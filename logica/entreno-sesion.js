// ---------- Entreno: la sesión en curso ----------
// Módulo de lógica pura (sin JSX, sin React): todo lo que se le puede hacer a un entreno mientras se
// está haciendo (añadir series, marcarlas, descansar, sustituir un ejercicio solo hoy, pausar...) y al
// terminarlo. Cada función recibe la sesión y devuelve una nueva, sin tocar la de entrada, así el hook
// (ui/estado/entreno.js) solo tiene que guardar lo que le devuelven, y cada operación se puede probar
// en validacion/ con una hora fija.
//
// Nada aquí mira el reloj: la hora llega siempre como `ahora` (milisegundos o texto ISO). El descanso y
// la duración se guardan como marcas de tiempo (`descanso.hasta`, `inicio`, `pausas`), no como cuentas
// atrás, para que sigan siendo exactos aunque el móvil se bloquee y el navegador pare los temporizadores
// (ver local/ideas/gimnasio/03-diseno-modulo-entreno.md, §5.4).
//
// Forma de la sesión: ver la sección «Entrenamiento» de CLAUDE.md. Ajustes que se usan aquí:
// { precargar, descansoSeg, descansoCalentamientoSeg }.
import { uid } from "comun";

const ms = (t) => (typeof t === "number" ? t : new Date(t).getTime());
const iso = (t) => new Date(ms(t)).toISOString();

// Cuántas series lleva un ejercicio que se añade sin rutina y sin historial: tres es lo más habitual, y
// las que sobren se quitan solas al terminar (solo se guardan las hechas). Menos toques que ir
// añadiéndolas de una en una, que es lo que más importa mientras se entrena.
const SERIES_POR_DEFECTO = 3;

function serieVacia(tipo = "normal") {
  return { id: "sr_" + uid(), tipo, kg: null, reps: null, seg: null, km: null, rir: null, hecha: false };
}

const esCalentamiento = (s) => s && s.tipo === "calentamiento";

// Rellena las series con lo de la última vez. Si lo anterior trae el tipo de cada serie, se emparejan
// por clase (el calentamiento con el calentamiento y el resto con el resto, en orden), para que una
// serie de calentamiento de más o de menos no descuadre las demás; si no lo trae, en orden sin más.
function precargarSeries(series, anterior) {
  if (!anterior || !anterior.length) return series;
  const conTipo = anterior.every((a) => a.tipo);
  const deCalentamiento = anterior.filter(esCalentamiento);
  const resto = anterior.filter((a) => !esCalentamiento(a));
  let iCal = 0, iResto = 0;
  return series.map((s, i) => {
    let a;
    if (!conTipo) a = anterior[i];
    else if (esCalentamiento(s)) a = deCalentamiento[iCal++];
    else a = resto[iResto++];
    if (!a) return s;
    return { ...s, kg: a.kg ?? null, reps: a.reps ?? null, seg: a.seg ?? null, km: a.km ?? null };
  });
}

function nuevoEjercicio(ejercicioId, series, { descansoSeg = null, nota = "" } = {}) {
  return { inst: "ei_" + uid(), ejercicioId, sustituyeA: null, nota, descansoSeg, superserie: null, series };
}

// Cambia un ejercicio de la sesión por su `inst` (la instancia: el mismo ejercicio puede salir dos veces).
function cambiarEjercicio(s, inst, fn) {
  return { ...s, ejercicios: s.ejercicios.map((ej) => (ej.inst === inst ? fn(ej) : ej)) };
}
function cambiarSerie(s, inst, id, fn) {
  return cambiarEjercicio(s, inst, (ej) => ({ ...ej, series: ej.series.map((sr) => (sr.id === id ? fn(sr) : sr)) }));
}

// Descanso con el que entra un ejercicio en una rutina o en un entreno empezado de cero (G3, 25-oct-2026):
// el propio del ejercicio (su ficha) o, si no tiene, el de los ajustes. A partir de ahí es suyo: se cambia
// en la rutina o durante el entreno, y cambiar después el de los ajustes ya no lo mueve.
export function descansoInicial(id, { ajustes = {}, descansoDe = () => null } = {}) {
  return descansoDe(id) ?? ajustes.descansoSeg ?? null;
}

