// Casos de prueba para las funciones de cálculo de app.jsx. No forma parte de la app en sí
// (no se enlaza desde index.html ni se registra en el service worker) — es una herramienta de
// mantenimiento para comprobar, tras cualquier cambio en app.jsx, que los cálculos siguen dando
// los mismos resultados conocidos. Los valores "esperado" de aquí abajo se verificaron a mano
// antes de guardarlos como referencia (agosto de 2026).
import { DAYS } from "comun";
import { objetivosPorComida } from "objetivos";
import { migrateData } from "migraciones";
import { FOODS_SEED } from "datos-iniciales";
import { CUESTIONARIO_PASOS_BASE, pasosCuestionario, construirIngredientesDesdeCuestionario } from "cuestionario";

// Compara solo las claves presentes en `esperado` (no exige igualdad total del objeto), y admite
// una tolerancia para comparar decimales que vienen de cálculos en coma flotante.
function comparar(actual, esperado, tolerancia = 0.01) {
  const diffs = [];
  for (const key of Object.keys(esperado)) {
    const a = actual ? actual[key] : undefined;
    const e = esperado[key];
    const iguales =
      typeof e === "number" && typeof a === "number"
        ? Math.abs(a - e) <= tolerancia
        : a === e;
    if (!iguales) diffs.push(`${key}: esperado ${JSON.stringify(e)}, obtenido ${JSON.stringify(a)}`);
  }
  return { ok: diffs.length === 0, diffs };
}

// Perfil base reutilizado por varios casos. La edad se calcula relativa al año actual (no un año
// fijo) para que el caso de prueba no "envejezca" con el calendario real.
function perfilBase(overrides = {}) {
  const anioNacimiento = new Date().getFullYear() - 31; // fuerza edad = 31 siempre
  return {
    anioNacimiento, altura: 180, peso: 90, sexo: "hombre", palBase: "escritorio",
    objetivo: "definicion", entrenamientos: [{ tipo: "pesas", horas: 1, frecuenciaSemanal: 5 }],
    calibracionKcal: 0,
    ...overrides,
  };
}

