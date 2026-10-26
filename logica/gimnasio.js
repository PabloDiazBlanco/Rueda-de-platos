// ---------- logica/gimnasio.js ----------
// El gimnasio dibujado de FitDraft (parte estética, 26-oct-2026; maquetas v3-01, v3-02 y v3-03 de
// local/ideas/esteticas/, decisiones en su registro.md, «Bloque ENTRENO / FITDRAFT»): todo lo que no es
// dibujo. La interfaz (ui/entreno/gimnasio*.jsx) solo pinta lo que sale de aquí.
//
// - El plano es una planta vista desde arriba con un poco de canto, de ANCHO × ALTO unidades (600 × 1010):
//   el gimnasio entero cabe a lo ancho de un móvil y, con zoom, una zona llena la pantalla. Arriba la sala
//   (siete zonas), abajo la oficina (izquierda) y la recepción (derecha), y la puerta en la fachada.
// - Las zonas son las cinco de los avisos de grupos (G8: pecho, espalda, pierna, hombros, brazos) más
//   esterillas (abdomen) y cardio. Entre todas cubren los 15 músculos de la biblioteca: cada músculo está en
//   una sola zona (zonaDeMusculo).
// - Las 25 máquinas («estaciones») se reparten los 80 ejercicios de la biblioteca: cada ejercicio está en una
//   sola (validacion/ lo comprueba). El press militar va en el mancuernero; la elevación de piernas y los
//   fondos, en la torre de dominadas; el peso muerto, en la plataforma de la zona de pierna (su músculo
//   principal es isquios). Los ejercicios propios no tienen máquina: se colocan en la de su músculo
//   (ESTACION_POR_MUSCULO), solo para dibujar la ruta de una rutina.
// - Rutas: rejilla de 10 unidades y A*, con el camino estirado para que no zigzaguee.
// - Zonas teñidas (v3-03 · A): verde = entrenada esta semana; gris con telarañas = 14 días o más sin
//   entrenar. Sale del índice del entreno (la última vez de cada ejercicio), sin leer ningún mes.
// - El monitor: una frase al día como mucho, al azar dentro de su situación.
//
// Sin React y sin dibujo. Solo importa de entreno-calculo.js (fechas).
import { fechaLocal, semanaDe } from "entreno-calculo";

export const ANCHO = 600;
export const ALTO = 1010;
// Hasta dónde llega lo que se ve de la fachada: lo de debajo es acera.
export const FONDO = 952;

// ---------- Zonas ----------
// `lx`, `ly`: dónde va su rótulo de lejos. `musculos`: los músculos principales que caen en ella, en el orden
// en que salen en su lista (y en sus filtros).
export const ZONAS = [
  { id: "pierna", x: 12, y: 12, w: 278, h: 278, musculos: ["cuadriceps", "isquios", "gluteos", "gemelos", "aductores"], lx: 151, ly: 140 },
  { id: "espalda", x: 340, y: 12, w: 248, h: 278, musculos: ["dorsales", "espalda_alta", "lumbar"], lx: 464, ly: 140 },
  { id: "pecho", x: 12, y: 318, w: 278, h: 210, musculos: ["pecho"], lx: 151, ly: 432 },
  { id: "hombros", x: 340, y: 318, w: 248, h: 102, musculos: ["hombros"], lx: 464, ly: 372 },
  { id: "brazos", x: 340, y: 420, w: 248, h: 108, musculos: ["biceps", "triceps", "antebrazos"], lx: 464, ly: 478 },
  { id: "core", x: 12, y: 552, w: 278, h: 136, musculos: ["abdomen"], lx: 151, ly: 620 },
  { id: "cardio", x: 340, y: 552, w: 248, h: 136, musculos: ["cardio"], lx: 464, ly: 620 },
];
export const ZONA = Object.fromEntries(ZONAS.map((z) => [z.id, z]));

export function zonaDeMusculo(musculo) {
  const z = ZONAS.find((zz) => zz.musculos.includes(musculo));
  return z ? z.id : null;
}