// Cuántas veces sale ya `id` en una lista de ejercicios antes de la posición `hasta`: con el mismo
// ejercicio dos veces en una rutina, el «anterior» del segundo es el del segundo (G4).
function ocurrenciaDe(lista, id, hasta = lista.length) {
  let n = 0;
  for (let i = 0; i < hasta; i++) if (lista[i].ejercicioId === id) n++;
  return n;
}

// ---------- Empezar ----------
// Desde una rutina (copia sus ejercicios, descansos, notas y nº y tipo de series) o vacía. Con
// `ajustes.precargar`, los kilos y repeticiones salen ya rellenos con lo de la última vez
// (`anteriorDe(id, { rutinaId, ocurrencia })` → series; en la app, el «anterior» equivalente de G4: lo de
// la última sesión de esa rutina si la hay); sin él, vacíos (la columna «anterior» los sigue enseñando al
// lado). `descansoDe(id)` es el
// descanso personalizado del ejercicio, si lo tiene: solo se usa si la rutina no trae uno (rutinas de
// antes de G3 que aún no han pasado por migrarCatalogo).
export function nuevaSesion({ rutina = null, ahora, ajustes = {}, anteriorDe = () => [], descansoDe = () => null, nombre = "" }) {
  const deRutina = (rutina && rutina.ejercicios) || [];
  const ejercicios = deRutina.map((re, i) => {
    let series = (re.series && re.series.length ? re.series : [{ tipo: "normal" }]).map((p) => serieVacia(p.tipo || "normal"));
    if (ajustes.precargar) series = precargarSeries(series, anteriorDe(re.ejercicioId, { rutinaId: rutina.id, ocurrencia: ocurrenciaDe(deRutina, re.ejercicioId, i) }));
    return { ...nuevoEjercicio(re.ejercicioId, series, { descansoSeg: re.descansoSeg ?? descansoInicial(re.ejercicioId, { ajustes, descansoDe }), nota: re.nota || "" }), superserie: re.superserie || null };
  });
  return {
    id: "ses_" + uid(),
    nombre: (rutina && rutina.nombre) || nombre,
    rutinaId: rutina ? rutina.id : null,
    inicio: iso(ahora), fin: null, pausas: [],
    esfuerzo: null, nota: "", origen: "app", lote: null,
    ejercicios,
    descanso: null,
    actualizado: ms(ahora),
  };
}

// Añade ejercicios al final. Llevan tantas series como la última vez (rellenas si se precarga) o, sin
// historial, tres vacías, y su descanso inicial (ver descansoInicial).
export function anadirEjercicios(s, ids, { ajustes = {}, anteriorDe = () => [], descansoDe = () => null } = {}) {
  const vistos = [...s.ejercicios];
  const nuevos = ids.map((id) => {
    const anterior = anteriorDe(id, { rutinaId: s.rutinaId || null, ocurrencia: ocurrenciaDe(vistos, id) }) || [];
    vistos.push({ ejercicioId: id });
    let series = anterior.length ? anterior.map((a) => serieVacia(a.tipo || "normal")) : Array.from({ length: SERIES_POR_DEFECTO }, () => serieVacia());
    if (ajustes.precargar) series = precargarSeries(series, anterior);
    return nuevoEjercicio(id, series, { descansoSeg: descansoInicial(id, { ajustes, descansoDe }) });
  });
  return { ...s, ejercicios: [...s.ejercicios, ...nuevos] };
}

export function quitarEjercicio(s, inst) {
  return { ...s, ejercicios: s.ejercicios.filter((ej) => ej.inst !== inst) };
}

// ---------- Series ----------
// Una serie más, con los valores de la última del ejercicio (lo normal es repetir peso), sin marcar.
export function anadirSerie(s, inst) {
  return cambiarEjercicio(s, inst, (ej) => {
    const ultima = ej.series[ej.series.length - 1];
    const nueva = serieVacia("normal");
    if (ultima) Object.assign(nueva, { kg: ultima.kg, reps: ultima.reps, seg: ultima.seg, km: ultima.km });
    return { ...ej, series: [...ej.series, nueva] };
  });
}

