// ---------- Informes cruzados y aviso de actividad ----------
// Módulo de lógica pura (sin JSX, sin React) del área Cuerpo (octubre de 2026): lo que junta datos de
// áreas distintas — el entreno registrado, las comidas marcadas como hechas, el peso y lo declarado en el
// perfil — para ayudar a interpretar el progreso (local/ideas/gimnasio/03-diseno-modulo-entreno.md, §8 y
// §9). Todo es **solo lectura**: ningún informe ni aviso cambia los objetivos; como mucho sugiere revisar
// «Actividad diaria», y la decisión es siempre del usuario. Alimentar el gasto con lo registrado tocaría
// calcularObjetivosPerfil y, según CLAUDE.md, necesitaría antes su propio estudio en los PDFs explicativos.
import { duracionEfectiva, volumenSesion, fechaLocal, semanaDe, sumarDias } from "entreno-calculo";
import { pesoEnMes } from "resumen-mensual";
import { TIPOS_ENTRENAMIENTO, calcularObjetivosPerfil } from "objetivos";
import {
  porCategoria, relacion, valores, pista, pearson, mediana, tablaXYZ, ejerciciosConRM, MINIMO, MINIMO_CATEGORIA,
} from "cuerpo-series";

const redondear1 = (x) => Math.round(x * 10) / 10;

// Sesiones de pesas por semana que el usuario declara en su perfil (suma de `frecuenciaSemanal` de los
// entrenamientos de tipo «pesas»). Es lo que se compara con lo que registra en el módulo de entreno, que es
// de fuerza: el cardio declarado (correr, bici...) no tiene por qué anotarse aquí.
export function declaradoPorSemana(perfil) {
  return ((perfil && perfil.entrenamientos) || [])
    .filter((e) => e.tipo === "pesas")
    .reduce((t, e) => t + (Number(e.frecuenciaSemanal) || 0), 0);
}

// Días transcurridos de un mes: el mes entero si ya pasó; si es el actual, hasta hoy incluido.
function diasTranscurridos(mesISO, hoy) {
  const [a, m] = mesISO.split("-").map(Number);
  const total = new Date(a, m, 0).getDate();
  const hoyISO = typeof hoy === "string" ? hoy : fechaLocal(hoy);
  if (hoyISO.slice(0, 7) === mesISO) return Number(hoyISO.slice(8, 10));
  return hoyISO.slice(0, 7) < mesISO ? 0 : total;
}

// Lo de un mes: entreno, peso, constancia en la comida según haya entreno ese día, y lo registrado
// frente a lo declarado.
function datosDelMes({ data, sesiones, ejercicioDe, mesISO, hoy }) {
  const perfil = (data && data.perfil) || {};
  const pesoCorporal = Number(perfil.peso) || null;
  const dias = diasTranscurridos(mesISO, hoy);
  const lista = sesiones || [];

  // 1. Entreno y peso.
  const horas = lista.reduce((t, s) => t + duracionEfectiva(s, s.fin || s.inicio), 0) / 3600;
  const volumen = redondear1(lista.reduce((t, s) => t + volumenSesion(s, ejercicioDe, pesoCorporal), 0));
  const peso = pesoEnMes(data && data.pesoTracking, mesISO);

  // 2. Constancia en la comida: % de comidas marcadas como hechas cada día (sobre las comidas al día del
  // reparto), de media en los días con entreno y en los días sin. No se calcula proteína ni kcal comidas:
  // la app no sabe qué plato del menú se comió cada día, solo que se marcó como hecho.
  const comidasPorDia = Object.keys(perfil.repartoComidas || {}).length || 4;
  const conEntreno = new Set(lista.map((s) => fechaLocal(s.inicio)).filter((f) => f.slice(0, 7) === mesISO));
  const completadas = (data && data.comidasCompletadas) || {};
  const grupos = { con: [], sin: [] };
  for (let d = 1; d <= dias; d++) {
    const fecha = `${mesISO}-${String(d).padStart(2, "0")}`;
    const hechas = Object.values(completadas[fecha] || {}).filter(Boolean).length;
    grupos[conEntreno.has(fecha) ? "con" : "sin"].push(Math.min(1, hechas / comidasPorDia));
  }
  const media = (l) => (l.length ? Math.round((l.reduce((t, x) => t + x, 0) / l.length) * 100) : null);

  // 3. Declarado frente a real. Sesiones por semana: las registradas en el mes, llevadas a 7 días. Kcal de
  // entrenamiento al día: las que asume el objetivo (las del perfil) frente a las que saldrían con lo
  // registrado, con la misma fórmula del objetivo (MET de «pesas» × peso × horas) repartida entre los días.
  const mets = (TIPOS_ENTRENAMIENTO.find((x) => x.key === "pesas") || { mets: 6 }).mets;
  const objetivos = calcularObjetivosPerfil(perfil);
  return {
    mes: mesISO,
    dias,
    sesiones: lista.length,
    horas: redondear1(horas),
    volumen,
    peso,
    constancia: { conEntreno: media(grupos.con), sinEntreno: media(grupos.sin), diasCon: grupos.con.length, diasSin: grupos.sin.length },
    declarado: {
      declaradasSemana: declaradoPorSemana(perfil),
      registradasSemana: dias ? redondear1((lista.length / dias) * 7) : 0,
      kcalDeclaradas: objetivos ? objetivos.kcalEntrenamiento : null,
      kcalEstimadas: dias && pesoCorporal ? Math.round((horas * mets * pesoCorporal) / dias) : null,
    },
  };
}

