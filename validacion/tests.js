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
import {
  despensaVacia, migrarDespensa, anadirItem, editarItem, quitarAlimento, menuEstaConfirmado, confirmarMenu,
  quitarConfirmacion, descontarComida, devolverComida, marcarComprado, desmarcarComprado,
  sellarCambios, racionMedia, alertasStock, anadirLimpieza, alternarLimpieza, quitarLimpieza, quitarLimpiezaComprada,
} from "despensa";
import { necesidadesComida, calcularListaNeta } from "lista-compra-neta";
import { esBebida, huecoDe, formaDe, repartirEnHuecos } from "nevera";
import { tieneTraduccion, clavesDeIdioma, IDIOMAS_DISPONIBLES } from "i18n";
import {
  EJERCICIOS_SEMILLA, TIPOS_EJERCICIO, GRUPOS_MUSCULARES, EQUIPOS, camposDeTipo, listaEjercicios, buscarEjercicios,
  posibleDuplicado,
} from "entreno-ejercicios";
import { NOMBRES_EJERCICIOS, nombreEjercicio } from "entreno-nombres";
import {
  e1rm, e1rmFiable, volumenSerie, volumenSesion, duracionEfectiva, seriesPorMusculo, validarSerie,
  mejoresDeEjercicioEnSesion, recordsBatidos, anteriorDe, semanaDe,
} from "entreno-calculo";
import {
  nuevaSesion, anadirSerie, marcarHecha, desmarcar, ajustarDescanso, saltarDescanso, sustituirHoy, pausar,
  terminarSesion, cambiosEstructurales, aplicarARutina, rutinaDesdeSesion,
} from "entreno-sesion";

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