export function quitarSerie(s, inst, id) {
  return cambiarEjercicio(s, inst, (ej) => ({ ...ej, series: ej.series.filter((sr) => sr.id !== id) }));
}

export function cambiarTipoSerie(s, inst, id, tipo) {
  return cambiarSerie(s, inst, id, (sr) => ({ ...sr, tipo }));
}

// `valores`: cualquiera de { kg, reps, seg, km, rir }, ya convertidos a kg y km.
export function editarSerie(s, inst, id, valores) {
  return cambiarSerie(s, inst, id, (sr) => ({ ...sr, ...valores }));
}

// Marca la serie como hecha y arranca el descanso: el del calentamiento si lo es; si no, el propio del
// ejercicio o, si no tiene, el de los ajustes. Con un descanso de 0 no se arranca ninguno.
export function marcarHecha(s, inst, id, ahora, ajustes = {}) {
  const ej = s.ejercicios.find((e) => e.inst === inst);
  const serie = ej && ej.series.find((sr) => sr.id === id);
  if (!serie) return s;
  const segundos = esCalentamiento(serie)
    ? (ajustes.descansoCalentamientoSeg ?? 60)
    : (ej.descansoSeg ?? ajustes.descansoSeg ?? 120);
  const t = ms(ahora);
  const marcada = cambiarSerie(s, inst, id, (sr) => ({ ...sr, hecha: true }));
  return { ...marcada, descanso: segundos > 0 ? { inicio: t, hasta: t + segundos * 1000, inst, avisado: false } : null };
}

// Deshacer el ✓: la serie vuelve a estar pendiente con sus valores intactos.
export function desmarcar(s, inst, id) {
  return cambiarSerie(s, inst, id, (sr) => ({ ...sr, hecha: false }));
}

// ---------- Descanso ----------
// Cambia el descanso de un ejercicio de la sesión (G3: acceso rápido durante el entreno). Vale para las
// series que se marquen a partir de ahora; el descanso que ya está corriendo no se toca (para eso están
// −15 y +15 en su barra). Si la sesión viene de una rutina, al terminar se ofrece pasarlo a ella (ver
// cambiosEstructurales).
export function descansoEjercicio(s, inst, segundos) {
  const valor = Math.max(0, Math.round(Number(segundos) || 0));
  return cambiarEjercicio(s, inst, (ej) => ({ ...ej, descansoSeg: valor }));
}

export function ajustarDescanso(s, segundos) {
  if (!s.descanso) return s;
  const hasta = Math.max(s.descanso.inicio, s.descanso.hasta + segundos * 1000);
  return { ...s, descanso: { ...s.descanso, hasta, avisado: false } };
}

export function saltarDescanso(s) {
  return { ...s, descanso: null };
}

// Se apunta que ya sonó el aviso del final del descanso, para no repetirlo al volver a la app.
export function descansoAvisado(s) {
  return s.descanso ? { ...s, descanso: { ...s.descanso, avisado: true } } : s;
}

// ---------- Ejercicios: sustituir, reordenar, nota ----------
// «Sustituir solo hoy» (petición repetida en las reseñas: la máquina está ocupada): cambia el ejercicio
// en esta sesión sin tocar la rutina. Se guarda cuál había (`sustituyeA`, el primero si se sustituye dos
// veces) para que al terminar no cuente como un cambio de la rutina.
export function sustituirHoy(s, inst, nuevoId) {
  return cambiarEjercicio(s, inst, (ej) => ({ ...ej, ejercicioId: nuevoId, sustituyeA: ej.sustituyeA || ej.ejercicioId }));
}

export function reordenar(s, desde, hasta) {
  if (desde === hasta || desde < 0 || hasta < 0 || desde >= s.ejercicios.length || hasta >= s.ejercicios.length) return s;
  const ejercicios = [...s.ejercicios];
  const [movido] = ejercicios.splice(desde, 1);
  ejercicios.splice(hasta, 0, movido);
  return { ...s, ejercicios };
}