// ---------- Máquinas ----------
// `tipo` y `var` dicen qué dibujo lleva (ui/entreno/gimnasio-dibujo.jsx); `ej`, sus ejercicios, con el
// «principal» primero (el que encabeza la lista al tocarla). Su nombre, solo de adorno en el dibujo al
// acercarse, está en logica/i18n.js (`fitdraft.maquina.<id>`): en las listas no sale nunca.
export const ESTACIONES = [
  // Pierna
  { id: "rack", zona: "pierna", tipo: "rack", x: 30, y: 60, w: 84, h: 72, ej: ["ex_sentadilla", "ex_sentadilla_frontal", "ex_hip_thrust"] },
  { id: "plataforma", zona: "pierna", tipo: "plataforma", x: 136, y: 64, w: 136, h: 58, ej: ["ex_peso_muerto", "ex_peso_muerto_rumano"] },
  { id: "prensa", zona: "pierna", tipo: "prensa", x: 28, y: 164, w: 62, h: 104, ej: ["ex_prensa", "ex_hack", "ex_gemelos_pie", "ex_gemelos_sentado"] },
  { id: "sillas", zona: "pierna", tipo: "maquina", var: "sillas", x: 116, y: 158, w: 60, h: 62, ej: ["ex_extension_cuadriceps", "ex_femoral_tumbado", "ex_femoral_sentado"] },
  { id: "gluteo", zona: "pierna", tipo: "maquina", var: "gluteo", x: 206, y: 158, w: 60, h: 62, ej: ["ex_abductores", "ex_aductores", "ex_hip_thrust_maquina", "ex_patada_gluteo"] },
  { id: "libre", zona: "pierna", tipo: "libre", x: 116, y: 236, w: 154, h: 42, ej: ["ex_zancadas", "ex_bulgara", "ex_sentadilla_goblet"] },
  // Espalda
  { id: "jalon", zona: "espalda", tipo: "jalon", x: 356, y: 56, w: 62, h: 76, ej: ["ex_jalon_pecho", "ex_jalon_estrecho", "ex_pullover_polea"] },
  { id: "remo-polea", zona: "espalda", tipo: "remoPolea", x: 440, y: 52, w: 50, h: 104, ej: ["ex_remo_sentado_polea"] },
  { id: "torre", zona: "espalda", tipo: "torre", x: 512, y: 56, w: 62, h: 64, ej: ["ex_dominadas", "ex_dominadas_lastradas", "ex_dominadas_asistidas", "ex_fondos_paralelas", "ex_elevacion_piernas"] },
  { id: "remo-maquina", zona: "espalda", tipo: "maquina", var: "remo", x: 356, y: 172, w: 60, h: 64, ej: ["ex_remo_maquina"] },
  { id: "remo-libre", zona: "espalda", tipo: "bancoRemo", x: 434, y: 190, w: 80, h: 56, ej: ["ex_remo_barra", "ex_remo_landmine", "ex_remo_mancuerna", "ex_encogimientos"] },
  { id: "hiper", zona: "espalda", tipo: "hiper", x: 532, y: 160, w: 44, h: 76, ej: ["ex_hiperextensiones"] },
  // Pecho
  { id: "banco-plano", zona: "pecho", tipo: "bancoBarra", x: 30, y: 334, w: 74, h: 88, ej: ["ex_press_banca_barra", "ex_press_declinado_barra", "ex_press_cerrado"] },
  { id: "banco-inclinado", zona: "pecho", tipo: "bancoInclinado", x: 122, y: 334, w: 66, h: 88, ej: ["ex_press_inclinado_barra", "ex_press_inclinado_mancuernas", "ex_press_banca_mancuernas", "ex_aperturas_mancuernas"] },
  { id: "contractor", zona: "pecho", tipo: "maquina", var: "contractor", x: 208, y: 338, w: 64, h: 66, ej: ["ex_press_pecho_maquina", "ex_aperturas_maquina"] },
  { id: "cruce", zona: "pecho", tipo: "cruce", x: 40, y: 446, w: 210, h: 66, ej: ["ex_cruce_poleas"] },
  // Hombros
  { id: "mancuernero", zona: "hombros", tipo: "mancuernero", x: 352, y: 326, w: 128, h: 84, ej: ["ex_press_militar", "ex_press_hombro_mancuernas", "ex_laterales_mancuernas", "ex_frontales", "ex_pajaros_mancuernas"] },
  { id: "maquina-hombro", zona: "hombros", tipo: "maquina", var: "hombro", x: 490, y: 330, w: 52, h: 68, ej: ["ex_press_hombro_maquina", "ex_laterales_maquina", "ex_contractor_inverso"] },
  { id: "polea-alta", zona: "hombros", tipo: "polea", x: 552, y: 326, w: 30, h: 76, ej: ["ex_face_pull", "ex_laterales_polea"] },
  // Brazos
  { id: "polea-brazos", zona: "brazos", tipo: "polea", x: 352, y: 434, w: 36, h: 80, ej: ["ex_triceps_cuerda", "ex_triceps_barra_polea", "ex_triceps_sobre_cabeza", "ex_curl_polea"] },
  { id: "banco-brazos", zona: "brazos", tipo: "bancoBrazos", x: 404, y: 440, w: 100, h: 66, ej: ["ex_curl_barra", "ex_curl_mancuernas", "ex_curl_martillo", "ex_curl_inclinado", "ex_press_frances", "ex_curl_muneca"] },
  { id: "predicador", zona: "brazos", tipo: "predicador", x: 518, y: 436, w: 60, h: 74, ej: ["ex_curl_predicador", "ex_fondos_maquina"] },
  // Esterillas
  { id: "esterillas", zona: "core", tipo: "esterilla", x: 26, y: 572, w: 160, h: 104, ej: ["ex_plancha", "ex_plancha_lateral", "ex_crunch", "ex_rueda_abdominal", "ex_flexiones", "ex_comba"] },
  { id: "abs-maquina", zona: "core", tipo: "maquina", var: "abs", x: 200, y: 574, w: 58, h: 66, ej: ["ex_crunch_polea", "ex_crunch_maquina"] },
  // Cardio
  { id: "cardio", zona: "cardio", tipo: "cardio", x: 352, y: 572, w: 226, h: 100, ej: ["ex_cinta", "ex_bicicleta", "ex_eliptica", "ex_remo_ergometro", "ex_escaladora", "ex_caminar"] },
];
export const ESTACION = Object.fromEntries(ESTACIONES.map((e) => [e.id, e]));
// Máquina de cada ejercicio de la biblioteca.
export const ESTACION_DE = {};
ESTACIONES.forEach((e) => e.ej.forEach((id) => { ESTACION_DE[id] = e.id; }));

