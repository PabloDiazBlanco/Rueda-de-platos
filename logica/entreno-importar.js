// ---------- Entreno: importar de Hevy y Lyfta (G10, 25-oct-2026) ----------
// Módulo de lógica pura (sin JSX, sin React): lee la exportación CSV de Hevy o de Lyfta y la convierte en
// sesiones con la forma de siempre, listas para guardarse por el mismo camino que un entreno terminado (por
// meses y reconstruyendo el índice; nunca window.storage.list()). La pantalla está en Ajustes →
// Entrenamiento (ui/entreno/importar.jsx) y el guardado en el hook (ui/estado/entreno.js).
//
// Formatos reales (mirados en las exportaciones del usuario, que **no** se copian al repositorio; los casos de
// validacion/ usan filas inventadas con el mismo formato):
// - **Hevy**: `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,
//   set_type,weight_kg,reps,distance_km,duration_seconds,rpe`. Fechas en inglés («Jun 14, 2026, 9:03 AM»),
//   `set_type` warmup / normal / failure / dropset, pesos en kg, RPE (no RIR).
// - **Lyfta**: `Title,Date,Duration,Description,Notes,Exercise,Exercise Note,Superset id,Weight,Reps,RIR/RPE,
//   Distance,Time,Set Type,...`. Fecha «2026-10-23 06:02:05», duración «01:23:33», `Set Type` WARMUP_SET /
//   NORMAL_SET (y FAILURE_SET / DROP_SET), `Time` como «15:00», nombres de ejercicio en inglés al estilo
//   ExerciseDB («Lever Chest Press», «Pulldown»).
//
// Decisiones (provisionales, apuntadas en el registro de la noche):
// - **RIR**: en Hevy, RIR = 10 − RPE (RPE 10 = al fallo = RIR 0). En Lyfta la columna «RIR/RPE» trae valores de
//   0 a 3 en los archivos vistos: se toma como RIR; si un valor es 6 o más, se entiende como RPE y se convierte.
// - **Peso de Lyfta**: se toma en kg (la exportación no dice la unidad).
// - **«Time» de Lyfta**: «mm:ss» con dos partes y «h:mm:ss» con tres.
// - **Duplicados**: una sesión ya importada (o registrada) con el mismo título y la misma hora de inicio, con
//   un margen de 5 minutos, no se vuelve a importar. Así reimportar el mismo archivo no duplica nada.
// - **Emparejar ejercicios**: contra la biblioteca que se le pase en cada momento (la semilla, los propios y
//   sus nombres en los cinco idiomas más los alias de logica/entreno-nombres.js): si la biblioteca crece, el
//   importador la usa sin tocarlo. Coincide si el nombre es igual sin tildes ni mayúsculas, o si lo es sin lo
//   que va entre paréntesis y sin palabras vacías, en cualquier orden. Lo que no coincide se crea como
//   ejercicio propio, salvo que el usuario elija uno parecido (posibleDuplicado) en la vista previa.
// - **Superseries**: el `superset_id` / `Superset id` se guarda como `superserie` del ejercicio en la sesión
//   (el modelo de G11): los ejercicios seguidos con el mismo valor forman una superserie.
import { uid } from "comun";
import { normalizarTexto, posibleDuplicado } from "entreno-ejercicios";

// ---------- CSV ----------
// Lee un CSV con comillas (y comillas dobladas dentro), saltos de línea dentro de comillas, BOM al principio
// y separador «,» o «;» (el que más aparezca en la primera línea). Devuelve una lista de filas (listas de
// textos), sin las filas vacías.
export function leerCSV(texto) {
  let s = String(texto || "");
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const primera = s.split(/\r?\n/, 1)[0] || "";
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ";" : ",";
  const filas = [];
  let fila = [];
  let campo = "";
  let entreComillas = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (entreComillas) {
      if (c === '"') {
        if (s[i + 1] === '"') { campo += '"'; i++; } else entreComillas = false;
      } else campo += c;
    } else if (c === '"') entreComillas = true;
    else if (c === sep) { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      fila.push(campo);
      if (fila.some((x) => x !== "")) filas.push(fila);
      fila = [];
      campo = "";
    } else campo += c;
  }
  fila.push(campo);
  if (fila.some((x) => x !== "")) filas.push(fila);
  return filas;
}

// ¿De qué app es? Por las columnas de la cabecera. null si no se reconoce.
export function detectarFormato(cabecera) {
  const c = (cabecera || []).map((x) => String(x).trim().toLowerCase());
  if (c.includes("exercise_title") && c.includes("start_time") && c.includes("set_type")) return "hevy";
  if (c.includes("exercise") && c.includes("set type") && c.includes("date")) return "lyfta";
  return null;
}