export function notaEjercicio(s, inst, texto) {
  return cambiarEjercicio(s, inst, (ej) => ({ ...ej, nota: texto }));
}

// ---------- Pausa ----------
// Para el cronómetro de duración (no el descanso, que sigue su curso: es tiempo real de reloj).
export function pausar(s, ahora) {
  if ((s.pausas || []).some((p) => p.fin === null)) return s;
  return { ...s, pausas: [...(s.pausas || []), { inicio: iso(ahora), fin: null }] };
}

export function reanudar(s, ahora) {
  return { ...s, pausas: (s.pausas || []).map((p) => (p.fin === null ? { ...p, fin: iso(ahora) } : p)) };
}

export const estaPausada = (s) => (s.pausas || []).some((p) => p.fin === null);

// ---------- Terminar ----------
// Lo que se guarda: solo las series hechas y los ejercicios que tienen alguna; cierra una pausa abierta,
// pone la hora de fin y quita el descanso (que solo tiene sentido en curso). `inicio` (opcional) cambia la
// fecha y hora del entreno (por si se apunta después): se mueve todo, conservando la duración. `gimnasio`
// (G2, opcional): dónde se entrenó, texto libre (vacío = null).
export function terminarSesion(s, ahora, { nombre, esfuerzo, nota, inicio, gimnasio } = {}) {
  let t = ms(ahora);
  let cerrada = reanudar(s, ahora);
  let pausas = cerrada.pausas || [];
  let inicioFinal = cerrada.inicio;
  if (inicio && ms(inicio) !== ms(cerrada.inicio)) {
    const delta = ms(inicio) - ms(cerrada.inicio);
    inicioFinal = iso(ms(inicio));
    t += delta;
    pausas = pausas.map((p) => ({ inicio: iso(ms(p.inicio) + delta), fin: iso(ms(p.fin) + delta) }));
  }
  const ejercicios = cerrada.ejercicios
    .map((ej) => ({ ...ej, series: ej.series.filter((sr) => sr.hecha) }))
    .filter((ej) => ej.series.length);
  const { descanso, ...resto } = cerrada;
  return {
    ...resto,
    nombre: nombre !== undefined ? nombre : s.nombre,
    esfuerzo: esfuerzo !== undefined ? esfuerzo : s.esfuerzo,
    nota: nota !== undefined ? nota : s.nota,
    gimnasio: gimnasio !== undefined ? (String(gimnasio || "").replace(/\s+/g, " ").trim() || null) : s.gimnasio || null,
    inicio: inicioFinal, fin: iso(t), pausas, ejercicios,
    actualizado: ms(ahora),
  };
}

// ---------- Rutinas ----------
// La «huella» de una sesión frente a su rutina: qué ejercicios (los sustituidos solo hoy cuentan como el
// original), en qué orden y cuántas series. Si cambia, al terminar se ofrece actualizar la rutina.
// La superserie entra en la huella por su forma (qué ejercicios van juntos), no por su id: en la sesión y en
// la rutina el mismo grupo puede tener ids distintos.
const formaSuperseries = (lista) => {
  const bloques = gruposSuperserie(lista);
  return lista.map((_, i) => {
    const b = bloques.find((x) => i >= x.inicio && i <= x.fin);
    return b && b.fin > b.inicio ? `+${b.inicio}` : "";
  });
};
const huellaSesion = (s) => {
  const forma = formaSuperseries(s.ejercicios);
  return s.ejercicios.map((ej, i) => `${ej.sustituyeA || ej.ejercicioId}:${ej.series.length}${forma[i]}`).join("|");
};
const huellaRutina = (r) => {
  const lista = r.ejercicios || [];
  const forma = formaSuperseries(lista);
  return lista.map((re, i) => `${re.ejercicioId}:${(re.series || []).length}${forma[i]}`).join("|");
};

