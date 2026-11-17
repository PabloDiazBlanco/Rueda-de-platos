// ---------- «Descargar mis datos»: la exportación completa ----------
// Módulo de lógica pura (sin JSX, sin React, sin Firebase): con todo lo que la app tiene de una cuenta, arma el
// contenido del archivo que se descarga desde Ajustes → Privacidad (auditoría de noviembre de 2026, etapa 4, punto
// 12b; derechos de acceso y portabilidad, RGPD arts. 15 y 20). Leer los datos lo hace la interfaz
// (ui/ajustes/exportar.js) y empaquetarlos, logica/zip.js (y el Excel, logica/xlsx.js); aquí solo se decide qué va y con qué forma, para poder
// probarlo en validacion/ con datos inventados.
//
// Qué va en el archivo (un ZIP, sin comprimir):
// - `datos.json`: **todo**, con los mismos nombres de campo que guarda la app. Cada sección corresponde a una de
//   documentacion/diccionario-datos.md, que explica cada campo. Es el formato para otro programa (y, algún día, el
//   puente hacia una base de estudios: 04 §4.2 de la auditoría).
// - Las tablas de medidas (pesadas, ciclos de peso, comidas hechas, entrenos, series, sueño y pasos, período) y la
//   de alimentos, una fila por medida («tabla larga»), en dos formatos con los mismos datos: `datos.xlsx` (una hoja
//   por tabla; se abre bien en cualquier Excel, logica/xlsx.js) y un CSV por tabla (el formato de los programas).
// - `LEEME.txt`: qué es cada archivo, las unidades y los avisos, en el idioma de la app.
//
// Decisiones:
// - **«Sin dato» no es 0**: un valor que no existe sale como casilla vacía en las tablas, nunca como 0, y en el JSON
//   el campo simplemente no está (o es `null`, como en la app).
// - Cabeceras, nombres de archivo y de hoja fijos, en español y sin tildes: son identificadores, igual que los
//   `mealType` o los tipos de serie, que salen tal cual se guardan. En las columnas de sí o no, 1 y 0 (se pueden
//   sumar). El formato de los CSV, más abajo («CSV»).
// - Las horas de los entrenos salen en hora local del aparato que exporta («AAAA-MM-DD HH:MM») y también tal cual se
//   guardan (UTC, ISO 8601): la hora local depende de la zona, que la app no guarda (hueco H2 del diccionario). Por
//   eso el JSON apunta la zona del aparato en el momento de exportar (`zonaHorariaDelAparato`), avisando en el nombre
//   de que es la de ahora, no la de cada dato.
// - Las marcas de tiempo de Firestore (firmas, premium, buzón) salen como texto ISO 8601.
// - El índice del entreno no va: es una caché que se rehace a partir de las sesiones, que sí van todas.

import { t } from "i18n";
import { PRESETS_COMIDAS } from "objetivos";
import { ejercicioPorId } from "entreno-ejercicios";
import { nombreEjercicio } from "entreno-nombres";
import { duracionEfectiva, fechaLocal } from "entreno-calculo";
import { crearXlsx } from "xlsx";

export const FORMATO_EXPORTACION = "fooddraft-exportacion";
// Sube cuando cambie la forma de `datos.json` o de un CSV (columnas, nombres de archivo): quien lea el archivo con
// un programa sabe así qué forma esperar.
export const VERSION_EXPORTACION = 1;

export const UNIDADES = {
  peso: "kg", altura: "cm", distancia: "km", duracion: "s", sueno: "h", energia: "kcal", nutrientes: "g",
  alimentos: "por 100 g",
};

// Orden en que salen las comidas de un día: el del reparto con las cinco (Desayuno … Cena). Un tipo que no esté ahí
// (no debería haberlo) va detrás, por orden alfabético.
const ORDEN_COMIDAS = ((PRESETS_COMIDAS || []).find((p) => p.id === "cinco-5") || { meals: [] }).meals;

// ---------- Utilidades ----------
const ms = (x) => (x === null || x === undefined ? null : typeof x === "number" ? x : new Date(x).getTime());
const dos = (n) => String(n).padStart(2, "0");