// Informe cruzado de un mes (premium; fase K2), con el mes anterior al lado para «mes frente a mes»:
//   entrenoPeso: sesiones, horas y volumen del mes y el peso del mes (inicio → fin);
//   constancia: % de comidas hechas en días con entreno y en días sin;
//   declarado: sesiones por semana declaradas y registradas; kcal de entrenamiento al día que asume el
//              objetivo y las que salen con lo registrado;
//   variacion: cómo cambian sesiones, volumen (%) y peso respecto al mes anterior.
export function informeCruzadoMes({ data, sesionesMes, sesionesMesAnterior, ejercicioDe, mesISO, hoy }) {
  const [a, m] = mesISO.split("-").map(Number);
  const d = new Date(a, m - 2, 15);
  const mesAnterior = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const actual = datosDelMes({ data, sesiones: sesionesMes, ejercicioDe, mesISO, hoy });
  const anterior = datosDelMes({ data, sesiones: sesionesMesAnterior, ejercicioDe, mesISO: mesAnterior, hoy });
  return {
    ...actual,
    anterior,
    variacion: {
      sesiones: actual.sesiones - anterior.sesiones,
      volumenPct: anterior.volumen > 0 ? Math.round(((actual.volumen - anterior.volumen) / anterior.volumen) * 100) : null,
      peso: actual.peso && anterior.peso ? redondear1(actual.peso.delta - anterior.peso.delta) : null,
    },
  };
}

// ---------- Aviso de actividad (fase K3) ----------
// Si lo que se registra se aleja mucho de lo declarado en el perfil durante varias semanas, se sugiere
// revisar «Actividad diaria», porque calcularObjetivosPerfil usa lo declarado para las calorías (diseño,
// §8.1, decidido el 23-oct). Es una sugerencia que acepta el usuario; nunca cambia nada solo, y no hay
// notificación push.

// Una sesión cuenta como entreno de la semana si tiene al menos una serie hecha de un ejercicio que no es
// cardio (lo declarado que se compara es de pesas).
function cuentaComoPesas(sesion, ejercicioDe) {
  return (sesion.ejercicios || []).some((ej) => {
    const e = ejercicioDe(ej.ejercicioId);
    return (!e || e.musculo !== "cardio") && (ej.series || []).some((s) => s.hecha);
  });
}

// Sesiones de pesas de cada una de las `k` últimas semanas **completas** (la actual no cuenta, porque
// aún puede llenarse), de la más antigua a la más reciente: [{ inicio: "AAAA-MM-DD", n }].
export function sesionesPorSemana(sesiones, ejercicioDe, inicioSemana, hoy, k = 3) {
  const hoyISO = typeof hoy === "string" ? hoy : fechaLocal(hoy);
  const actual = semanaDe(hoyISO, inicioSemana);
  const semanas = Array.from({ length: k }, (_, i) => ({ inicio: sumarDias(actual, -7 * (k - i)), n: 0 }));
  const porInicio = Object.fromEntries(semanas.map((s) => [s.inicio, s]));
  (sesiones || []).forEach((s) => {
    const fila = porInicio[semanaDe(s.inicio, inicioSemana)];
    if (fila && cuentaComoPesas(s, ejercicioDe)) fila.n += 1;
  });
  return semanas;
}