// También cuenta como cambio el descanso de un ejercicio retocado durante el entreno (G3). Solo se mira
// con la misma estructura (entonces el ejercicio i de la sesión es el i de la rutina), en los que no se
// sustituyeron solo hoy (vuelven a la rutina tal cual estaban) y si la rutina trae su propio descanso: una
// rutina de antes de G3 sin migrar (null, «el de siempre») no debe dar un cambio que nadie hizo.
export function cambiosEstructurales(s, rutina) {
  if (!rutina) return false;
  if (huellaSesion(s) !== huellaRutina(rutina)) return true;
  return s.ejercicios.some((ej, i) => {
    const deRutina = rutina.ejercicios[i].descansoSeg;
    return !ej.sustituyeA && deRutina !== null && deRutina !== undefined && (ej.descansoSeg ?? null) !== deRutina;
  });
}

const plantillaSerie = (sr) => {
  const p = { tipo: sr.tipo };
  ["kg", "reps", "seg", "km"].forEach((c) => { if (sr[c] !== null && sr[c] !== undefined) p[c] = sr[c]; });
  return p;
};

// Pasa a la rutina los cambios de estructura de la sesión: ejercicios, orden y series (con los valores
// de hoy como nueva plantilla) y el descanso de cada ejercicio (el de hoy, que es el de la rutina salvo que
// se cambiara durante el entreno). Un ejercicio sustituido solo hoy deja en la rutina el original con su
// plantilla de siempre. Se conserva la nota de cada ejercicio que ya estaba.
export function aplicarARutina(rutina, s, hoy) {
  const previos = rutina.ejercicios || [];
  const usados = new Set();
  const ejercicios = s.ejercicios.map((ej) => {
    const id = ej.sustituyeA || ej.ejercicioId;
    const i = previos.findIndex((re, k) => re.ejercicioId === id && !usados.has(k));
    const previo = i >= 0 ? previos[i] : null;
    if (i >= 0) usados.add(i);
    if (ej.sustituyeA && previo) return { ...previo, superserie: ej.superserie || null };
    return {
      ejercicioId: id,
      descansoSeg: ej.descansoSeg ?? (previo ? previo.descansoSeg ?? null : null),
      nota: previo ? previo.nota || "" : "",
      superserie: ej.superserie || null,
      series: ej.series.map(plantillaSerie),
    };
  });
  return { ...rutina, ejercicios, actualizado: hoy || rutina.actualizado };
}

// «Guardar como rutina» desde un entreno hecho: sus ejercicios, con las series hechas como plantilla.
export function rutinaDesdeSesion(s, nombre, hoy) {
  return {
    id: "rt_" + uid(),
    nombre: nombre || s.nombre || "",
    actualizado: hoy || null,
    ejercicios: s.ejercicios
      .map((ej) => ({ ejercicioId: ej.ejercicioId, descansoSeg: ej.descansoSeg ?? null, nota: "", superserie: ej.superserie || null, series: ej.series.filter((sr) => sr.hecha).map(plantillaSerie) }))
      .filter((re) => re.series.length),
  };
}

// ---------- Superseries (G11, 25-oct-2026) ----------
// Una superserie son dos o más ejercicios seguidos que se hacen alternando: una serie de A, una de B (y de C,
// si hay), y vuelta a A. Se guardan en cada ejercicio, de la rutina o de la sesión, como `superserie: id`:
// los ejercicios **seguidos** con el mismo id forman el grupo (así, al reordenar, un ejercicio que se aleja
// del grupo deja de estar en él sin tener que limpiar nada). Cada ejercicio conserva su propio descanso,
// como si no hubiera superserie (decisión del usuario): para pasar de A a B sin esperar, A lleva «Sin
// descanso». Estas funciones valen igual para `rutina.ejercicios` que para `sesion.ejercicios`.

// Los bloques de una lista: [{ inicio, fin, superserie }] (índices incluidos). Un ejercicio suelto es un
// bloque de uno; un id que solo lleva un ejercicio (o que no se repite seguido) no forma grupo.
export function gruposSuperserie(lista) {
  const bloques = [];
  (lista || []).forEach((ej, i) => {
    const ultimo = bloques[bloques.length - 1];
    if (ej.superserie && ultimo && ultimo.superserie === ej.superserie && ultimo.fin === i - 1) ultimo.fin = i;
    else bloques.push({ inicio: i, fin: i, superserie: ej.superserie || null });
  });
  return bloques;
}