export function crearGrupos(mod) {
  const {
    calcularObjetivosPerfil, calcularTendenciaPeso, evaluarTendencia, esCambioRadical,
    esDiaSugeridoPeso, calcularListaCompra, fechaISO, resumenNutrientesSemana, calcularResumenMensual,
  } = mod;

  return [
    {
      grupo: "calcularObjetivosPerfil",
      casos: [
        {
          nombre: "Definición · 90kg · pesas 5x/semana · sin calibración",
          ejecutar: () => {
            // Recalibrado 19/09/2026: en definición el suelo de carbohidrato deja de escalar por
            // carga de entrenamiento y pasa a un valor plano de 2,6 g/kg (antes 4,0 g/kg, tramo de
            // 3-5 sesiones) — aquí sí se alcanza cediendo parte de la grasa disponible (90g → 65,8g,
            // sin llegar a su suelo de 54g), a diferencia del tramo más ambicioso de antes.
            const r = calcularObjetivosPerfil(perfilBase());
            return comparar(r, { kcal: 2320, prot: 198, fat: 66, carb: 234, ajustePct: -15, bmr: 1875, carbMinNotMet: false });
          },
        },
        {
          nombre: "Igual, con calibración +200 kcal (suaviza el déficit)",
          ejecutar: () => {
            const r = calcularObjetivosPerfil(perfilBase({ calibracionKcal: 200 }));
            return comparar(r, { kcal: 2520, ajustePct: -7.7 });
          },
        },
        {
          nombre: "Igual, con calibración −100 kcal (debe quedar clampada al techo −17%)",
          ejecutar: () => {
            const r = calcularObjetivosPerfil(perfilBase({ calibracionKcal: -100 }));
            return comparar(r, { kcal: 2265, ajustePct: -17 });
          },
        },
        {
          nombre: "Igual, con calibración +2000 kcal extrema (debe quedar clampada al techo +15%)",
          ejecutar: () => {
            const r = calcularObjetivosPerfil(perfilBase({ calibracionKcal: 2000 }));
            return comparar(r, { kcal: 3139, ajustePct: 15 });
          },
        },
        {
          nombre: "Mantenimiento · 70kg · sin entrenamiento (referencia sin ajustes)",
          ejecutar: () => {
            const r = calcularObjetivosPerfil({
              anioNacimiento: new Date().getFullYear() - 31, altura: 170, peso: 70, sexo: "mujer",
              palBase: "escritorio", objetivo: "mantenimiento", entrenamientos: [],
            });
            return comparar(r, { ajustePct: 0, carbMin: null });
          },
        },
        {
          nombre: "Mantenimiento · 70kg · día a día exigente · sin entrenamiento (el suelo de grasa se respeta sin pasar por el ajuste de carbohidrato)",
          ejecutar: () => {
            // Regresión del bug de grasa corregido el 18/09/2026: sin entrenamiento, carbMin es
            // null y el bloque que antes era la ÚNICA vía para hacer cumplir el suelo de grasa
            // nunca se ejecuta. Con un TDEE alto (día a día "exigente", PAL 1,65) el 20% de las kcal
            // (65,7g) supera al 0,85 g/kg de la tabla (59,5g) — antes de la corrección, fat se
            // quedaba en 59,5g, por debajo de su propio suelo, en silencio.
            const r = calcularObjetivosPerfil({
              anioNacimiento: new Date().getFullYear() - 20, altura: 190, peso: 70, sexo: "hombre",
              palBase: "exigente", objetivo: "mantenimiento", entrenamientos: [],
            });
            return comparar(r, { kcal: 2958, prot: 70, fat: 66, carb: 522, carbMin: null, ajustePct: 0, bmr: 1793 });
          },
        },
        {
          nombre: "Mantenimiento · 95kg · pesas 6x/semana (suelo de carbohidrato por carga de entrenamiento, tramo alto)",
          ejecutar: () => {
            // Recalibrado 19/09/2026: fuera de definición, el suelo de carbohidrato ya no escala por
            // número de sesiones sino por kcal de entrenamiento/kg de peso al día (aquí 6*95*1*6/7÷95
            // ≈ 5,14 kcal/kg/día, tramo "alto" de CARGA_ENTRENAMIENTO_NIVELES → 4,5 g/kg = 427,5g).
            // Ni cediendo toda la grasa disponible hasta su suelo (118,75g → 63,98g) se llega del
            // todo — comprueba que el mecanismo de ajuste funciona igual con el nuevo suelo.
            const r = calcularObjetivosPerfil({
              anioNacimiento: new Date().getFullYear() - 31, altura: 178, peso: 95, sexo: "hombre",
              palBase: "escritorio", objetivo: "mantenimiento", entrenamientos: [{ tipo: "pesas", horas: 1, frecuenciaSemanal: 6 }],
            });
            return comparar(r, { kcal: 2879, prot: 152, fat: 83, carb: 380, carbMinNotMet: false, ajustePct: 0 });
          },
        },
      ],
    },
    {
      grupo: "Seguimiento de peso — tendencia y evaluación",
      casos: [
        {
          nombre: "Definición, ritmo dentro de lo esperado → óptimo",
          ejecutar: () => {
            const entradas = [
              { fecha: "2026-08-01", peso: 80.0, atipico: false },
              { fecha: "2026-08-04", peso: 79.7, atipico: false },
              { fecha: "2026-08-08", peso: 79.5, atipico: false },
              { fecha: "2026-08-11", peso: 79.1, atipico: false },
              { fecha: "2026-08-15", peso: 78.8, atipico: false },
              { fecha: "2026-08-18", peso: 78.5, atipico: false },
              { fecha: "2026-08-21", peso: 78.2, atipico: false },
            ];
            const t = calcularTendenciaPeso(entradas);
            const ev = evaluarTendencia(t.pctSemana, "definicion");
            return comparar({ pctSemana: t.pctSemana, nivel: ev.nivel }, { pctSemana: -0.79, nivel: "optimo" }, 0.05);
          },
        },
        {
          nombre: "Definición, ritmo demasiado rápido → acción (+200 kcal)",
          ejecutar: () => {
            const entradas = [
              { fecha: "2026-08-01", peso: 80.0, atipico: false },
              { fecha: "2026-08-08", peso: 78.5, atipico: false },
              { fecha: "2026-08-15", peso: 77.0, atipico: false },
              { fecha: "2026-08-21", peso: 75.8, atipico: false },
            ];
            const t = calcularTendenciaPeso(entradas);
            const ev = evaluarTendencia(t.pctSemana, "definicion");
            return comparar({ nivel: ev.nivel, sugerenciaKcal: ev.sugerenciaKcal }, { nivel: "accion", sugerenciaKcal: 200 });
          },
        },
        {
          nombre: "Pesada atípica excluida del cálculo de tendencia",
          ejecutar: () => {
            const entradas = [
              { fecha: "2026-08-01", peso: 80.0, atipico: false },
              { fecha: "2026-08-04", peso: 79.8, atipico: false },
              { fecha: "2026-08-06", peso: 82.5, atipico: true },
              { fecha: "2026-08-08", peso: 79.5, atipico: false },
              { fecha: "2026-08-15", peso: 79.0, atipico: false },
              { fecha: "2026-08-21", peso: 78.6, atipico: false },
            ];
            const t = calcularTendenciaPeso(entradas);
            return comparar({ n: t.n, pctSemana: t.pctSemana }, { n: 5, pctSemana: -0.622 }, 0.05);
          },
        },
        {
          nombre: "Volumen, ganancia demasiado lenta → ineficaz (+100 kcal)",
          ejecutar: () => {
            const entradas = [
              { fecha: "2026-08-01", peso: 70.0, atipico: false },
              { fecha: "2026-08-08", peso: 70.05, atipico: false },
              { fecha: "2026-08-15", peso: 70.1, atipico: false },
              { fecha: "2026-08-21", peso: 70.12, atipico: false },
            ];
            const t = calcularTendenciaPeso(entradas);
            const ev = evaluarTendencia(t.pctSemana, "volumen");
            return comparar({ nivel: ev.nivel, sugerenciaKcal: ev.sugerenciaKcal }, { nivel: "ineficaz", sugerenciaKcal: 100 });
          },
        },
        {
          nombre: "Definición pero el peso sube → dirección contraria (−200 kcal)",
          ejecutar: () => {
            const entradas = [
              { fecha: "2026-08-01", peso: 80.0, atipico: false },
              { fecha: "2026-08-08", peso: 80.3, atipico: false },
              { fecha: "2026-08-15", peso: 80.6, atipico: false },
            ];
            const t = calcularTendenciaPeso(entradas);
            const ev = evaluarTendencia(t.pctSemana, "definicion");
            return comparar({ nivel: ev.nivel, sugerenciaKcal: ev.sugerenciaKcal }, { nivel: "direccion-contraria", sugerenciaKcal: -200 });
          },
        },
        {
          nombre: "Mantenimiento → sin evaluación (no hay dirección esperada)",
          ejecutar: () => {
            const ev = evaluarTendencia(1.2, "mantenimiento");
            return comparar({ esNull: ev === null }, { esNull: true });
          },
        },
        {
          nombre: "Cambio radical: +2,7kg tras 79,8kg se detecta (≥1,5%)",
          ejecutar: () => {
            const entradas = [{ fecha: "2026-08-04", peso: 79.8, atipico: false }];
            const detectado = esCambioRadical(82.5, entradas, "2026-08-06");
            return comparar({ detectado }, { detectado: true });
          },
        },
        {
          nombre: "Cambio pequeño: +0,3kg tras 79,8kg NO se marca como radical",
          ejecutar: () => {
            const entradas = [{ fecha: "2026-08-04", peso: 79.8, atipico: false }];
            const detectado = esCambioRadical(80.1, entradas, "2026-08-06");
            return comparar({ detectado }, { detectado: false });
          },
        },
        {
          nombre: "Días sugeridos: lunes cuenta para 2x y 3x/semana",
          ejecutar: () => {
            const lunes = new Date("2026-08-24T12:00:00"); // lunes
            return comparar(
              { dos: esDiaSugeridoPeso(2, lunes), tres: esDiaSugeridoPeso(3, lunes) },
              { dos: true, tres: true }
            );
          },
        },
        {
          nombre: "Días sugeridos: martes no cuenta para ninguno de los dos",
          ejecutar: () => {
            const martes = new Date("2026-08-25T12:00:00");
            return comparar(
              { dos: esDiaSugeridoPeso(2, martes), tres: esDiaSugeridoPeso(3, martes) },
              { dos: false, tres: false }
            );
          },
        },
      ],
    },
    {
      grupo: "calcularListaCompra",
      casos: [
        {
          nombre: "Desglosa un plato cerrado (hamburguesa) en sus alimentos reales",
          ejecutar: () => {
            const { data, menu } = escenarioListaCompra();
            const items = calcularListaCompra(data, menu, 1);
            const porNombre = Object.fromEntries(items.map((i) => [i.nombre, i]));
            return comparar(
              {
                pan: porNombre["Pan de hamburguesa"]?.gramos,
                carne: porNombre["Carne de ternera"]?.gramos,
                queso: porNombre["Queso"]?.gramos,
                categoriaCarne: porNombre["Carne de ternera"]?.categoria,
              },
              { pan: 80, carne: 150, queso: 30, categoriaCarne: "cerrado" }
            );
          },
        },
        {
          nombre: "Multiplica por las raciones ajustadas de una comida",
          ejecutar: () => {
            const { data, menu } = escenarioListaCompra();
            const items = calcularListaCompra(data, menu, 2);
            const pollo = items.find((i) => i.nombre === "Pechuga de pollo");
            return comparar({ gramos: pollo?.gramos }, { gramos: 300 });
          },
        },
        {
          nombre: "El ciclo completo suma ambas semanas",
          ejecutar: () => {
            const { data, menu } = escenarioListaCompra();
            const items = calcularListaCompra(data, menu, "todo");
            const arroz = items.find((i) => i.nombre === "Arroz");
            const pollo = items.find((i) => i.nombre === "Pechuga de pollo");
            return comparar({ arroz: arroz?.gramos, pollo: pollo?.gramos }, { arroz: 160, pollo: 450 });
          },
        },
      ],
    },
    {
      grupo: "resumenNutrientesSemana",
      casos: [
        {
          nombre: "Sal por encima del límite, fibra en rango, azúcar óptimo (referencia 2000 kcal)",
          ejecutar: () => {
            const { data, menu } = escenarioNutrientesSalud();
            const r = resumenNutrientesSemana(data, menu, 1);
            return comparar(
              { sal: r.sal.media, nivelSal: r.sal.nivel, fibra: r.fibra.media, nivelFibra: r.fibra.nivel, azucares: r.azucares.media, nivelAzucar: r.azucares.nivel },
              { sal: 6.1, nivelSal: "demasiado", fibra: 31, nivelFibra: "optimo", azucares: 3, nivelAzucar: "optimo" }
            );
          },
        },
        {
          nombre: "Azúcar ajustado a un objetivo de kcal propio, y aviso de dato faltante",
          ejecutar: () => {
            const { data, menu } = escenarioNutrientesSalud({ azucaresAltoEnSal: 20, carboSinDatos: true });
            const r = resumenNutrientesSemana(data, menu, 1, 1500);
            return comparar(
              {
                nivelAzucar: r.azucares.nivel, nivelFibra: r.fibra.nivel,
                faltaSal: r.faltanDatos.sal.length, faltaFibra: r.faltanDatos.fibra.length,
              },
              { nivelAzucar: "aceptable", nivelFibra: "insuficiente", faltaSal: 1, faltaFibra: 1 }
            );
          },
        },
      ],
    },
    {
      // Fase 4 (reparto de comidas configurable): objetivosPorComida ya no lee la constante
      // global REPARTO_COMIDAS, sino el reparto que le pase cada perfil — estos casos prueban
      // repartos distintos al clásico de 4 comidas (2 comidas a partes iguales, 3 comidas con
      // pesos desiguales), no solo el de siempre.
      grupo: "objetivosPorComida (repartos personalizados)",
      casos: [
        {
          nombre: "2 comidas (Comida/Cena) al 50/50 reparte el objetivo diario a partes iguales",
          ejecutar: () => {
            const objetivosDiarios = { kcal: 2000, prot: 150, fat: 70, carb: 200 };
            const reparto = { Comida: 0.5, Cena: 0.5 };
            const comida = objetivosPorComida(objetivosDiarios, "Comida", reparto);
            const cena = objetivosPorComida(objetivosDiarios, "Cena", reparto);
            return comparar(
              { comidaKcal: comida.kcal, comidaProt: comida.prot, cenaKcal: cena.kcal, cenaCarb: cena.carb },
              { comidaKcal: 1000, comidaProt: 75, cenaKcal: 1000, cenaCarb: 100 }
            );
          },
        },
        {
          nombre: "3 comidas con pesos desiguales (60/10/30) reparte proporcionalmente",
          ejecutar: () => {
            const objetivosDiarios = { kcal: 2000, prot: 150, fat: 70, carb: 200 };
            const reparto = { Comida: 0.6, Merienda: 0.1, Cena: 0.3 };
            const comida = objetivosPorComida(objetivosDiarios, "Comida", reparto);
            const merienda = objetivosPorComida(objetivosDiarios, "Merienda", reparto);
            const cena = objetivosPorComida(objetivosDiarios, "Cena", reparto);
            return comparar(
              { comidaKcal: comida.kcal, meriendaKcal: merienda.kcal, meriendaProt: merienda.prot, cenaKcal: cena.kcal },
              { comidaKcal: 1200, meriendaKcal: 200, meriendaProt: 15, cenaKcal: 600 }
            );
          },
        },
        {
          nombre: "Una comida que no está en el reparto elegido devuelve null",
          ejecutar: () => {
            const objetivosDiarios = { kcal: 2000, prot: 150, fat: 70, carb: 200 };
            const r = objetivosPorComida(objetivosDiarios, "Desayuno", { Comida: 0.5, Cena: 0.5 });
            return comparar({ esNull: r === null }, { esNull: true });
          },
        },
      ],
    },
    {
      // El número de "comidas al día" del resumen mensual (f3-11) dejó de pedirse aparte en Perfil
      // (frep-7): ahora se cuenta solo a partir de perfil.repartoComidas. Estos casos comprueban
      // que un reparto de 2 comidas cambia de verdad cuántas "tocaban" ese mes, y que un perfil sin
      // repartoComidas todavía cae al valor de siempre (4) en vez de romperse.
      grupo: "calcularResumenMensual (reparto de comidas configurable)",
      casos: [
        {
          nombre: "Reparto de 2 comidas: comidasPorDia se deriva del perfil, no de un número aparte",
          ejecutar: () => {
            const data = {
              perfil: { repartoComidas: { Comida: 0.5, Cena: 0.5 } },
              comidasCompletadas: {
                "2026-09-01": { Comida: true },
                "2026-09-02": { Comida: true, Cena: true },
              },
            };
            const r = calcularResumenMensual(data, "2026-09", new Date(2026, 8, 10));
            return comparar(r, { comidasPorDia: 2, completadas: 3, esperadas: 20, porcentaje: 15 });
          },
        },
        {
          nombre: "Sin repartoComidas en el perfil, cae al valor por defecto de siempre (4)",
          ejecutar: () => {
            const data = { perfil: {}, comidasCompletadas: {} };
            const r = calcularResumenMensual(data, "2026-09", new Date(2026, 8, 10));
            return comparar(r, { comidasPorDia: 4, esperadas: 40 });
          },
        },
      ],
    },
    {
      // Añadido en octubre de 2026, al sacar migrateData de app.jsx a logica/migraciones.js. Los
      // valores esperados salen de leer migrateData bloque a bloque (ver sus comentarios): cada caso
      // prueba un parche concreto y, sobre todo, que nunca se pisa lo que el usuario ya tenía.
      grupo: "migrateData (datos guardados de versiones anteriores)",
      casos: [
        {
          nombre: "Cuenta sin nada guardado: completa catálogo, reglas, peso, listas y comidas completadas",
          ejecutar: () => {
            const { data, changed } = migrateData({});
            const idsSemilla = FOODS_SEED.map((f) => f.id).sort().join(",");
            return comparar(
              {
                changed,
                catalogoCompleto: data.foods.map((f) => f.id).sort().join(",") === idsSemilla,
                reglas: JSON.stringify(data.rules),
                pesadas: data.pesoTracking.entradas.length,
                vecesSemana: data.pesoTracking.vecesSemana,
                listaCompra: JSON.stringify(data.listaCompra),
                listaCompraSimple: JSON.stringify(data.listaCompraSimple),
                comidasCompletadas: JSON.stringify(data.comidasCompletadas),
                sinPerfilInventado: data.perfil === undefined,
              },
              {
                changed: true, catalogoCompleto: true, reglas: "[]", pesadas: 0, vecesSemana: 3,
                listaCompra: JSON.stringify({ marcados: {}, generadoEn: null }),
                listaCompraSimple: JSON.stringify({ marcados: {}, generadoEn: null }),
                comidasCompletadas: "{}", sinPerfilInventado: true,
              }
            );
          },
        },
        {
          nombre: "Perfil antiguo: recibe el reparto clásico, idioma español y notificaciones desactivadas",
          ejecutar: () => {
            const { data } = migrateData({ perfil: { nombre: "Antiguo" } });
            return comparar(
              { reparto: JSON.stringify(data.perfil.repartoComidas), preset: data.perfil.presetComidas, idioma: data.perfil.idioma, push: data.perfil.notificacionesPush, nombre: data.perfil.nombre },
              { reparto: JSON.stringify({ Desayuno: 0.2, Comida: 0.35, Merienda: 0.15, Cena: 0.3 }), preset: "clasico-4", idioma: "es", push: false, nombre: "Antiguo" }
            );
          },
        },
        {
          nombre: "Perfil ya configurado: no se toca el reparto, el idioma ni las notificaciones elegidas",
          ejecutar: () => {
            const perfil = { repartoComidas: { Comida: 0.5, Cena: 0.5 }, presetComidas: "intermitente-2", idioma: "en", notificacionesPush: true };
            const { data } = migrateData({ perfil });
            return comparar(
              { reparto: JSON.stringify(data.perfil.repartoComidas), preset: data.perfil.presetComidas, idioma: data.perfil.idioma, push: data.perfil.notificacionesPush },
              { reparto: JSON.stringify({ Comida: 0.5, Cena: 0.5 }), preset: "intermitente-2", idioma: "en", push: true }
            );
          },
        },
        {
          nombre: "Alimento del catálogo editado a mano: conserva nombre y macros, solo completa los campos nuevos",
          ejecutar: () => {
            const { data } = migrateData({ foods: [{ id: "f_pasta", name: "Mi pasta", kcal: 999, prot: 1, fat: 1, carb: 1 }] });
            const pasta = data.foods.find((f) => f.id === "f_pasta");
            return comparar(
              { ...pasta, totalAlimentos: data.foods.length },
              { name: "Mi pasta", kcal: 999, prot: 1, carb: 1, sal: 0.1, azucares: 3.5, fibra: 4, grasaSaturada: 0.3, categoria: "carbohidratos", totalAlimentos: FOODS_SEED.length }
            );
          },
        },
        {
          nombre: "Alimento creado por el usuario: se conserva y se añade el resto del catálogo",
          ejecutar: () => {
            const { data } = migrateData({ foods: [{ id: "f_mio", name: "Mi alimento", kcal: 50, prot: 2, fat: 1, carb: 8 }] });
            return comparar(
              { existe: data.foods.some((f) => f.id === "f_mio" && f.name === "Mi alimento"), total: data.foods.length },
              { existe: true, total: FOODS_SEED.length + 1 }
            );
          },
        },
        {
          nombre: "Ingredientes antiguos sin alimento vinculado: se vinculan por nombre, sin pisar los ya vinculados",
          ejecutar: () => {
            const { data } = migrateData({
              ingredients: [
                { id: "a", name: "Pasta" },
                { id: "b", name: "Garbanzos" },
                { id: "c", name: "Arroz", foodId: "f_otro", gramos: 50 },
                { id: "d", name: "Inventado" },
              ],
            });
            const [a, b, c, d] = data.ingredients;
            return comparar(
              { aFood: a.foodId, aG: a.gramos, bFood: b.foodId, bG: b.gramos, cFood: c.foodId, cG: c.gramos, dFood: d.foodId },
              { aFood: "f_pasta", aG: 80, bFood: "f_garbanzos_cocidos", bG: 120, cFood: "f_otro", cG: 50, dFood: undefined }
            );
          },
        },
        {
          nombre: "Bloque antiguo de pollo picado: recibe su patrón semanal (2+0 / 1+1); otros bloques no",
          ejecutar: () => {
            const { data } = migrateData({ blocks: [{ id: "b1", name: "Pollo picado / hamburguesa de pollo" }, { id: "b2", name: "Otro bloque" }] });
            return comparar(
              { pollo: JSON.stringify(data.blocks[0].weeklyPattern), otro: data.blocks[1].weeklyPattern },
              { pollo: JSON.stringify([{ counts: [2, 0] }, { counts: [1, 1] }]), otro: undefined }
            );
          },
        },
        {
          nombre: "Seguimiento de peso antiguo: añade historial y pausas sin tocar pesadas ni configuración",
          ejecutar: () => {
            const { data } = migrateData({ pesoTracking: { vecesSemana: 2, entradas: [{ fecha: "2026-01-01", peso: 70 }] } });
            const pt = data.pesoTracking;
            return comparar(
              { historial: JSON.stringify(pt.historial), pausas: JSON.stringify(pt.pausas), pesadas: pt.entradas.length, peso: pt.entradas[0].peso, vecesSemana: pt.vecesSemana },
              { historial: "[]", pausas: "[]", pesadas: 1, peso: 70, vecesSemana: 2 }
            );
          },
        },
        {
          nombre: "Migrar dos veces da lo mismo: la segunda pasada no detecta nada que cambiar",
          ejecutar: () => {
            const primera = migrateData({ perfil: { nombre: "X" }, ingredients: [{ id: "a", name: "Pasta" }], pesoTracking: { entradas: [] } });
            const antes = JSON.stringify(primera.data);
            const segunda = migrateData(JSON.parse(antes));
            return comparar({ changed: segunda.changed, igual: JSON.stringify(segunda.data) === antes }, { changed: false, igual: true });
          },
        },
      ],
    },
    {
      // Añadido en octubre de 2026, al sacar el cuestionario de catálogo de app.jsx a
      // logica/cuestionario.js. Probabilidades calculadas a mano con el mismo método que el código:
      // cada elección pesa su nivel sobre la suma, redondeado, y la última se queda con el resto
      // hasta 100 (así siempre suman exactamente 100).
      grupo: "Cuestionario de catálogo (alta de cuenta nueva)",
      casos: [
        {
          nombre: "Pasos con el reparto clásico de 4 comidas: los 5 base + desayuno y merienda",
          ejecutar: () => {
            const p = pasosCuestionario({ Desayuno: 0.2, Comida: 0.35, Merienda: 0.15, Cena: 0.3 });
            return comparar({ pasos: p.join(",") }, { pasos: [...CUESTIONARIO_PASOS_BASE, "desayuno", "merienda"].join(",") });
          },
        },
        {
          nombre: "Pasos con 5 comidas: añade también media mañana, en el orden del día",
          ejecutar: () => {
            const p = pasosCuestionario({ Desayuno: 0.2, "Media mañana": 0.1, Comida: 0.3, Merienda: 0.1, Cena: 0.3 });
            return comparar({ extra: p.slice(CUESTIONARIO_PASOS_BASE.length).join(",") }, { extra: "desayuno,media_manana,merienda" });
          },
        },
        {
          nombre: "Pasos sin desayuno (3 comidas): no pregunta por el desayuno",
          ejecutar: () => {
            const p = pasosCuestionario({ Comida: 0.4, Merienda: 0.2, Cena: 0.4 });
            return comparar({ extra: p.slice(CUESTIONARIO_PASOS_BASE.length).join(",") }, { extra: "merienda" });
          },
        },
        {
          nombre: "Proteína elegida: regla de frecuencia semanal con el nivel elegido y sus gramos de partida",
          ejecutar: () => {
            const [salmon] = construirIngredientesDesdeCuestionario({ frecuencias: { f_salmon: 2 }, pesosCarbo: {}, pesosVerdura: {}, pesosGrasa: {} });
            return comparar(salmon, { name: "Salmón", category: "proteina", ruleType: "frecuencia", freqCantidad: 2, freqPeriodo: "semana", foodId: "f_salmon", gramos: 150, active: true });
          },
        },
        {
          nombre: "Dos carbohidratos con pesos 2 y 1: 67% y 33% (el último ajusta el redondeo)",
          ejecutar: () => {
            const r = construirIngredientesDesdeCuestionario({ frecuencias: {}, pesosCarbo: { f_pasta: 2, f_arroz_basmati: 1 }, pesosVerdura: {}, pesosGrasa: {} });
            return comparar(
              { n: r.length, pasta: r[0].probabilidad, arroz: r[1].probabilidad, nombres: r.map((i) => i.name).join(","), gramos: r.map((i) => i.gramos).join(",") },
              { n: 2, pasta: 67, arroz: 33, nombres: "Pasta,Arroz", gramos: "80,80" }
            );
          },
        },
        {
          nombre: "Tres verduras con el mismo peso: 33%, 33% y 34% (suman 100)",
          ejecutar: () => {
            const r = construirIngredientesDesdeCuestionario({ frecuencias: {}, pesosCarbo: {}, pesosVerdura: { f_ensalada: 1, f_tomate: 1, f_pimiento: 1 }, pesosGrasa: {} });
            return comparar({ probs: r.map((i) => i.probabilidad).join(","), categoria: r[0].category }, { probs: "33,33,34", categoria: "verdura" });
          },
        },
        {
          nombre: "Tostadas elegidas en desayuno: un plato con composición y gramos por defecto de cada carpeta",
          ejecutar: () => {
            const r = construirIngredientesDesdeCuestionario({
              frecuencias: {}, pesosCarbo: {}, pesosVerdura: {}, pesosGrasa: {},
              comidasLigeras: { desayuno: { tostadas: { nivel: 1, grupos: [["f_pan_molde"], ["f_pavo", "f_mozzarella"]] } } },
            });
            return comparar(
              { n: r.length, nombre: r[0].name, categoria: r[0].category, prob: r[0].probabilidad, alimentos: r[0].composicion.map((c) => c.foodId).join(","), gramos: r[0].composicion.map((c) => c.gramos).join(",") },
              { n: 1, nombre: "Tostadas", categoria: "desayuno", prob: 100, alimentos: "f_pan_molde,f_pavo,f_mozzarella", gramos: "60,30,125" }
            );
          },
        },
        {
          nombre: "Arquetipo marcado sin ningún alimento dentro: no genera plato (solo el que sí tiene composición)",
          ejecutar: () => {
            const r = construirIngredientesDesdeCuestionario({
              frecuencias: {}, pesosCarbo: {}, pesosVerdura: {}, pesosGrasa: {},
              comidasLigeras: { merienda: { tostadas: { nivel: 2, grupos: [[], []] }, cereales_lacteo: { nivel: 1, grupos: [["f_cereales_cacao"], ["f_yogur_prot"]] } } },
            });
            return comparar({ n: r.length, nombre: r[0] && r[0].name, prob: r[0] && r[0].probabilidad }, { n: 1, nombre: "Cereales con lácteo", prob: 100 });
          },
        },
      ],
    },
  ];
}