// ¿Toca avisar? Devuelve null o { tipo: "menos" | "mas", declarado, media }.
// - «menos»: declara al menos 1 sesión y en las 3 semanas registra menos de la mitad.
// - «mas»: en las 3 semanas registra al menos 1,5 veces lo declarado y como mínimo 2 sesiones más (con
//   0 declaradas, 2 o más registradas).
// No avisa si hay menos de 4 sesiones registradas en total (quien no usa el registro no anota sus
// entrenos aquí: sería un aviso falso), si alguna de esas semanas cae en una pausa (viaje, lesión), si está
// silenciado o si se descartó hace menos de 14 días.
export const MINIMO_SESIONES_AVISO = 4;
export const ESPERA_TRAS_DESCARTAR_DIAS = 14;

export function evaluarAvisoActividad({ declaradoSemana, semanas, totalRegistradas, hoy, aviso }) {
  const hoyISO = typeof hoy === "string" ? hoy : fechaLocal(hoy);
  const estado = aviso || {};
  if ((totalRegistradas || 0) < MINIMO_SESIONES_AVISO) return null;
  if (!semanas || !semanas.length) return null;
  if (estado.silenciadoHasta && hoyISO < estado.silenciadoHasta) return null;
  if (estado.descartadoEl && hoyISO < sumarDias(estado.descartadoEl, ESPERA_TRAS_DESCARTAR_DIAS)) return null;
  const pausa = estado.pausa;
  if (pausa && pausa.desde && semanas.some((s) => pausa.desde <= sumarDias(s.inicio, 6) && (!pausa.hasta || pausa.hasta >= s.inicio))) return null;
  const d = Number(declaradoSemana) || 0;
  const ns = semanas.map((s) => (typeof s === "number" ? s : s.n));
  const media = Math.round((ns.reduce((t, n) => t + n, 0) / ns.length) * 10) / 10;
  if (d >= 1 && ns.every((n) => n < 0.5 * d)) return { tipo: "menos", declarado: d, media };
  if (ns.every((n) => n >= 1.5 * d && n - d >= 2)) return { tipo: "mas", declarado: d, media };
  return null;
}

// ---------- Grupos musculares sin entrenar (G8, 25-oct-2026) ----------
// Si un grupo muscular que se entrenaba lleva 3 semanas sin trabajarse, la pantalla Entrenar lo dice en
// una tarjeta que se cierra con un toque (y entonces ese grupo no vuelve a salir en 14 días, como el aviso
// de actividad). Solo informa: no cambia rutinas ni objetivos. La parte visual definitiva (telaraña,
// bocadillo) es de la propuesta estética; aquí solo está la regla, con sus casos en validacion/.
//
// Los grupos son los cinco que el usuario reconoce al planificar: pecho, espalda, pierna, hombros y
// brazos («torso» es un tipo de día, no un grupo). Cada músculo de la biblioteca cae en uno; abdomen y
// cardio en ninguno. Cuenta solo el **músculo principal** de cada ejercicio: un press de banca trabaja el
// tríceps, pero no es «haber entrenado brazos» (decisión provisional del 25-oct, a revisar).
export const GRUPOS_AVISO = ["pecho", "espalda", "pierna", "hombros", "brazos"];
export const GRUPO_DE_MUSCULO = {
  pecho: "pecho",
  dorsales: "espalda", espalda_alta: "espalda", lumbar: "espalda",
  hombros: "hombros",
  biceps: "brazos", triceps: "brazos", antebrazos: "brazos",
  gluteos: "pierna", cuadriceps: "pierna", isquios: "pierna", gemelos: "pierna", aductores: "pierna",
};
export const DIAS_SIN_GRUPO = 21;
export const SILENCIO_GRUPO_DIAS = 14;

// Días de diferencia entre dos fechas «AAAA-MM-DD» (b − a), sin que el cambio de hora estorbe.
function diasEntre(a, b) {
  const utc = (d) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((utc(b) - utc(a)) / 86400000);
}

