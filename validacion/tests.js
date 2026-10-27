// Casos de prueba para las funciones de cálculo de app.jsx. No forma parte de la app en sí
// (no se enlaza desde index.html ni se registra en el service worker) — es una herramienta de
// mantenimiento para comprobar, tras cualquier cambio en app.jsx, que los cálculos siguen dando
// los mismos resultados conocidos. Los valores "esperado" de aquí abajo se verificaron a mano
// antes de guardarlos como referencia (agosto de 2026).
import { DAYS, primerEmoji } from "comun";
import { cumplimientoMacrosMes } from "resumen-mensual";
import { migrarPeriodo, alternarDia, iniciosDeRegla, prediccionPeriodo } from "periodo";
import { objetivosPorComida, recomendacionPreentreno } from "objetivos";
import { migrateData } from "migraciones";
import { FOODS_SEED } from "datos-iniciales";
import { CUESTIONARIO_PASOS_BASE, pasosCuestionario, construirIngredientesDesdeCuestionario, huecosProteinaSemana } from "cuestionario";
import {
  despensaVacia, migrarDespensa, anadirItem, editarItem, quitarAlimento, menuEstaConfirmado, confirmarMenu,
  quitarConfirmacion, descontarComida, devolverComida, marcarComprado, desmarcarComprado,
  sellarCambios, racionMedia, alertasStock, anadirLimpieza, alternarLimpieza, quitarLimpieza, quitarLimpiezaComprada,
  resumenDespensaParaIA,
} from "despensa";
import { necesidadesComida, calcularListaNeta } from "lista-compra-neta";
import { esBebida, huecoDe, formaDe, repartirEnHuecos, dibujoPropio, frutasDelFrutero } from "nevera";
import { tieneTraduccion, clavesDeIdioma, IDIOMAS_DISPONIBLES } from "i18n";
import {
  EJERCICIOS_SEMILLA, TIPOS_EJERCICIO, GRUPOS_MUSCULARES, EQUIPOS, camposDeTipo, listaEjercicios, buscarEjercicios,
  posibleDuplicado,
} from "entreno-ejercicios";
import { NOMBRES_EJERCICIOS, nombreEjercicio, nombresParaEmparejar } from "entreno-nombres";
import { leerCSV, detectarFormato, fechaHevy, fechaLyfta, segundosDeTexto, prepararImportacion, construirImportacion } from "entreno-importar";
import {
  e1rm, e1rmFiable, volumenSerie, volumenSesion, duracionEfectiva, seriesPorMusculo, validarSerie,
  mejoresDeEjercicioEnSesion, recordsBatidos, anteriorDe, semanaDe, recordsEnVivo, seriesConRecord, semanasRecientes,
  pesoAPantalla, pesoDePantalla, distanciaAPantalla, distanciaDePantalla, resumenEntrenoMes, discosPorLado,
  anteriorEquivalente, repsLadoDebil,
} from "entreno-calculo";
import {
  nuevaSesion, anadirSerie, marcarHecha, desmarcar, ajustarDescanso, saltarDescanso, sustituirHoy, pausar,
  terminarSesion, cambiosEstructurales, aplicarARutina, rutinaDesdeSesion, anadirEjercicios, descansoEjercicio,
  gruposSuperserie, grupoDe, unirSuperserie, separarSuperserie, superserieCon, ordenDeSeries, siguienteSerie,
} from "entreno-sesion";
import {
  claveMes, mesDe, migrarCatalogo, anadirSesionAMes, fusionarMeses, reconstruirIndice, actualizarIndiceConSesion,
  elegirBorrador, encolar, quitarDeCola, sesionesACSV, CABECERA_CSV, migrarIndice,
} from "entreno-almacen";
import {
  lineasComida, redondearRazonable, propuestaGramos, opcionesCambio, comidaReal, registroComida, necesidadesComidaReal,
  estaHecha, registroDeSlot, totalesDiaReal,
} from "comida-real";
import {
  declaradoPorSemana, informeCruzadoMes, sesionesPorSemana, evaluarAvisoActividad, ultimaVezPorGrupo, gruposSinEntrenar,
  INFORMES, informesVisibles, pesoFinDeSemana, desviacionPeso,
} from "informes";
import {
  migrarDiario, apuntarSueno, quitarSueno, apuntarPasos, ultimoSueno, ultimosDias, calidadDeCara, caraDeCalidad,
  migrarFavoritos, alternarFavorito, tieneFavorito, idDeConstructor,
} from "cuerpo-diario";
import {
  construirSerie, valores, variable, pista, pearson, porCategoria, tablaXYZ, PREGUNTAS, FORMAS, TEMAS, resolverMontaje, completarHuecos,
} from "cuerpo-series";
import { SLUG_A_GRUPO, GRUPOS_MAPA, nivelSeries, colorSeries, generoMapa, seriesDeRutina, valoresDeEjercicio } from "mapa-corporal";
// Los trazados del mapa corporal son un archivo de datos de ui/ sin JSX: se importa directamente.
import { TRAZADOS_MIT } from "../ui/comun/mapa-trazados.js";
import {
  ZONAS, ESTACIONES, ESTACION_DE, SITIOS, ENTRADA_DENTRO, zonaDeMusculo, estacionDeEjercicio, ejerciciosDeZona, libre, aEstrella,
  puntoDe, paradasDeRutina, pasoEntreEjercicios, ultimaVezPorZona, estadoZonas, situacionMonitor, fraseMonitor, rutinaDeHoy,
  diasEntrenadosSemana,
} from "gimnasio";

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
        {
          nombre: "D3: preentreno — después de una comida no hace falta; antes, comer algo; solo la franja, la general; sin respuesta, nada",
          ejecutar: () => {
            const reparto = { Desayuno: 0.2, Comida: 0.35, Merienda: 0.15, Cena: 0.3 };
            const tipo = (p) => { const r = recomendacionPreentreno(p); return r ? `${r.tipo}${r.comida ? ":" + r.comida : ""}` : "nada"; };
            return comparar(
              {
                despues: tipo({ repartoComidas: reparto, entrenoComida: { momento: "despues", comida: "Comida" }, horaEntreno: "tarde" }),
                antes: tipo({ repartoComidas: reparto, entrenoComida: { momento: "antes", comida: "Cena" } }),
                franja: tipo({ repartoComidas: reparto, horaEntreno: "manana", entrenoComida: null }),
                comidaQueYaNoEsta: tipo({ repartoComidas: { Comida: 0.5, Cena: 0.5 }, entrenoComida: { momento: "antes", comida: "Merienda" }, horaEntreno: "noche" }),
                nada: tipo({ repartoComidas: reparto, horaEntreno: null, entrenoComida: null }), sinPerfil: tipo(null),
              },
              { despues: "noHace:Comida", antes: "comer:Cena", franja: "general", comidaQueYaNoEsta: "general", nada: "nada", sinPerfil: "nada" }
            );
          },
        },
      ],
    },
    {
      grupo: "«¿Qué cocino?»: la despensa que se manda (E2)",
      casos: [
        {
          nombre: "Una línea por alimento con algo en casa: gramos sumados de sus zonas (en kg desde 1000), «sí» sin cantidad, sin lo acabado ni lo que no está en el catálogo",
          ejecutar: () => {
            const foods = [
              { id: "f_arroz", name: "Arroz", categoria: "carbohidratos" }, { id: "f_pollo", name: "Pollo", categoria: "proteinas" },
              { id: "f_tomate", name: "Tomate", categoria: "vegetales" }, { id: "f_pera", name: "Pera", categoria: "frutas" },
            ];
            const despensa = { items: [
              { id: "1", foodId: "f_arroz", zona: "despensa", gramos: 800 }, { id: "2", foodId: "f_arroz", zona: "despensa", gramos: 450 },
              { id: "3", foodId: "f_pollo", zona: "nevera", gramos: 300 }, { id: "4", foodId: "f_pollo", zona: "congelador", gramos: 0 },
              { id: "5", foodId: "f_tomate", zona: "nevera", tengo: true }, { id: "6", foodId: "f_pera", zona: "nevera", tengo: false },
              { id: "7", foodId: "f_borrado", zona: "nevera", gramos: 100 },
            ] };
            const r = resumenDespensaParaIA(despensa, foods);
            return comparar({ lineas: r.map((x) => `${x.nombre}:${x.cantidad}`).join(","), ids: r.map((x) => x.id).join(",") }, { lineas: "Arroz:1.3 kg,Pollo:300 g,Tomate:sí", ids: "f_arroz,f_pollo,f_tomate" });
          },
        },
      ],
    },
    {
      // I1 (25-oct-2026): inicios de regla = días de regla cuyo día anterior no lo es; siguiente inicio = último
      // + distancia entre los dos últimos (o + 28 con uno solo).
      grupo: "Período (I1)",
      casos: [
        {
          nombre: "Inicios y predicción: con dos inicios (1-oct y 30-oct, 29 días) → 28-nov; con uno → +28; sin ninguno → null",
          ejecutar: () => {
            const dos = { regla: ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-30", "2026-10-31", "2026-11-01"] };
            const uno = { regla: ["2026-10-05", "2026-10-06"] };
            const p = prediccionPeriodo(dos);
            const q = prediccionPeriodo(uno);
            return comparar(
              { inicios: iniciosDeRegla(dos.regla).join(","), fecha: p.fecha, ciclo: p.ciclo, base: p.base, fechaUno: q.fecha, baseUno: q.base, nada: prediccionPeriodo({ regla: [] }) },
              { inicios: "2026-10-01,2026-10-30", fecha: "2026-11-28", ciclo: 29, base: "dos", fechaUno: "2026-11-02", baseUno: "uno", nada: null }
            );
          },
        },
        {
          nombre: "Marcar y desmarcar un día; la migración quita fechas mal escritas y repetidas y ordena",
          ejecutar: () => {
            const p1 = alternarDia(migrarPeriodo(null), "regla", "2026-10-10");
            const p2 = alternarDia(p1, "relaciones", "2026-10-12");
            const p3 = alternarDia(p2, "regla", "2026-10-10");
            const m = migrarPeriodo({ regla: ["2026-10-09", "x", "2026-10-02", "2026-10-09"], relaciones: "no" });
            return comparar(
              { regla1: p1.regla.join(","), relaciones2: p2.relaciones.join(","), regla3: p3.regla.length, migrada: m.regla.join(","), relacionesMigradas: m.relaciones.length, version: m.version },
              { regla1: "2026-10-10", relaciones2: "2026-10-12", regla3: 0, migrada: "2026-10-02,2026-10-09", relacionesMigradas: 0, version: 1 }
            );
          },
        },
      ],
    },
    {
      // B2 (25-oct-2026): días del mes con todas las comidas marcadas y macros guardadas; «llegar» = al
      // menos el 90 % del objetivo del día. Objetivo: 150 g de proteína, 200 de carbohidratos y 70 de grasa.
      grupo: "Resúmenes: cumplimiento de macros (B2)",
      casos: [
        {
          nombre: "3 días válidos: proteína 2 de 3 (67 %), carbohidratos 3 de 3, grasa 1 de 3; sin detalle e incompletos no cuentan",
          ejecutar: () => {
            const reg = (prot, carb, fat) => ({ hecha: true, slotId: "x", macros: { kcal: 0, prot, carb, fat } });
            const dia = (p, c, g) => ({ Comida: reg(p / 2, c / 2, g / 2), Cena: reg(p / 2, c / 2, g / 2) });
            const comidasCompletadas = {
              "2026-10-01": dia(140, 190, 60),   // prot 140 ≥ 135 ✓, carb 190 ≥ 180 ✓, grasa 60 < 63 ✗
              "2026-10-02": dia(120, 250, 80),   // prot 120 < 135 ✗, carb ✓, grasa 80 ≥ 63 ✓
              "2026-10-03": dia(160, 180, 40),   // prot ✓, carb 180 = 180 ✓ (justo el 90 %), grasa ✗
              "2026-10-04": { Comida: { hecha: true }, Cena: reg(70, 90, 30) },   // sin detalle
              "2026-10-05": { Comida: reg(70, 90, 30) },                           // incompleto
              "2026-09-30": dia(150, 200, 70),   // otro mes
            };
            const r = cumplimientoMacrosMes(comidasCompletadas, "2026-10", { prot: 150, carb: 200, fat: 70 }, ["Comida", "Cena"]);
            return comparar(
              { dias: r.dias, sinDetalle: r.sinDetalle, incompletos: r.incompletos, prot: r.prot.pct, carb: r.carb.pct, fat: r.fat.pct, sinObjetivos: cumplimientoMacrosMes(comidasCompletadas, "2026-10", null, ["Comida", "Cena"]).dias },
              { dias: 3, sinDetalle: 1, incompletos: 1, prot: 67, carb: 100, fat: 33, sinObjetivos: 0 }
            );
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
        {
          nombre: "C8: el aviso para descongelar empieza desactivado en los perfiles de antes y no se toca si ya estaba",
          ejecutar: () => comparar(
            { viejo: migrateData({ perfil: { nombre: "X" } }).data.perfil.avisoDescongelar, activado: migrateData({ perfil: { nombre: "Y", avisoDescongelar: true } }).data.perfil.avisoDescongelar, sinPerfil: migrateData({}).data.perfil },
            { viejo: false, activado: true, sinPerfil: undefined }
          ),
        },
        {
          nombre: "FitDraft: el perfil de antes recibe el avatar de su sexo (sin sexo, hombre); uno elegido no se toca; uno raro se corrige",
          ejecutar: () => {
            const avatar = (perfil) => migrateData({ perfil }).data.perfil.avatar;
            return comparar(
              { mujer: avatar({ nombre: "A", sexo: "mujer" }), hombre: avatar({ nombre: "B", sexo: "hombre" }), sinSexo: avatar({ nombre: "C" }),
                elegido: avatar({ nombre: "D", sexo: "mujer", avatar: "hombre" }), raro: avatar({ nombre: "E", sexo: "mujer", avatar: "gato" }),
                sinPerfil: migrateData({}).data.perfil, segunda: migrateData(migrateData({ perfil: { nombre: "F", sexo: "mujer" } }).data).changed },
              { mujer: "mujer", hombre: "hombre", sinSexo: "hombre", elegido: "hombre", raro: "mujer", sinPerfil: undefined, segunda: false }
            );
          },
        },
        {
          nombre: "D3: el perfil de antes queda sin respuesta de preentreno (null, null, sin días) sin tocar lo contestado",
          ejecutar: () => {
            const viejo = migrateData({ perfil: { nombre: "X", repartoComidas: { Comida: 0.5, Cena: 0.5 } } }).data.perfil;
            const contestado = migrateData({ perfil: { nombre: "Y", repartoComidas: { Comida: 1 }, horaEntreno: "tarde", entrenoComida: { momento: "antes", comida: "Comida" }, diasEntreno: ["Lunes"] } }).data.perfil;
            return comparar(
              { hora: viejo.horaEntreno, comida: viejo.entrenoComida, dias: JSON.stringify(viejo.diasEntreno), horaY: contestado.horaEntreno, diasY: contestado.diasEntreno.join(","), comidaY: contestado.entrenoComida.comida },
              { hora: null, comida: null, dias: "[]", horaY: "tarde", diasY: "Lunes", comidaY: "Comida" }
            );
          },
        },
        {
          nombre: "F3: los alimentos de la semilla sin emoji reciben el suyo; uno cambiado o borrado a propósito, o uno propio, no se tocan",
          ejecutar: () => {
            const { data, changed } = migrateData({
              foods: [
                { id: "f_huevo", name: "Huevo entero (crudo)", categoria: "proteinas", kcal: 140, prot: 12.7, fat: 9.5, carb: 0.3 },
                { id: "f_atun", name: "Atún", categoria: "proteinas", kcal: 105, prot: 22.5, fat: 1.2, carb: 0, emoji: "🐟" },
                { id: "f_pasta", name: "Pasta", categoria: "carbohidratos", kcal: 357, prot: 11, fat: 1.5, carb: 70, emoji: "" },
                { id: "f_mio", name: "Mi bizcocho", categoria: "snacks_procesados", kcal: 400, prot: 6, fat: 20, carb: 50 },
              ],
            });
            const de = (id) => data.foods.find((f) => f.id === id).emoji;
            return comparar(
              { changed, huevo: de("f_huevo"), atun: de("f_atun"), pasta: de("f_pasta"), mio: de("f_mio"), platano: de("f_platano") },
              { changed: true, huevo: "🥚", atun: "🐟", pasta: "", mio: undefined, platano: "🍌" }
            );
          },
        },
        {
          nombre: "F3: cada alimento de la semilla trae su emoji y no se repite ninguno",
          ejecutar: () => {
            const emojis = FOODS_SEED.map((f) => f.emoji);
            return comparar(
              { todos: emojis.every((e) => typeof e === "string" && e.length > 0), distintos: new Set(emojis).size === emojis.length, n: emojis.length },
              { todos: true, distintos: true, n: FOODS_SEED.length }
            );
          },
        },
        {
          nombre: "F3: primerEmoji guarda el primero completo (tono de piel, unidos, bandera, tecla) e ignora letras",
          ejecutar: () => comparar(
            {
              varios: primerEmoji("abc 🍕🍔"), tono: primerEmoji("👍🏽x"), unidos: primerEmoji("🧑‍🍳"), bandera: primerEmoji("🇪🇸🇫🇷"),
              tecla: primerEmoji("1️⃣"), letras: primerEmoji("hola"), vacio: primerEmoji(""), nulo: primerEmoji(null),
            },
            { varios: "🍕", tono: "👍🏽", unidos: "🧑‍🍳", bandera: "🇪🇸", tecla: "1️⃣", letras: "", vacio: "", nulo: "" }
          ),
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
          nombre: "A9: más de 3 veces por semana; la predeterminada pasa a ser la «base» del motor; huecos de proteína según el reparto",
          ejecutar: () => {
            const r = construirIngredientesDesdeCuestionario({ frecuencias: { f_salmon: 5, f_pechuga_pollo: 2 }, pesosCarbo: {}, pesosVerdura: {}, pesosGrasa: {}, predeterminado: "f_pechuga_pollo" });
            const salmon = r.find((i) => i.foodId === "f_salmon");
            const pollo = r.find((i) => i.foodId === "f_pechuga_pollo");
            const sinBase = construirIngredientesDesdeCuestionario({ frecuencias: { f_salmon: 2 }, pesosCarbo: {}, pesosVerdura: {}, pesosGrasa: {}, predeterminado: "f_pechuga_pollo" });
            return comparar(
              {
                salmon: `${salmon.ruleType}:${salmon.freqCantidad}`, pollo: pollo.ruleType, polloSinFrecuencia: pollo.freqCantidad === undefined, sinBase: sinBase.map((i) => i.ruleType).join(","),
                cuatro: huecosProteinaSemana({ Desayuno: 0.2, Comida: 0.35, Merienda: 0.15, Cena: 0.3 }), soloComida: huecosProteinaSemana({ Desayuno: 0.3, Comida: 0.7 }), sinReparto: huecosProteinaSemana(null),
              },
              { salmon: "frecuencia:5", pollo: "base", polloSinFrecuencia: true, sinBase: "frecuencia", cuatro: 14, soloComida: 7, sinReparto: 14 }
            );
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
        {
          // Estética de la cocina (26-oct-2026): los 43 alimentos de la semilla llevan dibujo propio; los
          // del usuario, no (siguen con su emoji). Si el usuario cambió el emoji de uno de la semilla, se
          // respeta el suyo; si lo borró, vuelve el dibujo.
          nombre: "Dibujo propio: todos los de la semilla, ninguno de los del usuario, y el emoji cambiado a mano manda",
          ejecutar: () => {
            const f = (id) => FOODS_SEED.find((x) => x.id === id);
            const conDibujo = FOODS_SEED.filter((x) => dibujoPropio(x, FOODS_SEED) === x.id).length;
            const items = [{ id: "1", foodId: "f_huevo", zona: "nevera", gramos: 360 }, { id: "2", foodId: "f_mio", zona: "nevera", gramos: 100 }];
            const foods = [...FOODS_SEED, { id: "f_mio", name: "Kéfir de cabra", categoria: "lacteos", emoji: "🐐" }];
            const puerta = repartirEnHuecos(items, foods, "nevera", FOODS_SEED).find((h) => h.clave === "puerta");
            return comparar(
              {
                conDibujo, total: FOODS_SEED.length,
                propio: dibujoPropio({ id: "f_mio", name: "Mi tarta", categoria: "snacks_procesados" }, FOODS_SEED),
                emojiCambiado: dibujoPropio({ ...f("f_salmon"), emoji: "🐡" }, FOODS_SEED),
                emojiBorrado: dibujoPropio({ ...f("f_salmon"), emoji: "" }, FOODS_SEED),
                sinSemilla: dibujoPropio(f("f_salmon")),
                enLaPuerta: puerta.entradas.map((e) => `${e.item.foodId}:${e.dibujo}`).join(","),
              },
              {
                conDibujo: 43, total: 43, propio: null, emojiCambiado: null, emojiBorrado: "f_salmon", sinSemilla: null,
                enLaPuerta: "f_huevo:f_huevo,f_mio:null",
              }
            );
          },
        },
        {
          nombre: "Frutero: la fruta que queda en la nevera o la despensa, sin la congelada ni repetidas, como mucho 5",
          ejecutar: () => {
            const items = [
              { id: "1", foodId: "f_manzana", zona: "nevera", tengo: true },
              { id: "2", foodId: "f_manzana", zona: "despensa", tengo: true },
              { id: "3", foodId: "f_fresas", zona: "congelador", gramos: 300 },
              { id: "4", foodId: "f_pera", zona: "nevera", tengo: false },
              { id: "5", foodId: "f_platano", zona: "despensa", gramos: 400 },
              { id: "6", foodId: "f_tomate", zona: "nevera", tengo: true },
              { id: "7", foodId: "f_uvas", zona: "nevera", gramos: 0 },
            ];
            const muchas = ["f_manzana", "f_platano", "f_naranja", "f_pera", "f_fresas", "f_uvas"].map((id, i) => ({ id: String(i), foodId: id, zona: "nevera", tengo: true }));
            return comparar(
              {
                frutas: frutasDelFrutero(items, FOODS_SEED, FOODS_SEED).map((e) => e.food.id).join(","),
                dibujo: frutasDelFrutero(items, FOODS_SEED, FOODS_SEED)[0].dibujo,
                cuantas: frutasDelFrutero(muchas, FOODS_SEED, FOODS_SEED).length,
                vacio: frutasDelFrutero([], FOODS_SEED, FOODS_SEED).length,
              },
              { frutas: "f_manzana,f_platano", dibujo: "f_manzana", cuantas: 5, vacio: 0 }
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
    grupoEntrenoAlmacen(),
    grupoInformes(),
    grupoAvisoActividad(),
    grupoComidaReal(),
    grupoImportar(),
    grupoCuerpoDiario(),
    grupoCuerpoSeries(),
    grupoCuerpoInformes(),
    grupoMapaCorporal(),
    grupoGimnasio(),
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
  "tipoEjercicio.", "tipoSerie.", "cuerpo.", "feedback.ejercicio", "fitdraft.",
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
        // 27-oct-2026. A mano: 20 kg por mancuerna × 10 = 400 kg de volumen; 1RM con 40 kg y 10 reps =
        // 40 × (1 + 10/30) = 53,3; el peso máximo se queda en 20 (lo tecleado). Unilateral 10/8 a 20 kg: volumen
        // 20 × 18 = 360; 1RM con el lado débil (8): 20 × (1 + 8/30) = 25,3; mejor serie 20 × 8 = 160.
        nombre: "×2 con dos mancuernas y series unilaterales: volumen, 1RM y récords",
        ejecutar: () => {
          const conPareja = { tipo: "peso_reps", pareja: true };
          const par = serieP("normal", 20, 10);
          const mPar = mejoresDeEjercicioEnSesion({ series: [par] }, conPareja, 80);
          const lado = { ...serieP("normal", 20, 8), lados: true, repsIzq: 10, repsDer: 8 };
          const mLado = mejoresDeEjercicioEnSesion({ series: [lado] }, "peso_reps", 80);
          // Ejercicio unilateral por naturaleza: una serie sin `lados` cuenta las mismas repeticiones a cada lado.
          const uni = { tipo: "peso_reps", unilateral: true };
          const deFabrica = (id) => EJERCICIOS_SEMILLA.find((e) => e.id === id);
          return comparar(
            {
              volPar: volumenSerie(par, conPareja, 80), volTexto: volumenSerie(par, "peso_reps", 80),
              e1rmPar: mPar.e1rm, pesoMaxPar: mPar.pesoMax, mejorPar: mPar.mejorSerie.valor,
              volLado: volumenSerie(lado, "peso_reps", 80), e1rmLado: mLado.e1rm, mejorLado: mLado.mejorSerie.valor,
              volUniDefecto: volumenSerie(serieP("normal", 10, 12), uni, 80), volUniApagado: volumenSerie({ ...serieP("normal", 10, 12), lados: false }, uni, 80),
              debil: [repsLadoDebil(10, 8), repsLadoDebil(null, 7), repsLadoDebil(null, null)].join(" "),
              bancaMancuernas: !!deFabrica("ex_press_banca_mancuernas").pareja, remoUnaMano: [!!deFabrica("ex_remo_mancuerna").pareja, !!deFabrica("ex_remo_mancuerna").unilateral].join(" "),
              bancaBarra: !!deFabrica("ex_press_banca_barra").pareja,
              indiceViejo: migrarIndice({ version: 1, meses: {}, ejercicios: {}, rutinas: {} }).reconstruir,
            },
            {
              volPar: 400, volTexto: 200, e1rmPar: 53.3, pesoMaxPar: 20, mejorPar: 400,
              volLado: 360, e1rmLado: 25.3, mejorLado: 160, volUniDefecto: 240, volUniApagado: 120,
              debil: "8 7 ", bancaMancuernas: true, remoUnaMano: "false true", bancaBarra: false, indiceViejo: true,
            }
          );
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
        nombre: "Récord en vivo: 62,5 × 6 bate el peso máximo; la siguiente, 62,5 × 12, solo el 1RM",
        ejecutar: () => {
          const ej = { series: [serieP("normal", 62.5, 6), serieP("normal", 62.5, 12)] };
          const previos = { pesoMax: { valor: 60 }, e1rm: { valor: 80 } };
          const claves = (i) => recordsEnVivo(ej, ej.series[i].id, "peso_reps", 80, previos).map((r) => r.clave).join(",");
          // La 2.ª no bate el peso máximo (62,5 = 62,5 de la serie anterior), pero su 1RM (87,5) sí supera a 80 y a 75.
          return comparar({ primera: claves(0), segunda: claves(1), sinPrevios: recordsEnVivo(ej, ej.series[0].id, "peso_reps", 80, {}).length }, { primera: "pesoMax", segunda: "e1rm", sinPrevios: 0 });
        },
      },
      {
        nombre: "Medallas del historial: la serie que tiene hoy el récord de su sesión",
        ejecutar: () => {
          const ej = { series: [serieP("normal", 60, 10), serieP("normal", 65, 8)] };
          const registro = { records: { pesoMax: { valor: 65, sesionId: "s1" }, mejorSerie: { kg: 60, reps: 12, valor: 720, sesionId: "s3" } } };
          const enS1 = seriesConRecord(registro, "s1", ej, "peso_reps", 80);
          return comparar({ n: enS1.size, esLa65: enS1.has(ej.series[1].id), enOtra: seriesConRecord(registro, "s9", ej, "peso_reps", 80).size }, { n: 1, esLa65: true, enOtra: 0 });
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
        nombre: "semanasRecientes: entrenos y volumen de las 3 últimas semanas (lunes como inicio)",
        ejecutar: () => {
          const ses = (dia, kg) => ({ inicio: `2026-10-${dia}T17:00:00.000Z`, ejercicios: [{ ejercicioId: "banca", series: [serieP("normal", kg, 10)] }] });
          // Hoy viernes 23: semanas del 5, del 12 y del 19. El 4 (domingo) es de la semana del 28-9 y queda fuera.
          const r = semanasRecientes([ses("04", 50), ses("06", 60), ses("13", 60), ses("15", 62), ses("20", 65)], ejercicioPrueba, 80, 1, "2026-10-23", 3);
          return comparar(
            { semanas: r.map((s) => s.semana).join(","), entrenos: r.map((s) => s.entrenos).join(","), volumen: r.map((s) => s.volumen).join(",") },
            { semanas: "2026-10-05,2026-10-12,2026-10-19", entrenos: "1,2,1", volumen: "600,1220,650" }
          );
        },
      },
      {
        nombre: "Libras y millas: conversión y vuelta sin perder lo tecleado",
        ejecutar: () => comparar(
          {
            cienKgEnLb: pesoAPantalla(100, "lb"), lb135EnKg: pesoDePantalla(135, "lb"), idaYVuelta: pesoAPantalla(pesoDePantalla(135, "lb"), "lb"),
            enKg: pesoAPantalla(61.3, "kg"), cincoMi: distanciaDePantalla(5, "mi"), vueltaMi: distanciaAPantalla(distanciaDePantalla(5, "mi"), "mi"),
            vacio: pesoDePantalla("", "lb"),
          },
          // 100 / 0,45359237 = 220,46 → 220,5; 135 × 0,45359237 = 61,2350 kg; 5 × 1,609344 = 8,047 km.
          { cienKgEnLb: 220.5, lb135EnKg: 61.235, idaYVuelta: 135, enKg: 61.3, cincoMi: 8.047, vueltaMi: 5, vacio: null },
          0.0001
        ),
      },
      {
        nombre: "resumenEntrenoMes: entrenos, días, volumen, tiempo, récords del mes y músculos más trabajados",
        ejecutar: () => {
          const ses = (inicio, fin, ejercicios) => ({ inicio, fin, pausas: [], ejercicios });
          const sesiones = [
            ses("2026-10-05T17:00:00.000Z", "2026-10-05T18:00:00.000Z", [{ ejercicioId: "banca", series: [serieP("normal", 60, 10), serieP("normal", 60, 10)] }]),
            ses("2026-10-05T19:00:00.000Z", "2026-10-05T19:30:00.000Z", [{ ejercicioId: "curl", series: [serieP("normal", 20, 10)] }]),
            ses("2026-10-07T17:00:00.000Z", "2026-10-07T17:45:00.000Z", [{ ejercicioId: "banca", series: [serieP("normal", 62.5, 8)] }]),
          ];
          const indice = { ejercicios: { banca: { records: { pesoMax: { valor: 62.5, fecha: "2026-10-07" }, e1rm: { valor: 80, fecha: "2026-09-20" } } } } };
          const r = resumenEntrenoMes(sesiones, ejercicioPrueba, 80, { indice, mes: "2026-10" });
          // Volumen: 1200 + 200 + 500 = 1900. Tiempo: 60 + 30 + 45 min = 8100 s. Pecho 3, tríceps y hombros 1,5, bíceps 1.
          return comparar(
            { sesiones: r.sesiones, dias: r.dias, volumen: r.volumen, duracion: r.duracionSeg, records: r.records, primero: r.topMusculos[0].musculo, series: r.topMusculos[0].series, n: r.topMusculos.length },
            { sesiones: 3, dias: 2, volumen: 1900, duracion: 8100, records: 1, primero: "pecho", series: 3, n: 3 }
          );
        },
      },
      {
        nombre: "Calculadora de discos: 100 kg = 25 + 15 por lado; 62,5 = 20 + 1,25; 101 deja 1 kg; 15 no llega a la barra",
        ejecutar: () => {
          const lado = (kg) => discosPorLado(kg).porLado.join("+");
          // (100 − 20) / 2 = 40 = 25 + 15; (62,5 − 20) / 2 = 21,25 = 20 + 1,25; (101 − 20) / 2 = 40,5 → 25 + 15 y sobra 0,5 por lado.
          return comparar(
            { cien: lado(100), sesenta: lado(62.5), barra: lado(20), cientoUno: lado(101), restoCientoUno: discosPorLado(101).resto, quince: discosPorLado(15).posible },
            { cien: "25+15", sesenta: "20+1.25", barra: "", cientoUno: "25+15", restoCientoUno: 1, quince: false }
          );
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
      // ---------- Gimnasio (G2, 25-oct-2026) ----------
      {
        nombre: "G2: terminarSesion guarda el gimnasio sin espacios de más; vacío es null; sin pasarlo, conserva el que tenía",
        ejecutar: () => {
          const s = nuevaSesion({ rutina: RUTINA_PRUEBA, ahora: AHORA_SESION, ajustes: AJUSTES_PRUEBA });
          const fin = AHORA_SESION + 3600000;
          const conGym = terminarSesion(s, fin, { gimnasio: "  Basic-Fit   Gran Vía " });
          return comparar(
            {
              gym: conGym.gimnasio, vacio: terminarSesion(s, fin, { gimnasio: "   " }).gimnasio, sinPasar: terminarSesion({ ...s, gimnasio: "VivaGym" }, fin, {}).gimnasio,
              nunca: terminarSesion(s, fin).gimnasio, ajusteDefecto: migrarCatalogo(null).valor.ajustes.gimnasio,
            },
            { gym: "Basic-Fit Gran Vía", vacio: null, sinPasar: "VivaGym", nunca: null, ajusteDefecto: "" }
          );
        },
      },
      // ---------- Superseries (G11, 25-oct-2026) ----------
      {
        nombre: "G11: unir con el siguiente, sumar un tercero, separar; solo los seguidos forman grupo",
        ejecutar: () => {
          const lista = ["a", "b", "c", "d"].map((x) => ({ ejercicioId: x, superserie: null }));
          const ab = unirSuperserie(lista, 0);
          const abc = unirSuperserie(ab, 1);
          const sinB = separarSuperserie(abc, 1);
          const forma = (l) => gruposSuperserie(l).map((g) => (g.fin > g.inicio ? `[${l.slice(g.inicio, g.fin + 1).map((e) => e.ejercicioId).join("")}]` : l[g.inicio].ejercicioId)).join(" ");
          return comparar(
            { ab: forma(ab), abc: forma(abc), sinB: forma(sinB), mismoId: abc[0].superserie === abc[2].superserie, grupoD: grupoDe(abc, 3), numero: grupoDe(abc, 2).numero, ultimoSinSiguiente: unirSuperserie(lista, 3) === lista },
            { ab: "[ab] c d", abc: "[abc] d", sinB: "a b c d", mismoId: true, grupoD: null, numero: 1, ultimoSinSiguiente: true }
          );
        },
      },
      {
        nombre: "Superserie «con…» (27-oct): el elegido se coloca tras el grupo, sale del suyo y no se duplica",
        ejecutar: () => {
          const lista = ["a", "b", "c", "d", "e"].map((x) => ({ ejercicioId: x, superserie: null }));
          const forma = (l) => gruposSuperserie(l).map((g) => (g.fin > g.inicio ? `[${l.slice(g.inicio, g.fin + 1).map((e) => e.ejercicioId).join("")}]` : l[g.inicio].ejercicioId)).join(" ");
          // a con d: d sube detrás de a. b con a (a va antes): a baja detrás de b.
          const ad = superserieCon(lista, 0, 3);
          const ba = superserieCon(lista, 1, 0);
          // Con un grupo ya hecho [ad], e se suma detrás de d; c con [ad] (pidiéndolo desde d) también.
          const ade = superserieCon(ad, 0, 4);
          const desdeD = superserieCon(ad, 1, 3);
          // d sale de [ad] para irse con e: [ad] se deshace.
          const de = superserieCon(ad, 4, 1);
          return comparar(
            { ad: forma(ad), ba: forma(ba), ade: forma(ade), desdeD: forma(desdeD), de: forma(de), mismo: superserieCon(ad, 0, 1) === ad, total: ade.length },
            { ad: "[ad] b c e", ba: "[ba] c d e", ade: "[ade] b c", desdeD: "[adc] b e", de: "a b c [ed]", mismo: true, total: 5 }
          );
        },
      },
      {
        nombre: "G11: orden por rondas (A1 B1 A2 B2 A3 y luego el siguiente ejercicio) y a dónde salta el foco al marcar",
        ejecutar: () => {
          const ej = (inst, n, superserie = null) => ({ inst, ejercicioId: inst, superserie, series: Array.from({ length: n }, (_, k) => ({ id: `${inst}${k + 1}`, hecha: false })) });
          const s = { ejercicios: [ej("A", 3, "ss1"), ej("B", 2, "ss1"), ej("C", 2)] };
          const orden = ordenDeSeries(s).map((x) => x.id).join(" ");
          const trasA1 = siguienteSerie(s, "A", "A1").id;
          const trasB1 = siguienteSerie(s, "B", "B1").id;
          const trasA3 = siguienteSerie(s, "A", "A3").id;
          // Si B2 ya estaba hecha, tras A2 se salta a A3.
          const conB2 = { ejercicios: [ej("A", 3, "ss1"), { ...ej("B", 2, "ss1"), series: [{ id: "B1", hecha: false }, { id: "B2", hecha: true }] }, ej("C", 2)] };
          const sinSuperserie = { ejercicios: [ej("A", 2), ej("B", 2)] };
          return comparar(
            { orden, trasA1, trasB1, trasA3, saltaHecha: siguienteSerie(conB2, "A", "A2").id, normal: ordenDeSeries(sinSuperserie).map((x) => x.id).join(" "), alFinal: siguienteSerie(s, "C", "C2") },
            { orden: "A1 B1 A2 B2 A3 C1 C2", trasA1: "B1", trasB1: "A2", trasA3: "C1", saltaHecha: "A3", normal: "A1 A2 B1 B2", alFinal: null }
          );
        },
      },
      {
        nombre: "G11: la superserie viaja de la rutina a la sesión y vuelve con aplicarARutina; crearla durante el entreno es un cambio de la rutina",
        ejecutar: () => {
          const rutina = { ...RUTINA_PRUEBA, ejercicios: RUTINA_PRUEBA.ejercicios.map((re) => ({ ...re, descansoSeg: re.descansoSeg ?? 120 })) };
          let s = nuevaSesion({ rutina, ahora: AHORA_SESION, ajustes: AJUSTES_PRUEBA, anteriorDe: anteriorPrueba });
          s.ejercicios.forEach((e) => e.series.forEach((sr) => { s = marcarHecha(s, e.inst, sr.id, AHORA_SESION, AJUSTES_PRUEBA); }));
          const unida = { ...s, ejercicios: unirSuperserie(s.ejercicios, 0) };
          const r = aplicarARutina(rutina, unida, "2026-10-25");
          const s2 = nuevaSesion({ rutina: r, ahora: AHORA_SESION, ajustes: AJUSTES_PRUEBA });
          return comparar(
            { antes: cambiosEstructurales(s, rutina), despues: cambiosEstructurales(unida, rutina), enRutina: !!r.ejercicios[0].superserie && r.ejercicios[0].superserie === r.ejercicios[1].superserie, enSesion: !!grupoDe(s2.ejercicios, 1), igualTrasAplicar: cambiosEstructurales(unida, r) },
            { antes: false, despues: true, enRutina: true, enSesion: true, igualTrasAplicar: false }
          );
        },
      },
      // ---------- Descanso de cada ejercicio (G3, 25-oct-2026) ----------
      {
        nombre: "G3: un ejercicio añadido sin rutina entra con el descanso de su ficha o el de los ajustes; descansoEjercicio cambia el de las series siguientes",
        ejecutar: () => {
          const descansoDe = (id) => (id === "ex_jalon_pecho" ? 75 : null);
          let s = nuevaSesion({ ahora: AHORA_SESION, ajustes: AJUSTES_PRUEBA });
          s = anadirEjercicios(s, ["ex_press_banca_barra", "ex_jalon_pecho"], { ajustes: AJUSTES_PRUEBA, descansoDe });
          const antes = s.ejercicios.map((e) => e.descansoSeg).join(",");
          const banca = s.ejercicios[0];
          const s90 = descansoEjercicio(s, banca.inst, 90);
          const marcada = marcarHecha(s90, banca.inst, banca.series[0].id, AHORA_SESION, AJUSTES_PRUEBA);
          const sinDescanso = marcarHecha(descansoEjercicio(s, banca.inst, 0), banca.inst, banca.series[0].id, AHORA_SESION, AJUSTES_PRUEBA);
          // 120 = ajustes (banca sin descanso propio), 75 = el de la ficha del jalón; tras cambiarlo a 90, la
          // serie marcada descansa 90 s; con 0, no arranca ninguno.
          return comparar(
            { antes, despues: s90.ejercicios[0].descansoSeg, otro: s90.ejercicios[1].descansoSeg, ms: marcada.descanso.hasta - AHORA_SESION, cero: sinDescanso.descanso },
            { antes: "120,75", despues: 90, otro: 75, ms: 90000, cero: null }
          );
        },
      },
      {
        nombre: "G3: un descanso cambiado durante el entreno cuenta como cambio de la rutina y aplicarARutina lo guarda",
        ejecutar: () => {
          const rutina = { ...RUTINA_PRUEBA, ejercicios: RUTINA_PRUEBA.ejercicios.map((re) => ({ ...re, descansoSeg: re.descansoSeg ?? 120 })) };
          let s = nuevaSesion({ rutina, ahora: AHORA_SESION, ajustes: AJUSTES_PRUEBA, anteriorDe: anteriorPrueba });
          s.ejercicios.forEach((ej) => ej.series.forEach((sr) => { s = marcarHecha(s, ej.inst, sr.id, AHORA_SESION, AJUSTES_PRUEBA); }));
          const cambiada = descansoEjercicio(s, s.ejercicios[1].inst, 90);
          const r = aplicarARutina(rutina, cambiada, "2026-10-25");
          return comparar(
            { igual: cambiosEstructurales(s, rutina), cambiada: cambiosEstructurales(cambiada, rutina), banca: r.ejercicios[0].descansoSeg, jalon: r.ejercicios[1].descansoSeg },
            { igual: false, cambiada: true, banca: 120, jalon: 90 }
          );
        },
      },
    ],
  };
}

// Sesión mínima terminada para los casos del almacén: un ejercicio con sus series (todas hechas).
function sesionAlmacen(id, inicio, series, { actualizado = 1, ejercicioId = "banca", nombre = "Torso" } = {}) {
  return { id, nombre, inicio, fin: inicio, pausas: [], actualizado, ejercicios: [{ inst: "ei_" + id, ejercicioId, nota: "", series: series.map(([kg, reps]) => serieP("normal", kg, reps)) }] };
}

function grupoEntrenoAlmacen() {
  const septiembre = { version: 1, mes: "2026-09", sesiones: [sesionAlmacen("s1", "2026-09-10T17:00:00.000Z", [[60, 10], [65, 8]])] };
  const octubre = { version: 1, mes: "2026-10", sesiones: [sesionAlmacen("s2", "2026-10-05T17:00:00.000Z", [[62.5, 8]]), sesionAlmacen("s3", "2026-10-20T17:00:00.000Z", [[60, 12]])] };
  return {
    grupo: "Entreno: almacén",
    casos: [
      {
        nombre: "claveMes y mesDe (hora local)",
        ejecutar: () => comparar(
          { clave: claveMes("2026-10"), mes: mesDe("2026-10-23T17:55:00.000Z") },
          { clave: "rueda-de-platos:entreno-2026-10-v1", mes: "2026-10" }
        ),
      },
      {
        nombre: "migrarCatalogo: vacío con ajustes por defecto; completa sin pisar lo elegido",
        ejecutar: () => {
          const vacio = migrarCatalogo(null);
          const viejo = migrarCatalogo({ version: 1, propios: [], personalizados: {}, rutinas: [], ajustes: { precargar: false, descansoSeg: 90 }, aviso: {} });
          return comparar(
            { changed: vacio.changed, precargar: vacio.valor.ajustes.precargar, descanso: vacio.valor.ajustes.descansoSeg, inicioViejo: viejo.valor.ajustes.inicioSemana, precargarViejo: viejo.valor.ajustes.precargar, descansoViejo: viejo.valor.ajustes.descansoSeg, cambioViejo: viejo.changed },
            { changed: true, precargar: true, descanso: 120, inicioViejo: 1, precargarViejo: false, descansoViejo: 90, cambioViejo: true }
          );
        },
      },
      {
        nombre: "migrarCatalogo (FitDraft): el paseo del descanso empieza encendido en los catálogos de antes; apagado se queda apagado",
        ejecutar: () => {
          const viejo = migrarCatalogo({ version: 1, propios: [], personalizados: {}, rutinas: [], ajustes: { descansoSeg: 90 }, aviso: {} });
          const apagado = migrarCatalogo({ version: 1, propios: [], personalizados: {}, rutinas: [], ajustes: { paseoDescanso: false }, aviso: {} });
          return comparar(
            { nuevo: migrarCatalogo(null).valor.ajustes.paseoDescanso, viejo: viejo.valor.ajustes.paseoDescanso, cambio: viejo.changed, apagado: apagado.valor.ajustes.paseoDescanso },
            { nuevo: true, viejo: true, cambio: true, apagado: false }
          );
        },
      },
      {
        nombre: "migrarCatalogo (G3): el descanso «de siempre» de una rutina pasa a ser el de la ficha del ejercicio o el de los ajustes; un número se conserva",
        ejecutar: () => {
          const guardado = {
            version: 1, ajustes: { descansoSeg: 90 }, aviso: {},
            personalizados: { ex_press_banca_barra: { descansoSeg: 150 } },
            propios: [{ id: "exp_a", nombre: "Mi máquina", tipo: "peso_reps", descansoSeg: 45 }],
            rutinas: [{ id: "r1", nombre: "A", ejercicios: [
              { ejercicioId: "ex_press_banca_barra", descansoSeg: null, series: [] },
              { ejercicioId: "ex_jalon_pecho", series: [] },
              { ejercicioId: "exp_a", descansoSeg: null, series: [] },
              { ejercicioId: "ex_curl_barra", descansoSeg: 75, series: [] },
            ] }],
          };
          const m = migrarCatalogo(guardado);
          const otraVez = migrarCatalogo(m.valor);
          return comparar(
            { descansos: m.valor.rutinas[0].ejercicios.map((re) => re.descansoSeg).join(","), changed: m.changed, segunda: otraVez.changed, original: guardado.rutinas[0].ejercicios[0].descansoSeg },
            { descansos: "150,90,45,75", changed: true, segunda: false, original: null }
          );
        },
      },
      {
        nombre: "anadirSesionAMes ordena por inicio y, con el mismo id, gana el actualizado mayor",
        ejecutar: () => {
          let m = { version: 1, mes: "2026-10", sesiones: [] };
          m = anadirSesionAMes(m, sesionAlmacen("b", "2026-10-20T17:00:00.000Z", [[60, 10]], { actualizado: 5 }));
          m = anadirSesionAMes(m, sesionAlmacen("a", "2026-10-05T17:00:00.000Z", [[60, 10]]));
          const masNueva = anadirSesionAMes(m, sesionAlmacen("b", "2026-10-20T17:00:00.000Z", [[70, 10]], { actualizado: 9 }));
          const masVieja = anadirSesionAMes(m, sesionAlmacen("b", "2026-10-20T17:00:00.000Z", [[50, 10]], { actualizado: 2 }));
          return comparar(
            { orden: m.sesiones.map((x) => x.id).join(","), nueva: masNueva.sesiones[1].ejercicios[0].series[0].kg, vieja: masVieja.sesiones[1].ejercicios[0].series[0].kg, total: masNueva.sesiones.length },
            { orden: "a,b", nueva: 70, vieja: 60, total: 2 }
          );
        },
      },
      {
        nombre: "fusionarMeses une por id y gana el actualizado mayor",
        ejecutar: () => {
          const a = { version: 1, mes: "2026-10", sesiones: [sesionAlmacen("x", "2026-10-01T10:00:00.000Z", [[40, 10]], { actualizado: 1 }), sesionAlmacen("y", "2026-10-03T10:00:00.000Z", [[40, 10]])] };
          const b = { version: 1, mes: "2026-10", sesiones: [sesionAlmacen("x", "2026-10-01T10:00:00.000Z", [[45, 10]], { actualizado: 3 }), sesionAlmacen("z", "2026-10-02T10:00:00.000Z", [[40, 10]])] };
          const f = fusionarMeses(a, b);
          return comparar({ ids: f.sesiones.map((x) => x.id).join(","), x: f.sesiones[0].ejercicios[0].series[0].kg }, { ids: "x,z,y", x: 45 });
        },
      },
      {
        nombre: "reconstruirIndice: «anterior» de la sesión más reciente, récords máximos y sesiones por mes",
        ejecutar: () => {
          const ind = reconstruirIndice([septiembre, octubre], ejercicioPrueba, 80);
          const b = ind.ejercicios.banca;
          // Peso máximo 65 (s1); 1RM: 60 × 1,4 = 84 (s3) > 65 × (1 + 8/30) = 82,3 (s1); mejor serie 60 × 12 = 720 (s3);
          // mejor volumen de sesión: s1 = 600 + 520 = 1120.
          return comparar(
            {
              ultima: b.ultima.sesionId, kgUltima: b.ultima.series[0].kg, sesiones: b.sesiones, sep: ind.meses["2026-09"], oct: ind.meses["2026-10"],
              pesoMax: b.records.pesoMax.valor, pesoMaxDe: b.records.pesoMax.sesionId, e1rm: b.records.e1rm.valor, mejorSerie: b.records.mejorSerie.valor, volumen: b.records.volumenSesion.valor,
            },
            { ultima: "s3", kgUltima: 60, sesiones: 3, sep: 1, oct: 2, pesoMax: 65, pesoMaxDe: "s1", e1rm: 84, mejorSerie: 720, volumen: 1120 }
          );
        },
      },
      {
        nombre: "actualizarIndiceConSesion da lo mismo que reconstruir con esa sesión añadida",
        ejecutar: () => {
          const nueva = sesionAlmacen("s4", "2026-10-23T17:00:00.000Z", [[70, 5], [60, 10]]);
          const incremental = actualizarIndiceConSesion(reconstruirIndice([septiembre, octubre], ejercicioPrueba, 80), nueva, ejercicioPrueba, 80);
          const completo = reconstruirIndice([septiembre, anadirSesionAMes(octubre, nueva)], ejercicioPrueba, 80);
          return comparar({ iguales: JSON.stringify(incremental) === JSON.stringify(completo), pesoMax: incremental.ejercicios.banca.records.pesoMax.valor }, { iguales: true, pesoMax: 70 });
        },
      },
      // ---------- «Anterior» equivalente (G4, 25-oct-2026) ----------
      {
        nombre: "G4: «anterior» de la última sesión de la misma rutina; rutina nueva, sin rutina o ejercicio que no estaba, la última vez a secas",
        ejecutar: () => {
          const ses = (id, inicio, rutinaId, ejercicios) => ({
            id, nombre: "x", rutinaId, inicio, fin: inicio, pausas: [], actualizado: 1,
            ejercicios: ejercicios.map(([eid, series], k) => ({ inst: `ei_${id}_${k}`, ejercicioId: eid, nota: "", series: series.map(([kg, reps]) => serieP("normal", kg, reps)) })),
          });
          // Lunes, «Pecho» con la banca de primero; jueves, «Torso» con la banca de segundo (más cansado);
          // viernes, un entreno suelto sin rutina.
          const oct = { version: 1, mes: "2026-10", sesiones: [
            ses("p1", "2026-10-19T17:00:00.000Z", "rt_pecho", [["banca", [[80, 8], [80, 7]]]]),
            ses("t1", "2026-10-22T17:00:00.000Z", "rt_torso", [["curl", [[30, 10]]], ["banca", [[70, 10], [70, 9]]]]),
            ses("l1", "2026-10-23T17:00:00.000Z", null, [["banca", [[60, 12]]]]),
          ] };
          const ind = reconstruirIndice([oct], ejercicioPrueba, 80);
          const txt = (series) => series.map((s) => `${s.kg}x${s.reps}`).join(" ");
          return comparar(
            {
              pecho: txt(anteriorEquivalente(ind, "banca", { rutinaId: "rt_pecho" })), torso: txt(anteriorEquivalente(ind, "banca", { rutinaId: "rt_torso" })),
              nueva: txt(anteriorEquivalente(ind, "banca", { rutinaId: "rt_nueva" })), sinRutina: txt(anteriorEquivalente(ind, "banca")),
              noEstaba: txt(anteriorEquivalente(ind, "curl", { rutinaId: "rt_pecho" })),
            },
            { pecho: "80x8 80x7", torso: "70x10 70x9", nueva: "60x12", sinRutina: "60x12", noEstaba: "30x10" }
          );
        },
      },
      {
        nombre: "G4: el mismo ejercicio dos veces en una rutina, cada uno con el suyo al precargar; un índice de antes de G4 pide reconstruirse",
        ejecutar: () => {
          const sesion = {
            id: "d1", nombre: "Doble", rutinaId: "rt_doble", inicio: "2026-10-20T17:00:00.000Z", fin: "2026-10-20T18:00:00.000Z", pausas: [], actualizado: 1,
            ejercicios: [
              { inst: "a", ejercicioId: "banca", nota: "", series: [serieP("normal", 90, 5)] },
              { inst: "b", ejercicioId: "banca", nota: "", series: [serieP("normal", 60, 12)] },
            ],
          };
          const ind = reconstruirIndice([{ version: 1, mes: "2026-10", sesiones: [sesion] }], ejercicioPrueba, 80);
          const rutina = { id: "rt_doble", nombre: "Doble", ejercicios: [
            { ejercicioId: "banca", descansoSeg: 120, series: [{ tipo: "normal" }] },
            { ejercicioId: "banca", descansoSeg: 120, series: [{ tipo: "normal" }] },
          ] };
          const s = nuevaSesion({ rutina, ahora: AHORA_SESION, ajustes: { precargar: true, descansoSeg: 120 }, anteriorDe: (id, ctx) => anteriorEquivalente(ind, id, ctx) });
          const viejo = migrarIndice({ version: 1, meses: { "2026-10": 1 }, ejercicios: {} });
          return comparar(
            { primero: s.ejercicios[0].series[0].kg, segundo: s.ejercicios[1].series[0].kg, reconstruir: viejo.reconstruir, rutinas: typeof viejo.valor.rutinas, actual: migrarIndice(ind).reconstruir },
            { primero: 90, segundo: 60, reconstruir: true, rutinas: "object", actual: false }
          );
        },
      },
      {
        nombre: "elegirBorrador y la cola de envíos pendientes",
        ejecutar: () => {
          const local = { id: "ses_1", actualizado: 200 };
          const nube = { id: "ses_1", actualizado: 100 };
          let cola = encolar([], local);
          cola = encolar(cola, { ...local, actualizado: 300 });
          return comparar(
            { gana: elegirBorrador(local, nube).actualizado, soloNube: elegirBorrador(null, nube).actualizado, ninguno: elegirBorrador(null, null), cola: cola.length, ultima: cola[0].actualizado, vacia: quitarDeCola(cola, "ses_1").length },
            { gana: 200, soloNube: 100, ninguno: null, cola: 1, ultima: 300, vacia: 0 }
          );
        },
      },
      {
        nombre: "sesionesACSV: cabecera fija, una fila por serie y comillas si el nombre lleva «;»",
        ejecutar: () => {
          const s = sesionAlmacen("c1", "2026-10-23T17:00:00.000Z", [[61.3, 10], [59, 6]], { nombre: "Torso; día A" });
          const csv = sesionesACSV([s], () => "Press banca", "es").split("\n");
          return comparar(
            { cabecera: csv[0], filas: csv.length - 1, entreno: csv[1].split(";")[1], kg: csv[1].includes(";61,3;10;") },
            { cabecera: CABECERA_CSV, filas: 2, entreno: '"Torso', kg: true }
          );
        },
      },
    ],
  };
}

// ---------- Informes cruzados (fase K2) ----------
// Un mes de 30 días (septiembre de 2026, ya terminado): 12 sesiones de 1 h en 10 días distintos; peso
// 80 kg; en el perfil, 4 sesiones de pesas de 1 h a la semana; 4 comidas al día, todas hechas los días con
// entreno y 2 de 4 los demás.
function escenarioInforme() {
  const perfil = {
    anioNacimiento: new Date().getFullYear() - 31, altura: 180, peso: 80, sexo: "hombre", palBase: "escritorio",
    objetivo: "mantenimiento", entrenamientos: [{ tipo: "pesas", horas: 1, frecuenciaSemanal: 4 }], calibracionKcal: 0,
    repartoComidas: { Desayuno: 0.2, Comida: 0.35, Merienda: 0.15, Cena: 0.3 },
  };
  const dia = (d) => `2026-09-${String(d).padStart(2, "0")}`;
  const comidasCompletadas = {};
  for (let d = 1; d <= 30; d++) {
    comidasCompletadas[dia(d)] = d <= 10 ? { Desayuno: true, Comida: true, Merienda: true, Cena: true } : { Comida: true, Cena: true };
  }
  const sesion = (d, hora) => ({ id: `s${d}${hora}`, inicio: `${dia(d)}T${hora}:00:00.000Z`, fin: `${dia(d)}T${String(Number(hora) + 1).padStart(2, "0")}:00:00.000Z`, pausas: [], ejercicios: [] });
  const sesiones = [...Array.from({ length: 10 }, (_, i) => sesion(i + 1, "08")), sesion(1, "17"), sesion(2, "17")];
  return { data: { perfil, comidasCompletadas, pesoTracking: null }, sesiones };
}

function grupoInformes() {
  return {
    grupo: "Informes cruzados",
    casos: [
      {
        nombre: "declaradoPorSemana suma solo las sesiones de pesas del perfil",
        ejecutar: () => comparar(
          { n: declaradoPorSemana({ entrenamientos: [{ tipo: "pesas", frecuenciaSemanal: 3 }, { tipo: "correr", frecuenciaSemanal: 2 }, { tipo: "pesas", frecuenciaSemanal: 1 }] }), vacio: declaradoPorSemana(null) },
          { n: 4, vacio: 0 }
        ),
      },
      {
        nombre: "Declarado frente a real: 2,8 sesiones/semana registradas y 192 kcal/día frente a 274",
        ejecutar: () => {
          const { data, sesiones } = escenarioInforme();
          const r = informeCruzadoMes({ data, sesionesMes: sesiones, sesionesMesAnterior: [], ejercicioDe: ejercicioPrueba, mesISO: "2026-09", hoy: "2026-10-05" });
          // 12 ÷ 30 × 7 = 2,8; 12 h × 6 MET × 80 kg ÷ 30 días = 192; 6 × 80 × 1 h × 4 ÷ 7 = 274,3 → 274 (el objetivo redondea).
          return comparar(
            { dias: r.dias, sesiones: r.sesiones, horas: r.horas, declaradas: r.declarado.declaradasSemana, registradas: r.declarado.registradasSemana, estimadas: r.declarado.kcalEstimadas, declaradasKcal: r.declarado.kcalDeclaradas },
            { dias: 30, sesiones: 12, horas: 12, declaradas: 4, registradas: 2.8, estimadas: 192, declaradasKcal: 274 }
          );
        },
      },
      {
        nombre: "Constancia: 100 % de comidas hechas en días con entreno frente a 50 % sin entreno",
        ejecutar: () => {
          const { data, sesiones } = escenarioInforme();
          const r = informeCruzadoMes({ data, sesionesMes: sesiones, sesionesMesAnterior: [], ejercicioDe: ejercicioPrueba, mesISO: "2026-09", hoy: "2026-10-05" });
          return comparar({ con: r.constancia.conEntreno, sin: r.constancia.sinEntreno, diasCon: r.constancia.diasCon, diasSin: r.constancia.diasSin }, { con: 100, sin: 50, diasCon: 10, diasSin: 20 });
        },
      },
      {
        nombre: "Mes frente a mes: diferencia de sesiones respecto al mes anterior",
        ejecutar: () => {
          const { data, sesiones } = escenarioInforme();
          const r = informeCruzadoMes({ data, sesionesMes: sesiones, sesionesMesAnterior: sesiones.slice(0, 9), ejercicioDe: ejercicioPrueba, mesISO: "2026-09", hoy: "2026-10-05" });
          return comparar({ sesiones: r.variacion.sesiones, mesAnterior: r.anterior.mes, volumen: r.variacion.volumenPct }, { sesiones: 3, mesAnterior: "2026-08", volumen: null });
        },
      },
    ],
  };
}

// ---------- Aviso de actividad (fase K3) ----------
// Hoy: viernes 23-10-2026. Las 3 últimas semanas completas empiezan el 28-9, el 5-10 y el 12-10.
const SEMANAS_AVISO = ["2026-09-28", "2026-10-05", "2026-10-12"];
const semanasCon = (ns) => ns.map((n, i) => ({ inicio: SEMANAS_AVISO[i], n }));
const avisoDe = (declarado, ns, extra = {}) => {
  const r = evaluarAvisoActividad({ declaradoSemana: declarado, semanas: semanasCon(ns), totalRegistradas: 10, hoy: "2026-10-23", aviso: {}, ...extra });
  return r ? r.tipo : "nada";
};

function grupoAvisoActividad() {
  return {
    grupo: "Aviso de actividad",
    casos: [
      {
        nombre: "sesionesPorSemana: las 3 últimas semanas completas, sin cardio ni la semana actual",
        ejecutar: () => {
          const ej = (id) => ({ ejercicioId: id, series: [serieP("normal", 50, 10)] });
          const ses = (dia, id) => ({ inicio: `2026-10-${dia}T17:00:00.000Z`, ejercicios: [ej(id)] });
          // 6-10: banca (cuenta); 7-10: solo cinta (no cuenta); 13 y 15-10: banca; 20-10: semana actual (no cuenta).
          const r = sesionesPorSemana([ses("06", "banca"), ses("07", "cinta"), ses("13", "banca"), ses("15", "curl"), ses("20", "banca")], ejercicioPrueba, 1, "2026-10-23", 3);
          return comparar({ inicios: r.map((s) => s.inicio).join(","), n: r.map((s) => s.n).join(",") }, { inicios: SEMANAS_AVISO.join(","), n: "0,1,2" });
        },
      },
      {
        nombre: "«Menos»: declara 4 y registra [1,1,1]; con [1,3,1] no avisa",
        ejecutar: () => comparar({ menos: avisoDe(4, [1, 1, 1]), mezcla: avisoDe(4, [1, 3, 1]) }, { menos: "menos", mezcla: "nada" }),
      },
      {
        nombre: "No avisa con una pausa en la 2.ª semana, con 3 sesiones en total, silenciado o recién descartado",
        ejecutar: () => comparar(
          {
            pausa: avisoDe(4, [1, 1, 1], { aviso: { pausa: { desde: "2026-10-07", hasta: "2026-10-09" } } }),
            pocas: avisoDe(4, [1, 1, 1], { totalRegistradas: 3 }),
            silenciado: avisoDe(4, [1, 1, 1], { aviso: { silenciadoHasta: "2026-10-24" } }),
            descartado: avisoDe(4, [1, 1, 1], { aviso: { descartadoEl: "2026-10-15" } }),
            descartadoHaceTiempo: avisoDe(4, [1, 1, 1], { aviso: { descartadoEl: "2026-10-01" } }),
          },
          { pausa: "nada", pocas: "nada", silenciado: "nada", descartado: "nada", descartadoHaceTiempo: "menos" }
        ),
      },
      {
        nombre: "«Más»: declara 2 y registra [4,4,4]; declara 0 y registra [2,3,2]; declara 4 y [2,2,2] no avisa",
        ejecutar: () => comparar({ mas: avisoDe(2, [4, 4, 4]), ceroDeclarado: avisoDe(0, [2, 3, 2]), limite: avisoDe(4, [2, 2, 2]) }, { mas: "mas", ceroDeclarado: "mas", limite: "nada" }),
      },
      // ---------- Grupos sin entrenar (G8, 25-oct-2026) ----------
      // Hoy: 25-10-2026. 21 días antes es el 4-10.
      {
        nombre: "G8: última vez por grupo desde el índice y la cola (solo el músculo principal; abdomen y cardio no cuentan)",
        ejecutar: () => {
          const musculos = { banca: "pecho", curl: "biceps", cinta: "cardio", sentadilla: "cuadriceps", remo: "dorsales", plancha: "abdomen" };
          const ejercicioDe = (id) => (musculos[id] ? { musculo: musculos[id] } : null);
          const indice = { ejercicios: {
            banca: { ultima: { fecha: "2026-10-20" } }, curl: { ultima: { fecha: "2026-09-30" } }, cinta: { ultima: { fecha: "2026-10-24" } },
            sentadilla: { ultima: { fecha: "2026-09-01" } }, remo: { ultima: { fecha: "2026-10-01" } }, plancha: { ultima: { fecha: "2026-10-24" } },
          } };
          const cola = [{ inicio: "2026-10-03T17:00:00.000Z", ejercicios: [{ ejercicioId: "remo", series: [{ hecha: true }] }, { ejercicioId: "curl", series: [{ hecha: false }] }] }];
          const u = ultimaVezPorGrupo(indice, ejercicioDe, cola);
          return comparar(
            { pecho: u.pecho, brazos: u.brazos, pierna: u.pierna, espalda: u.espalda, hombros: u.hombros, grupos: Object.keys(u).sort().join(",") },
            { pecho: "2026-10-20", brazos: "2026-09-30", pierna: "2026-09-01", espalda: "2026-10-03", hombros: undefined, grupos: "brazos,espalda,pecho,pierna" }
          );
        },
      },
      {
        nombre: "G8: avisa de los grupos con 21 días o más, del más olvidado al menos; nunca entrenado o sin nada reciente no avisa",
        ejecutar: () => {
          const ultimaVez = { pecho: "2026-10-20", brazos: "2026-09-30", pierna: "2026-09-01", espalda: "2026-10-04", hombros: "2026-10-05" };
          const r = gruposSinEntrenar({ ultimaVez, hoy: "2026-10-25", aviso: {} });
          // pierna 54 días, brazos 25, espalda justo 21; hombros 20 (aún no); pecho 5.
          const todoViejo = gruposSinEntrenar({ ultimaVez: { pecho: "2026-09-01", pierna: "2026-09-02" }, hoy: "2026-10-25", aviso: {} });
          return comparar(
            { grupos: r.map((x) => x.grupo).join(","), dias: r.map((x) => x.dias).join(","), todoViejo: todoViejo.length, nunca: gruposSinEntrenar({ ultimaVez: {}, hoy: "2026-10-25" }).length },
            { grupos: "pierna,brazos,espalda", dias: "54,25,21", todoViejo: 0, nunca: 0 }
          );
        },
      },
      {
        nombre: "G8: un grupo cerrado no vuelve a salir en 14 días; una pausa en esas 3 semanas no avisa",
        ejecutar: () => {
          const ultimaVez = { pecho: "2026-10-20", pierna: "2026-09-01", brazos: "2026-09-30" };
          const grupos = (aviso, hoy = "2026-10-25") => gruposSinEntrenar({ ultimaVez, hoy, aviso }).map((x) => x.grupo).join(",");
          return comparar(
            {
              cerradoAyer: grupos({ grupos: { pierna: "2026-10-24" } }),
              cerradoHace14: grupos({ grupos: { pierna: "2026-10-11" } }),
              pausaAbierta: grupos({ pausa: { desde: "2026-10-22", hasta: null } }),
              pausaVieja: grupos({ pausa: { desde: "2026-08-01", hasta: "2026-08-15" } }),
            },
            { cerradoAyer: "brazos", cerradoHace14: "pierna,brazos", pausaAbierta: "", pausaVieja: "pierna,brazos" }
          );
        },
      },
    ],
  };
}

// ---------- Lo comido de verdad (B1 + B3, 25-oct-2026) ----------
// Una comida con pollo (150 g), pasta (80 g) y ensalada (150 g, la verdura: no cuenta en las kcal), y un
// desayuno compuesto de pan de molde (60 g) y pavo (40 g). Kcal del catálogo semilla: pollo 165, pasta
// 357, ensalada 25, ñoquis 156, patata 77, tomate 18, pavo 90, jamón 212 (por 100 g).
function escenarioComidaReal() {
  const data = {
    foods: FOODS_SEED.map((f) => ({ ...f })),
    ingredients: [
      { id: "i_pollo", name: "Pollo", category: "proteina", foodId: "f_pechuga_pollo", gramos: 150 },
      { id: "i_pasta", name: "Pasta", category: "carbo", foodId: "f_pasta", gramos: 80 },
      { id: "i_ensalada", name: "Ensalada", category: "verdura", foodId: "f_ensalada", gramos: 150 },
      { id: "i_tostadas", name: "Tostadas", category: "desayuno", composicion: [{ id: "c1", foodId: "f_pan_molde", gramos: 60 }, { id: "c2", foodId: "f_pavo", gramos: 40 }] },
    ],
    comidasCompletadas: {},
  };
  const comida = { id: "m1", week: 1, day: "Lunes", mealType: "Comida", protein: "Pollo", carbo: "Pasta", verdura: "Ensalada" };
  const desayuno = { id: "m2", week: 1, day: "Lunes", mealType: "Desayuno", item: "Tostadas" };
  return { data, comida, desayuno };
}

function grupoComidaReal() {
  return {
    grupo: "Lo comido de verdad (B1 + B3)",
    casos: [
      {
        nombre: "Líneas de una comida (la verdura no cuenta) y, sin cambios, lo comido es lo del menú: 247,5 + 285,6 = 533,1 kcal",
        ejecutar: () => {
          const { data, comida, desayuno } = escenarioComidaReal();
          const l = lineasComida(data, comida);
          const real = comidaReal(data, comida, {});
          return comparar(
            {
              claves: l.map((x) => x.clave).join(","), gramos: l.map((x) => x.gramos).join(","), cuentan: l.map((x) => x.cuenta).join(","),
              kcal: real.macros.kcal, menu: real.planificadas.kcal, hayCambios: real.hayCambios,
              desayuno: lineasComida(data, desayuno).map((x) => `${x.clave}=${x.foodId}`).join(","),
            },
            { claves: "protein,carbo,verdura", gramos: "150,80,150", cuentan: "true,true,false", kcal: 533.1, menu: 533.1, hayCambios: false, desayuno: "item:0=f_pan_molde,item:1=f_pavo" }
          );
        },
      },
      {
        nombre: "Cantidad propuesta con las mismas kcal, redondeada sin pasar del ±10 %",
        ejecutar: () => {
          const { data, comida, desayuno } = escenarioComidaReal();
          const [, pasta, verdura] = lineasComida(data, comida);
          const [, pavo] = lineasComida(data, desayuno);
          // Pasta: 285,6 kcal ÷ 1,56 (ñoquis) = 183,1 g → de 10 en 10: 180. Ensalada: 37,5 kcal ÷ 0,77 (patata) =
          // 48,7 g → de 5 en 5: 50. Pavo: 36 kcal ÷ 2,12 (jamón) = 17,0 g → al gramo: 17.
          return comparar(
            {
              nyoquis: propuestaGramos(data, pasta, "f_gnocchi"), patata: propuestaGramos(data, verdura, "f_patata"), jamon: propuestaGramos(data, pavo, "f_jamon"),
              r8: redondearRazonable(8.4), r47: redondearRazonable(47), r183: redondearRazonable(183), r312: redondearRazonable(312), r0: redondearRazonable(0),
            },
            { nyoquis: 180, patata: 50, jamon: 17, r8: 8, r47: 45, r183: 180, r312: 300, r0: 0 }
          );
        },
      },
      {
        nombre: "Cambios: 300 g de ñoquis por la pasta = 715,5 kcal; sin el pollo = 285,6; la verdura por patata cuenta y por tomate no",
        ejecutar: () => {
          const { data, comida } = escenarioComidaReal();
          const kcal = (cambios) => Math.round(comidaReal(data, comida, cambios).macros.kcal * 10) / 10;
          return comparar(
            {
              nyoquis: kcal({ carbo: { foodId: "f_gnocchi", gramos: 300 } }),
              sinPollo: kcal({ protein: { omitido: true } }),
              patata: kcal({ verdura: { foodId: "f_patata", gramos: 50 } }),
              tomate: kcal({ verdura: { foodId: "f_tomate", gramos: 150 } }),
            },
            { nyoquis: 715.5, sinPollo: 285.6, patata: 571.6, tomate: 533.1 }
          );
        },
      },
      {
        nombre: "Para elegir: primero la misma carpeta y después el resto, sin repetir el propio alimento",
        ejecutar: () => {
          const { data, comida } = escenarioComidaReal();
          const pasta = lineasComida(data, comida)[1];
          const o = opcionesCambio(data, pasta);
          const total = o.mismaCarpeta.length + o.resto.length;
          return comparar(
            { primera: o.mismaCarpeta.every((f) => f.categoria === "carbohidratos"), sinPasta: ![...o.mismaCarpeta, ...o.resto].some((f) => f.id === "f_pasta"), total, todos: data.foods.length - 1 },
            { primera: true, sinPasta: true, total: data.foods.length - 1, todos: data.foods.length - 1 }
          );
        },
      },
      {
        nombre: "registroComida guarda la comida, sus macros y solo los cambios de verdad; la despensa descuenta lo comido",
        ejecutar: () => {
          const { data, comida } = escenarioComidaReal();
          const sinCambios = registroComida(data, comida);
          const igual = registroComida(data, comida, { carbo: { foodId: "f_pasta", gramos: 80 } });
          const cambiado = registroComida(data, comida, { carbo: { foodId: "f_gnocchi", gramos: 300 }, protein: { omitido: true } });
          const nec = necesidadesComidaReal(data, comida, cambiado.cambios);
          return comparar(
            {
              hecha: sinCambios.hecha, slot: sinCambios.slotId, kcal: sinCambios.macros.kcal, sinClave: sinCambios.cambios === undefined, igualSinCambios: igual.cambios === undefined,
              kcalCambiado: cambiado.macros.kcal, claves: Object.keys(cambiado.cambios).sort().join(","),
              necesidades: nec.map((n) => `${n.foodId}:${n.gramos}`).join(","),
            },
            {
              hecha: true, slot: "m1", kcal: 533, sinClave: true, igualSinCambios: true, kcalCambiado: 468, claves: "carbo,protein",
              necesidades: "f_gnocchi:300,f_ensalada:null",
            }
          );
        },
      },
      {
        nombre: "Despensa: al guardar los cambios devuelve lo de la pasta y descuenta los ñoquis; al desmarcar, todo vuelve",
        ejecutar: () => {
          const { data, comida } = escenarioComidaReal();
          let d = conItems([{ id: "a", foodId: "f_pasta", zona: "despensa", gramos: 500 }, { id: "b", foodId: "f_gnocchi", zona: "nevera", gramos: 400 }, { id: "c", foodId: "f_pechuga_pollo", zona: "nevera", gramos: 600 }]);
          d = descontarComida(d, { fecha: HOY, mealType: "Comida", slotId: "m1", necesidades: necesidadesComida(data, comida) });
          const trasHecha = d.items.map((i) => i.gramos).join(",");
          const cambios = registroComida(data, comida, { carbo: { foodId: "f_gnocchi", gramos: 300 } }).cambios;
          d = descontarComida(d, { fecha: HOY, mealType: "Comida", slotId: "m1", necesidades: necesidadesComidaReal(data, comida, cambios) });
          const trasCambios = d.items.map((i) => i.gramos).join(",");
          d = devolverComida(d, { fecha: HOY, mealType: "Comida" });
          return comparar(
            { trasHecha, trasCambios, trasDesmarcar: d.items.map((i) => i.gramos).join(",") },
            { trasHecha: "420,400,450", trasCambios: "500,100,450", trasDesmarcar: "500,400,600" }
          );
        },
      },
      {
        nombre: "Las kcal del día del menú usan lo comido de verdad en la comida cambiada (715,5 + 195 del desayuno)",
        ejecutar: () => {
          const { data, comida, desayuno } = escenarioComidaReal();
          // Desayuno: pan 265 × 0,6 = 159 + pavo 90 × 0,4 = 36 → 195 kcal.
          data.comidasCompletadas = { "2026-10-25": { Comida: registroComida(data, comida, { carbo: { foodId: "f_gnocchi", gramos: 300 } }) } };
          const t = totalesDiaReal(data, [comida, desayuno], 1, "Lunes");
          const sinNada = totalesDiaReal({ ...data, comidasCompletadas: {} }, [comida, desayuno], 1, "Lunes");
          return comparar(
            { kcal: Math.round(t.kcal * 10) / 10, cambiadas: t.cambiadas, menu: Math.round(sinNada.kcal * 10) / 10, encontrado: registroDeSlot(data.comidasCompletadas, "m1").slotId },
            { kcal: 910.5, cambiadas: 1, menu: 728.1, encontrado: "m1" }
          );
        },
      },
      {
        nombre: "migrateData: cada comida hecha `true` pasa a { hecha: true } sin tocar las que ya son registros; dos pasadas, igual",
        ejecutar: () => {
          const registro = { hecha: true, slotId: "x", macros: { kcal: 500, prot: 30, fat: 10, carb: 60 } };
          const { data, changed } = migrateData({ comidasCompletadas: { "2026-10-20": { Comida: true, Cena: registro }, "2026-10-21": { Desayuno: true } } });
          const segunda = migrateData(JSON.parse(JSON.stringify(data)));
          return comparar(
            {
              changed, comida: JSON.stringify(data.comidasCompletadas["2026-10-20"].Comida), cena: data.comidasCompletadas["2026-10-20"].Cena.slotId,
              desayuno: JSON.stringify(data.comidasCompletadas["2026-10-21"].Desayuno), segunda: segunda.changed, hecha: estaHecha(data.comidasCompletadas["2026-10-21"].Desayuno),
              viejoHecho: estaHecha(true), nada: estaHecha(undefined),
            },
            { changed: true, comida: '{"hecha":true}', cena: "x", desayuno: '{"hecha":true}', segunda: false, hecha: true, viejoHecho: true, nada: false }
          );
        },
      },
    ],
  };
}

// ---------- Importar de Hevy y Lyfta (G10, 25-oct-2026) ----------
// CSV **inventados** con el mismo formato que las exportaciones reales (que nunca se copian al repositorio):
// cabeceras, fechas, tipos de serie, RPE/RIR, superseries, comas dentro de comillas y cardio.
const CSV_HEVY = [
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
  '"Pierna","Mar 3, 2026, 6:30 PM","Mar 3, 2026, 7:40 PM","Buen día","Squat (Barbell)",,"",0,"warmup",40,10,,,',
  '"Pierna","Mar 3, 2026, 6:30 PM","Mar 3, 2026, 7:40 PM","Buen día","Squat (Barbell)",,"",1,"normal",80,8,,,8',
  '"Pierna","Mar 3, 2026, 6:30 PM","Mar 3, 2026, 7:40 PM","Buen día","Leg Extension (Machine)",0,"",0,"normal",50,12,,,',
  '"Pierna","Mar 3, 2026, 6:30 PM","Mar 3, 2026, 7:40 PM","Buen día","Lying Leg Curl (Machine)",0,"",0,"failure",40,10,,,10',
  '"Pierna","Mar 3, 2026, 6:30 PM","Mar 3, 2026, 7:40 PM","Buen día","Zancada inventada, con coma",,"",0,"normal",20,10,,,',
  '"Cardio","Mar 5, 2026, 12:10 AM","Mar 5, 2026, 12:40 AM","","Treadmill",,"",0,"normal",,,3.2,1800,',
].join("\n");

const CSV_LYFTA = [
  "Title,Date,Duration,Description,Notes,Exercise,Exercise Note,Superset id,Weight,Reps,RIR/RPE,Distance,Time,Set Type,RecordLevel: gold/silver/bronze,RecordType: 1RM / max_weight / volume / reps",
  "Torso,2026-09-10 07:15:00,01:05:30,,,Pulldown,,,30.000,10,,,,WARMUP_SET,,",
  'Torso,2026-09-10 07:15:00,01:05:30,,,Pulldown,,,55.500,9,1,,,NORMAL_SET,"2,1","1,3"',
  "Torso,2026-09-10 07:15:00,01:05:30,,,Lever Seated Fly,,2,50.000,12,8,,,NORMAL_SET,,",
  "Torso,2026-09-10 07:15:00,01:05:30,,,Cable one arm row,,2,12.000,12,0,,,NORMAL_SET,,",
  "Torso,2026-09-10 07:15:00,01:05:30,,,Captains Chair Straight Leg Raise,,,,15,0,,,NORMAL_SET,,",
  "Torso,2026-09-10 07:15:00,01:05:30,,,Walking,,,,,,2.5,15:00,NORMAL_SET,,",
].join("\r\n");

const opcionesImportar = (existentes = []) => ({ lista: listaEjercicios(null), nombresDe: nombresParaEmparejar, existentes });
const horaLocal = (iso) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };

function grupoImportar() {
  return {
    grupo: "Entreno: importar de Hevy y Lyfta (G10)",
    casos: [
      {
        nombre: "leerCSV: BOM, «;», comillas dobladas, separador dentro de comillas y CRLF; detectarFormato",
        ejecutar: () => {
          const filas = leerCSV("﻿a;b\r\n\"x;y\";\"di \"\"hola\"\"\"\r\n");
          return comparar(
            {
              filas: JSON.stringify(filas), hevy: detectarFormato(leerCSV(CSV_HEVY)[0]), lyfta: detectarFormato(leerCSV(CSV_LYFTA)[0]),
              otro: detectarFormato(["fecha", "entreno", "ejercicio"]),
            },
            { filas: JSON.stringify([["a", "b"], ["x;y", 'di "hola"']]), hevy: "hevy", lyfta: "lyfta", otro: null }
          );
        },
      },
      {
        nombre: "Fechas y duraciones: «Mar 3, 2026, 6:30 PM», «12:10 AM», «2026-09-10 07:15:00», «01:23:33» y «15:00»",
        ejecutar: () => comparar(
          {
            tarde: horaLocal(fechaHevy("Mar 3, 2026, 6:30 PM")), medianoche: horaLocal(fechaHevy("Mar 5, 2026, 12:10 AM")),
            mediodia: horaLocal(fechaHevy("Jun 14, 2026, 12:05 PM")), europeo: horaLocal(fechaHevy("14 Jun 2026, 09:03")),
            lyfta: horaLocal(fechaLyfta("2026-09-10 07:15:00")), largo: segundosDeTexto("01:23:33"), corto: segundosDeTexto("15:00"), malo: fechaHevy("ayer"),
          },
          { tarde: "3/3 18:30", medianoche: "3/5 0:10", mediodia: "6/14 12:05", europeo: "6/14 9:03", lyfta: "9/10 7:15", largo: 5013, corto: 900, malo: null }
        ),
      },
      {
        nombre: "Hevy: sesiones, series (calentamiento, al fallo), RIR = 10 − RPE, superserie y emparejamiento con la biblioteca",
        ejecutar: () => {
          const p = prepararImportacion(CSV_HEVY, opcionesImportar());
          const [pierna, cardio] = p.entrenos;
          const id = (n) => (p.ejercicios.find((x) => x.nombre === n) || {}).ejercicioId;
          return comparar(
            {
              formato: p.formato, entrenos: p.entrenos.length, series: p.series, inicio: horaLocal(pierna.inicio), fin: horaLocal(pierna.fin),
              tipos: pierna.ejercicios[0].series.map((s) => s.tipo).join(","), rir: pierna.ejercicios[0].series[1].rir, fallo: `${pierna.ejercicios[2].series[0].tipo}:${pierna.ejercicios[2].series[0].rir}`,
              superserie: pierna.ejercicios.map((e) => e.superserie || "-").join(","), cardio: `${cardio.ejercicios[0].series[0].km}km ${cardio.ejercicios[0].series[0].seg}s`,
              sentadilla: id("Squat (Barbell)"), extension: id("Leg Extension (Machine)"), femoral: id("Lying Leg Curl (Machine)"), cinta: id("Treadmill"),
              inventado: id("Zancada inventada, con coma"),
            },
            {
              formato: "hevy", entrenos: 2, series: 6, inicio: "3/3 18:30", fin: "3/3 19:40", tipos: "calentamiento,normal", rir: 2, fallo: "fallo:0",
              superserie: "-,0,0,-", cardio: "3.2km 1800s", sentadilla: "ex_sentadilla", extension: "ex_extension_cuadriceps", femoral: "ex_femoral_tumbado",
              cinta: "ex_cinta", inventado: null,
            }
          );
        },
      },
      {
        nombre: "Lyfta: fin = inicio + duración, RIR tal cual (y RPE ≥ 6 convertido), «Time» en minutos, alias de Lyfta y ejercicio propio nuevo",
        ejecutar: () => {
          const p = prepararImportacion(CSV_LYFTA, opcionesImportar());
          const [s] = p.entrenos;
          const id = (n) => (p.ejercicios.find((x) => x.nombre === n) || {}).ejercicioId;
          const r = construirImportacion(p, { lote: "lot_prueba", ahora: 1, hoy: "2026-10-25" });
          const sesion = r.sesiones[0];
          return comparar(
            {
              entrenos: p.entrenos.length, inicio: horaLocal(s.inicio), finMin: (new Date(s.fin) - new Date(s.inicio)) / 1000,
              rir: s.ejercicios[0].series[1].rir, rpe8: s.ejercicios[1].series[0].rir, caminar: `${s.ejercicios[4].series[0].km}km ${s.ejercicios[4].series[0].seg}s`,
              jalon: id("Pulldown"), aperturas: id("Lever Seated Fly"), piernas: id("Captains Chair Straight Leg Raise"), andar: id("Walking"), nuevo: id("Cable one arm row"),
              propios: r.propios.map((e) => `${e.nombre}:${e.tipo}:${e.lote}`).join(","), origen: sesion.origen, lote: sesion.lote,
              superserie: sesion.ejercicios.map((e) => e.superserie || "-").join(","), ejercicioNuevo: sesion.ejercicios[2].ejercicioId === r.propios[0].id,
              todasHechas: sesion.ejercicios.every((e) => e.series.every((x) => x.hecha)),
            },
            {
              entrenos: 1, inicio: "9/10 7:15", finMin: 3930, rir: 1, rpe8: 2, caminar: "2.5km 900s",
              jalon: "ex_jalon_pecho", aperturas: "ex_aperturas_maquina", piernas: "ex_elevacion_piernas", andar: "ex_caminar", nuevo: null,
              propios: "Cable one arm row:peso_reps:lot_prueba", origen: "importado:lyfta", lote: "lot_prueba",
              superserie: "-,ss_lot_prueba_2,ss_lot_prueba_2,-,-", ejercicioNuevo: true, todasHechas: true,
            }
          );
        },
      },
      {
        nombre: "Reimportar no duplica (mismo nombre y misma hora, ±5 min); elegir un ejercicio de la biblioteca en vez de crear uno",
        ejecutar: () => {
          const p = prepararImportacion(CSV_LYFTA, opcionesImportar());
          const r = construirImportacion(p, { lote: "lot_a", decisiones: { "Cable one arm row": "ex_remo_mancuerna" } });
          const otraVez = prepararImportacion(CSV_LYFTA, opcionesImportar(r.sesiones));
          const casiIgual = prepararImportacion(CSV_LYFTA, opcionesImportar([{ nombre: "torso", inicio: new Date(new Date(r.sesiones[0].inicio).getTime() + 3 * 60000).toISOString() }]));
          const otraHora = prepararImportacion(CSV_LYFTA, opcionesImportar([{ nombre: "Torso", inicio: new Date(new Date(r.sesiones[0].inicio).getTime() + 60 * 60000).toISOString() }]));
          return comparar(
            { propios: r.propios.length, elegido: r.sesiones[0].ejercicios[2].ejercicioId, otraVez: `${otraVez.entrenos.length}/${otraVez.repetidos}`, casiIgual: casiIgual.repetidos, otraHora: otraHora.repetidos },
            { propios: 0, elegido: "ex_remo_mancuerna", otraVez: "0/1", casiIgual: 1, otraHora: 0 }
          );
        },
      },
    ],
  };
}

// ---------- Área Cuerpo: sueño, pasos, favoritos, informes, constructor y mapa corporal (26-oct-2026) ----------
// Los valores esperados se calcularon a mano con los datos de cada caso (ver los comentarios de cada uno).

function grupoCuerpoDiario() {
  return {
    grupo: "Cuerpo: sueño, pasos y favoritos",
    casos: [
      {
        nombre: "Sueño: al cuarto más cercano y dentro de 3-11 h; pasos vacíos = sin dato; la última noche y los últimos días",
        ejecutar: () => {
          let d = migrarDiario(null).diario;
          d = apuntarSueno(d, "2026-10-20", 7.3, 6); // 7,3 × 4 = 29,2 → 29 cuartos = 7 h 15
          d = apuntarSueno(d, "2026-10-21", 2, 10); // menos de 3 h → 3 h
          d = apuntarPasos(d, "2026-10-21", 8420);
          const conPasos = d.dias["2026-10-21"].pasos;
          d = apuntarPasos(d, "2026-10-21", ""); // vacío borra el dato (no es 0)
          const ultima = ultimoSueno(d, "2026-10-22");
          const dias = ultimosDias(d, "2026-10-21", 3);
          const sinNoche = quitarSueno(d, "2026-10-21"); // el día se queda sin nada: desaparece
          return comparar(
            { h20: d.dias["2026-10-20"].sueno.horas, c20: d.dias["2026-10-20"].sueno.calidad, h21: d.dias["2026-10-21"].sueno.horas, conPasos, pasosBorrados: d.dias["2026-10-21"].pasos === undefined,
              ultima: `${ultima.fecha}:${ultima.horas}:${ultima.calidad}`, fechas: dias.map((x) => x.fecha).join(","), primero: dias[0].sueno, segundo: dias[1].sueno.horas,
              quedan: Object.keys(sinNoche.dias).join(",") },
            { h20: 7.25, c20: 6, h21: 3, conPasos: 8420, pasosBorrados: true, ultima: "2026-10-21:3:10", fechas: "2026-10-19,2026-10-20,2026-10-21", primero: null, segundo: 7.25, quedan: "2026-10-20" }
          );
        },
      },
      {
        nombre: "Las cinco caras se guardan como 2, 4, 6, 8 y 10; la migración del diario quita lo imposible sin perder lo bueno",
        ejecutar: () => {
          const m = migrarDiario({ version: 0, dias: { x: { sueno: { horas: 7 } }, "2026-10-01": { sueno: { horas: "8" }, pasos: -5 }, "2026-10-02": {}, "2026-10-03": { pasos: 12000.4 } } });
          return comparar(
            { caras: [0, 1, 2, 3, 4].map(calidadDeCara).join(","), deCalidad: [2, 6, 10, 3].map(caraDeCalidad).join(","), fechas: Object.keys(m.diario.dias).join(","),
              horas: m.diario.dias["2026-10-01"].sueno.horas, calidad: m.diario.dias["2026-10-01"].sueno.calidad, sinPasos: m.diario.dias["2026-10-01"].pasos === undefined,
              pasos: m.diario.dias["2026-10-03"].pasos, changed: m.changed, version: m.diario.version, vacio: Object.keys(migrarDiario(null).diario.dias).length },
            { caras: "2,4,6,8,10", deCalidad: "0,2,4,1", fechas: "2026-10-01,2026-10-03", horas: 8, calidad: null, sinPasos: true, pasos: 12000, changed: true, version: 1, vacio: 0 }
          );
        },
      },
      {
        nombre: "Favoritos: la estrella pone arriba y quita; la migración deja solo los bien formados y sin repetir; id estable del constructor",
        ejecutar: () => {
          const spec = { pregunta: "suenoKcal", forma: "relacion", huecos: { v2: "kcal", v1: "sueno" }, periodo: "dia", vista: "a" };
          const idCons = idDeConstructor(spec);
          let f = migrarFavoritos(null).favoritos;
          f = alternarFavorito(f, { id: "ce-prot", tipo: "pre" });
          f = alternarFavorito(f, { id: idCons, tipo: "cons", spec });
          const orden = f.lista.map((x) => x.tipo).join(",");
          const sinPre = alternarFavorito(f, { id: "ce-prot", tipo: "pre" });
          const m = migrarFavoritos({ version: 1, lista: [{ id: "a", tipo: "pre" }, { id: "a", tipo: "pre" }, { id: "b", tipo: "cons" }, { id: "c", tipo: "x" }, { id: "d", tipo: "cons", spec: { pregunta: "libre" } }] });
          return comparar(
            { idCons, orden, tiene: tieneFavorito(f, "ce-prot"), quedan: sinPre.lista.length, yaNo: tieneFavorito(sinPre, "ce-prot"), migrados: m.favoritos.lista.map((x) => x.id).join(","), changed: m.changed },
            { idCons: "cons:suenoKcal:v1=sueno&v2=kcal:dia:a", orden: "cons,pre", tiene: true, quedan: 1, yaNo: false, migrados: "a,d", changed: true }
          );
        },
      },
    ],
  };
}

// Una cuenta pequeña de prueba (hoy = miércoles 28-oct-2026; las semanas empiezan en lunes): dos comidas al
// día, pesajes (uno atípico), un entreno el martes 27, sueño, pasos y una regla el 20-21.
function serieDePrueba() {
  const macros = (kcal, prot, carb, fat) => ({ hecha: true, macros: { kcal, prot, carb, fat } });
  const ejercicioDe = (id) => EJERCICIOS_SEMILLA.find((e) => e.id === id) || null;
  return construirSerie({
    data: {
      perfil: { repartoComidas: { Comida: 0.6, Cena: 0.4 } },
      comidasCompletadas: {
        "2026-10-26": { Comida: macros(900, 50, 100, 30), Cena: macros(700, 40, 60, 25) },
        "2026-10-27": { Comida: true }, // marcada antes de B1+B3: cuenta como hecha, pero sin macros
        "2026-10-28": {},
      },
      pesoTracking: { historial: [{ fecha: "2026-10-19", peso: 80 }, { fecha: "2026-10-21", peso: 79.6 }], entradas: [{ fecha: "2026-10-26", peso: 79 }, { fecha: "2026-10-27", peso: 90, atipico: true }] },
    },
    sesiones: [{
      id: "s1", inicio: "2026-10-27T18:00:00", fin: "2026-10-27T19:00:00", pausas: [], esfuerzo: 4,
      ejercicios: [{ ejercicioId: "ex_press_banca_barra", series: [{ tipo: "normal", kg: 100, reps: 5, hecha: true }, { tipo: "calentamiento", kg: 120, reps: 5, hecha: true }] }],
    }],
    ejercicioDe, pesoCorporal: 80, indice: null,
    diario: { version: 1, dias: { "2026-10-26": { sueno: { horas: 6.5, calidad: 4 } }, "2026-10-27": { sueno: { horas: 8, calidad: 8 }, pasos: 9000 } } },
    periodo: { regla: ["2026-10-20", "2026-10-21"] },
    hoy: "2026-10-28", inicioSemana: 1,
  });
}

function grupoCuerpoSeries() {
  return {
    grupo: "Cuerpo: la serie de cada día y la estadística honesta",
    casos: [
      {
        nombre: "La serie junta lo de verdad: kcal solo de días completos con macros, peso sin atípicos, entreno desde la primera sesión, fase del período",
        ejecutar: () => {
          const s = serieDePrueba();
          const dia = (f) => s.dias.find((d) => d.fecha === f);
          const d26 = dia("2026-10-26"), d27 = dia("2026-10-27"), d28 = dia("2026-10-28");
          return comparar(
            { dias: s.dias.length, semanas: s.semanas.length, kcal26: d26.kcal, prot26: d26.prot, hidr26: d26.hidr, grasa26: d26.grasa, hechas26: d26.hechas, hechas27: d27.hechas, hechas28: d28.hechas,
              hechas25: dia("2026-10-25").hechas, kcal27: d27.kcal, peso26: d26.peso, peso27: d27.peso, entreno26: d26.entreno, entreno27: d27.entreno, entreno28: d28.entreno,
              volumen27: d27.volumen, rm27: d27.rm.ex_press_banca_barra, duracion27: d27.duracion, esfuerzo27: d27.esfuerzo, pecho27: d27.series.pecho, triceps27: d27.series.triceps,
              sueno26: d26.sueno, pasos27: d27.pasos, fase19: dia("2026-10-19").fase, fase20: dia("2026-10-20").fase, fase28: d28.fase, cicloDia28: d28.cicloDia },
            // 900+700 = 1600 kcal; 100 kg × 5 = 500 kg = 0,5 t (el calentamiento no cuenta); Epley 100 × (1 + 5/30) = 116,7;
            // del 19-oct (lunes del primer pesaje) al 28 = 10 días en 2 semanas; el 28 es el día 9 desde el inicio del 20.
            { dias: 10, semanas: 2, kcal26: 1600, prot26: 90, hidr26: 160, grasa26: 55, hechas26: 100, hechas27: 50, hechas28: 0, hechas25: null, kcal27: null, peso26: 79, peso27: null,
              entreno26: null, entreno27: "con", entreno28: "sin", volumen27: 0.5, rm27: 116.7, duracion27: 60, esfuerzo27: 4, pecho27: 1, triceps27: 0.5, sueno26: 6.5, pasos27: 9000,
              fase19: null, fase20: "regla", fase28: "folicular", cicloDia28: 9 }
          );
        },
      },
      {
        nombre: "Por semana: media del peso, suma de entrenos y «cambio de peso» = media de esta semana menos la de la anterior",
        ejecutar: () => {
          const s = serieDePrueba();
          const peso = valores(s, "peso", "semana");
          const d = valores(s, "dPeso", "semana");
          const ses = valores(s, "sesiones", "dia"); // «entrenos» solo existe por semana: aunque se pida por día
          return comparar(
            { peso1: peso[0].valor, peso2: peso[1].valor, delta1: d[0].valor, delta2: d[1].valor, ses1: ses[0].valor, ses2: ses[1].valor, nSes: ses.length, rm: variable("rm:ex_press_banca_barra").agg, serie: variable("series:pecho").soloSemana },
            { peso1: 79.8, peso2: 79, delta1: null, delta2: -0.8, ses1: null, ses2: 1, nSes: 2, rm: "max", serie: true }
          );
        },
      },
      {
        nombre: "Pista: con menos de 14 días o 6 semanas, «aún no hay suficiente»; |r| < 0,2 sin relación; 0,2-0,4 débil; 0,4-0,6 pista; ≥ 0,6 clara",
        ejecutar: () => {
          const c = (p) => `${p.tipo}${p.fuerza ? ":" + p.fuerza : ""}${p.sube === null ? "" : p.sube ? ":sube" : ":baja"}`;
          return comparar(
            { poco: c(pista(0.9, 13, "dia")), pocoSemana: c(pista(0.9, 5, "semana")), nada: c(pista(0.15, 20, "dia")), debil: c(pista(0.2, 14, "dia")), media: c(pista(0.5, 14, "dia")), clara: c(pista(-0.65, 6, "semana")),
              r1: pearson([[1, 2], [2, 4], [3, 6]]), rMenos1: pearson([[1, 3], [2, 2], [3, 1]]), pocos: pearson([[1, 2], [2, 3]]) },
            { poco: "poco", pocoSemana: "poco", nada: "nada", debil: "pista:debil:sube", media: "pista:media:sube", clara: "pista:clara:baja", r1: 1, rMenos1: -1, pocos: 0 }
          );
        },
      },
      {
        nombre: "Medias por categoría (con / sin entreno) y tabla «más / menos X e Y: media de Z» con cuántas semanas hay detrás",
        ejecutar: () => {
          const s = serieDePrueba();
          const g = porCategoria(s, "entreno", "duracion");
          // Diez semanas a mano: proteína, entrenos y peso medio de cada una (cambio de peso desde la 2.ª).
          const P = [100, 150, 100, 150, 100, 150, 100, 150, 150, 150], S = [1, 1, 3, 3, 1, 1, 3, 3, 3, 3];
          const W = [80, 79.5, 79.4, 78.6, 78.6, 78.4, 78.3, 77.5, 77, 76.7];
          const semanas = P.map((p, k) => ({ inicio: `2026-0${Math.floor(k / 4) + 1}-${String(1 + (k % 4) * 7).padStart(2, "0")}`, dias: [{ prot: p, sesiones: S[k], peso: W[k] }] }));
          const tabla = tablaXYZ({ dias: [], semanas }, ["prot", "sesiones", "dPeso"], "semana", Infinity);
          // Medianas: proteína 150 y entrenos 3. «Más y más» (≥ las dos): semanas 3, 7, 8 y 9 → −0,8 −0,8 −0,5 −0,3 = −0,6 de media.
          return comparar(
            { sin: `${g[0].cat}:${g[0].n}`, con: `${g[1].cat}:${g[1].n}:${g[1].media}`, mx: tabla.medianaX, my: tabla.medianaY, aaN: tabla.celdas.aa.n, aa: tabla.celdas.aa.media, abN: tabla.celdas.ab.n, ab: tabla.celdas.ab.media, bbN: tabla.celdas.bb.n },
            { sin: "sin:0", con: "con:1:60", mx: 150, my: 3, aaN: 4, aa: -0.6, abN: 2, ab: null, bbN: 1 }
          );
        },
      },
    ],
  };
}

function grupoCuerpoInformes() {
  return {
    grupo: "Cuerpo: informes predefinidos y constructor",
    casos: [
      {
        nombre: "15 informes (11 sin ciclo: los tres del ciclo y «peso, kcal y sueño con las fases»); fin de semana = lunes − viernes; el peso de un día frente a los de alrededor",
        ejecutar: () => {
          const dias = [
            { fecha: "2026-10-16", dow: 4, peso: 80 }, { fecha: "2026-10-17", dow: 5, peso: null }, { fecha: "2026-10-18", dow: 6, peso: null },
            { fecha: "2026-10-19", dow: 0, peso: 81 }, { fecha: "2026-10-20", dow: 1, peso: null },
          ];
          const vecinos = [{ peso: 80 }, { peso: null }, { peso: 81 }, { peso: 80.5 }, { peso: null }, { peso: 79.5 }];
          const ids = INFORMES.map((it) => it.id);
          return comparar(
            { total: INFORMES.length, distintos: new Set(ids).size, sinCiclo: informesVisibles(false).length, conCiclo: informesVisibles(true).length,
              finde: pesoFinDeSemana({ dias }, Infinity).map((q) => `${q.fecha}:${q.valor}`).join(","), desv: desviacionPeso(vecinos, 2), sinVecinos: desviacionPeso([{ peso: 80 }, { peso: 81 }], 0) },
            // vecinos del índice 2 (81): 80, 80,5 y 79,5 → media 80 → +1
            { total: 15, distintos: 15, sinCiclo: 11, conCiclo: 15, finde: "2026-10-19:1", desv: 1, sinVecinos: null }
          );
        },
      },
      {
        nombre: "Con pocos datos, los informes dicen «aún no hay suficiente» (y nunca rompen); el balance describe el cambio de peso, pero su relación con las kcal aún no",
        ejecutar: () => {
          const s = serieDePrueba();
          const r = INFORMES.map((it) => it.calc(s, { semanas: 13, periodo: "dia", objetivos: { kcal: 2000, prot: 120, carb: 200, fat: 60 } }));
          const de = (id) => r[INFORMES.findIndex((it) => it.id === id)];
          const prot = de("ce-prot"), balance = de("pc-balance");
          // Balance: dos semanas con pesaje (79,8 → 79 = −0,8 kg) y un solo día completo de comida (1.600 kcal).
          return comparar(
            { suficientes: INFORMES.filter((it, i) => r[i].suficiente).map((it) => it.id).join(","), todosConGrafica: r.every((x) => x.grafica && x.grafica.tipo), protCon: prot.cifras.nCon, protRef: prot.cifras.ref,
              balance: balance.cifras.cambio, balanceKcal: balance.cifras.kcalMedia, balancePista: balance.pista.tipo },
            { suficientes: "pc-balance", todosConGrafica: true, protCon: 0, protRef: 120, balance: -0.8, balanceKcal: 1600, balancePista: "poco" }
          );
        },
      },
      {
        nombre: "Constructor: 25 preguntas por temas; «entrenos» obliga a ir por semana; los marcadores toman el ejercicio y el músculo con datos",
        ejecutar: () => {
          const s = serieDePrueba();
          const m1 = resolverMontaje({ forma: "relacion", huecos: { v1: "sesiones", v2: "kcal" }, periodo: "dia" });
          const m2 = resolverMontaje({ forma: "categoria", huecos: { v1: "sueno", c: "fase" }, periodo: "semana" });
          const m3 = resolverMontaje({ forma: "libre", huecos: { v1: "sueno", v2: "kcal", v3: "esfuerzo", v4: "" }, periodo: "dia" });
          const h = completarHuecos({ v1: "rm", v2: "serie" }, s);
          return comparar(
            { preguntas: PREGUNTAS.length, ids: new Set(PREGUNTAS.map((p) => p.id)).size, formas: PREGUNTAS.every((p) => FORMAS[p.forma]), temas: TEMAS.every((x) => PREGUNTAS.some((p) => p.tema === x)),
              p1: `${m1.periodo}:${m1.soloSemana}`, p2: `${m2.forma}:${m2.periodo}:${m2.cat}:${m2.ids.join("/")}`, p3: `${m3.ids.length}:${m3.periodo}`, rm: h.v1, serie: h.v2 },
            { preguntas: 25, ids: 25, formas: true, temas: true, p1: "semana:sesiones", p2: "categoria:dia:fase:sueno", p3: "3:dia", rm: "rm:ex_press_banca_barra", serie: "series:pecho" }
          );
        },
      },
    ],
  };
}

const SLUGS_SIN_MUSCULO = ["head", "hair", "neck", "hands", "feet", "knees", "ankles", "tibialis"];

function grupoMapaCorporal() {
  return {
    grupo: "Cuerpo: mapa corporal",
    casos: [
      {
        nombre: "Los trazos van a los 14 grupos (oblicuos y abdominales → abdomen; upper-back → dorsales; trapecio → espalda alta), y los 14 se ven en hombre y en mujer",
        ejecutar: () => {
          const grupos = new Set(Object.values(SLUG_A_GRUPO));
          const sinGrupo = [];
          const faltan = [];
          ["hombre", "mujer"].forEach((g) => {
            const vistos = new Set();
            ["frente", "espalda"].forEach((lado) => Object.keys(TRAZADOS_MIT[g][lado].partes).forEach((slug) => {
              if (SLUG_A_GRUPO[slug]) vistos.add(SLUG_A_GRUPO[slug]);
              else if (!SLUGS_SIN_MUSCULO.includes(slug)) sinGrupo.push(`${g}:${slug}`);
            }));
            GRUPOS_MAPA.forEach((m) => { if (!vistos.has(m)) faltan.push(`${g}:${m}`); });
          });
          return comparar(
            { grupos: grupos.size, iguales: GRUPOS_MAPA.every((m) => grupos.has(m)), obliques: SLUG_A_GRUPO.obliques, abs: SLUG_A_GRUPO.abs, upper: SLUG_A_GRUPO["upper-back"], trapecio: SLUG_A_GRUPO.trapezius,
              sinGrupo: sinGrupo.join(","), faltan: faltan.join(","), contornos: ["hombre", "mujer"].every((g) => TRAZADOS_MIT[g].frente.contorno && TRAZADOS_MIT[g].espalda.contorno) },
            { grupos: 14, iguales: true, obliques: "abdomen", abs: "abdomen", upper: "dorsales", trapecio: "espalda_alta", sinGrupo: "", faltan: "", contornos: true }
          );
        },
      },
      {
        nombre: "Escala de cinco verdes (0 · 1-3 · 4-6 · 7-9 · 10+); series de una rutina; principal y secundarios de un ejercicio; hombre o mujer",
        ejecutar: () => {
          const ejercicioDe = (id) => EJERCICIOS_SEMILLA.find((e) => e.id === id) || null;
          const rutina = { ejercicios: [
            { ejercicioId: "ex_press_banca_barra", series: [{ tipo: "calentamiento" }, { tipo: "normal" }, { tipo: "normal" }, { tipo: "normal" }] },
            { ejercicioId: "no_existe", series: [{ tipo: "normal" }] },
          ] };
          const r = seriesDeRutina(rutina, ejercicioDe);
          const v = valoresDeEjercicio(ejercicioDe("ex_press_banca_barra"));
          return comparar(
            { niveles: [0, 0.5, 3, 3.4, 4, 6, 7, 9, 9.6, 10, 25].map(nivelSeries).join(","), cero: colorSeries(0), diez: colorSeries(12),
              pecho: r.pecho, triceps: r.triceps, hombros: r.hombros, otros: Object.keys(r).length, principal: v.pecho, secundario: v.triceps,
              mujer: generoMapa({ sexo: "mujer" }), hombre: generoMapa({ sexo: "hombre" }), sinSexo: generoMapa({}), sinPerfil: generoMapa(null) },
            // 3 series normales (la de calentamiento no cuenta): pecho 3, tríceps y hombros 1,5 cada uno
            { niveles: "0,1,1,1,2,2,3,3,4,4,4", cero: "#e6e2d6", diez: "#2f6b4f", pecho: 3, triceps: 1.5, hombros: 1.5, otros: 3, principal: 10, secundario: 5,
              mujer: "mujer", hombre: "hombre", sinSexo: "hombre", sinPerfil: "hombre" }
          );
        },
      },
    ],
  };
}

// ---------- FitDraft: el gimnasio dibujado (parte estética, 26-oct-2026) ----------
// Reparto de los 80 ejercicios en las 25 máquinas, la lista de una zona, las rutas, las zonas teñidas, la frase
// del monitor, la rutina de hoy y el paso entre ejercicios. Los órdenes esperados de las listas se calcularon a
// mano con las distancias entre los centros de las máquinas (prensa → sillas 91, rack 121, zona libre 140,
// glúteo 179, plataforma 190).
function grupoGimnasio() {
  const ejercicioDe = (id) => EJERCICIOS_SEMILLA.find((e) => e.id === id) || null;
  const lista = listaEjercicios(null);
  const sesionPaso = (hechas) => ({ ejercicios: hechas.map((h, i) => ({ inst: "i" + i, ejercicioId: "ex_prensa", series: h.map((x, k) => ({ id: "s" + i + k, hecha: !!x })) })) });
  return {
    grupo: "FitDraft: el gimnasio",
    casos: [
      {
        nombre: "Los 80 ejercicios de la biblioteca, cada uno en una sola de las 25 máquinas; los 15 músculos, cada uno en una sola zona",
        ejecutar: () => {
          const todos = ESTACIONES.flatMap((e) => e.ej);
          const ids = EJERCICIOS_SEMILLA.map((e) => e.id);
          const zonas = new Set(ZONAS.map((z) => z.id));
          const musculos = ZONAS.flatMap((z) => z.musculos);
          return comparar(
            { maquinas: ESTACIONES.length, enMaquinas: todos.length, distintos: new Set(todos).size, faltan: ids.filter((id) => !ESTACION_DE[id]).join(","), sobran: todos.filter((id) => !ids.includes(id)).join(","),
              zonasMal: ESTACIONES.filter((e) => !zonas.has(e.zona)).map((e) => e.id).join(","), musculos: musculos.length, musculosDistintos: new Set(musculos).size,
              sinZona: GRUPOS_MUSCULARES.filter((m) => !zonaDeMusculo(m)).join(","), gemelos: zonaDeMusculo("gemelos"), antebrazos: zonaDeMusculo("antebrazos") },
            { maquinas: 25, enMaquinas: 80, distintos: 80, faltan: "", sobran: "", zonasMal: "", musculos: 15, musculosDistintos: 15, sinZona: "", gemelos: "pierna", antebrazos: "brazos" }
          );
        },
      },
      {
        nombre: "Tocar la prensa: «Pierna» con Prensa de piernas primero, luego hack, extensión y el resto de cuádriceps, y después isquios, glúteos, gemelos y aductores",
        ejecutar: () => {
          const r = ejerciciosDeZona(lista, "pierna", "prensa");
          const conPropio = ejerciciosDeZona([...lista, { id: "exp_x", musculo: "cuadriceps" }, { id: "exp_y", musculo: "pecho" }], "pierna", "prensa");
          return comparar(
            { orden: r.join(","), propio: conPropio.indexOf("exp_x"), total: conPropio.length, sinPecho: conPropio.includes("exp_y") },
            { orden: "ex_prensa,ex_hack,ex_extension_cuadriceps,ex_sentadilla,ex_sentadilla_frontal,ex_sentadilla_goblet,ex_zancadas,ex_bulgara,ex_femoral_tumbado,ex_femoral_sentado,ex_peso_muerto,ex_peso_muerto_rumano,ex_hip_thrust,ex_hip_thrust_maquina,ex_patada_gluteo,ex_abductores,ex_gemelos_pie,ex_gemelos_sentado,ex_aductores",
              propio: 8, total: 20, sinPecho: false }
          );
        },
      },
      {
        nombre: "Tocar la zona (sin máquina): músculo a músculo en el orden de la biblioteca; tocar la torre empieza por las dominadas y no trae los fondos (son de pecho)",
        ejecutar: () => {
          const espalda = ejerciciosDeZona(lista, "espalda");
          const torre = ejerciciosDeZona(lista, "espalda", "torre");
          return comparar(
            { espalda: espalda.join(","), primeroTorre: torre[0], fondos: torre.includes("ex_fondos_paralelas"), totalTorre: torre.length, nada: ejerciciosDeZona(lista, "no-existe").length },
            { espalda: "ex_dominadas,ex_dominadas_lastradas,ex_dominadas_asistidas,ex_jalon_pecho,ex_jalon_estrecho,ex_remo_mancuerna,ex_pullover_polea,ex_remo_barra,ex_remo_sentado_polea,ex_remo_maquina,ex_remo_landmine,ex_encogimientos,ex_hiperextensiones",
              primeroTorre: "ex_dominadas", fondos: false, totalTorre: 13, nada: 0 }
          );
        },
      },
      {
        nombre: "Rutas: desde la entrada se llega a las 25 máquinas y a los 6 sitios por pasillos libres, empezando y acabando donde se pide",
        ejecutar: () => {
          const desde = [ENTRADA_DENTRO.x, ENTRADA_DENTRO.y];
          const mal = [];
          [...ESTACIONES, ...SITIOS].forEach((c) => {
            const p = puntoDe(c, desde);
            const ruta = aEstrella(desde[0], desde[1], p[0], p[1]);
            if (!libre(p[0], p[1]) || !ruta) { mal.push(c.id); return; }
            const fin = ruta[ruta.length - 1];
            if (ruta[0][0] !== desde[0] || ruta[0][1] !== desde[1] || fin[0] !== p[0] || fin[1] !== p[1]) mal.push(c.id + ":extremos");
            // Cada tramo, muestreado cada 4 unidades, pasa por sitio libre (con el margen del avatar menos 1).
            let choca = false;
            for (let k = 1; k < ruta.length && !choca; k++) {
              const [a, b] = [ruta[k - 1], ruta[k]];
              const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4);
              for (let q = 1; q < n && !choca; q++) if (!libre(a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n, 7)) choca = true;
            }
            if (choca) mal.push(c.id + ":choca");
          });
          return comparar({ mal: mal.join(","), dentroDeMaquina: libre(59, 216) }, { mal: "", dentroDeMaquina: false });
        },
      },
      {
        nombre: "La rutina como ruta: paradas en su orden, dos seguidos en la misma máquina son una parada; un propio va a la de su músculo; lo desconocido se salta",
        ejecutar: () => {
          const de = (id) => (id === "exp_curl" ? { id, musculo: "biceps" } : ejercicioDe(id));
          const p = paradasDeRutina(["ex_prensa", "ex_hack", "ex_jalon_pecho", "exp_curl", "ex_prensa", "no_existe"], de);
          return comparar(
            { paradas: p.map((x) => `${x.estacion}[${x.indices.join("+")}]`).join(" "), propio: estacionDeEjercicio({ id: "exp_z", musculo: "gemelos" }), nulo: estacionDeEjercicio(null) },
            { paradas: "prensa[0+1] jalon[2] banco-brazos[3] prensa[4]", propio: "prensa", nulo: null }
          );
        },
      },
      {
        nombre: "Entre ejercicios: al cerrar uno, el siguiente con series pendientes (o uno saltado de antes); nada si quedan series, si no existe o si todo está hecho",
        ejecutar: () => {
          const a = sesionPaso([[1, 1], [1, 0], [0]]);
          const b = sesionPaso([[0, 1], [1], [1, 1]]);
          const c = sesionPaso([[1], [1]]);
          const vacio = sesionPaso([[], [0]]);
          return comparar(
            { cerrarPrimero: JSON.stringify(pasoEntreEjercicios(a, "i0")), quedan: pasoEntreEjercicios(a, "i1"), saltado: JSON.stringify(pasoEntreEjercicios(b, "i2")), todo: pasoEntreEjercicios(c, "i1"),
              noExiste: pasoEntreEjercicios(a, "zz"), sinSeries: pasoEntreEjercicios(vacio, "i0") },
            { cerrarPrimero: '{"desde":0,"hacia":1}', quedan: null, saltado: '{"desde":2,"hacia":0}', todo: null, noExiste: null, sinSeries: null }
          );
        },
      },
      {
        nombre: "Zonas teñidas: entrenada esta semana, olvidada a los 14 días, sin tinte entre medias y si nunca; la cola cuenta",
        ejecutar: () => {
          const indice = { ejercicios: {
            ex_prensa: { ultima: { fecha: "2026-10-27" } },
            ex_jalon_pecho: { ultima: { fecha: "2026-10-10" } },
            ex_press_banca_barra: { ultima: { fecha: "2026-10-20" } },
            ex_plancha: { ultima: { fecha: "2026-10-14" } },
            no_existe: { ultima: { fecha: "2026-10-28" } },
          } };
          const cola = [{ inicio: "2026-10-26T18:00:00", ejercicios: [{ ejercicioId: "ex_curl_barra", series: [{ hecha: true }] }, { ejercicioId: "ex_cinta", series: [{ hecha: false }] }] }];
          const uv = ultimaVezPorZona(indice, ejercicioDe, cola);
          const e = estadoZonas({ ultimaVez: uv, hoy: "2026-10-28", inicioSemana: 1 });
          const dom = estadoZonas({ ultimaVez: uv, hoy: "2026-10-28", inicioSemana: 0 });
          return comparar(
            { pierna: e.pierna.estado, espalda: e.espalda.estado, diasEspalda: e.espalda.dias, pecho: e.pecho.estado, core: e.core.estado, brazos: e.brazos.estado, hombros: e.hombros.estado,
              diasHombros: e.hombros.dias, cardio: e.cardio.estado, ultima: uv.ultima, brazosDomingo: dom.brazos.estado },
            // La plancha, el 14: justo 14 días → olvidada. El «no_existe» del 28 cuenta como última sesión pero no tiñe nada.
            { pierna: "entrenada", espalda: "olvidada", diasEspalda: 18, pecho: "nada", core: "olvidada", brazos: "entrenada", hombros: "nada",
              diasHombros: null, cardio: "nada", ultima: "2026-10-28", brazosDomingo: "entrenada" }
          );
        },
      },
      {
        nombre: "El monitor: mucho tiempo sin venir a los 14 días; si no, el grupo más olvidado; si no, el saludo; una frase al día como mucho",
        ejecutar: () => {
          const estados = { pierna: { estado: "entrenada", dias: 1 }, espalda: { estado: "olvidada", dias: 18 }, core: { estado: "olvidada", dias: 30 }, pecho: { estado: "nada", dias: 8 } };
          const grupo = situacionMonitor({ estados, ultimaSesion: "2026-10-27", hoy: "2026-10-28" });
          const tiempo = situacionMonitor({ estados, ultimaSesion: "2026-10-14", hoy: "2026-10-28" });
          const trece = situacionMonitor({ estados: {}, ultimaSesion: "2026-10-15", hoy: "2026-10-28" });
          const nueva = situacionMonitor({ estados: {}, ultimaSesion: null, hoy: "2026-10-28" });
          const f1 = fraseMonitor({ estados, ultimaSesion: "2026-10-27", hoy: "2026-10-28", azar: () => 0.99 });
          const f2 = fraseMonitor({ estados: {}, ultimaSesion: null, hoy: "2026-10-28", guardada: f1, azar: () => 0 });
          const f3 = fraseMonitor({ estados: {}, ultimaSesion: null, hoy: "2026-10-29", guardada: f1, azar: () => 0 });
          return comparar(
            { grupo: grupo.situacion + ":" + grupo.grupo, tiempo: tiempo.situacion, trece: trece.situacion, nueva: nueva.situacion,
              f1: `${f1.situacion}:${f1.grupo}:${f1.indice}:${f1.nueva}`, f2: `${f2.situacion}:${f2.indice}:${f2.nueva}`, f3: `${f3.situacion}:${f3.indice}:${f3.nueva}:${f3.fecha}` },
            { grupo: "grupo:core", tiempo: "tiempo", trece: "normal", nueva: "normal",
              f1: "grupo:core:4:true", f2: "grupo:4:false", f3: "normal:0:true:2026-10-29" }
          );
        },
      },
      {
        nombre: "La rutina de hoy: primero las que no se han hecho nunca (en su orden); si no, la que hace más que no se hace; sin rutinas, ninguna",
        ejecutar: () => {
          const r = [{ id: "a", nombre: "Torso" }, { id: "b", nombre: "Pierna" }, { id: "c", nombre: "Brazos" }];
          const indice = { rutinas: { a: { fecha: "2026-10-20" }, b: { fecha: "2026-10-22" } } };
          return comparar(
            { nunca: rutinaDeHoy(r, indice).id, rotacion: rutinaDeHoy(r.slice(0, 2), indice).id, sinIndice: rutinaDeHoy(r, null).id, vacia: rutinaDeHoy([], indice) },
            { nunca: "c", rotacion: "a", sinIndice: "a", vacia: null }
          );
        },
      },
      {
        nombre: "El corcho: los días de esta semana con algún entreno, desde el primer día de la semana elegido",
        ejecutar: () => {
          const s = ["2026-10-26T18:00:00", "2026-10-28T09:00:00", "2026-10-25T18:00:00", "2026-11-02T18:00:00"].map((inicio) => ({ inicio }));
          const lunes = diasEntrenadosSemana(s, "2026-10-29", 1).map((x) => (x ? 1 : 0)).join("");
          const domingo = diasEntrenadosSemana(s, "2026-10-29", 0).map((x) => (x ? 1 : 0)).join("");
          return comparar({ lunes, domingo }, { lunes: "1010000", domingo: "1101000" });
        },
      },
    ],
  };
}