// Datos + menú de ejemplo mínimos y fijos, reutilizados por los casos de la lista de la compra.
function escenarioListaCompra() {
  const data = {
    foods: [
      { id: "f_pollo", name: "Pechuga de pollo", kcal: 165, prot: 31, fat: 3.6, carb: 0 },
      { id: "f_arroz", name: "Arroz", kcal: 130, prot: 2.7, fat: 0.3, carb: 28 },
      { id: "f_pan", name: "Pan de hamburguesa", kcal: 280, prot: 9, fat: 4, carb: 50 },
      { id: "f_carne_ternera", name: "Carne de ternera", kcal: 250, prot: 26, fat: 15, carb: 0 },
      { id: "f_queso", name: "Queso", kcal: 350, prot: 25, fat: 27, carb: 2 },
    ],
    ingredients: [
      { id: "ing_pollo", name: "Pollo (carne)", category: "proteina", foodId: "f_pollo", gramos: 150 },
      { id: "ing_arroz", name: "Arroz", category: "carbo", foodId: "f_arroz", gramos: 80 },
      {
        id: "ing_hamburguesa", name: "Hamburguesa completa con pan", category: "cerrado",
        composicion: [
          { id: "c1", foodId: "f_pan", gramos: 80 },
          { id: "c2", foodId: "f_carne_ternera", gramos: 150 },
          { id: "c3", foodId: "f_queso", gramos: 30 },
        ],
      },
    ],
  };
  const menu = [
    { id: "m1", week: 1, day: "Lunes", mealType: "Comida", protein: "Pollo (carne)", carbo: "Arroz", verdura: "Ensalada", raciones: {} },
    { id: "m2", week: 1, day: "Martes", mealType: "Cena", closedDish: "Hamburguesa completa con pan", raciones: {} },
    { id: "m3", week: 2, day: "Lunes", mealType: "Comida", protein: "Pollo (carne)", carbo: "Arroz", verdura: "Ensalada", raciones: { protein: 2 } },
  ];
  return { data, menu };
}