// La última fecha en que se entrenó cada grupo: { pecho: "AAAA-MM-DD", ... } (solo los que se han entrenado
// alguna vez). Sale del índice, que ya guarda la última vez de cada ejercicio (así no hay que leer todos los
// meses), más las sesiones que aún esperan en la cola de envíos.
export function ultimaVezPorGrupo(indice, ejercicioDe, sesionesExtra = []) {
  const ultima = {};
  const anotar = (ejercicioId, fecha) => {
    const e = ejercicioDe(ejercicioId);
    const grupo = e && GRUPO_DE_MUSCULO[e.musculo];
    if (grupo && fecha && (!ultima[grupo] || fecha > ultima[grupo])) ultima[grupo] = fecha;
  };
  Object.entries((indice && indice.ejercicios) || {}).forEach(([id, info]) => {
    if (info && info.ultima) anotar(id, info.ultima.fecha || fechaLocal(info.ultima.inicio));
  });
  (sesionesExtra || []).forEach((s) => {
    (s.ejercicios || []).forEach((ej) => {
      if ((ej.series || []).some((sr) => sr.hecha)) anotar(ej.ejercicioId, fechaLocal(s.inicio));
    });
  });
  return ultima;
}

// Los grupos que toca avisar, del más olvidado al menos: [{ grupo, dias, desde }]. No avisa:
// - de un grupo que no se ha entrenado nunca;
// - si no se ha entrenado **nada** en esas 3 semanas (eso no es olvidar un grupo, es una pausa; para eso
//   está el aviso de actividad), ni si una pausa declarada toca esas 3 semanas;
// - de un grupo cerrado hace menos de 14 días (`aviso.grupos[grupo]` = día en que se cerró).
export function gruposSinEntrenar({ ultimaVez, hoy, aviso }) {
  const hoyISO = typeof hoy === "string" ? hoy : fechaLocal(hoy);
  const estado = aviso || {};
  const fechas = Object.values(ultimaVez || {});
  if (!fechas.length) return [];
  const masReciente = fechas.reduce((a, b) => (b > a ? b : a));
  if (diasEntre(masReciente, hoyISO) >= DIAS_SIN_GRUPO) return [];
  const pausa = estado.pausa;
  if (pausa && pausa.desde && pausa.desde <= hoyISO && (!pausa.hasta || pausa.hasta >= sumarDias(hoyISO, -DIAS_SIN_GRUPO))) return [];
  const cerrados = estado.grupos || {};
  return GRUPOS_AVISO
    .filter((g) => ultimaVez[g])
    .map((g) => ({ grupo: g, desde: ultimaVez[g], dias: diasEntre(ultimaVez[g], hoyISO) }))
    .filter((x) => x.dias >= DIAS_SIN_GRUPO)
    .filter((x) => !(cerrados[x.grupo] && hoyISO < sumarDias(cerrados[x.grupo], SILENCIO_GRUPO_DIAS)))
    .sort((a, b) => b.dias - a.dias);
}

// ---------- Los 15 informes predefinidos (26-oct-2026) ----------
// Sustituyen a las cuatro tarjetas del mes de la fase K2 (informeCruzadoMes sigue aquí, con sus casos, por
// si se vuelve a usar). Son los de la maqueta v3-04 (local/ideas/esteticas/, decisiones en su registro.md):
// tres por cada cruce (comida × entreno, peso × comida, peso × entreno, ciclo) y tres de más de dos cosas.
// Los tres que usaban el hambre se cambiaron, porque hambre y energía están descartadas (26-oct):
//   «¿Pasas hambre con este déficit?» → «¿Los días que comes más se nota al día siguiente en la báscula?»;
//   «¿Cambia tu hambre según la fase?» → «¿Comes distinto según la fase del ciclo?»;
//   «Regla, peso y comida» → peso, kcal y sueño con las fases de fondo.
// Todo se calcula con la serie real de logica/cuerpo-series.js (construirSerie) y con la honestidad
// estadística de allí (pista / aún no hay suficiente). Cada informe devuelve solo números y qué dibujar
// (`grafica`); las frases las escribe la interfaz (ui/cuerpo/informes.jsx) con logica/i18n.js. Los del ciclo
// solo existen si la serie trae la fase (perfil de mujer, con el período del dispositivo).
//
// Cada `calc(serie, ctx)` recibe ctx = { semanas, periodo, objetivos } y devuelve:
//   { suficiente, cifras: {...}, mini: { datos, barras }, pista?, pista2?, grafica: { tipo, ... } }.

