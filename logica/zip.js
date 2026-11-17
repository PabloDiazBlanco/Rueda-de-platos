// ---------- ZIP sin comprimir ----------
// Módulo de lógica pura (sin JSX, sin React, sin DOM): escribe y lee un archivo ZIP con varios archivos dentro,
// **sin comprimir** (método 0, «stored»). Lo usa «Descargar mis datos» (logica/exportacion.js) para entregar en un solo
// archivo el JSON con todo y una tabla CSV por tipo de medida (auditoría de noviembre de 2026, etapa 4, punto 12b).
//
// Por qué escrito a mano: la app no tiene build ni dependencias fuera del importmap (CLAUDE.md), así que no hay
// JSZip. Un ZIP sin comprimir es sencillo: por cada archivo, una cabecera local y su contenido tal cual; al final, un
// directorio central con una entrada por archivo y un registro de cierre. Comprimir (DEFLATE) haría el archivo unas
// diez veces más pequeño, pero escribir un compresor a mano es mucho más código y más riesgo, y una exportación de
// varios años de datos son unos pocos megas: no compensa.
//
// Formato: la especificación de PKWARE (APPNOTE.TXT, secciones 4.3.7 cabecera local, 4.3.12 directorio central y
// 4.3.16 registro de cierre). Todos los números van en little-endian. Decisiones:
// - Nombres en UTF-8 con el bit 11 de los indicadores puesto (APPNOTE, apéndice D): así «sueño» no sale mal en
//   ningún descompresor actual. De todas formas, los nombres que pone la app van sin tildes.
// - Versión 2.0 («necesaria para extraer»): la habitual y la que entiende cualquier descompresor.
// - Sin ZIP64: cada archivo y el total tienen que caber en 4 GiB, y no más de 65 535 archivos. Una exportación está
//   muy lejos de eso; si alguna vez se pasara, se lanza un error en vez de escribir un ZIP roto.
// - Fecha y hora de modificación en el formato de MS-DOS (hora local, segundos de 2 en 2, desde 1980).
//
// `leerZip` hace el camino inverso y comprueba el CRC-32 de cada archivo: lo usan las pruebas de validacion/ y la
// propia exportación, que relee el ZIP antes de entregarlo (si algo no cuadra, mejor un error que un archivo roto).

const FIRMA_LOCAL = 0x04034b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_CIERRE = 0x06054b50;
const VERSION_ZIP = 20; // 2.0
const NOMBRES_UTF8 = 0x0800; // bit 11
const MAX_32 = 0xffffffff;
const MAX_ARCHIVOS = 0xffff;

// ---------- CRC-32 ----------
// El de ZIP (y PNG, y Ethernet): polinomio 0xEDB88320 (el 0x04C11DB7 «al revés»), empieza en 0xFFFFFFFF y se
// invierte al final. Valor de comprobación estándar: crc32("123456789") = 0xCBF43926.
let tablaCrc = null;
function tabla() {
  if (tablaCrc) return tablaCrc;
  tablaCrc = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tablaCrc[n] = c >>> 0;
  }
  return tablaCrc;
}