// Dónde se dibuja un ejercicio propio (no tiene máquina): en la más típica de su músculo principal.
export const ESTACION_POR_MUSCULO = {
  pecho: "banco-plano", dorsales: "jalon", espalda_alta: "remo-libre", lumbar: "hiper", hombros: "mancuernero",
  biceps: "banco-brazos", triceps: "polea-brazos", antebrazos: "banco-brazos", abdomen: "esterillas",
  cuadriceps: "rack", isquios: "sillas", gluteos: "gluteo", gemelos: "prensa", aductores: "gluteo", cardio: "cardio",
};

// La máquina de un ejercicio (el objeto de la biblioteca o propio, o null): la suya o la de su músculo.
export function estacionDeEjercicio(ejercicio) {
  if (!ejercicio) return null;
  return ESTACION_DE[ejercicio.id] || ESTACION_POR_MUSCULO[ejercicio.musculo] || null;
}

// ---------- Oficina, recepción y lo que estorba al andar ----------
// Lo que se toca y no es una máquina: el torno (Empezar), la pizarra (Progreso), el libro (Historial), la
// estantería (Rutinas), el corcho (la semana) y el monitor.
export const SITIOS = [
  { id: "empezar", x: 292, y: 772, w: 46, h: 30 },
  { id: "progreso", x: 386, y: 702, w: 182, h: 52 },
  { id: "historial", x: 470, y: 806, w: 38, h: 18 },
  { id: "rutinas", x: 22, y: 702, w: 108, h: 54 },
  { id: "semana", x: 144, y: 704, w: 104, h: 46 },
  { id: "monitor", x: 98, y: 762, w: 46, h: 46 },
];
export const SITIO = Object.fromEntries(SITIOS.map((s) => [s.id, s]));
export const MUEBLES = [
  { id: "mesa", x: 56, y: 806, w: 132, h: 44 }, { id: "silla-visita", x: 108, y: 862, w: 28, h: 24 }, { id: "planta-of", x: 20, y: 884, w: 26, h: 30 },
  { id: "mostrador", x: 452, y: 806, w: 124, h: 44 }, { id: "banco-espera", x: 286, y: 880, w: 74, h: 22 }, { id: "planta-rec", x: 554, y: 884, w: 26, h: 30 },
  { id: "fuente", x: 262, y: 652, w: 22, h: 28 },
];
// Paredes (lo que se ve como su borde de arriba) y las caras que se ven de frente.
export const PAREDES = [
  { x: 0, y: 0, w: ANCHO, h: 12 }, { x: 0, y: 0, w: 12, h: 940 }, { x: 588, y: 0, w: 12, h: 940 },
  { x: 0, y: 928, w: 380, h: 12 }, { x: 470, y: 928, w: 130, h: 12 },
  { x: 0, y: 688, w: 290, h: 12 }, { x: 340, y: 688, w: 260, h: 12 },
  { x: 254, y: 700, w: 12, h: 80 }, { x: 254, y: 860, w: 12, h: 20 }, { x: 254, y: 916, w: 12, h: 12 },
];
export const CARAS = [{ x: 12, y: 12, w: 576, h: 28 }, { x: 12, y: 700, w: 242, h: 56 }, { x: 266, y: 700, w: 24, h: 56 }, { x: 340, y: 700, w: 248, h: 56 }];
// La ventana de la oficina: abierta y sin cristal, pero no se pasa por ella.
export const ALFEIZAR = { x: 254, y: 780, w: 12, h: 80 };
const OBSTACULOS = [...PAREDES, ...CARAS, ALFEIZAR, ...ESTACIONES, ...MUEBLES, { x: 98, y: 770, w: 46, h: 32 }, { x: 22, y: 702, w: 108, h: 58 }];
export const ENTRADA_FUERA = { x: 425, y: 980 };
export const ENTRADA_DENTRO = { x: 425, y: 896 };
// Donde está sentado el monitor (los pies, para el dibujo y su bocadillo).
export const MONITOR = { x: 121, y: 810 };