// ¿En qué grupo está el ejercicio i? { inicio, fin, numero } si está en uno de dos o más (numero: 1, 2... por
// orden de aparición), o null.
export function grupoDe(lista, i) {
  let numero = 0;
  for (const b of gruposSuperserie(lista)) {
    if (b.fin > b.inicio) numero += 1;
    if (i >= b.inicio && i <= b.fin) return b.fin > b.inicio ? { inicio: b.inicio, fin: b.fin, numero } : null;
  }
  return null;
}

// Une el ejercicio i con el siguiente: si alguno ya está en un grupo, el otro se suma a él; si no, se crea uno.
export function unirSuperserie(lista, i) {
  if (i < 0 || i >= lista.length - 1) return lista;
  const id = lista[i].superserie || lista[i + 1].superserie || "ss_" + uid();
  // Si el siguiente ya tenía su propio grupo, todo ese grupo pasa al id común.
  const deSiguiente = lista[i + 1].superserie;
  return lista.map((ej, k) => {
    if (k === i || k === i + 1) return { ...ej, superserie: id };
    if (deSiguiente && deSiguiente !== id && ej.superserie === deSiguiente) return { ...ej, superserie: id };
    return ej;
  });
}

// Superserie «con…» (27-oct-2026): desde el ⋮ de un ejercicio se elige con cuál hacerla, esté donde esté. El
// elegido (j) sale de su grupo anterior, si tenía, y se coloca justo detrás del grupo del ejercicio i (o de i,
// si va suelto), y los dos quedan unidos con unirSuperserie. Si j ya estaba en el grupo de i, no cambia nada.
export function superserieCon(lista, i, j) {
  if (i === j || !lista[i] || !lista[j]) return lista;
  const g = grupoDe(lista, i);
  if (g && j >= g.inicio && j <= g.fin) return lista;
  const fin = g ? g.fin : i;
  const resto = lista.filter((_, k) => k !== j);
  // Al quitar j, todo lo que iba detrás se adelanta un puesto.
  const finEnResto = j < fin ? fin - 1 : fin;
  resto.splice(finEnResto + 1, 0, { ...lista[j], superserie: null });
  return unirSuperserie(resto, finEnResto);
}

// Saca el ejercicio i de su superserie (los demás siguen juntos si quedan dos o más seguidos).
export function separarSuperserie(lista, i) {
  if (!lista[i] || !lista[i].superserie) return lista;
  return lista.map((ej, k) => (k === i ? { ...ej, superserie: null } : ej));
}

// El orden en que se hacen las series: en un ejercicio suelto, una tras otra; en una superserie, por rondas
// (la 1.ª de A, la 1.ª de B, la 2.ª de A, la 2.ª de B...; si uno tiene más series, sigue solo al final).
export function ordenDeSeries(s) {
  const lista = s.ejercicios || [];
  const orden = [];
  gruposSuperserie(lista).forEach((b) => {
    const ejercicios = lista.slice(b.inicio, b.fin + 1);
    const rondas = Math.max(0, ...ejercicios.map((ej) => ej.series.length));
    if (b.fin === b.inicio) ejercicios[0].series.forEach((sr) => orden.push({ inst: ejercicios[0].inst, id: sr.id }));
    else for (let k = 0; k < rondas; k++) ejercicios.forEach((ej) => { if (ej.series[k]) orden.push({ inst: ej.inst, id: ej.series[k].id }); });
  });
  return orden;
}

// Tras marcar una serie, a cuál pasa el foco: la primera sin hacer que viene después en ese orden (en una
// superserie, la equivalente del siguiente ejercicio, y al acabar la ronda, la siguiente del primero). null
// si ya no queda ninguna por delante.
export function siguienteSerie(s, inst, id) {
  const orden = ordenDeSeries(s);
  const i = orden.findIndex((x) => x.inst === inst && x.id === id);
  const hecha = (x) => {
    const ej = s.ejercicios.find((e) => e.inst === x.inst);
    const sr = ej && ej.series.find((y) => y.id === x.id);
    return !sr || sr.hecha;
  };
  for (let k = i + 1; k < orden.length; k++) if (!hecha(orden[k])) return orden[k];
  return null;
}