export function crc32(bytes) {
  const t = tabla();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = t[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------- Fecha de MS-DOS ----------
// Hora: bits 15-11 la hora, 10-5 los minutos, 4-0 los segundos / 2. Fecha: bits 15-9 los años desde 1980, 8-5 el
// mes (1-12), 4-0 el día. Antes de 1980 no se puede representar: se usa el 1 de enero de 1980.
export function fechaDos(fecha) {
  const d = fecha instanceof Date && !Number.isNaN(fecha.getTime()) ? fecha : new Date(1980, 0, 1);
  if (d.getFullYear() < 1980) return { hora: 0, dia: (1 << 5) | 1 };
  return {
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    dia: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

const aBytes = (contenido) => (contenido instanceof Uint8Array ? contenido : new TextEncoder().encode(String(contenido ?? "")));

// ---------- Escribir ----------
// `archivos`: [{ nombre, contenido }], con `contenido` texto (se guarda en UTF-8) o Uint8Array. Devuelve el ZIP como
// Uint8Array. Los nombres tienen que ser distintos y no vacíos (un ZIP con dos archivos iguales lo abre cada programa
// a su manera).
export function crearZip(archivos, fecha = new Date()) {
  const lista = archivos || [];
  if (lista.length > MAX_ARCHIVOS) throw new Error("Demasiados archivos para un ZIP sin ZIP64.");
  const vistos = new Set();
  const { hora, dia } = fechaDos(fecha);
  const entradas = lista.map(({ nombre, contenido }) => {
    if (!nombre || typeof nombre !== "string") throw new Error("Un archivo del ZIP no tiene nombre.");
    if (vistos.has(nombre)) throw new Error(`Archivo repetido en el ZIP: ${nombre}`);
    vistos.add(nombre);
    const datos = aBytes(contenido);
    if (datos.length > MAX_32) throw new Error(`Archivo demasiado grande para un ZIP sin ZIP64: ${nombre}`);
    return { nombre: new TextEncoder().encode(nombre), datos, crc: crc32(datos) };
  });

  const tamLocales = entradas.reduce((t, e) => t + 30 + e.nombre.length + e.datos.length, 0);
  const tamCentral = entradas.reduce((t, e) => t + 46 + e.nombre.length, 0);
  const total = tamLocales + tamCentral + 22;
  if (tamLocales > MAX_32 || total > MAX_32) throw new Error("La exportación no cabe en un ZIP sin ZIP64.");

  const salida = new Uint8Array(total);
  const v = new DataView(salida.buffer);
  let p = 0;
  const u16 = (x) => { v.setUint16(p, x, true); p += 2; };
  const u32 = (x) => { v.setUint32(p, x >>> 0, true); p += 4; };
  const bytes = (b) => { salida.set(b, p); p += b.length; };

  // Cabeceras locales con su contenido, una detrás de otra.
  entradas.forEach((e) => {
    e.desplazamiento = p;
    u32(FIRMA_LOCAL);
    u16(VERSION_ZIP); u16(NOMBRES_UTF8); u16(0); // versión necesaria, indicadores, método (0 = sin comprimir)
    u16(hora); u16(dia);
    u32(e.crc); u32(e.datos.length); u32(e.datos.length); // CRC, tamaño comprimido y sin comprimir (iguales)
    u16(e.nombre.length); u16(0); // largo del nombre, sin campo extra
    bytes(e.nombre);
    bytes(e.datos);
  });

  // Directorio central.
  const inicioCentral = p;
  entradas.forEach((e) => {
    u32(FIRMA_CENTRAL);
    u16(VERSION_ZIP); u16(VERSION_ZIP); u16(NOMBRES_UTF8); u16(0); // hecha con, necesaria, indicadores, método
    u16(hora); u16(dia);
    u32(e.crc); u32(e.datos.length); u32(e.datos.length);
    u16(e.nombre.length); u16(0); u16(0); // nombre, extra, comentario
    u16(0); u16(0); u32(0); // disco, atributos internos y externos
    u32(e.desplazamiento);
    bytes(e.nombre);
  });

  // Registro de cierre. El tamaño del directorio central se toma antes de empezar a escribirlo.
  const finCentral = p;
  u32(FIRMA_CIERRE);
  u16(0); u16(0); // este disco y el del directorio central
  u16(entradas.length); u16(entradas.length);
  u32(finCentral - inicioCentral);
  u32(inicioCentral);
  u16(0); // sin comentario
  if (p !== total) throw new Error("El ZIP no ha salido del tamaño calculado.");
  return salida;
}

// ---------- Leer ----------
// Lee un ZIP sin comprimir por su directorio central y comprueba, para cada archivo, que la cabecera local coincide
// y que el CRC-32 del contenido es el apuntado. Devuelve [{ nombre, contenido (Uint8Array) }] en el orden del ZIP.
// Lanza si algo no cuadra. Solo entiende lo que escribe crearZip (sin compresión, sin ZIP64, sin cifrar).
export function leerZip(zip) {
  const b = zip instanceof Uint8Array ? zip : new Uint8Array(zip);
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length < 22) throw new Error("ZIP demasiado corto.");
  const cierre = b.length - 22; // sin comentario, el registro de cierre son los últimos 22 bytes
  if (v.getUint32(cierre, true) !== FIRMA_CIERRE) throw new Error("ZIP sin registro de cierre.");
  const n = v.getUint16(cierre + 10, true);
  const tamCentral = v.getUint32(cierre + 12, true);
  let p = v.getUint32(cierre + 16, true);
  if (p + tamCentral !== cierre) throw new Error("El directorio central del ZIP no está donde dice.");
  const decodificar = new TextDecoder("utf-8", { fatal: true });
  const archivos = [];
  for (let i = 0; i < n; i++) {
    if (v.getUint32(p, true) !== FIRMA_CENTRAL) throw new Error("Entrada del directorio central rota.");
    const metodo = v.getUint16(p + 10, true);
    const crc = v.getUint32(p + 16, true);
    const tam = v.getUint32(p + 20, true);
    const tamSin = v.getUint32(p + 24, true);
    const largoNombre = v.getUint16(p + 28, true);
    const largoExtra = v.getUint16(p + 30, true);
    const largoComentario = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const nombre = decodificar.decode(b.subarray(p + 46, p + 46 + largoNombre));
    if (metodo !== 0 || tam !== tamSin) throw new Error(`Archivo comprimido o con tamaños distintos: ${nombre}`);
    if (v.getUint32(local, true) !== FIRMA_LOCAL) throw new Error(`Cabecera local rota: ${nombre}`);
    const largoNombreLocal = v.getUint16(local + 26, true);
    const largoExtraLocal = v.getUint16(local + 28, true);
    if (v.getUint32(local + 14, true) !== crc || v.getUint32(local + 22, true) !== tamSin) {
      throw new Error(`La cabecera local no coincide con el directorio: ${nombre}`);
    }
    const inicio = local + 30 + largoNombreLocal + largoExtraLocal;
    const contenido = b.subarray(inicio, inicio + tamSin);
    if (contenido.length !== tamSin) throw new Error(`Contenido cortado: ${nombre}`);
    if (crc32(contenido) !== crc) throw new Error(`CRC-32 incorrecto: ${nombre}`);
    archivos.push({ nombre, contenido });
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  return archivos;
}