// ---------- La lista de una zona ----------
const centro = (c) => [c.x + c.w / 2, c.y + c.h / 2];
const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Al tocar una zona o una máquina, una sola lista con **todos** los ejercicios de la zona (los de músculo
// principal dentro de ella), en este orden:
// 1. si se tocó una máquina, su ejercicio principal (el primero de los suyos que es de la zona);
// 2. el resto de ese mismo músculo, del más cerca al más lejos de la máquina tocada (los de su misma
//    máquina, primero);
// 3. los demás músculos de la zona, en su orden, cada uno igual de cerca a lejos.
// Sin máquina tocada, músculo a músculo en el orden de la biblioteca. Dentro de una misma distancia, el
// orden de la biblioteca; los propios (sin máquina) van al final de su músculo. Nada de nombres de máquina:
// eso lo pinta la interfaz como «equipo · músculo».
// `lista`: la biblioteca del usuario (listaEjercicios), con sus propios. Devuelve los ids.
export function ejerciciosDeZona(lista, zonaId, estacionId = null) {
  const zona = ZONA[zonaId];
  if (!zona) return [];
  const est = estacionId ? ESTACION[estacionId] : null;
  const enZona = (lista || []).filter((e) => zona.musculos.includes(e.musculo));
  const porId = Object.fromEntries(enZona.map((e) => [e.id, e]));
  const principal = est ? est.ej.find((id) => porId[id]) : null;
  const orden = new Map(enZona.map((e, i) => [e.id, i]));
  const distDe = (e) => {
    const sitio = ESTACION_DE[e.id];
    if (!sitio) return Infinity;
    return est ? distancia(centro(ESTACION[sitio]), centro(est)) : 0;
  };
  const primerMusculo = principal ? porId[principal].musculo : null;
  const musculos = primerMusculo ? [primerMusculo, ...zona.musculos.filter((m) => m !== primerMusculo)] : zona.musculos;
  const resultado = [];
  if (principal) resultado.push(principal);
  musculos.forEach((m) => {
    enZona
      .filter((e) => e.musculo === m && e.id !== principal)
      .sort((a, b) => distDe(a) - distDe(b) || orden.get(a.id) - orden.get(b.id))
      .forEach((e) => resultado.push(e.id));
  });
  return resultado;
}

// ---------- Rutas: rejilla de 10 unidades y A* ----------
const CELDA = 10;
const COLS = ANCHO / CELDA;
const FILAS = Math.ceil(ALTO / CELDA);
const RADIO = 8;

// ¿Cabe el avatar (un círculo de `radio`) en este punto sin tocar nada?
export function libre(px, py, radio = RADIO) {
  if (px < radio || py < radio || px > ANCHO - radio || py > ALTO - radio - 22) return false;
  for (const o of OBSTACULOS) if (px > o.x - radio && px < o.x + o.w + radio && py > o.y - radio && py < o.y + o.h + radio) return false;
  return true;
}

// La rejilla se calcula la primera vez que hace falta (no al cargar el módulo).
let rejilla = null;
function laRejilla() {
  if (!rejilla) {
    rejilla = new Uint8Array(COLS * FILAS);
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) rejilla[f * COLS + c] = libre(c * CELDA + 5, f * CELDA + 5) ? 0 : 1;
  }
  return rejilla;
}
const celdaDe = (x, y) => [Math.max(0, Math.min(COLS - 1, Math.floor(x / CELDA))), Math.max(0, Math.min(FILAS - 1, Math.floor(y / CELDA)))];
function celdaLibreCerca(c, f) {
  const r = laRejilla();
  if (!r[f * COLS + c]) return [c, f];
  for (let rr = 1; rr < 12; rr++) {
    for (let dc = -rr; dc <= rr; dc++) {
      for (let df = -rr; df <= rr; df++) {
        const cc = c + dc, ff = f + df;
        if (cc >= 0 && ff >= 0 && cc < COLS && ff < FILAS && !r[ff * COLS + cc]) return [cc, ff];
      }
    }
  }
  return [c, f];
}