// `carga` (opcional) lo pasa validacion/index.html tras cargar la interfaz con cargador-ui.js: qué
// archivos de ui/ se cargaron de verdad y qué lista ui/archivos.json.
export function crearGrupos(mod, carga) {
  const {
    calcularObjetivosPerfil, calcularTendenciaPeso, evaluarTendencia, esCambioRadical,
    esDiaSugeridoPeso, calcularListaCompra, fechaISO, resumenNutrientesSemana, calcularResumenMensual,
  } = mod;

  return [
    ...(carga ? [{
      // Desde octubre de 2026 la interfaz está repartida en ui/ y la carga cargador-ui.js. La lista
      // ui/archivos.json la usa también sw.js para el modo sin conexión: un archivo que se carga
      // pero no está en la lista funcionaría con conexión y fallaría sin ella; uno que está en la
      // lista pero ya no se usa haría fallar la instalación del service worker si se borra.
      grupo: "Carga de la interfaz (ui/archivos.json)",
      casos: [
        {
          nombre: "Todo archivo de ui/ que carga la app está en ui/archivos.json",
          ejecutar: () => {
            const faltan = carga.archivosCargados.filter((f) => !carga.archivosLista.includes(f));
            return comparar({ faltanEnLaLista: faltan.join(", ") }, { faltanEnLaLista: "" });
          },
        },
        {
          nombre: "Todo archivo de ui/archivos.json se usa de verdad",
          ejecutar: () => {
            const sobran = carga.archivosLista.filter((f) => !carga.archivosCargados.includes(f));
            return comparar({ sobranEnLaLista: sobran.join(", ") }, { sobranEnLaLista: "" });
          },
        },
      ],
    }] : []),
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
    {
      // Añadido en octubre de 2026 con la Fase A de la despensa (logica/despensa.js y
      // logica/lista-compra-neta.js). Todos usan escenarioDespensa() (más abajo, con las necesidades
      // de cada comida calculadas a mano en su comentario). Lo que más importa proteger: que la
      // lista neta nunca cuente dos veces lo ya cocinado, y que desmarcar una comida o destachar una
      // compra deje la despensa exactamente como estaba.
      grupo: "Despensa y lista de la compra neta",
      casos: [
        {
          nombre: "Sin nada en casa: una fila por alimento y «comprar» = «necesitas»",
          ejecutar: () => {
            const { data, menu } = escenarioDespensa();
            const filas = calcularListaNeta(data, menu, 1, despensaVacia());
            const pollo = filas.find((f) => f.foodId === "f_pollo");
            const arroz = filas.find((f) => f.foodId === "f_arroz");
            // Semana 1: Arroz, Lechuga, Manzana, Pan, Pechuga de pollo, Queso y Tomate (7 filas).
            return comparar(
              { filas: filas.length, polloNecesito: pollo?.necesito, polloTengo: pollo?.tengo, polloComprar: pollo?.comprar, arrozComprar: arroz?.comprar, categoria: pollo?.categoria },
              { filas: 7, polloNecesito: 600, polloTengo: 0, polloComprar: 600, arrozComprar: 120, categoria: "proteinas" }
            );
          },
        },
        {
          nombre: "El mismo alimento desde ingredientes distintos (y con raciones) se suma en una sola fila",
          ejecutar: () => {
            const { data, menu } = escenarioDespensa();
            const filas = calcularListaNeta(data, menu, 1, despensaVacia());
            const pan = filas.filter((f) => f.foodId === "f_pan");
            const pollo = filas.filter((f) => f.foodId === "f_pollo");
            // Pan: 80 × 1,5 (bocadillo) + 60 (tostada) = 180.
            return comparar({ filasPan: pan.length, pan: pan[0]?.necesito, filasPollo: pollo.length }, { filasPan: 1, pan: 180, filasPollo: 1 });
          },
        },
        {
          nombre: "Lo que hay en casa se resta: de sobra (comprar 0), repartido en dos zonas y a cero",
          ejecutar: () => {
            const { data, menu } = escenarioDespensa();
            const despensa = conItems([
              { id: "a", foodId: "f_arroz", zona: "despensa", gramos: 1000 },
              { id: "b", foodId: "f_pollo", zona: "nevera", gramos: 200 },
              { id: "c", foodId: "f_pollo", zona: "congelador", gramos: 300 },
              { id: "d", foodId: "f_queso", zona: "nevera", gramos: 0 },
            ]);
            const filas = calcularListaNeta(data, menu, 1, despensa);
            const fila = (id) => filas.find((f) => f.foodId === id) || {};
            return comparar(
              { arrozTengo: fila("f_arroz").tengo, arrozComprar: fila("f_arroz").comprar, polloTengo: fila("f_pollo").tengo, polloComprar: fila("f_pollo").comprar, quesoTengo: fila("f_queso").tengo, quesoComprar: fila("f_queso").comprar },
              { arrozTengo: 1000, arrozComprar: 0, polloTengo: 500, polloComprar: 100, quesoTengo: 0, quesoComprar: 30 }
            );
          },
        },
        {
          nombre: "Verdura y fruta sin cantidad: salen si no las tienes; la verdura sin alimento vinculado, siempre",
          ejecutar: () => {
            const { data, menu } = escenarioDespensa();
            const despensa = conItems([{ id: "t", foodId: "f_tomate", zona: "nevera", tengo: true }]);
            const filas = calcularListaNeta(data, menu, 1, despensa);
            const tomate = filas.find((f) => f.foodId === "f_tomate") || {};
            const manzana = filas.find((f) => f.foodId === "f_manzana") || {};
            const lechuga = filas.find((f) => f.key === "nombre:Lechuga") || {};
            return comparar(
              { tomateTengo: tomate.tengo, tomateComprar: tomate.comprar, manzanaSinCantidad: manzana.sinCantidad, manzanaComprar: manzana.comprar, lechugaFood: lechuga.foodId, lechugaComprar: lechuga.comprar, lechugaCategoria: lechuga.categoria },
              { tomateTengo: true, tomateComprar: false, manzanaSinCantidad: true, manzanaComprar: true, lechugaFood: null, lechugaComprar: true, lechugaCategoria: "vegetales" }
            );
          },
        },
        {
          nombre: "Coherencia con calcularListaCompra: los mismos gramos de cada alimento para el mismo menú",
          ejecutar: () => {
            const { data, menu } = escenarioDespensa();
            const neta = Object.fromEntries(calcularListaNeta(data, menu, "todo", despensaVacia()).filter((f) => !f.sinCantidad).map((f) => [f.nombre, f.necesito]));
            // La lista de siempre puede sacar el mismo alimento en dos filas (por ingrediente): se suman.
            const clasica = {};
            calcularListaCompra(data, menu, "todo").forEach((i) => { clasica[i.nombre] = (clasica[i.nombre] || 0) + i.gramos; });
            const distintos = Object.keys(neta).filter((n) => Math.round(clasica[n]) !== neta[n]);
            // Ciclo completo: pollo 600 + 150 (semana 2) = 750; arroz 120 + 80 = 200; pan 180; queso 30.
            return comparar(
              { distintos: distintos.join(", "), pollo: neta["Pechuga de pollo"], arroz: neta["Arroz"], pan: neta["Pan"], queso: neta["Queso"] },
              { distintos: "", pollo: 750, arroz: 200, pan: 180, queso: 30 }
            );
          },
        },
        {
          nombre: "Cocinar no cuenta dos veces: sale de la despensa y deja de hacer falta a la vez",
          ejecutar: () => {
            const { data, menu } = escenarioDespensa();
            const antes = confirmarMenu(conItems([
              { id: "p", foodId: "f_pollo", zona: "nevera", gramos: 200 },
              { id: "a", foodId: "f_arroz", zona: "despensa", gramos: 1000 },
            ]), menu, HOY);
            const lunes = menu[0];
            const despues = descontarComida(antes, { fecha: HOY, mealType: lunes.mealType, slotId: lunes.id, necesidades: necesidadesComida(data, lunes) });
            const pAntes = calcularListaNeta(data, menu, 1, antes).find((f) => f.foodId === "f_pollo");
            const filas = calcularListaNeta(data, menu, 1, despues);
            const pollo = filas.find((f) => f.foodId === "f_pollo");
            const arroz = filas.find((f) => f.foodId === "f_arroz");
            // Lunes: 150 de pollo y 80 de arroz. Pollo: necesitas 600 → 450, tienes 200 → 50,
            // comprar 400 antes y después. Arroz: necesitas 40, tienes 920.
            return comparar(
              { comprarAntes: pAntes.comprar, necesito: pollo.necesito, tengo: pollo.tengo, comprar: pollo.comprar, arrozNecesito: arroz.necesito, arrozTengo: arroz.tengo },
              { comprarAntes: 400, necesito: 450, tengo: 50, comprar: 400, arrozNecesito: 40, arrozTengo: 920 }
            );
          },
        },
        {
          nombre: "Descontar nunca baja de cero, y desmarcar devuelve exactamente lo descontado",
          ejecutar: () => {
            const { data, menu } = escenarioDespensa();
            const inicial = conItems([
              { id: "a", foodId: "f_pollo", zona: "nevera", gramos: 100 },
              { id: "b", foodId: "f_pollo", zona: "congelador", gramos: 20 },
            ]);
            const martes = menu[3]; // pide 300 g de pollo (ración 2) y 40 de arroz, que no hay
            const hecha = descontarComida(inicial, { fecha: HOY, mealType: martes.mealType, slotId: martes.id, necesidades: necesidadesComida(data, martes) });
            const consumo = hecha.consumos[HOY][martes.mealType];
            const vuelta = devolverComida(hecha, { fecha: HOY, mealType: martes.mealType });
            return comparar(
              {
                nevera: hecha.items[0].gramos, congelador: hecha.items[1].gramos,
                descontado: consumo.items.map((x) => `${x.itemId}:${x.gramos}`).join(","),
                igualQueAntes: JSON.stringify(vuelta.items) === JSON.stringify(inicial.items), consumos: JSON.stringify(vuelta.consumos),
              },
              { nevera: 0, congelador: 0, descontado: "a:100,b:20", igualQueAntes: true, consumos: "{}" }
            );
          },
        },
        {
          nombre: "Tachar un alimento que no tenías lo crea en su zona; destachar lo borra",
          ejecutar: () => {
            const { data, menu } = escenarioDespensa();
            const d0 = confirmarMenu(despensaVacia(), menu, HOY);
            const fila = calcularListaNeta(data, menu, 1, d0).find((f) => f.foodId === "f_pollo");
            const d1 = marcarComprado(d0, fila, data.foods.find((f) => f.id === "f_pollo"));
            const tachada = calcularListaNeta(data, menu, 1, d1).find((f) => f.foodId === "f_pollo");
            const d2 = desmarcarComprado(d1, tachada);
            // La fila tachada no desaparece: sigue diciendo comprar 600, ahora como comprada.
            return comparar(
              { zona: d1.items[0]?.zona, gramos: d1.items[0]?.gramos, comprar: tachada.comprar, comprado: tachada.comprado, itemsAlDestachar: d2.items.length, compras: JSON.stringify(d2.compras) },
              { zona: "nevera", gramos: 600, comprar: 600, comprado: true, itemsAlDestachar: 0, compras: "{}" }
            );
          },
        },
        {
          nombre: "Tachar un alimento que ya tenías le suma lo comprado; destachar se lo quita",
          ejecutar: () => {
            const { data, menu } = escenarioDespensa();
            const d0 = confirmarMenu(conItems([{ id: "a", foodId: "f_pollo", zona: "nevera", gramos: 200 }]), menu, HOY);
            const fila = calcularListaNeta(data, menu, 1, d0).find((f) => f.foodId === "f_pollo");
            const d1 = marcarComprado(d0, fila, data.foods.find((f) => f.id === "f_pollo"));
            const tachada = calcularListaNeta(data, menu, 1, d1).find((f) => f.foodId === "f_pollo");
            const d2 = desmarcarComprado(d1, tachada);
            return comparar(
              { tras: d1.items[0].gramos, delta: d1.compras.f_pollo.delta, tengo: tachada.tengo, comprar: tachada.comprar, alDestachar: d2.items.map((i) => `${i.id}:${i.gramos}`).join(",") },
              { tras: 600, delta: 400, tengo: 200, comprar: 400, alDestachar: "a:200" }
            );
          },
        },
        {
          nombre: "Tachar fruta la pone como «tengo» sin cantidad; destachar la quita",
          ejecutar: () => {
            const { data, menu } = escenarioDespensa();
            const d0 = confirmarMenu(despensaVacia(), menu, HOY);
            const fila = calcularListaNeta(data, menu, 1, d0).find((f) => f.foodId === "f_manzana");
            const d1 = marcarComprado(d0, fila, data.foods.find((f) => f.id === "f_manzana"));
            const tachada = calcularListaNeta(data, menu, 1, d1).find((f) => f.foodId === "f_manzana");
            const d2 = desmarcarComprado(d1, tachada);
            return comparar(
              { tengoGuardado: d1.items[0]?.tengo, sinGramos: d1.items[0]?.gramos === undefined, comprado: tachada.comprado, itemsAlDestachar: d2.items.length },
              { tengoGuardado: true, sinGramos: true, comprado: true, itemsAlDestachar: 0 }
            );
          },
        },
        {
          nombre: "Confirmar guarda el menú; generar otro lo deja en borrador y «Deshacer» lo recupera",
          ejecutar: () => {
            const { menu } = escenarioDespensa();
            const d = confirmarMenu(despensaVacia(), menu, HOY);
            const otro = menu.map((s) => ({ ...s, id: "n_" + s.id }));
            const sinConfirmar = quitarConfirmacion({ ...d, compras: { f_pollo: { itemId: "x", delta: 1, creado: false } } });
            return comparar(
              { guardado: d.menuConfirmadoId, confirmado: menuEstaConfirmado(d, menu), conOtro: menuEstaConfirmado(d, otro), alDeshacer: menuEstaConfirmado(d, menu), quitado: menuEstaConfirmado(sinConfirmar, menu), compras: JSON.stringify(sinConfirmar.compras) },
              { guardado: menu[0].id, confirmado: true, conOtro: false, alDeshacer: true, quitado: false, compras: "{}" }
            );
          },
        },
        {
          nombre: "Confirmar otro menú solo conserva los consumos de hoy y los de ese menú, y empieza la lista de cero",
          ejecutar: () => {
            const { menu } = escenarioDespensa();
            const d = confirmarMenu({
              ...despensaVacia(),
              consumos: {
                "2026-10-01": { Comida: { slotId: "de-otro-menu", items: [] } },
                "2026-10-10": { Comida: { slotId: menu[0].id, items: [] } },
                [HOY]: { Cena: { slotId: "de-otro-menu", items: [] } },
              },
              compras: { f_pollo: { itemId: "x", delta: 100, creado: false } },
            }, menu, HOY);
            return comparar({ fechas: Object.keys(d.consumos).sort().join(","), compras: JSON.stringify(d.compras) }, { fechas: `2026-10-10,${HOY}`, compras: "{}" });
          },
        },
        {
          nombre: "Borrar un alimento del catálogo lo quita de la despensa, de las compras y de los consumos",
          ejecutar: () => {
            const d = quitarAlimento({
              ...despensaVacia(),
              items: [{ id: "p", foodId: "f_pollo", zona: "nevera", gramos: 100 }, { id: "a", foodId: "f_arroz", zona: "despensa", gramos: 500 }],
              compras: { f_pollo: { itemId: "p", delta: 100, creado: false } },
              consumos: { [HOY]: { Comida: { slotId: "s", items: [{ itemId: "p", foodId: "f_pollo", zona: "nevera", gramos: 50 }, { itemId: "a", foodId: "f_arroz", zona: "despensa", gramos: 80 }] } } },
            }, "f_pollo");
            return comparar(
              { items: d.items.map((i) => i.foodId).join(","), compras: JSON.stringify(d.compras), consumo: d.consumos[HOY].Comida.items.map((x) => x.foodId).join(",") },
              { items: "f_arroz", compras: "{}", consumo: "f_arroz" }
            );
          },
        },
        {
          nombre: "Añadir: zona por defecto según la carpeta, se suma en la misma zona y se junta al mover",
          ejecutar: () => {
            const { data } = escenarioDespensa();
            const food = (id) => data.foods.find((f) => f.id === id);
            let d = anadirItem(despensaVacia(), food("f_pollo"), { gramos: 200 });
            d = anadirItem(d, food("f_pollo"), { gramos: 300 });
            d = anadirItem(d, food("f_arroz"), { gramos: 1000 });
            d = anadirItem(d, food("f_manzana"));
            d = anadirItem(d, food("f_pollo"), { zona: "congelador", gramos: 100 });
            const enCongelador = d.items.find((i) => i.zona === "congelador").id;
            const movido = editarItem(d, enCongelador, { zona: "nevera" });
            return comparar(
              {
                resumen: d.items.map((i) => `${i.foodId}@${i.zona}:${i.gramos ?? (i.tengo ? "tengo" : "no")}`).join(","),
                trasMover: movido.items.filter((i) => i.foodId === "f_pollo").map((i) => `${i.zona}:${i.gramos}`).join(","),
              },
              { resumen: "f_pollo@nevera:500,f_arroz@despensa:1000,f_manzana@nevera:tengo,f_pollo@congelador:100", trasMover: "nevera:600" }
            );
          },
        },
        {
          nombre: "Migración de despensa-v1: sin nada guardado, con campos que faltan, y dos pasadas",
          ejecutar: () => {
            const vacia = migrarDespensa(null);
            const { despensa: d, changed } = migrarDespensa({ items: [{ foodId: "f_x", gramos: "150" }, { gramos: 3 }], menuConfirmadoId: "m1" });
            const segunda = migrarDespensa(JSON.parse(JSON.stringify(d)));
            return comparar(
              {
                vacia: JSON.stringify(vacia.despensa), vaciaCambia: vacia.changed, changed, version: d.version, items: d.items.length,
                gramos: d.items[0].gramos, zona: d.items[0].zona, conId: !!d.items[0].id, menu: d.menuConfirmadoId,
                consumos: JSON.stringify(d.consumos), compras: JSON.stringify(d.compras), segundaCambia: segunda.changed,
              },
              {
                vacia: JSON.stringify(despensaVacia()), vaciaCambia: true, changed: true, version: 1, items: 1,
                gramos: 150, zona: "despensa", conId: true, menu: "m1", consumos: "{}", compras: "{}", segundaCambia: false,
              }
            );
          },
        },
      ],
    },
    {
      // Añadido en octubre de 2026 con tres mejoras de la despensa (logica/despensa.js): la fecha de la
      // última vez que se tocó cada cosa (para el futuro aviso F2), el aviso de «queda poco» con la
      // ración media de los platos del usuario, y la lista de limpieza de debajo del fregadero. Usa el
      // mismo escenarioDespensa() que el grupo anterior (pollo: 150 g en «Pollo» y 100 g en el bocadillo;
      // pan: 60 g en la tostada y 80 g en el bocadillo).
      grupo: "Despensa: queda poco, limpieza y fechas",
      casos: [
        {
          nombre: "Fecha de cambio: se pone a lo nuevo y a lo que cambió; lo que no cambió conserva la suya",
          ejecutar: () => {
            const antes = conItems([
              { id: "a", foodId: "f_pollo", zona: "nevera", gramos: 100, actualizado: "2026-10-01" },
              { id: "b", foodId: "f_arroz", zona: "despensa", gramos: 200, actualizado: "2026-10-01" },
            ]);
            const despues = conItems([
              { id: "a", foodId: "f_pollo", zona: "nevera", gramos: 50, actualizado: "2026-10-01" },
              { id: "b", foodId: "f_arroz", zona: "despensa", gramos: 200, actualizado: "2026-10-01" },
              { id: "c", foodId: "f_pan", zona: "despensa", gramos: 300 },
            ]);
            const sellada = sellarCambios(antes, despues, HOY);
            const movido = sellarCambios(despues, editarItem(despues, "b", { zona: "congelador" }), HOY);
            return comparar(
              { fechas: sellada.items.map((i) => `${i.id}:${i.actualizado}`).join(","), alMover: movido.items.find((i) => i.id === "b").actualizado },
              { fechas: `a:${HOY},b:2026-10-01,c:${HOY}`, alMover: HOY }
            );
          },
        },
        {
          nombre: "Migración: lista de limpieza vacía y la fecha de hoy a lo que no tenía; una segunda pasada no cambia nada",
          ejecutar: () => {
            const { despensa: d, changed } = migrarDespensa({
              items: [
                { id: "a", foodId: "f_x", zona: "nevera", gramos: 100 },
                { id: "b", foodId: "f_y", zona: "nevera", gramos: 50, actualizado: "2026-10-01" },
              ],
            }, HOY);
            const segunda = migrarDespensa(JSON.parse(JSON.stringify(d)), "2026-12-31");
            return comparar(
              { changed, a: d.items[0].actualizado, b: d.items[1].actualizado, limpieza: JSON.stringify(d.limpieza), segundaCambia: segunda.changed },
              { changed: true, a: HOY, b: "2026-10-01", limpieza: "[]", segundaCambia: false }
            );
          },
        },
        {
          nombre: "Ración media: la de los platos del usuario y, si no la usa ninguno, la de su carpeta",
          ejecutar: () => {
            const { data } = escenarioDespensa();
            const conExtra = { ...data, foods: [...data.foods, { id: "f_nueces", name: "Nueces", categoria: "frutos_secos" }, { id: "f_raro", name: "Raro" }] };
            // Pollo: (150 + 100) / 2 = 125. Pan: (60 + 80) / 2 = 70. Arroz: 80. Nueces: sin platos,
            // 30 g de su carpeta. Raro: sin platos ni carpeta, sin mínimo.
            return comparar(
              { pollo: racionMedia("f_pollo", conExtra), pan: racionMedia("f_pan", conExtra), arroz: racionMedia("f_arroz", conExtra), nueces: racionMedia("f_nueces", conExtra), raro: racionMedia("f_raro", conExtra) },
              { pollo: 125, pan: 70, arroz: 80, nueces: 30, raro: null }
            );
          },
        },
        {
          nombre: "Queda poco: menos de una ración es «poco», nada es «acabado» y las zonas se suman",
          ejecutar: () => {
            const { data } = escenarioDespensa();
            const d = conItems([
              { id: "1", foodId: "f_pollo", zona: "nevera", gramos: 60 },
              { id: "2", foodId: "f_pollo", zona: "congelador", gramos: 40 },
              { id: "3", foodId: "f_arroz", zona: "despensa", gramos: 200 },
              { id: "4", foodId: "f_pan", zona: "despensa", gramos: 0 },
              { id: "5", foodId: "f_tomate", zona: "nevera", tengo: false },
              { id: "6", foodId: "f_manzana", zona: "nevera", tengo: true },
              { id: "7", foodId: "f_queso", zona: "nevera", gramos: 30 },
            ]);
            // Pollo: 60 + 40 = 100 < 125 → poco. Arroz: 200 ≥ 80. Pan: 0 → acabado. Tomate: se acabó.
            // Manzana: queda. Queso: 30, justo una ración, da para una vez.
            const alertas = alertasStock(d, data);
            const pollo = alertas.find((a) => a.foodId === "f_pollo") || {};
            return comparar(
              { lista: alertas.map((a) => `${a.nombre}:${a.estado}`).join(","), polloGramos: pollo.gramos, polloRacion: pollo.racion, polloZonas: (pollo.zonas || []).join(",") },
              { lista: "Pan:acabado,Pechuga de pollo:poco,Tomate:acabado", polloGramos: 100, polloRacion: 125, polloZonas: "nevera,congelador" }
            );
          },
        },
        {
          nombre: "Limpieza: añadir sin repetir, tachar, volver a apuntar lo comprado, quitar y vaciar lo comprado",
          ejecutar: () => {
            let d = anadirLimpieza(despensaVacia(), "  Lavavajillas ");
            d = anadirLimpieza(d, "lavavajillas");
            d = anadirLimpieza(d, "Lejía");
            const lavavajillas = d.limpieza[0].id;
            d = alternarLimpieza(d, lavavajillas);
            const tachado = d.limpieza[0].comprado;
            d = anadirLimpieza(d, "LAVAVAJILLAS");
            const otraVezPendiente = !d.limpieza[0].comprado;
            d = alternarLimpieza(d, lavavajillas);
            const sinComprado = quitarLimpiezaComprada(d);
            const vacia = quitarLimpieza(sinComprado, sinComprado.limpieza[0].id);
            return comparar(
              { nombres: d.limpieza.map((c) => c.nombre).join(","), tachado, otraVezPendiente, trasVaciar: sinComprado.limpieza.map((c) => c.nombre).join(","), alFinal: vacia.limpieza.length, enBlanco: anadirLimpieza(despensaVacia(), "   ").limpieza.length },
              { nombres: "Lavavajillas,Lejía", tachado: true, otraVezPendiente: true, trasVaciar: "Lejía", alFinal: 0, enBlanco: 0 }
            );
          },
        },
      ],
    },
    {
      // Añadido en octubre de 2026 con la Fase B de la despensa (la nevera dibujada, logica/nevera.js):
      // dónde va cada alimento y con qué dibujo. Los nombres son los del catálogo base (FOODS_SEED) o
      // casos típicos escritos a mano; lo esperado es lo que haría cualquiera al guardar la compra.
      grupo: "Colocación en la nevera",
      casos: [
        {
          nombre: "Bebidas por el nombre: la leche y el gazpacho sí; un queso de leche o el tomate frito, no",
          ejecutar: () => comparar(
            { leche: esBebida("Leche entera"), gazpacho: esBebida("Gazpacho"), cafe: esBebida("Café con leche (taza 200 ml)"), queso: esBebida("Queso de leche cruda"), tomateFrito: esBebida("Tomate frito") },
            { leche: true, gazpacho: true, cafe: true, queso: false, tomateFrito: false }
          ),
        },
        {
          nombre: "Nevera: bebidas y huevos a la puerta, lácteos, carne y embutido en sus baldas, fruta y verdura al cajón",
          ejecutar: () => {
            const f = (id) => FOODS_SEED.find((x) => x.id === id);
            const leche = { id: "x", name: "Leche semidesnatada", categoria: "lacteos" };
            return comparar(
              {
                leche: huecoDe(leche, "nevera"), huevo: huecoDe(f("f_huevo"), "nevera"), yogur: huecoDe(f("f_yogur_prot"), "nevera"),
                pollo: huecoDe(f("f_pechuga_pollo"), "nevera"), salmon: huecoDe(f("f_salmon"), "nevera"), pavo: huecoDe(f("f_pavo"), "nevera"),
                tomate: huecoDe(f("f_tomate"), "nevera"), manzana: huecoDe(f("f_manzana"), "nevera"), gnocchi: huecoDe(f("f_gnocchi"), "nevera"),
              },
              { leche: "puerta", huevo: "puerta", yogur: "lacteos", pollo: "carne", salmon: "carne", pavo: "embutido", tomate: "frutaVerdura", manzana: "frutaVerdura", gnocchi: "otros" }
            );
          },
        },
        {
          nombre: "Despensa y congelador: cada cosa en su estante o cajón",
          ejecutar: () => {
            const f = (id) => FOODS_SEED.find((x) => x.id === id);
            return comparar(
              {
                arroz: huecoDe(f("f_arroz_basmati"), "despensa"), garbanzos: huecoDe(f("f_garbanzos_cocidos"), "despensa"), atun: huecoDe(f("f_atun"), "despensa"),
                aceite: huecoDe(f("f_aove"), "despensa"), pan: huecoDe(f("f_pan_molde"), "despensa"), patata: huecoDe(f("f_patata"), "despensa"),
                polloCongelado: huecoDe(f("f_pechuga_pollo"), "congelador"), fresas: huecoDe(f("f_fresas"), "congelador"), panCongelado: huecoDe(f("f_pan_molde"), "congelador"),
                sinAlimento: huecoDe(null, "nevera"),
              },
              { arroz: "cereales", garbanzos: "conservas", atun: "conservas", aceite: "aceites", pan: "pan", patata: "pan", polloCongelado: "carne", fresas: "frutaVerdura", panCongelado: "otros", sinAlimento: "otros" }
            );
          },
        },
        {
          nombre: "Dibujo de cada alimento: por el nombre (con o sin tildes) y, si no dice nada, por su carpeta",
          ejecutar: () => {
            const f = (id) => FOODS_SEED.find((x) => x.id === id);
            return comparar(
              {
                platano: formaDe(f("f_platano")), sinTilde: formaDe({ name: "platano maduro", categoria: "frutas" }), sardinas: formaDe(f("f_sardinas")),
                panBrioche: formaDe(f("f_pan_brioche")), ensalada: formaDe(f("f_ensalada")), pera: formaDe(f("f_pera")), pavo: formaDe(f("f_pavo")),
                patatasFritas: formaDe({ name: "Patatas fritas", categoria: "snacks_procesados" }), raro: formaDe({ name: "Cosa rara", categoria: "nada" }), sinAlimento: formaDe(null),
              },
              { platano: "platano", sinTilde: "platano", sardinas: "lata", panBrioche: "pan", ensalada: "lechuga", pera: "fruta", pavo: "fiambre", patatasFritas: "snack", raro: "generico", sinAlimento: "generico" }
            );
          },
        },
        {
          nombre: "Repartir en huecos: en orden, con las baldas vacías que siempre se pintan y «otros» solo si hace falta",
          ejecutar: () => {
            const foods = FOODS_SEED;
            const items = [
              { id: "1", foodId: "f_yogur_prot", zona: "nevera", gramos: 500 },
              { id: "2", foodId: "f_huevo", zona: "nevera", gramos: 360 },
              { id: "3", foodId: "f_queso_cottage", zona: "nevera", gramos: 200 },
              { id: "4", foodId: "f_arroz_basmati", zona: "despensa", gramos: 1000 },
            ];
            const nevera = repartirEnHuecos(items, foods, "nevera");
            const conOtros = repartirEnHuecos([...items, { id: "5", foodId: "f_gnocchi", zona: "nevera", gramos: 400 }], foods, "nevera");
            return comparar(
              {
                huecos: nevera.map((h) => h.clave).join(","),
                lacteos: nevera.find((h) => h.clave === "lacteos").entradas.map((e) => e.item.id).join(","),
                puerta: nevera.find((h) => h.clave === "puerta").entradas.map((e) => e.forma).join(","),
                conOtros: conOtros.map((h) => h.clave).join(","),
                despensa: repartirEnHuecos(items, foods, "despensa").map((h) => `${h.clave}:${h.entradas.length}`).join(","),
              },
              {
                huecos: "puerta,lacteos,carne,embutido,frutaVerdura", lacteos: "3,1", puerta: "huevos",
                conOtros: "puerta,lacteos,carne,embutido,otros,frutaVerdura", despensa: "cereales:1,conservas:0,aceites:0,pan:0",
              }
            );
          },
        },
      ],
    },
    grupoNavegacion(mod),
    grupoEntrenoBiblioteca(),
    grupoEntrenoNombres(),
    grupoEntrenoCalculos(),
    grupoEntrenoSesion(),
  ];
}