const mediaDe = (xs) => { const ys = xs.filter((v) => v !== null && v !== undefined && Number.isFinite(v)); return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : null; };
const ultimoDe = (xs) => [...xs].reverse().find((v) => v !== null && v !== undefined) ?? null;
const primeroDe = (xs) => xs.find((v) => v !== null && v !== undefined) ?? null;
const r2 = (x) => (x === null || x === undefined ? null : Math.round(x * 100) / 100);
const diasDelRango = (serie, semanas) => (Number.isFinite(semanas) ? serie.dias.slice(-semanas * 7) : serie.dias);

// Peso de un día respecto a la media de los pesajes de los 3 días de antes y de después (sin contarlo a él):
// quita la tendencia de fondo para ver solo lo que se mueve ese día. null si hay menos de 2 vecinos.
export function desviacionPeso(dias, i) {
  const d = dias[i];
  if (!d || d.peso === null || d.peso === undefined) return null;
  const vecinos = [];
  for (let k = Math.max(0, i - 3); k <= Math.min(dias.length - 1, i + 3); k++) {
    if (k !== i && dias[k].peso !== null && dias[k].peso !== undefined) vecinos.push(dias[k].peso);
  }
  if (vecinos.length < 2) return null;
  return r2(d.peso - vecinos.reduce((a, b) => a + b, 0) / vecinos.length);
}

// Lunes menos el viernes de antes, semana a semana (si falta el lunes vale el martes; si falta el viernes, el
// jueves): [{ fecha (el lunes), valor }].
export function pesoFinDeSemana(serie, semanas) {
  const dias = serie.dias;
  const desde = Number.isFinite(semanas) ? Math.max(0, dias.length - semanas * 7) : 0;
  const peso = (k) => (dias[k] && dias[k].peso !== null && dias[k].peso !== undefined ? dias[k].peso : null);
  const lista = [];
  for (let i = desde; i < dias.length; i++) {
    if (dias[i].dow !== 0) continue;
    const lunes = peso(i) ?? peso(i + 1);
    const viernes = peso(i - 3) ?? peso(i - 4);
    lista.push({ fecha: dias[i].fecha, valor: lunes !== null && viernes !== null ? r2(lunes - viernes) : null });
  }
  return lista;
}

const GRUPO_CE = "comidaEntreno", GRUPO_PC = "pesoComida", GRUPO_PE = "pesoEntreno", GRUPO_CI = "ciclo", GRUPO_MAS = "mas";
export const GRUPOS_INFORMES = [GRUPO_CE, GRUPO_PC, GRUPO_PE, GRUPO_CI, GRUPO_MAS];

