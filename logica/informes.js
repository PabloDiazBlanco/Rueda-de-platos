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