// ---------- Fechas y números ----------
const MESES_EN = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

// «Jun 14, 2026, 9:03 AM» o «14 Jun 2026, 09:03» (hora local) → ISO. null si no se entiende.
export function fechaHevy(texto) {
  const t = String(texto || "").trim();
  let m = t.match(/^([A-Za-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))? ?([AaPp][Mm])?$/);
  let dia, mes, anio, hora, minuto, segundo, ampm;
  if (m) [, mes, dia, anio, hora, minuto, segundo, ampm] = m;
  else {
    m = t.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]*\.? (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))? ?([AaPp][Mm])?$/);
    if (!m) return null;
    [, dia, mes, anio, hora, minuto, segundo, ampm] = m;
  }
  const nMes = MESES_EN[mes.toLowerCase().slice(0, 3)];
  if (nMes === undefined) return null;
  let h = Number(hora) % (ampm ? 12 : 24);
  if (ampm && ampm.toLowerCase() === "pm") h += 12;
  const d = new Date(Number(anio), nMes, Number(dia), h, Number(minuto), Number(segundo || 0));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// «2026-10-23 06:02:05» (hora local) → ISO.
export function fechaLyfta(texto) {
  const m = String(texto || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// «01:23:33» → 5013 s; «15:00» → 900 s (minutos y segundos).
export function segundosDeTexto(texto) {
  const t = String(texto || "").trim();
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const partes = t.split(":").map(Number);
  if (partes.some((x) => Number.isNaN(x))) return null;
  return partes.reduce((total, x) => total * 60 + x, 0);
}

const numero = (x) => {
  const t = String(x === undefined || x === null ? "" : x).trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const redondear2 = (n) => (n === null ? null : Math.round(n * 100) / 100);

const TIPO_SERIE = {
  warmup: "calentamiento", normal: "normal", failure: "fallo", dropset: "drop", drop: "drop",
  warmup_set: "calentamiento", normal_set: "normal", failure_set: "fallo", drop_set: "drop",
};
const tipoSerie = (x) => TIPO_SERIE[String(x || "").trim().toLowerCase()] || "normal";

function rirDeRPE(rpe) {
  if (rpe === null) return null;
  return Math.max(0, redondear2(10 - rpe));
}

// ---------- Adaptadores ----------
// Cada uno devuelve una lista de entrenos «crudos»: { titulo, inicio, fin, nota, ejercicios: [{ nombre,
// nota, superserie, series: [{ tipo, kg, reps, seg, km, rir }] }] }. Las filas seguidas del mismo ejercicio
// son una instancia; si el mismo ejercicio vuelve más tarde en la sesión, es otra.
function agrupar(filas, claveSesion, deFila) {
  const sesiones = [];
  const porClave = new Map();
  filas.forEach((f) => {
    const datos = deFila(f);
    if (!datos || !datos.inicio || !datos.ejercicio) return;
    const clave = claveSesion(datos);
    let s = porClave.get(clave);
    if (!s) {
      s = { titulo: datos.titulo, inicio: datos.inicio, fin: datos.fin, nota: datos.nota, ejercicios: [] };
      porClave.set(clave, s);
      sesiones.push(s);
    }
    const ultimo = s.ejercicios[s.ejercicios.length - 1];
    let ej = ultimo && ultimo.nombre === datos.ejercicio && ultimo.superserie === datos.superserie ? ultimo : null;
    if (!ej || datos.nuevaInstancia) {
      ej = { nombre: datos.ejercicio, nota: datos.notaEjercicio, superserie: datos.superserie, series: [] };
      s.ejercicios.push(ej);
    }
    ej.series.push(datos.serie);
  });
  return sesiones;
}

function columnas(cabecera) {
  const idx = {};
  cabecera.forEach((c, i) => { idx[String(c).trim().toLowerCase()] = i; });
  return (fila, nombre) => (idx[nombre] === undefined ? "" : (fila[idx[nombre]] || "").trim());
}

function adaptarHevy(filas) {
  const col = columnas(filas[0]);
  return agrupar(
    filas.slice(1),
    (d) => `${d.titulo}|${d.inicio}`,
    (f) => {
      const inicio = fechaHevy(col(f, "start_time"));
      const setIndex = numero(col(f, "set_index"));
      return {
        titulo: col(f, "title"), inicio, fin: fechaHevy(col(f, "end_time")) || inicio, nota: col(f, "description"),
        ejercicio: col(f, "exercise_title"), notaEjercicio: col(f, "exercise_notes"), superserie: col(f, "superset_id") || null,
        // En Hevy el índice de serie vuelve a 0 en cada instancia del ejercicio: si el mismo ejercicio sale
        // dos veces seguidas en la sesión, el 0 marca la segunda.
        nuevaInstancia: setIndex === 0,
        serie: {
          tipo: tipoSerie(col(f, "set_type")), kg: redondear2(numero(col(f, "weight_kg"))), reps: numero(col(f, "reps")),
          seg: numero(col(f, "duration_seconds")), km: redondear2(numero(col(f, "distance_km"))), rir: rirDeRPE(numero(col(f, "rpe"))),
        },
      };
    }
  );
}

function adaptarLyfta(filas) {
  const col = columnas(filas[0]);
  return agrupar(
    filas.slice(1),
    (d) => `${d.titulo}|${d.inicio}`,
    (f) => {
      const inicio = fechaLyfta(col(f, "date"));
      const dur = segundosDeTexto(col(f, "duration"));
      const v = numero(col(f, "rir/rpe"));
      return {
        titulo: col(f, "title"), inicio, fin: inicio && dur !== null ? new Date(new Date(inicio).getTime() + dur * 1000).toISOString() : inicio,
        nota: [col(f, "description"), col(f, "notes")].filter(Boolean).join(" · "),
        ejercicio: col(f, "exercise"), notaEjercicio: col(f, "exercise note"), superserie: col(f, "superset id") || null,
        nuevaInstancia: false,
        serie: {
          tipo: tipoSerie(col(f, "set type")), kg: redondear2(numero(col(f, "weight"))), reps: numero(col(f, "reps")),
          seg: segundosDeTexto(col(f, "time")), km: redondear2(numero(col(f, "distance"))),
          rir: v === null ? null : v >= 6 ? rirDeRPE(v) : v,
        },
      };
    }
  );
}

// ---------- Emparejar nombres ----------
const PALABRAS_VACIAS = new Set(["a", "al", "de", "del", "la", "el", "los", "las", "con", "en", "y", "the", "with", "of", "on"]);
// Lo que va entre paréntesis suele ser el equipo («(Cable)», «(Machine)») y se ignora en la huella, salvo
// lo que cambia el ejercicio: unos fondos «(Assisted)» no son los fondos de siempre (los kilos son de ayuda,
// no de carga), así que no deben emparejarse con ellos sin que el usuario lo elija.
const CALIFICATIVOS = new Set(["assisted", "weighted", "asistida", "asistidas", "asistido", "lastrada", "lastradas", "lastrado"]);
const huella = (nombre) => {
  const texto = String(nombre || "");
  const dentro = (texto.match(/\(([^)]*)\)/g) || []).flatMap((p) => normalizarTexto(p).split(" ")).filter((p) => CALIFICATIVOS.has(p));
  const fuera = normalizarTexto(texto.replace(/\([^)]*\)/g, " ")).split(" ");
  return [...fuera, ...dentro].filter((p) => p && !PALABRAS_VACIAS.has(p)).sort().join(" ");
};

// Índice de nombres de la biblioteca: `nombresDe(ejercicio)` da todos sus nombres (los cinco idiomas, los
// alias y, en los propios, su nombre). Un nombre exacto gana a una huella; a igualdad, el primero de la lista
// (la semilla va antes que los propios).
export function indiceDeNombres(lista, nombresDe) {
  const exactos = new Map();
  const huellas = new Map();
  (lista || []).forEach((e) => {
    (nombresDe(e) || []).forEach((n) => {
      const exacto = normalizarTexto(n);
      if (exacto && !exactos.has(exacto)) exactos.set(exacto, e.id);
      const h = huella(n);
      if (h && !huellas.has(h)) huellas.set(h, e.id);
    });
  });
  return { exactos, huellas };
}

export function emparejarEjercicio(nombre, indice) {
  return indice.exactos.get(normalizarTexto(nombre)) || indice.huellas.get(huella(nombre)) || null;
}

// Qué tipo de ejercicio crear para uno que no está en la biblioteca, por lo que traen sus series.
export function tipoPorSeries(series) {
  const hay = (c) => (series || []).some((s) => s[c] !== null && s[c] !== undefined && s[c] > 0);
  if (hay("kg")) return "peso_reps";
  if (hay("km")) return "distancia_duracion";
  if (hay("reps")) return "reps";
  if (hay("seg")) return "duracion";
  return "peso_reps";
}

// ---------- Vista previa ----------
const MARGEN_DUPLICADO_MS = 5 * 60 * 1000;

function yaEsta(existentes, titulo, inicio) {
  const t = new Date(inicio).getTime();
  const nombre = normalizarTexto(titulo);
  return (existentes || []).some((s) => normalizarTexto(s.nombre) === nombre && Math.abs(new Date(s.inicio).getTime() - t) <= MARGEN_DUPLICADO_MS);
}

// Lee el archivo y prepara lo que enseña la vista previa. `existentes`: las sesiones que ya hay (todos los
// meses y la cola). Devuelve null si el archivo no es de ninguna de las dos apps, o:
//   { formato, entrenos: [...nuevos], repetidos, series, desde, hasta,
//     ejercicios: [{ nombre, ejercicioId | null, sugerencia | null, tipo, series }] }
export function prepararImportacion(texto, { lista, nombresDe, existentes = [] }) {
  const filas = leerCSV(texto);
  if (filas.length < 2) return null;
  const formato = detectarFormato(filas[0]);
  if (!formato) return null;
  const todos = (formato === "hevy" ? adaptarHevy(filas) : adaptarLyfta(filas)).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  const entrenos = [];
  const vistos = [];
  let repetidos = 0;
  todos.forEach((e) => {
    // Repetido si ya estaba guardado o si sale dos veces en el mismo archivo.
    if (yaEsta(existentes, e.titulo, e.inicio) || yaEsta(vistos, e.titulo, e.inicio)) { repetidos += 1; return; }
    vistos.push({ nombre: e.titulo, inicio: e.inicio });
    entrenos.push(e);
  });
  const indice = indiceDeNombres(lista, nombresDe);
  const porNombre = new Map();
  entrenos.forEach((e) => e.ejercicios.forEach((ej) => {
    const x = porNombre.get(ej.nombre) || { nombre: ej.nombre, seriesLista: [] };
    x.seriesLista.push(...ej.series);
    porNombre.set(ej.nombre, x);
  }));
  const ejercicios = [...porNombre.values()].map((x) => {
    const ejercicioId = emparejarEjercicio(x.nombre, indice);
    const parecido = ejercicioId ? null : posibleDuplicado(x.nombre, lista || [], (e) => (nombresDe(e) || [])[0] || e.id);
    return { nombre: x.nombre, ejercicioId, sugerencia: parecido ? parecido.id : null, tipo: tipoPorSeries(x.seriesLista), series: x.seriesLista.length };
  }).sort((a, b) => (a.ejercicioId ? 1 : 0) - (b.ejercicioId ? 1 : 0) || a.nombre.localeCompare(b.nombre));
  return {
    formato, entrenos, repetidos, ejercicios,
    series: entrenos.reduce((n, e) => n + e.ejercicios.reduce((m, ej) => m + ej.series.length, 0), 0),
    desde: entrenos.length ? entrenos[0].inicio : null,
    hasta: entrenos.length ? entrenos[entrenos.length - 1].inicio : null,
  };
}

// ---------- Construir lo que se guarda ----------
// `decisiones[nombre]`: el id de un ejercicio de la biblioteca o "nuevo" (crear propio). Sin decisión, lo
// emparejado se queda emparejado y lo demás se crea como propio. Devuelve los ejercicios propios que hay
// que crear y las sesiones, todas con el mismo `lote` (para poder deshacer la importación entera).
export function construirImportacion(prep, { decisiones = {}, ahora = Date.now(), lote = "lot_" + uid(), hoy = null } = {}) {
  const propios = [];
  const idDe = {};
  prep.ejercicios.forEach((x) => {
    const d = decisiones[x.nombre];
    if (d && d !== "nuevo") { idDe[x.nombre] = d; return; }
    if (!d && x.ejercicioId) { idDe[x.nombre] = x.ejercicioId; return; }
    const id = "exp_" + uid();
    propios.push({ id, nombre: x.nombre, tipo: x.tipo, musculo: null, secundarios: [], equipo: "otro", creado: hoy, archivado: false, importado: prep.formato, lote });
    idDe[x.nombre] = id;
  });
  const sesiones = prep.entrenos.map((e) => ({
    id: "ses_" + uid(),
    nombre: e.titulo,
    rutinaId: null,
    inicio: e.inicio,
    fin: e.fin && new Date(e.fin) >= new Date(e.inicio) ? e.fin : e.inicio,
    pausas: [],
    esfuerzo: null,
    nota: e.nota || "",
    origen: "importado:" + prep.formato,
    lote,
    ejercicios: e.ejercicios.map((ej) => ({
      inst: "ei_" + uid(),
      ejercicioId: idDe[ej.nombre],
      sustituyeA: null,
      nota: ej.nota || "",
      descansoSeg: null,
      superserie: ej.superserie ? `ss_${lote}_${ej.superserie}` : null,
      series: ej.series.map((sr) => ({ id: "sr_" + uid(), tipo: sr.tipo, kg: sr.kg, reps: sr.reps, seg: sr.seg, km: sr.km, rir: sr.rir, hecha: true })),
    })),
    actualizado: ahora,
  }));
  return { lote, propios, sesiones };
}