export const INFORMES = [
  // ---- Comida × entreno ----
  {
    id: "ce-prot", grupo: GRUPO_CE,
    calc(serie, { semanas, objetivos }) {
      const g = porCategoria(serie, "entreno", "prot", semanas);
      const [sin, con] = g;
      const ref = objetivos && objetivos.prot ? objetivos.prot : null;
      return {
        suficiente: sin.n >= 7 && con.n >= 7,
        cifras: { con: con.media, sin: sin.media, nCon: con.n, nSin: sin.n, pctSin: ref && sin.media !== null ? Math.round((sin.media / ref) * 100) : null, ref },
        mini: { datos: [sin.media, con.media], barras: true },
        grafica: { tipo: "pares", grupos: g, variable: "prot", ref },
      };
    },
  },
  {
    id: "ce-hidr", grupo: GRUPO_CE,
    calc(serie, { semanas }) {
      const dias = diasDelRango(serie, semanas);
      const todos = serie.dias;
      const desde = todos.length - dias.length;
      const p = [];
      dias.forEach((d, k) => {
        const ant = todos[desde + k - 1];
        if (d.esfuerzo !== null && ant && ant.hidr !== null) p.push([ant.hidr, d.esfuerzo, d.fecha]);
      });
      const umbral = mediana(p.map((q) => q[0]));
      const alto = mediaDe(p.filter((q) => q[0] >= umbral).map((q) => q[1]));
      const bajo = mediaDe(p.filter((q) => q[0] < umbral).map((q) => q[1]));
      const pi = pista(pearson(p), p.length, "dia");
      return {
        suficiente: pi.tipo !== "poco",
        cifras: { alto: r2(alto), bajo: r2(bajo), umbral: umbral === null ? null : Math.round(umbral) },
        mini: { datos: [bajo, alto], barras: true },
        pista: pi,
        grafica: { tipo: "dispersion", p, x: "hidrAntes", y: "esfuerzo", periodo: "dia" },
      };
    },
  },
  {
    id: "ce-hechas", grupo: GRUPO_CE,
    calc(serie, { semanas }) {
      const rel = relacion(serie, "sesiones", "hechas", "semana", semanas);
      const umbral = Math.max(1, mediana(rel.p.map((q) => q[0])) || 0);
      const mas = mediaDe(rel.p.filter((q) => q[0] >= umbral).map((q) => q[1]));
      const menos = mediaDe(rel.p.filter((q) => q[0] < umbral).map((q) => q[1]));
      return {
        suficiente: rel.pista.tipo !== "poco",
        cifras: { mas: mas === null ? null : Math.round(mas), menos: menos === null ? null : Math.round(menos), umbral },
        mini: { datos: valores(serie, "hechas", "semana", semanas).map((q) => q.valor), barras: false },
        pista: rel.pista,
        grafica: { tipo: "dispersion", p: rel.p, x: "sesiones", y: "hechas", periodo: "semana" },
      };
    },
  },
  // ---- Peso × comida ----
  {
    id: "pc-balance", grupo: GRUPO_PC,
    calc(serie, { semanas, objetivos }) {
      const pe = valores(serie, "peso", "semana", semanas);
      const kc = valores(serie, "kcal", "semana", semanas);
      const ini = primeroDe(pe.map((q) => q.valor)), fin = ultimoDe(pe.map((q) => q.valor));
      const rel = relacion(serie, "kcal", "dPeso", "semana", semanas);
      const conPeso = pe.filter((q) => q.valor !== null).length;
      return {
        suficiente: conPeso >= 2 && kc.some((q) => q.valor !== null),
        cifras: { cambio: ini !== null && fin !== null ? r2(fin - ini) : null, kcalMedia: mediaDe(kc.map((q) => q.valor)), semanaMedia: r2(mediaDe(valores(serie, "dPeso", "semana", semanas).map((q) => q.valor))) },
        mini: { datos: pe.map((q) => q.valor), barras: false },
        pista: rel.pista,
        grafica: { tipo: "lineas2", periodo: "semana", filas: [{ variable: "kcal", datos: kc, barras: true, ref: objetivos && objetivos.kcal ? objetivos.kcal : null }, { variable: "peso", datos: pe }] },
      };
    },
  },
  {
    id: "pc-finde", grupo: GRUPO_PC,
    calc(serie, { semanas }) {
      const f = pesoFinDeSemana(serie, semanas);
      const conDato = f.filter((q) => q.valor !== null);
      const m = mediaDe(conDato.map((q) => q.valor));
      return {
        suficiente: conDato.length >= MINIMO.semana,
        cifras: { media: r2(m), n: conDato.length, min: MINIMO.semana },
        mini: { datos: f.map((q) => q.valor), barras: true },
        grafica: { tipo: "linea", periodo: "semana", datos: f, barras: true, unidad: "kg", dec: 1 },
      };
    },
  },
  {
    id: "pc-siguiente", grupo: GRUPO_PC,
    calc(serie, { semanas }) {
      const todos = serie.dias;
      const desde = Number.isFinite(semanas) ? Math.max(0, todos.length - semanas * 7) : 0;
      const p = [];
      for (let i = desde; i < todos.length - 1; i++) {
        if (todos[i].kcal === null) continue;
        const desv = desviacionPeso(todos, i + 1);
        if (desv !== null) p.push([todos[i].kcal, desv, todos[i].fecha]);
      }
      const umbral = mediana(p.map((q) => q[0]));
      const mas = mediaDe(p.filter((q) => q[0] >= umbral).map((q) => q[1]));
      const menos = mediaDe(p.filter((q) => q[0] < umbral).map((q) => q[1]));
      const pi = pista(pearson(p), p.length, "dia");
      return {
        suficiente: pi.tipo !== "poco",
        cifras: { mas: r2(mas), menos: r2(menos), umbral: umbral === null ? null : Math.round(umbral) },
        mini: { datos: [menos, mas], barras: true },
        pista: pi,
        grafica: { tipo: "dispersion", p, x: "kcal", y: "desvPeso", periodo: "dia" },
      };
    },
  },
  // ---- Peso × entreno ----
  {
    id: "pe-fuerza", grupo: GRUPO_PE,
    calc(serie, { semanas }) {
      const ej = ejerciciosConRM(serie)[0] || null;
      const rm = ej ? valores(serie, "rm:" + ej.id, "semana", semanas) : [];
      const pe = valores(serie, "peso", "semana", semanas);
      const d = (xs) => { const a = primeroDe(xs), b = ultimoDe(xs); return a !== null && b !== null ? r2(b - a) : null; };
      const vr = rm.map((q) => q.valor), vp = pe.map((q) => q.valor);
      return {
        suficiente: vr.filter((v) => v !== null).length >= 2 && vp.filter((v) => v !== null).length >= 2,
        cifras: { ejercicio: ej ? ej.id : null, dRm: d(vr), dPeso: d(vp) },
        mini: { datos: vr, barras: false },
        grafica: { tipo: "lineas2", periodo: "semana", filas: [{ variable: ej ? "rm:" + ej.id : null, datos: rm }, { variable: "peso", datos: pe }] },
      };
    },
  },
  {
    id: "pe-relativa", grupo: GRUPO_PE,
    calc(serie, { semanas }) {
      const ej = ejerciciosConRM(serie)[0] || null;
      const rm = ej ? valores(serie, "rm:" + ej.id, "semana", semanas) : [];
      const pe = Object.fromEntries(valores(serie, "peso", "semana", semanas).map((q) => [q.fecha, q.valor]));
      const rel = rm.map((q) => ({ fecha: q.fecha, valor: q.valor !== null && pe[q.fecha] ? Math.round((q.valor / pe[q.fecha]) * 1000) / 1000 : null }));
      return {
        suficiente: rel.filter((q) => q.valor !== null).length >= 2,
        cifras: { ejercicio: ej ? ej.id : null, ultimo: ultimoDe(rel.map((q) => q.valor)) },
        mini: { datos: rel.map((q) => q.valor), barras: false },
        grafica: { tipo: "linea", periodo: "semana", datos: rel, unidad: "×", dec: 2, ref: 1 },
      };
    },
  },
  {
    id: "pe-volumen", grupo: GRUPO_PE,
    calc(serie, { semanas }) {
      const rel = relacion(serie, "volumen", "dPeso", "semana", semanas);
      return {
        suficiente: rel.pista.tipo !== "poco",
        cifras: { n: rel.n },
        mini: { datos: valores(serie, "volumen", "semana", semanas).map((q) => q.valor), barras: true },
        pista: rel.pista,
        grafica: { tipo: "dispersion", p: rel.p, x: "volumen", y: "dPeso", periodo: "semana" },
      };
    },
  },
  // ---- Ciclo (solo con perfil de mujer; calculado en el móvil) ----
  {
    id: "ci-peso", grupo: GRUPO_CI, local: true,
    calc(serie, { semanas }) {
      const dias = serie.dias;
      const desde = Number.isFinite(semanas) ? Math.max(0, dias.length - semanas * 7) : 0;
      const porDia = {};
      for (let i = desde; i < dias.length; i++) {
        const c = dias[i].cicloDia;
        if (!c || c > 28) continue;
        const desv = desviacionPeso(dias, i);
        if (desv !== null) (porDia[c] = porDia[c] || []).push(desv);
      }
      const datos = Array.from({ length: 28 }, (_, k) => ({ fecha: String(k + 1), valor: porDia[k + 1] ? r2(mediaDe(porDia[k + 1])) : null }));
      const conDato = datos.filter((q) => q.valor !== null);
      const max = conDato.length ? conDato.reduce((a, b) => (b.valor > a.valor ? b : a)) : null;
      return {
        suficiente: conDato.length >= MINIMO.dia,
        cifras: { max: max ? max.valor : null, dia: max ? Number(max.fecha) : null, n: conDato.length, min: MINIMO.dia },
        mini: { datos: datos.map((q) => q.valor), barras: false, color: "var(--berry)" },
        grafica: { tipo: "linea", periodo: "ciclo", datos, unidad: "kg", dec: 2, ref: 0, color: "var(--berry)" },
      };
    },
  },
  {
    id: "ci-comida", grupo: GRUPO_CI, local: true,
    calc(serie, { semanas, objetivos }) {
      const g = porCategoria(serie, "fase", "kcal", semanas);
      return {
        suficiente: g.every((x) => x.n >= MINIMO_CATEGORIA),
        cifras: { lutea: g[3].media, folicular: g[1].media, minN: Math.min(...g.map((x) => x.n)) },
        mini: { datos: g.map((x) => x.media), barras: true, color: "var(--berry)" },
        grafica: { tipo: "pares", grupos: g, variable: "kcal", ref: objetivos && objetivos.kcal ? objetivos.kcal : null, ciclo: true },
      };
    },
  },
  {
    id: "ci-rinde", grupo: GRUPO_CI, local: true,
    calc(serie, { semanas }) {
      const g = porCategoria(serie, "fase", "esfuerzo", semanas);
      const total = g.reduce((t, x) => t + x.n, 0);
      return {
        suficiente: g.every((x) => x.n >= 3) && total >= MINIMO.dia,
        cifras: { regla: g[0].media, folicular: g[1].media, total },
        mini: { datos: g.map((x) => x.media), barras: true, color: "var(--berry)" },
        grafica: { tipo: "pares", grupos: g, variable: "esfuerzo", ref: null, ciclo: true },
      };
    },
  },
  // ---- Más de dos cosas a la vez ----
  {
    id: "m-sueno", grupo: GRUPO_MAS, conPeriodo: true,
    calc(serie, { semanas, periodo }) {
      const dias = diasDelRango(serie, semanas).filter((d) => d.sueno !== null && d.kcal !== null);
      const umbral = mediana(dias.map((d) => d.sueno));
      const corto = mediaDe(dias.filter((d) => d.sueno < umbral).map((d) => d.kcal));
      const largo = mediaDe(dias.filter((d) => d.sueno >= umbral).map((d) => d.kcal));
      const relK = relacion(serie, "sueno", "kcal", "dia", semanas);
      const relE = relacion(serie, "sueno", "esfuerzo", "dia", semanas);
      const p = periodo === "dia" ? "dia" : "semana";
      return {
        suficiente: relK.pista.tipo !== "poco",
        cifras: { dif: corto !== null && largo !== null ? Math.round(corto - largo) : null, umbral },
        mini: { datos: valores(serie, "sueno", "semana", Math.min(semanas, 8)).map((q) => q.valor), barras: false },
        pista: relK.pista,
        pista2: relE.pista,
        grafica: { tipo: "apiladas", periodo: p, ids: ["sueno", "kcal", "esfuerzo"], semanas: p === "dia" ? Math.min(semanas, 4) : semanas },
      };
    },
  },
  {
    id: "m-ciclo", grupo: GRUPO_MAS, local: true,
    calc(serie, { semanas }) {
      const s = Math.min(semanas, 8);
      const dias = diasDelRango(serie, s);
      const conFase = dias.filter((d) => d.fase).length;
      return {
        suficiente: conFase >= MINIMO.dia,
        cifras: { semanas: s, conFase },
        mini: { datos: valores(serie, "peso", "dia", s).map((q) => q.valor).slice(-28), barras: false, color: "var(--berry)" },
        grafica: { tipo: "apiladas", periodo: "dia", ids: ["peso", "kcal", "sueno"], semanas: s, bandasFase: true },
      };
    },
  },
  {
    id: "m-prot", grupo: GRUPO_MAS,
    calc(serie, { semanas }) {
      const tabla = tablaXYZ(serie, ["prot", "sesiones", "dPeso"], "semana", semanas);
      const conMedia = Object.values(tabla.celdas).filter((c) => c.media !== null).length;
      return {
        suficiente: conMedia >= 2,
        cifras: { conMedia },
        mini: { datos: valores(serie, "prot", "semana", semanas).map((q) => q.valor), barras: false },
        grafica: { tipo: "tabla", ids: ["prot", "sesiones", "dPeso"], tabla },
      };
    },
  },
];

// Los informes que se ven: los del ciclo, solo si hay fase (perfil de mujer con el período del dispositivo).
export function informesVisibles(conCiclo) {
  return INFORMES.filter((it) => !it.local || conCiclo);
}