// Fecha fija para los casos de la despensa (los consumos se guardan por fecha).
const HOY = "2026-10-15";

function conItems(items) {
  return { ...despensaVacia(), items };
}

// Escenario de la despensa. Necesidades de cada comida (gramos ya con sus raciones):
// - m0 · S1 lunes Comida: Pollo 150 + Arroz 80 + Tomate (verdura con alimento, sin cantidad).
// - m1 · S1 lunes Cena: Bocadillo de pollo × 1,5 → Pan 120 + Pollo 150.
// - m2 · S1 martes Desayuno: Tostada con queso → Pan 60 + Queso 30 + Manzana (fruta, sin cantidad).
// - m3 · S1 martes Comida: Pollo × 2 = 300 + Arroz × 0,5 = 40 + Lechuga (verdura sin alimento).
// - m4 · S2 lunes Comida: Pollo 150 + Arroz 80 + Tomate.
// Semana 1: pollo 600, arroz 120, pan 180, queso 30. Ciclo completo: pollo 750, arroz 200.
function escenarioDespensa() {
  const data = {
    foods: [
      { id: "f_pollo", name: "Pechuga de pollo", categoria: "proteinas", kcal: 165, prot: 31, fat: 3.6, carb: 0 },
      { id: "f_arroz", name: "Arroz", categoria: "carbohidratos", kcal: 353, prot: 8, fat: 1, carb: 78 },
      { id: "f_pan", name: "Pan", categoria: "panes", kcal: 265, prot: 9, fat: 3.5, carb: 48 },
      { id: "f_queso", name: "Queso", categoria: "lacteos", kcal: 285, prot: 21, fat: 21, carb: 1 },
      { id: "f_tomate", name: "Tomate", categoria: "vegetales", kcal: 18, prot: 0.9, fat: 0.2, carb: 3.9 },
      { id: "f_manzana", name: "Manzana", categoria: "frutas", kcal: 52, prot: 0.3, fat: 0.2, carb: 14 },
    ],
    ingredients: [
      { id: "ing_pollo", name: "Pollo", category: "proteina", foodId: "f_pollo", gramos: 150 },
      { id: "ing_arroz", name: "Arroz", category: "carbo", foodId: "f_arroz", gramos: 80 },
      { id: "ing_tomate", name: "Tomate", category: "verdura", foodId: "f_tomate", gramos: 150 },
      { id: "ing_lechuga", name: "Lechuga", category: "verdura" },
      {
        id: "ing_tostada", name: "Tostada con queso", category: "desayuno",
        composicion: [{ id: "c1", foodId: "f_pan", gramos: 60 }, { id: "c2", foodId: "f_queso", gramos: 30 }, { id: "c3", foodId: "f_manzana", gramos: 150 }],
      },
      {
        id: "ing_bocadillo", name: "Bocadillo de pollo", category: "cerrado",
        composicion: [{ id: "c4", foodId: "f_pan", gramos: 80 }, { id: "c5", foodId: "f_pollo", gramos: 100 }],
      },
    ],
  };
  const menu = [
    { id: "m0", week: 1, day: "Lunes", mealType: "Comida", protein: "Pollo", carbo: "Arroz", verdura: "Tomate", raciones: {} },
    { id: "m1", week: 1, day: "Lunes", mealType: "Cena", closedDish: "Bocadillo de pollo", raciones: { closedDish: 1.5 } },
    { id: "m2", week: 1, day: "Martes", mealType: "Desayuno", item: "Tostada con queso", raciones: {} },
    { id: "m3", week: 1, day: "Martes", mealType: "Comida", protein: "Pollo", carbo: "Arroz", verdura: "Lechuga", raciones: { protein: 2, carbo: 0.5 } },
    { id: "m4", week: 2, day: "Lunes", mealType: "Comida", protein: "Pollo", carbo: "Arroz", verdura: "Tomate", raciones: {} },
  ];
  return { data, menu };
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

// ---------- Navegación por áreas (octubre de 2026) ----------
// La descripción de ui/marco/navegacion.js se escribe a mano (ver su cabecera), así que estas pruebas
// son lo que evita que una pantalla nueva se quede sin área, sin pestaña y sin entrada en el menú.

// Prefijos de las claves de i18n creadas para la navegación por áreas y el módulo de entreno (anexo B
// del plan): todas deben existir en los cinco idiomas, porque en pantalla una que falte no se nota.
const PREFIJOS_NUEVOS = [
  "area.", "barra.", "header.tuEntreno", "header.tuCuerpo", "header.tuCuenta", "entreno.", "musculo.", "equipo.",
  "tipoEjercicio.", "tipoSerie.", "cuerpo.", "feedback.ejercicio",
];

function clavesSinTraducir(claves) {
  const faltan = [];
  claves.forEach((clave) => {
    IDIOMAS_DISPONIBLES.forEach(({ key }) => { if (!tieneTraduccion(key, clave)) faltan.push(`${key}:${clave}`); });
  });
  return faltan;
}

function grupoNavegacion(mod) {
  const { AREAS, COMUNES, areaDe, pestanaDe, DESTINOS } = mod;
  const pestanas = AREAS.flatMap((a) => a.pestanas);
  return {
    grupo: "Navegación por áreas",
    casos: [
      {
        nombre: "Todo destino está en una pestaña, en el menú de un área o en la zona común",
        ejecutar: () => {
          const huerfanos = DESTINOS.filter((d) =>
            !pestanas.some((p) => p.incluye.includes(d)) &&
            !AREAS.some((a) => a.menu.some((m) => m.destino === d)) &&
            !COMUNES.some((c) => c.destino === d));
          return comparar({ huerfanos: huerfanos.join(", ") }, { huerfanos: "" });
        },
      },
      {
        nombre: "Todo destino de pestañas, menús y zona común existe en PANTALLAS",
        ejecutar: () => {
          const usados = [
            ...pestanas.flatMap((p) => [p.destino, ...p.incluye]),
            ...AREAS.flatMap((a) => a.menu.map((m) => m.destino)),
            ...COMUNES.map((c) => c.destino),
          ];
          const inexistentes = [...new Set(usados.filter((d) => !DESTINOS.includes(d)))];
          return comparar({ inexistentes: inexistentes.join(", ") }, { inexistentes: "" });
        },
      },
      {
        nombre: "areaDe y pestanaDe de algunos destinos conocidos",
        ejecutar: () => comparar(
          {
            proteina: areaDe("proteina"), pestanaProteina: pestanaDe("proteina"), ajustes: areaDe("ajustes"),
            peso: areaDe("perfil-peso"), cocinaVitro: pestanaDe("cocinar-desde-cocina"),
          },
          { proteina: "fooddraft", pestanaProteina: "comidas", ajustes: null, peso: "cuerpo", cocinaVitro: "despensa" }
        ),
      },
      {
        nombre: "Ningún destino aparece en dos pestañas",
        ejecutar: () => {
          const vistos = {};
          const repetidos = [];
          pestanas.forEach((p) => p.incluye.forEach((d) => { if (vistos[d]) repetidos.push(d); vistos[d] = true; }));
          return comparar({ repetidos: repetidos.join(", ") }, { repetidos: "" });
        },
      },
      {
        nombre: "La raíz de cada pestaña está en su propio «incluye»",
        ejecutar: () => {
          const mal = pestanas.filter((p) => !p.incluye.includes(p.destino)).map((p) => p.clave);
          return comparar({ mal: mal.join(", ") }, { mal: "" });
        },
      },
      {
        nombre: "Traducciones completas de lo nuevo (navegación y prefijos nuevos, cinco idiomas)",
        ejecutar: () => {
          const deNavegacion = [
            ...AREAS.flatMap((a) => [a.etiqueta, a.titulo, ...a.pestanas.map((p) => p.etiqueta), ...a.menu.map((m) => m.etiqueta)]),
            ...COMUNES.flatMap((c) => [c.etiqueta, c.etiquetaPremium].filter(Boolean)),
            "header.tuCuenta",
          ];
          const porPrefijo = clavesDeIdioma("es").filter((k) => PREFIJOS_NUEVOS.some((p) => k.startsWith(p)));
          const faltan = clavesSinTraducir([...new Set([...deNavegacion, ...porPrefijo])]);
          return comparar({ faltan: faltan.join(", ") }, { faltan: "" });
        },
      },
    ],
  };
}

// ---------- Entreno (octubre de 2026) ----------
// Valores esperados calculados a mano a partir del anexo A del plan (local/ideas/gimnasio/04-plan-de-ejecucion.md).

// Nombres mínimos para probar la búsqueda sin depender del módulo de nombres; el resto cae a su id con
// espacios («ex press banca barra»), que no contiene ninguna de las palabras buscadas aquí salvo donde se
// espera.
const NOMBRES_PRUEBA = {
  ex_jalon_pecho: "Jalón al pecho (polea)",
  ex_jalon_estrecho: "Jalón con agarre estrecho",
  ex_press_inclinado_barra: "Press inclinado con barra",
  ex_press_inclinado_mancuernas: "Press inclinado con mancuernas",
  ex_curl_inclinado: "Curl inclinado con mancuernas",
};
const nombrePrueba = (e) => NOMBRES_PRUEBA[e.id] || e.nombre || e.id.replace(/_/g, " ");

function grupoEntrenoBiblioteca() {
  const lista = listaEjercicios(null);
  const ids = (r) => r.map((e) => e.id).sort().join(",");
  return {
    grupo: "Entreno: biblioteca",
    casos: [
      {
        nombre: "80 ejercicios semilla con ids únicos que empiezan por ex_",
        ejecutar: () => comparar(
          { total: EJERCICIOS_SEMILLA.length, unicos: new Set(EJERCICIOS_SEMILLA.map((e) => e.id)).size, malos: EJERCICIOS_SEMILLA.filter((e) => !e.id.startsWith("ex_")).length },
          { total: 80, unicos: 80, malos: 0 }
        ),
      },
      {
        nombre: "Todo tipo, músculo, secundario y equipo pertenece a su lista",
        ejecutar: () => {
          const malos = EJERCICIOS_SEMILLA.filter((e) =>
            !TIPOS_EJERCICIO.includes(e.tipo) || !GRUPOS_MUSCULARES.includes(e.musculo) || !EQUIPOS.includes(e.equipo) ||
            e.secundarios.some((m) => !GRUPOS_MUSCULARES.includes(m) || m === "cardio")).map((e) => e.id);
          return comparar({ malos: malos.join(",") }, { malos: "" });
        },
      },
      {
        nombre: "camposDeTipo de asistido y de distancia + duración",
        ejecutar: () => comparar(
          { asistido: camposDeTipo("asistido_reps").join(","), distancia: camposDeTipo("distancia_duracion").join(","), reps: camposDeTipo("reps").join(",") },
          { asistido: "kg,reps", distancia: "km,seg", reps: "reps" }
        ),
      },
      {
        nombre: "Búsqueda: sin tilde, por prefijos, con una errata y sin resultados",
        ejecutar: () => comparar(
          {
            jalon: buscarEjercicios(lista, "jalon", nombrePrueba).some((e) => e.id === "ex_jalon_pecho"),
            pressInclin: ids(buscarEjercicios(lista, "press inclin", nombrePrueba)),
            errata: buscarEjercicios(lista, "jalon pexho", nombrePrueba).map((e) => e.id)[0],
            nada: buscarEjercicios(lista, "xyz", nombrePrueba).length,
          },
          { jalon: true, pressInclin: "ex_press_inclinado_barra,ex_press_inclinado_mancuernas", errata: "ex_jalon_pecho", nada: 0 }
        ),
      },
      {
        nombre: "Filtro por músculo principal: bíceps devuelve 6",
        ejecutar: () => comparar({ n: buscarEjercicios(lista, "", nombrePrueba, { musculo: "biceps" }).length }, { n: 6 }),
      },
      {
        nombre: "posibleDuplicado(«Jalon al pecho») avisa del jalón de la biblioteca",
        ejecutar: () => {
          const d = posibleDuplicado("Jalon al pecho", lista, nombrePrueba);
          const n = posibleDuplicado("Remo en mi máquina rara", lista, nombrePrueba);
          return comparar({ duplicado: d && d.id, nuevo: n }, { duplicado: "ex_jalon_pecho", nuevo: null });
        },
      },
      {
        nombre: "listaEjercicios oculta un propio archivado y aplica el favorito de personalizados",
        ejecutar: () => {
          const l = listaEjercicios({
            propios: [
              { id: "exp_1", nombre: "Remo en mi máquina", tipo: "peso_reps", musculo: "espalda_alta", secundarios: [], equipo: "maquina", archivado: false },
              { id: "exp_2", nombre: "Viejo", tipo: "reps", musculo: "pecho", secundarios: [], equipo: "otro", archivado: true },
            ],
            personalizados: { ex_jalon_pecho: { favorito: true, notaFija: "Agarre abierto" } },
          });
          const jalon = l.find((e) => e.id === "ex_jalon_pecho");
          return comparar(
            { total: l.length, propio: l.some((e) => e.id === "exp_1" && e.propio), archivado: l.some((e) => e.id === "exp_2"), favorito: jalon.favorito, nota: jalon.notaFija },
            { total: 81, propio: true, archivado: false, favorito: true, nota: "Agarre abierto" }
          );
        },
      },
    ],
  };
}

function grupoEntrenoNombres() {
  const lista = listaEjercicios(null);
  return {
    grupo: "Entreno: nombres de los ejercicios",
    casos: [
      {
        nombre: "Todo ejercicio de la semilla tiene nombre en los cinco idiomas (y no sobra ninguno)",
        ejecutar: () => {
          const faltan = [];
          IDIOMAS_DISPONIBLES.forEach(({ key }) => EJERCICIOS_SEMILLA.forEach((e) => {
            if (!NOMBRES_EJERCICIOS[key] || !NOMBRES_EJERCICIOS[key][e.id]) faltan.push(`${key}:${e.id}`);
          }));
          const sobran = Object.keys(NOMBRES_EJERCICIOS.es).filter((id) => !EJERCICIOS_SEMILLA.some((e) => e.id === id));
          return comparar({ faltan: faltan.join(","), sobran: sobran.join(",") }, { faltan: "", sobran: "" });
        },
      },
      {
        nombre: "nombreEjercicio: propio, de la semilla en euskera, id inexistente en euskera y desconocido",
        ejecutar: () => comparar(
          {
            propio: nombreEjercicio({ id: "exp_1", nombre: "Remo en mi máquina", propio: true }, "en"),
            eu: nombreEjercicio("ex_plancha", "eu"),
            cae: nombreEjercicio("ex_plancha", "xx"),
            desconocido: nombreEjercicio("ex_no_existe", "eu"),
          },
          { propio: "Remo en mi máquina", eu: "Plantxa", cae: "Plancha", desconocido: "ex_no_existe" }
        ),
      },
      {
        nombre: "Búsqueda con los nombres reales: «press inclin» encuentra los dos press inclinados",
        ejecutar: () => {
          const r = buscarEjercicios(lista, "press inclin", (e) => nombreEjercicio(e, "es")).map((e) => e.id).sort();
          return comparar({ r: r.join(",") }, { r: "ex_press_inclinado_barra,ex_press_inclinado_mancuernas" });
        },
      },
    ],
  };
}

// `ejercicioDe` sintético para los cálculos (no depende de la biblioteca).
const EJERCICIOS_PRUEBA = {
  banca: { tipo: "peso_reps", musculo: "pecho", secundarios: ["triceps", "hombros"] },
  curl: { tipo: "peso_reps", musculo: "biceps", secundarios: ["antebrazos"] },
  cinta: { tipo: "distancia_duracion", musculo: "cardio", secundarios: [] },
};
const ejercicioPrueba = (id) => EJERCICIOS_PRUEBA[id] || null;
const serieP = (tipo, kg, reps, hecha = true, extra = {}) => ({ id: Math.random().toString(36).slice(2), tipo, kg, reps, seg: null, km: null, rir: null, hecha, ...extra });

function grupoEntrenoCalculos() {
  return {
    grupo: "Entreno: cálculos",
    casos: [
      {
        nombre: "1RM estimado (Epley, con RIR) y fiabilidad",
        ejecutar: () => comparar(
          { uno: e1rm(100, 1), cinco: e1rm(100, 5), conRir: e1rm(59, 11, 2), cero: e1rm(60, 0), fiable: e1rmFiable(10, 2), noFiable: e1rmFiable(11, 2) },
          // 100 × (1 + 5/30) = 116,67 → 116,7; 59 × (1 + 13/30) = 84,57 → 84,6.
          { uno: 100, cinco: 116.7, conRir: 84.6, cero: null, fiable: true, noFiable: false }
        ),
      },
      {
        nombre: "Volumen: solo series hechas que no son de calentamiento",
        ejecutar: () => {
          const sesion = { ejercicios: [{ ejercicioId: "banca", series: [serieP("normal", 60, 10), serieP("calentamiento", 40, 10), serieP("normal", 60, 8, false)] }] };
          return comparar({ v: volumenSesion(sesion, ejercicioPrueba, 80) }, { v: 600 });
        },
      },
      {
        nombre: "Volumen por tipo: peso corporal, lastre, asistido y duración",
        ejecutar: () => comparar(
          {
            reps: volumenSerie(serieP("normal", null, 10), "reps", 80),
            repsSinPeso: volumenSerie(serieP("normal", null, 10), "reps", null),
            lastre: volumenSerie(serieP("normal", 10, 5), "lastre_reps", 80),
            asistido: volumenSerie(serieP("normal", 30, 8), "asistido_reps", 80),
            asistidoDeMas: volumenSerie(serieP("normal", 100, 8), "asistido_reps", 80),
            duracion: volumenSerie(serieP("normal", null, null, true, { seg: 60 }), "duracion", 80),
          },
          // (80 + 10) × 5 = 450; (80 − 30) × 8 = 400; máx(0, 80 − 100) × 8 = 0.
          { reps: 800, repsSinPeso: 0, lastre: 450, asistido: 400, asistidoDeMas: 0, duracion: 0 }
        ),
      },
      {
        nombre: "duracionEfectiva descuenta las pausas (también una aún abierta)",
        ejecutar: () => {
          const h = (hm) => `2026-10-23T${hm}:00.000Z`;
          const s1 = { inicio: h("10:00"), fin: null, pausas: [{ inicio: h("10:20"), fin: h("10:30") }] };
          const s2 = { ...s1, pausas: [...s1.pausas, { inicio: h("10:50"), fin: null }] };
          return comparar({ una: duracionEfectiva(s1, h("11:00")), dos: duracionEfectiva(s2, h("11:00")) }, { una: 3000, dos: 2400 });
        },
      },
      {
        nombre: "Series por músculo: principal 1, secundarios 0,5, sin calentamiento ni cardio",
        ejecutar: () => {
          const sesion = {
            inicio: "2026-10-23T17:00:00.000Z",
            ejercicios: [
              { ejercicioId: "banca", series: [serieP("normal", 60, 10), serieP("normal", 60, 10), serieP("fallo", 60, 8), serieP("calentamiento", 40, 10)] },
              { ejercicioId: "curl", series: [serieP("normal", 30, 10), serieP("normal", 30, 9)] },
              { ejercicioId: "cinta", series: [serieP("normal", null, null, true, { km: 3, seg: 1200 })] },
            ],
          };
          const r = seriesPorMusculo([sesion], ejercicioPrueba, null, null);
          return comparar({ ...r, cardio: r.cardio ?? 0 }, { pecho: 3, triceps: 1.5, hombros: 1.5, biceps: 2, antebrazos: 1, cardio: 0 });
        },
      },
      {
        nombre: "validarSerie: peso alto con y sin histórico, repeticiones de más y a cero",
        ejecutar: () => {
          const avisos = (v, h) => validarSerie(v, "peso_reps", h).avisos.join(",");
          return comparar(
            {
              a250: avisos({ kg: 250, reps: 5 }, { pesoMax: 100 }), a251: avisos({ kg: 251, reps: 5 }, { pesoMax: 100 }),
              a1005: avisos({ kg: 1005, reps: 5 }, { pesoMax: 100 }), s400: avisos({ kg: 400, reps: 5 }, {}),
              s401: avisos({ kg: 401, reps: 5 }, {}), reps101: avisos({ kg: 60, reps: 101 }, { pesoMax: 100 }),
              reps0: avisos({ kg: 60, reps: 0 }, { pesoMax: 100 }),
            },
            { a250: "", a251: "peso_alto", a1005: "peso_alto", s400: "", s401: "peso_alto", reps101: "reps_altas", reps0: "sin_reps" }
          );
        },
      },
      {
        nombre: "Récords: 62,5 × 6 bate solo el peso máximo; 62,5 × 12 bate también el 1RM",
        ejecutar: () => {
          const previos = { pesoMax: 60, e1rm: 80 };
          const batidos = (reps) => recordsBatidos(previos, mejoresDeEjercicioEnSesion({ series: [serieP("normal", 62.5, reps)] }, "peso_reps", 80)).map((r) => r.clave).join(",");
          // 1RM de 62,5 × 6 = 62,5 × 1,2 = 75 (< 80); de 62,5 × 12 = 62,5 × 1,4 = 87,5 (> 80).
          return comparar({ seis: batidos(6), doce: batidos(12) }, { seis: "pesoMax", doce: "pesoMax,e1rm" });
        },
      },
      {
        nombre: "anteriorDe: las series de la última vez, o nada sin historial",
        ejecutar: () => {
          const indice = { ejercicios: { banca: { ultima: { sesionId: "s1", fecha: "2026-10-21", series: [{ tipo: "normal", kg: 60, reps: 10 }] } } } };
          return comparar({ con: anteriorDe(indice, "banca").length, kg: anteriorDe(indice, "banca")[0].kg, sin: anteriorDe(indice, "curl").length }, { con: 1, kg: 60, sin: 0 });
        },
      },
      {
        nombre: "semanaDe: el viernes 23-10-2026 es de la semana del lunes 19 (o del domingo 18)",
        ejecutar: () => comparar({ lunes: semanaDe("2026-10-23", 1), domingo: semanaDe("2026-10-23", 0), elPropioLunes: semanaDe("2026-10-19", 1) }, { lunes: "2026-10-19", domingo: "2026-10-18", elPropioLunes: "2026-10-19" }),
      },
    ],
  };
}

// Rutina de prueba: press de banca con 1 calentamiento + 3 normales, y jalón con 3 normales y su propio
// descanso de 105 s. Hora fija: 23-10-2026 a las 18:00 UTC.
const AHORA_SESION = Date.UTC(2026, 9, 23, 18, 0, 0);
const RUTINA_PRUEBA = {
  id: "rt_torso", nombre: "Torso", actualizado: "2026-10-20",
  ejercicios: [
    { ejercicioId: "ex_press_banca_barra", descansoSeg: null, nota: "", series: [{ tipo: "calentamiento" }, { tipo: "normal" }, { tipo: "normal" }, { tipo: "normal" }] },
    { ejercicioId: "ex_jalon_pecho", descansoSeg: 105, nota: "", series: [{ tipo: "normal" }, { tipo: "normal" }, { tipo: "normal" }] },
  ],
};
const AJUSTES_PRUEBA = { precargar: true, descansoSeg: 120, descansoCalentamientoSeg: 60 };
const ANTERIOR_BANCA = [{ kg: 32, reps: 8 }, { kg: 61.3, reps: 10 }, { kg: 59, reps: 6 }, { kg: 54.3, reps: 7 }];
const anteriorPrueba = (id) => (id === "ex_press_banca_barra" ? ANTERIOR_BANCA : []);

// La sesión de la rutina con todas sus series marcadas (como si se hubiera hecho entera).
function sesionCompleta() {
  let s = nuevaSesion({ rutina: RUTINA_PRUEBA, ahora: AHORA_SESION, ajustes: AJUSTES_PRUEBA, anteriorDe: anteriorPrueba });
  s.ejercicios.forEach((ej) => ej.series.forEach((sr) => { s = marcarHecha(s, ej.inst, sr.id, AHORA_SESION, AJUSTES_PRUEBA); }));
  return s;
}

function grupoEntrenoSesion() {
  return {
    grupo: "Entreno: sesión en curso",
    casos: [
      {
        nombre: "nuevaSesion desde una rutina: 2 ejercicios, 7 series sin hacer; precarga en orden o vacía",
        ejecutar: () => {
          const con = nuevaSesion({ rutina: RUTINA_PRUEBA, ahora: AHORA_SESION, ajustes: AJUSTES_PRUEBA, anteriorDe: anteriorPrueba });
          const sin = nuevaSesion({ rutina: RUTINA_PRUEBA, ahora: AHORA_SESION, ajustes: { ...AJUSTES_PRUEBA, precargar: false }, anteriorDe: anteriorPrueba });
          const series = con.ejercicios.flatMap((e) => e.series);
          return comparar(
            {
              ejercicios: con.ejercicios.length, series: series.length, hechas: series.filter((x) => x.hecha).length,
              precargadas: con.ejercicios[0].series.map((x) => `${x.kg}x${x.reps}`).join(" "),
              vacias: sin.ejercicios[0].series.every((x) => x.kg === null && x.reps === null),
              nombre: con.nombre, rutinaId: con.rutinaId,
            },
            { ejercicios: 2, series: 7, hechas: 0, precargadas: "32x8 61.3x10 59x6 54.3x7", vacias: true, nombre: "Torso", rutinaId: "rt_torso" }
          );
        },
      },
      {
        nombre: "marcarHecha arranca el descanso (60 s calentamiento, 105 s del ejercicio); ±15, saltar y desmarcar",
        ejecutar: () => {
          const s0 = nuevaSesion({ rutina: RUTINA_PRUEBA, ahora: AHORA_SESION, ajustes: AJUSTES_PRUEBA, anteriorDe: anteriorPrueba });
          const [banca, jalon] = s0.ejercicios;
          const sW = marcarHecha(s0, banca.inst, banca.series[0].id, AHORA_SESION, AJUSTES_PRUEBA);
          const sJ = marcarHecha(s0, jalon.inst, jalon.series[0].id, AHORA_SESION, AJUSTES_PRUEBA);
          const sMas = ajustarDescanso(sJ, 15);
          const sDes = desmarcar(sW, banca.inst, banca.series[0].id);
          return comparar(
            {
              calentamiento: sW.descanso.hasta - AHORA_SESION, ejercicio: sJ.descanso.hasta - AHORA_SESION, mas15: sMas.descanso.hasta - AHORA_SESION,
              saltado: saltarDescanso(sJ).descanso, desmarcada: sDes.ejercicios[0].series[0].hecha, conserva: sDes.ejercicios[0].series[0].kg,
            },
            { calentamiento: 60000, ejercicio: 105000, mas15: 120000, saltado: null, desmarcada: false, conserva: 32 }
          );
        },
      },
      {
        nombre: "sustituirHoy cambia el ejercicio, recuerda el original y conserva las series",
        ejecutar: () => {
          const s0 = nuevaSesion({ rutina: RUTINA_PRUEBA, ahora: AHORA_SESION, ajustes: AJUSTES_PRUEBA, anteriorDe: anteriorPrueba });
          const s1 = sustituirHoy(s0, s0.ejercicios[1].inst, "ex_jalon_estrecho");
          return comparar(
            { id: s1.ejercicios[1].ejercicioId, original: s1.ejercicios[1].sustituyeA, series: s1.ejercicios[1].series.length },
            { id: "ex_jalon_estrecho", original: "ex_jalon_pecho", series: 3 }
          );
        },
      },
      {
        nombre: "terminarSesion quita lo no hecho, pone el fin y cierra la pausa abierta",
        ejecutar: () => {
          let s = nuevaSesion({ rutina: RUTINA_PRUEBA, ahora: AHORA_SESION, ajustes: AJUSTES_PRUEBA, anteriorDe: anteriorPrueba });
          const banca = s.ejercicios[0];
          s = marcarHecha(s, banca.inst, banca.series[1].id, AHORA_SESION, AJUSTES_PRUEBA);
          s = marcarHecha(s, banca.inst, banca.series[2].id, AHORA_SESION, AJUSTES_PRUEBA);
          s = pausar(s, AHORA_SESION + 30 * 60000);
          const fin = AHORA_SESION + 45 * 60000;
          const t = terminarSesion(s, fin, { nombre: "Torso corto", esfuerzo: 3 });
          return comparar(
            { ejercicios: t.ejercicios.length, series: t.ejercicios[0].series.length, fin: t.fin, pausaCerrada: t.pausas[0].fin, nombre: t.nombre, descanso: t.descanso },
            { ejercicios: 1, series: 2, fin: new Date(fin).toISOString(), pausaCerrada: new Date(fin).toISOString(), nombre: "Torso corto", descanso: undefined }
          );
        },
      },
      {
        nombre: "cambiosEstructurales: igual → no; una serie más → sí; sustituido solo hoy → no",
        ejecutar: () => {
          const s = sesionCompleta();
          const conSerie = anadirSerie(s, s.ejercicios[0].inst);
          const sustituida = sustituirHoy(s, s.ejercicios[1].inst, "ex_jalon_estrecho");
          return comparar(
            { igual: cambiosEstructurales(s, RUTINA_PRUEBA), serieMas: cambiosEstructurales(conSerie, RUTINA_PRUEBA), sustituida: cambiosEstructurales(sustituida, RUTINA_PRUEBA) },
            { igual: false, serieMas: true, sustituida: false }
          );
        },
      },
      {
        nombre: "aplicarARutina copia ejercicios y series (sin el sustituido solo hoy); rutinaDesdeSesion",
        ejecutar: () => {
          let s = sesionCompleta();
          s = anadirSerie(s, s.ejercicios[0].inst);
          s = sustituirHoy(s, s.ejercicios[1].inst, "ex_jalon_estrecho");
          const r = aplicarARutina(RUTINA_PRUEBA, s, "2026-10-23");
          const nueva = rutinaDesdeSesion(sesionCompleta(), "Mi torso", "2026-10-23");
          return comparar(
            {
              seriesBanca: r.ejercicios[0].series.length, segundo: r.ejercicios[1].ejercicioId, descansoJalon: r.ejercicios[1].descansoSeg,
              plantillaKg: r.ejercicios[0].series[1].kg, nueva: nueva.nombre, nuevaEjercicios: nueva.ejercicios.length, nuevaSeries: nueva.ejercicios[0].series.length,
            },
            { seriesBanca: 5, segundo: "ex_jalon_pecho", descansoJalon: 105, plantillaKg: 61.3, nueva: "Mi torso", nuevaEjercicios: 2, nuevaSeries: 4 }
          );
        },
      },
    ],
  };
}