// Alimento A: alto en sal (6 g/100g). Alimento B: rico en fibra (30 g/100g) y con todos los
// campos rellenados. Alimento C (opcional, por defecto no se usa): sin sal/azúcares/fibra
// registrados en el catálogo, para probar el aviso de dato incompleto. Todos los ingredientes
// llevan 100 g de base, así que a 1 ración el factor de escalado es exactamente 1 — los valores
// de cada comida son directamente los del alimento por 100 g, sin necesidad de calcular a mano.
function escenarioNutrientesSalud({ azucaresAltoEnSal, carboSinDatos } = {}) {
  const data = {
    foods: [
      { id: "f_altoensal", name: "Alto en sal", kcal: 100, prot: 5, fat: 2, carb: 10, sal: 6, azucares: azucaresAltoEnSal ?? 2, fibra: 1 },
      { id: "f_ricoenfibra", name: "Rico en fibra", kcal: 200, prot: 10, fat: 5, carb: 20, sal: 0.1, azucares: 1, fibra: 30 },
      { id: "f_sindatos", name: "Sin datos de sal, azúcares y fibra", kcal: 150, prot: 8, fat: 3, carb: 15 },
    ],
    ingredients: [
      { id: "ing_altoensal", name: "Alto en sal", category: "proteina", foodId: "f_altoensal", gramos: 100 },
      { id: "ing_ricoenfibra", name: "Rico en fibra", category: "carbo", foodId: "f_ricoenfibra", gramos: 100 },
      { id: "ing_sindatos", name: "Sin datos", category: "carbo", foodId: "f_sindatos", gramos: 100 },
    ],
  };
  const carbo = carboSinDatos ? "Sin datos" : "Rico en fibra";
  const menu = DAYS.map((day) => ({
    id: `m_${day}`, week: 1, day, mealType: "Comida",
    protein: "Alto en sal", carbo, verdura: null, garbanzos: false, raciones: {},
  }));
  return { data, menu };
}
