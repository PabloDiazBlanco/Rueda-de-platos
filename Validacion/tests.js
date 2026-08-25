// Casos de prueba para las funciones de cálculo de app.jsx. No forma parte de la app en sí
// (no se enlaza desde index.html ni se registra en el service worker) — es una herramienta de
// mantenimiento para comprobar, tras cualquier cambio en app.jsx, que los cálculos siguen dando
// los mismos resultados conocidos. Los valores "esperado" de aquí abajo se verificaron a mano
// antes de guardarlos como referencia (agosto de 2026).
import { DAYS } from "comun";

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
    esDiaSugeridoPeso, calcularListaCompra, fechaISO, resumenNutrientesSemana,
  } = mod;

  return [
    {
      grupo: "calcularObjetivosPerfil",
      casos: [
        {
          nombre: "Definición · 90kg · pesas 5x/semana · sin calibración",
          ejecutar: () => {
            const r = calcularObjetivosPerfil(perfilBase());
            return comparar(r, { kcal: 2320, prot: 198, fat: 90, carb: 180, ajustePct: -15 });
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