// Fecha y hora local «AAAA-MM-DD HH:MM» de un instante (texto ISO o milisegundos); "" si no hay.
export function horaLocal(instante) {
  const t0 = ms(instante);
  if (t0 === null || Number.isNaN(t0)) return "";
  const d = new Date(t0);
  return `${fechaLocal(t0)} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

// Texto de fecha cualquiera (el `creationTime` de Authentication: «Tue, 03 Mar 2026 17:55:00 GMT») → ISO 8601, o
// null si no se entiende. Nunca se inventa una fecha.
export function isoDeTexto(texto) {
  if (!texto) return null;
  const d = new Date(texto);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Cambia, en cualquier profundidad, las marcas de tiempo de Firestore (objetos con `toDate()`) y las fechas por su
// texto ISO 8601. Lo demás se copia tal cual. Una marca que no da una fecha válida sale como null.
export function marcasATexto(valor) {
  if (valor === null || valor === undefined) return valor;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor.toISOString();
  if (typeof valor === "object" && typeof valor.toDate === "function") {
    try {
      return marcasATexto(valor.toDate());
    } catch (e) {
      return null;
    }
  }
  if (Array.isArray(valor)) return valor.map(marcasATexto);
  if (typeof valor === "object") {
    const copia = {};
    Object.keys(valor).forEach((k) => { copia[k] = marcasATexto(valor[k]); });
    return copia;
  }
  return valor;
}

// ---------- Las sesiones del entreno ----------
// Todas las sesiones terminadas: las de los meses leídos más las de la cola de este aparato (terminadas pero aún sin
// confirmar en la nube). Con el mismo id gana la de `actualizado` mayor y, a igualdad, la que llega después (la de
// la cola): la misma regla que `anadirSesionAMes` (logica/entreno-almacen.js), sin reordenar a cada paso. Del más
// antiguo al más reciente.
export function sesionesParaExportar(meses, cola) {
  const porId = new Map();
  const anadir = (s) => {
    if (!s || !s.id) return;
    const previa = porId.get(s.id);
    if (previa && Number(previa.actualizado || 0) > Number(s.actualizado || 0)) return;
    porId.set(s.id, s);
  };
  (meses || []).forEach((m) => ((m && m.sesiones) || []).forEach(anadir));
  (cola || []).forEach(anadir);
  return [...porId.values()].sort((a, b) => (ms(a.inicio) || 0) - (ms(b.inicio) || 0));
}

// ---------- datos.json ----------
// `f` (lo reúne ui/ajustes/exportar.js):
//   ahora (ms), zonaHoraria (texto o null), idioma,
//   cuenta: { autenticacion: { email, proveedor, emailVerificado, creada, ultimoAcceso }, ficha, buzon,
//             consentimientos: { <id del documento>: contenido } }  (lo leído de Firebase, con sus marcas de tiempo)
//   datos (data-v1), menus: { completo: { menu, historial }, simple: { menu, historial } }, despensa,
//   entreno: { catalogo, meses (documentos de mes), cola, enCurso }, cuerpo: { diario, favoritos }, periodo
// No modifica nada de lo que recibe.
export function construirExportacion(f) {
  const cuenta = f.cuenta || {};
  const auth = cuenta.autenticacion || {};
  const entreno = f.entreno || {};
  const cola = entreno.cola || [];
  const menus = f.menus || {};
  const menu = (m) => ({ menu: (m && m.menu) || null, historial: (m && m.historial) || [] });
  return {
    formato: FORMATO_EXPORTACION,
    versionFormato: VERSION_EXPORTACION,
    exportadoEn: new Date(f.ahora).toISOString(),
    zonaHorariaDelAparato: f.zonaHoraria || null,
    idioma: f.idioma || null,
    unidades: UNIDADES,
    cuenta: {
      autenticacion: {
        email: auth.email || null,
        proveedor: auth.proveedor || null,
        emailVerificado: auth.emailVerificado === true,
        creada: isoDeTexto(auth.creada),
        ultimoAcceso: isoDeTexto(auth.ultimoAcceso),
      },
      ficha: marcasATexto(cuenta.ficha || null),
      consentimientos: marcasATexto(cuenta.consentimientos || {}),
      avisosPush: marcasATexto(cuenta.buzon || null),
    },
    datos: f.datos || null,
    menus: { completo: menu(menus.completo), simple: menu(menus.simple) },
    despensa: f.despensa || null,
    entreno: {
      catalogo: entreno.catalogo || null,
      sesiones: sesionesParaExportar(entreno.meses, cola),
      // Ids de las sesiones que este aparato aún no ha confirmado en la nube (van ya dentro de `sesiones`).
      pendientesDeSubir: cola.map((s) => s && s.id).filter(Boolean),
      enCurso: entreno.enCurso || null,
    },
    cuerpo: { diario: (f.cuerpo && f.cuerpo.diario) || null, favoritos: (f.cuerpo && f.cuerpo.favoritos) || null },
    soloEsteAparato: { periodo: f.periodo || null },
  };
}

// ---------- Las tablas ----------
// Cada tabla da filas de valores «en bruto»: números como números, sí/no como 1 y 0, textos como texto y `null` para
// la casilla vacía (sin dato, nunca 0). De ahí salen los dos formatos: el CSV (`textoCSV`) y la hoja de Excel
// (logica/xlsx.js), así que los dos dicen siempre lo mismo.

// Un número, o null si no hay. Un valor que no es número (no debería haberlo) sale como texto, para no perderlo.
export function valorNumero(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "boolean") return String(valor);
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : String(valor);
}
const valorTexto = (valor) => (valor === null || valor === undefined || valor === "" ? null : String(valor));
const siNo = (v) => (v === true ? 1 : v === false ? 0 : null);

export const CABECERAS = {
  pesadas: ["fecha", "peso_kg", "atipica", "motivo", "ciclo"],
  ciclosPeso: ["inicio", "fin", "tendencia_pct_semana", "nivel", "ajuste_kcal_aplicado", "peso_actualizado"],
  comidasHechas: ["fecha", "comida", "hecha", "kcal", "prot_g", "grasa_g", "carb_g", "con_cambios", "id_menu"],
  entrenos: [
    "sesion_id", "inicio_local", "fin_local", "inicio_utc", "fin_utc", "duracion_seg", "nombre", "rutina_id", "esfuerzo",
    "gimnasio", "origen", "lote", "nota",
  ],
  series: [
    "sesion_id", "inicio_local", "orden_ejercicio", "ejercicio_id", "ejercicio", "tipo_ejercicio", "pareja", "serie",
    "tipo_serie", "kg", "reps", "reps_izq", "reps_der", "segundos", "km", "rir", "sustituye_a", "superserie",
    "nota_ejercicio",
  ],
  suenoPasos: ["fecha", "sueno_horas", "sueno_calidad", "pasos"],
  periodo: ["fecha", "dato"],
  alimentos: [
    "id", "nombre", "categoria", "kcal_100g", "prot_100g", "grasa_100g", "carb_100g", "grasa_saturada_100g",
    "azucares_100g", "fibra_100g", "sal_100g", "fuente",
  ],
};

// Pesadas: las de los ciclos cerrados (`historial`) y las del ciclo en curso (`entradas`), por fecha.
export function filasPesadas(exp) {
  const pt = (exp.datos && exp.datos.pesoTracking) || {};
  const filas = [
    ...(pt.historial || []).map((e) => ({ e, ciclo: "cerrado" })),
    ...(pt.entradas || []).map((e) => ({ e, ciclo: "en_curso" })),
  ].filter((x) => x.e && x.e.fecha);
  filas.sort((a, b) => (a.e.fecha < b.e.fecha ? -1 : a.e.fecha > b.e.fecha ? 1 : 0));
  return filas.map(({ e, ciclo }) => [String(e.fecha), valorNumero(e.peso), siNo(!!e.atipico), valorTexto(e.motivo), ciclo]);
}

// Ciclos de peso cerrados (los 12 últimos que guarda la app), del más antiguo al más reciente.
export function filasCiclosPeso(exp) {
  const ciclos = ((exp.datos && exp.datos.pesoTracking && exp.datos.pesoTracking.historialCiclos) || []).filter(Boolean);
  const orden = [...ciclos].sort((a, b) => String(a.inicio || "").localeCompare(String(b.inicio || "")));
  return orden.map((c) => [
    valorTexto(c.inicio), valorTexto(c.fin), valorNumero(c.pctSemana), valorTexto(c.nivel), valorNumero(c.ajusteKcalAplicado),
    siNo(c.pesoActualizado),
  ]);
}

const posicionComida = (tipo) => {
  const i = ORDEN_COMIDAS.indexOf(tipo);
  return i === -1 ? ORDEN_COMIDAS.length : i;
};

// Comidas hechas: una fila por comida marcada. Un registro antiguo (`true` o `{ hecha: true }` sin más) sale como
// hecho, con las macros y «con cambios» vacías: no se sabe, y no se inventa.
export function filasComidasHechas(exp) {
  const cc = (exp.datos && exp.datos.comidasCompletadas) || {};
  const filas = [];
  Object.keys(cc).sort().forEach((fecha) => {
    const delDia = cc[fecha];
    if (!delDia || typeof delDia !== "object") return;
    Object.keys(delDia)
      .sort((a, b) => posicionComida(a) - posicionComida(b) || a.localeCompare(b))
      .forEach((tipo) => {
        const r = delDia[tipo];
        if (!r) return;
        const registro = r === true ? { hecha: true } : r;
        const m = registro.macros || null;
        const conCambios = m ? !!(registro.cambios && Object.keys(registro.cambios).length) : undefined;
        filas.push([
          fecha, tipo, siNo(registro.hecha !== false),
          valorNumero(m && m.kcal), valorNumero(m && m.prot), valorNumero(m && m.fat), valorNumero(m && m.carb),
          siNo(conCambios), valorTexto(registro.slotId),
        ]);
      });
  });
  return filas;
}

export function filasEntrenos(exp) {
  return ((exp.entreno && exp.entreno.sesiones) || []).map((s) => [
    valorTexto(s.id), horaLocal(s.inicio) || null, horaLocal(s.fin) || null, valorTexto(s.inicio), valorTexto(s.fin),
    s.inicio && s.fin ? duracionEfectiva(s) : null,
    valorTexto(s.nombre), valorTexto(s.rutinaId), valorNumero(s.esfuerzo), valorTexto(s.gimnasio), valorTexto(s.origen),
    valorTexto(s.lote), valorTexto(s.nota),
  ]);
}

// Series: una fila por serie hecha. `ejercicio` es el nombre en el idioma de la app (los propios, tal cual los
// escribió la persona); `tipo_ejercicio` y `pareja` dicen cómo leer `kg` (de una mancuerna con pareja = 1; la ayuda
// en `asistido_reps`; el lastre en `lastre_reps`).
export function filasSeries(exp, idioma) {
  const catalogo = (exp.entreno && exp.entreno.catalogo) || null;
  const filas = [];
  ((exp.entreno && exp.entreno.sesiones) || []).forEach((s) => {
    (s.ejercicios || []).forEach((ej, i) => {
      const e = ejercicioPorId(catalogo, ej.ejercicioId);
      const nombre = nombreEjercicio(e || ej.ejercicioId, idioma);
      let n = 0;
      (ej.series || []).filter((sr) => sr && sr.hecha !== false).forEach((sr) => {
        n += 1;
        const lados = sr.lados === true;
        filas.push([
          valorTexto(s.id), horaLocal(s.inicio) || null, i + 1, valorTexto(ej.ejercicioId), valorTexto(nombre),
          e ? valorTexto(e.tipo) : null, siNo(e ? !!e.pareja : undefined), n, valorTexto(sr.tipo),
          valorNumero(sr.kg), valorNumero(sr.reps),
          valorNumero(lados ? sr.repsIzq : null), valorNumero(lados ? sr.repsDer : null),
          valorNumero(sr.seg), valorNumero(sr.km), valorNumero(sr.rir),
          valorTexto(ej.sustituyeA), valorTexto(ej.superserie), valorTexto(ej.nota),
        ]);
      });
    });
  });
  return filas;
}

export function filasSuenoPasos(exp) {
  const dias = (exp.cuerpo && exp.cuerpo.diario && exp.cuerpo.diario.dias) || {};
  return Object.keys(dias).sort().map((fecha) => {
    const d = dias[fecha] || {};
    const s = d.sueno || null;
    return [fecha, valorNumero(s && s.horas), valorNumero(s && s.calidad), valorNumero(d.pasos)];
  });
}

export function filasPeriodo(exp) {
  const p = (exp.soloEsteAparato && exp.soloEsteAparato.periodo) || {};
  const filas = [
    ...(p.regla || []).map((fecha) => [String(fecha), "regla"]),
    ...(p.relaciones || []).map((fecha) => [String(fecha), "relaciones"]),
  ];
  return filas.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
}

export function filasAlimentos(exp) {
  return ((exp.datos && exp.datos.foods) || []).filter(Boolean).map((f) => [
    valorTexto(f.id), valorTexto(f.name), valorTexto(f.categoria),
    valorNumero(f.kcal), valorNumero(f.prot), valorNumero(f.fat), valorNumero(f.carb),
    valorNumero(f.grasaSaturada), valorNumero(f.azucares), valorNumero(f.fibra), valorNumero(f.sal),
    valorTexto(f.fuente),
  ]);
}

// Las tablas, en el orden en que van en el ZIP y en las hojas del Excel. `clave` es a la vez el nombre del CSV (sin
// «.csv») y el de la hoja.
export const TABLAS = [
  { clave: "pesadas", cabecera: CABECERAS.pesadas, filas: filasPesadas },
  { clave: "ciclos-peso", cabecera: CABECERAS.ciclosPeso, filas: filasCiclosPeso },
  { clave: "comidas-hechas", cabecera: CABECERAS.comidasHechas, filas: filasComidasHechas },
  { clave: "entrenos", cabecera: CABECERAS.entrenos, filas: filasEntrenos },
  { clave: "series", cabecera: CABECERAS.series, filas: filasSeries },
  { clave: "sueno-pasos", cabecera: CABECERAS.suenoPasos, filas: filasSuenoPasos },
  { clave: "periodo", cabecera: CABECERAS.periodo, filas: filasPeriodo },
  { clave: "alimentos", cabecera: CABECERAS.alimentos, filas: filasAlimentos },
];

// ---------- CSV ----------
// El formato internacional (RFC 4180), igual en todos los idiomas de la app: separador «,», punto decimal, comillas
// solo cuando el texto lleva comas, comillas o saltos de línea (las comillas, dobladas), fin de línea CRLF y BOM al
// principio (UTF-8: sin él, Excel lee mal las tildes). Así lo lee bien cualquier programa, y las exportaciones de
// personas con la app en idiomas distintos se pueden juntar. Antes (primera versión) iban «a la española» (punto y
// coma y coma decimal, salvo en inglés): con Windows en inglés, Excel las partía por las comas. Para abrir las tablas
// en Excel con doble clic está `datos.xlsx`, que no depende del idioma del ordenador.
const SEP = ",";
const BOM = "﻿";
const FIN = "\r\n";

export function campoCSV(valor) {
  if (valor === null || valor === undefined) return "";
  const s = String(valor);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function textoCSV(cabecera, filas) {
  return BOM + [cabecera, ...filas].map((f) => f.map(campoCSV).join(SEP)).join(FIN) + FIN;
}

// ---------- LEEME.txt ----------
export function textoLeeme(exp, idioma) {
  const claves = ["json", "excel", "csv", "unidades", "fechas", "mancuernas", "salud", "periodo"];
  const partes = [
    t(idioma, "exportacion.leeme.titulo", { fecha: horaLocal(exp.exportadoEn) }),
    ...claves.map((k) => t(idioma, "exportacion.leeme." + k)),
    t(idioma, "exportacion.leeme.pagos", { donde: t(idioma, "premiumView.gestionarSuscripcion") }),
  ];
  return BOM + partes.join(FIN + FIN) + FIN;
}

// ---------- Todos los archivos ----------
// En este orden van dentro del ZIP. Los nombres no llevan tildes ni espacios. El Excel lleva una hoja por tabla, con
// los mismos datos que los CSV.
export function archivosExportacion(exp, idioma) {
  const tablas = TABLAS.map((tb) => ({ ...tb, datos: tb.filas(exp, idioma) }));
  return [
    { nombre: "LEEME.txt", contenido: textoLeeme(exp, idioma) },
    { nombre: "datos.json", contenido: JSON.stringify(exp, null, 2) },
    { nombre: "datos.xlsx", contenido: crearXlsx(tablas.map((tb) => ({ nombre: tb.clave, filas: [tb.cabecera, ...tb.datos] })), new Date(exp.exportadoEn)) },
    ...tablas.map((tb) => ({ nombre: `${tb.clave}.csv`, contenido: textoCSV(tb.cabecera, tb.datos) })),
  ];
}

// «fooddraft-datos-AAAA-MM-DD.zip», con el día local de la descarga.
export function nombreArchivoExportacion(ahora) {
  return `fooddraft-datos-${fechaLocal(ahora)}.zip`;
}