// Camino de (x0, y0) a (x1, y1) por los pasillos: lista de puntos [[x, y], ...] que empieza y acaba en los
// puntos pedidos, o null si no hay paso. Ocho direcciones sin cortar esquinas; al final se estira (de cada
// punto se salta al más lejano que se vea sin chocar), para que se dibuje como una ruta de Maps y no en
// escalera.
export function aEstrella(x0, y0, x1, y1) {
  const r = laRejilla();
  const [sc, sf] = celdaLibreCerca(...celdaDe(x0, y0));
  const [ec, ef] = celdaLibreCerca(...celdaDe(x1, y1));
  const N = COLS * FILAS;
  const g = new Float32Array(N).fill(Infinity);
  const de = new Int32Array(N).fill(-1);
  const cerrado = new Uint8Array(N);
  const inicio = sf * COLS + sc, fin = ef * COLS + ec;
  const h = (i) => { const dc = Math.abs((i % COLS) - ec), df = Math.abs(Math.floor(i / COLS) - ef); return Math.max(dc, df) + 0.414 * Math.min(dc, df); };
  // Montículo binario de [prioridad, celda].
  const monton = [[h(inicio), inicio]];
  g[inicio] = 0;
  const subir = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (monton[p][0] <= monton[i][0]) break; [monton[p], monton[i]] = [monton[i], monton[p]]; i = p; } };
  const bajar = (i) => {
    for (;;) {
      let m = i; const a = 2 * i + 1, b = a + 1;
      if (a < monton.length && monton[a][0] < monton[m][0]) m = a;
      if (b < monton.length && monton[b][0] < monton[m][0]) m = b;
      if (m === i) break;
      [monton[m], monton[i]] = [monton[i], monton[m]]; i = m;
    }
  };
  while (monton.length) {
    const [, i] = monton[0];
    const ult = monton.pop();
    if (monton.length) { monton[0] = ult; bajar(0); }
    if (cerrado[i]) continue;
    cerrado[i] = 1;
    if (i === fin) break;
    const c = i % COLS, f = Math.floor(i / COLS);
    for (let dc = -1; dc <= 1; dc++) {
      for (let df = -1; df <= 1; df++) {
        if (!dc && !df) continue;
        const cc = c + dc, ff = f + df;
        if (cc < 0 || ff < 0 || cc >= COLS || ff >= FILAS) continue;
        const j = ff * COLS + cc;
        if (r[j] || cerrado[j]) continue;
        if (dc && df && (r[f * COLS + cc] || r[ff * COLS + c])) continue; // sin cortar esquinas
        const ng = g[i] + (dc && df ? 1.414 : 1);
        if (ng < g[j]) { g[j] = ng; de[j] = i; monton.push([ng + h(j), j]); subir(monton.length - 1); }
      }
    }
  }
  if (de[fin] === -1 && fin !== inicio) return null;
  const celdas = [];
  for (let i = fin; i !== -1; i = de[i]) celdas.push(i);
  celdas.reverse();
  const puntos = [[x0, y0], ...celdas.map((i) => [(i % COLS) * CELDA + 5, Math.floor(i / COLS) * CELDA + 5]), [x1, y1]];
  const ve = (a, b) => {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4);
    for (let k = 1; k < n; k++) { const t = k / n; if (!libre(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, RADIO - 1)) return false; }
    return true;
  };
  const liso = [puntos[0]];
  let i = 0;
  while (i < puntos.length - 1) {
    let j = puntos.length - 1;
    while (j > i + 1 && !ve(puntos[i], puntos[j])) j--;
    liso.push(puntos[j]);
    i = j;
  }
  return liso;
}

export const largoRuta = (ruta) => (ruta || []).reduce((a, p, i) => (i ? a + Math.hypot(p[0] - ruta[i - 1][0], p[1] - ruta[i - 1][1]) : 0), 0);

// Dónde se pone el avatar para usar una máquina (o un sitio): delante si se puede (es por donde se sube
// uno); si no, a un lado o detrás. Con `desde`, el lado al que se llega antes andando.
export function puntoDe(cosa, desde = null) {
  const { x, y, w, h } = cosa;
  const cx = x + w / 2, cy = y + h / 2;
  const cand = [[cx, y + h + 14], [x - 14, cy], [x + w + 14, cy], [cx, y - 14]].filter(([px, py]) => libre(px, py));
  if (!cand.length) return [cx, y + h + 14];
  if (!desde) return cand[0];
  let mejor = cand[0], ml = Infinity;
  cand.forEach((p) => {
    const ruta = aEstrella(desde[0], desde[1], p[0], p[1]);
    const lg = ruta ? largoRuta(ruta) + (p === cand[0] ? 0 : 30) : Infinity;
    if (lg < ml) { ml = lg; mejor = p; }
  });
  return mejor;
}

// ---------- La rutina como ruta ----------
// Las paradas de una lista de ejercicios en su orden (el de la rutina o el de la sesión; nunca «por
// cercanía»: el gimnasio del dibujo no es el del usuario y el orden bueno es el del entrenamiento). Dos
// ejercicios seguidos en la misma máquina son una sola parada. Devuelve [{ estacion, indices }], con
// `indices` = las posiciones de la lista que caen en esa parada. Los ejercicios sin máquina posible
// (desconocidos) se saltan.
export function paradasDeRutina(ejercicioIds, ejercicioDe) {
  const paradas = [];
  (ejercicioIds || []).forEach((id, i) => {
    const est = estacionDeEjercicio(ejercicioDe(id));
    if (!est) return;
    const ultima = paradas[paradas.length - 1];
    if (ultima && ultima.estacion === est) ultima.indices.push(i);
    else paradas.push({ estacion: est, indices: [i] });
  });
  return paradas;
}

// ---------- Entre ejercicios (V2 de la v3-02) ----------
// Al marcar la última serie pendiente de un ejercicio, ¿a qué ejercicio toca ir? El siguiente de la sesión
// (el orden de la rutina) con alguna serie sin hacer; si detrás no queda ninguno, el primero pendiente de
// antes (uno que se saltó). null si el ejercicio aún tiene series pendientes, si no existe o si ya está todo
// hecho. Devuelve { desde, hacia } (índices en sesion.ejercicios).
export function pasoEntreEjercicios(sesion, inst) {
  const lista = (sesion && sesion.ejercicios) || [];
  const i = lista.findIndex((e) => e.inst === inst);
  if (i < 0) return null;
  const terminado = (e) => (e.series || []).length > 0 && e.series.every((s) => s.hecha);
  if (!terminado(lista[i])) return null;
  const pendiente = (e) => (e.series || []).some((s) => !s.hecha);
  let j = lista.findIndex((e, k) => k > i && pendiente(e));
  if (j < 0) j = lista.findIndex((e, k) => k < i && pendiente(e));
  return j < 0 ? null : { desde: i, hacia: j };
}

// ---------- Zonas teñidas ----------
export const DIAS_ZONA_OLVIDADA = 14;

function diasEntre(a, b) {
  const utc = (d) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((utc(b) - utc(a)) / 86400000);
}

// La última fecha en que se entrenó cada zona (por el músculo principal de cada ejercicio, como el aviso
// G8) y la última sesión de todas: { zonas: { pierna: "AAAA-MM-DD", ... }, ultima }. Del índice (la última
// vez de cada ejercicio) más las sesiones que aún esperan en la cola; nunca lee meses.
export function ultimaVezPorZona(indice, ejercicioDe, sesionesExtra = []) {
  const zonas = {};
  let ultima = null;
  const anotar = (ejercicioId, fecha) => {
    if (!fecha) return;
    if (!ultima || fecha > ultima) ultima = fecha;
    const e = ejercicioDe(ejercicioId);
    const z = e && zonaDeMusculo(e.musculo);
    if (z && (!zonas[z] || fecha > zonas[z])) zonas[z] = fecha;
  };
  Object.entries((indice && indice.ejercicios) || {}).forEach(([id, info]) => {
    if (info && info.ultima) anotar(id, info.ultima.fecha || fechaLocal(info.ultima.inicio));
  });
  (sesionesExtra || []).forEach((s) => {
    (s.ejercicios || []).forEach((ej) => {
      if ((ej.series || []).some((sr) => sr.hecha)) anotar(ej.ejercicioId, fechaLocal(s.inicio));
    });
  });
  return { zonas, ultima };
}

// Estado de cada zona: { pierna: { estado, dias }, ... }, con estado
// - "entrenada": se entrenó esta semana (desde el primer día de la semana de los ajustes);
// - "olvidada": la última vez fue hace DIAS_ZONA_OLVIDADA días o más (gris con telarañas);
// - "nada": ni lo uno ni lo otro, o no se ha entrenado nunca (sin tinte: a una cuenta nueva no se le llena el
//   gimnasio de telarañas).
// `dias`: días desde la última vez (null si nunca).
export function estadoZonas({ ultimaVez, hoy, inicioSemana = 1 }) {
  const hoyISO = typeof hoy === "string" ? hoy : fechaLocal(hoy);
  const lunes = semanaDe(hoyISO, inicioSemana);
  const zonas = (ultimaVez && ultimaVez.zonas) || {};
  const estados = {};
  ZONAS.forEach((z) => {
    const f = zonas[z.id];
    if (!f) { estados[z.id] = { estado: "nada", dias: null }; return; }
    const dias = diasEntre(f, hoyISO);
    estados[z.id] = { estado: f >= lunes ? "entrenada" : dias >= DIAS_ZONA_OLVIDADA ? "olvidada" : "nada", dias };
  });
  return estados;
}

// ---------- El monitor ----------
// Cinco frases por situación (los textos, en logica/i18n.js: `fitdraft.monitor.<situacion>.<n>`):
// - "tiempo": mucho tiempo sin venir (la última sesión fue hace DIAS_ZONA_OLVIDADA días o más);
// - "grupo": se viene, pero una zona lleva DIAS_ZONA_OLVIDADA días o más sin tocarse (la más olvidada);
// - "normal": el saludo de siempre (también en una cuenta sin entrenos).
export const FRASES_POR_SITUACION = 5;

export function situacionMonitor({ estados, ultimaSesion, hoy }) {
  const hoyISO = typeof hoy === "string" ? hoy : fechaLocal(hoy);
  if (ultimaSesion && diasEntre(ultimaSesion, hoyISO) >= DIAS_ZONA_OLVIDADA) return { situacion: "tiempo", grupo: null };
  const olvidadas = ZONAS.filter((z) => estados && estados[z.id] && estados[z.id].estado === "olvidada")
    .sort((a, b) => estados[b.id].dias - estados[a.id].dias);
  if (olvidadas.length) return { situacion: "grupo", grupo: olvidadas[0].id };
  return { situacion: "normal", grupo: null };
}

// La frase de hoy, como mucho una al día: si `guardada` (la última dicha, que la interfaz guarda en el
// dispositivo) es de hoy, vuelve esa con `nueva: false` (no se dice sola otra vez, pero el monitor la repite
// si se le toca); si no, una al azar de su situación, con `nueva: true`. `azar`: función que da [0, 1).
export function fraseMonitor({ estados, ultimaSesion, hoy, guardada = null, azar = Math.random }) {
  const hoyISO = typeof hoy === "string" ? hoy : fechaLocal(hoy);
  if (guardada && guardada.fecha === hoyISO && guardada.situacion) return { ...guardada, nueva: false };
  const { situacion, grupo } = situacionMonitor({ estados, ultimaSesion, hoy: hoyISO });
  const indice = Math.min(FRASES_POR_SITUACION - 1, Math.floor(azar() * FRASES_POR_SITUACION));
  return { fecha: hoyISO, situacion, indice, grupo, nueva: true };
}

// ---------- «Empezar · (rutina de hoy)» ----------
// La rutina que toca hoy, para el botón de un toque: la que hace más que no se hace (según el índice, que
// guarda la última sesión de cada rutina), y antes que ninguna las que no se han hecho nunca, en el orden de
// la lista. Así una rotación Torso / Pierna sale sola. null si no hay rutinas.
export function rutinaDeHoy(rutinas, indice) {
  const lista = rutinas || [];
  if (!lista.length) return null;
  const ultima = (r) => (((indice && indice.rutinas) || {})[r.id] || {}).fecha || null;
  let mejor = null;
  lista.forEach((r) => {
    if (!mejor) { mejor = r; return; }
    const a = ultima(r), b = ultima(mejor);
    if (b === null) return; // la elegida no se ha hecho nunca: gana
    if (a === null || a < b) mejor = r;
  });
  return mejor;
}

// Los días de esta semana con algún entreno (el corcho de la oficina): siete booleanos desde el primer día de
// la semana de los ajustes.
export function diasEntrenadosSemana(sesiones, hoy, inicioSemana = 1) {
  const hoyISO = typeof hoy === "string" ? hoy : fechaLocal(hoy);
  const lunes = semanaDe(hoyISO, inicioSemana);
  const dias = [false, false, false, false, false, false, false];
  (sesiones || []).forEach((s) => {
    const f = fechaLocal(s.inicio);
    const d = diasEntre(lunes, f);
    if (d >= 0 && d < 7) dias[d] = true;
  });
  return dias;
}
