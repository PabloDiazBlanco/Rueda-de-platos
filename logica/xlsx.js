// ---------- Libro de Excel (.xlsx) sencillo ----------
// Módulo de lógica pura (sin JSX, sin React, sin DOM): escribe un libro de Excel con varias hojas de datos (una fila
// de cabecera en negrita y debajo los datos). Lo usa «Descargar mis datos» (logica/exportacion.js) para dar las mismas
// tablas que los CSV en un archivo que **se abre bien en cualquier Excel**, sea cual sea el idioma del ordenador.
//
// Por qué hace falta (prueba de Pablo, noviembre de 2026): un CSV no dice cómo separa las columnas ni qué es la coma
// decimal, y cada Excel lo lee con la costumbre de su Windows. Con Windows en inglés, un CSV «a la española» (punto y
// coma, coma decimal) salía partido por las comas; con Windows en español, uno internacional (coma, punto decimal)
// sale entero en la columna A. Un .xlsx guarda cada celda por separado y los números como números: no hay nada que
// adivinar. Los CSV siguen en el ZIP, en el formato internacional, para los programas.
//
// Qué es un .xlsx por dentro (Office Open XML, ECMA-376): un ZIP con unos pocos archivos XML. Aquí, los mínimos que
// Excel, LibreOffice y Google Sheets abren sin quejarse:
//   [Content_Types].xml          qué tipo es cada parte
//   _rels/.rels                  dónde está el libro
//   xl/workbook.xml              la lista de hojas
//   xl/_rels/workbook.xml.rels   dónde está cada hoja y los estilos
//   xl/styles.xml                dos estilos: normal y negrita (la cabecera)
//   xl/worksheets/sheetN.xml     cada hoja
// Decisiones:
// - Textos «en línea» (`inlineStr`) y no en la tabla compartida de textos: algo más grande, pero mucho más simple, y
//   Excel lo lee igual.
// - Números como números (`<v>`): se pueden sumar y ordenar. Las fechas van como texto AAAA-MM-DD: un número de fecha
//   de Excel depende de la zona y del formato de cada ordenador, y el texto ISO se ordena bien igual.
// - Casilla vacía = sin dato: no se escribe la celda.
// - La fila de cabecera queda fija al desplazarse, y cada columna tiene un ancho según su contenido (de 8 a 60).
// - Textos limpios para XML: sin caracteres de control (no son XML válido) y como mucho 32 767 caracteres por celda
//   (el tope de Excel).
import { crearZip } from "zip";

const NS_HOJA = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_PAQUETE_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const CABECERA_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
const MAX_TEXTO = 32767;

// Columna de Excel a partir de su índice desde 0: 0 → A, 25 → Z, 26 → AA, 701 → ZZ, 702 → AAA.
export function columnaExcel(indice) {
  let n = indice + 1;
  let letras = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

// Texto apto para XML: sin caracteres de control (salvo tabulador y saltos de línea), sin medios caracteres sueltos
// (un emoji cortado) y con los cinco caracteres especiales escapados.
export function textoXml(valor) {
  let s = String(valor);
  if (typeof s.toWellFormed === "function") s = s.toWellFormed();
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// Una celda: número (si es un número finito), texto o nada. `estilo` 1 = negrita.
export function celdaXml(valor, ref, estilo = 0) {
  if (valor === null || valor === undefined || valor === "") return "";
  const s = estilo ? ` s="${estilo}"` : "";
  if (typeof valor === "number" && Number.isFinite(valor)) return `<c r="${ref}"${s}><v>${valor}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${textoXml(String(valor).slice(0, MAX_TEXTO))}</t></is></c>`;
}

function hojaXml(filas) {
  const anchos = [];
  filas.forEach((fila) => fila.forEach((v, i) => {
    const largo = v === null || v === undefined ? 0 : String(v).length;
    anchos[i] = Math.max(anchos[i] || 0, largo);
  }));
  const cols = anchos.length
    ? `<cols>${anchos.map((a, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, Math.max(8, a + 2))}" customWidth="1"/>`).join("")}</cols>`
    : "";
  const filasXml = filas.map((fila, r) => `<row r="${r + 1}">${fila.map((v, c) => celdaXml(v, columnaExcel(c) + (r + 1), r === 0 ? 1 : 0)).join("")}</row>`).join("");
  return CABECERA_XML
    + `<worksheet xmlns="${NS_HOJA}">`
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + cols
    + `<sheetData>${filasXml}</sheetData>`
    + "</worksheet>";
}

const ESTILOS = CABECERA_XML
  + `<styleSheet xmlns="${NS_HOJA}">`
  + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
  + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + "</styleSheet>";

// Nombre de hoja válido para Excel: de 1 a 31 caracteres, sin []:*?/\ y sin repetir (sin distinguir mayúsculas).
function comprobarNombres(hojas) {
  const vistos = new Set();
  hojas.forEach(({ nombre }) => {
    if (typeof nombre !== "string" || !nombre.length || nombre.length > 31 || /[[\]:*?/\\]/.test(nombre)) {
      throw new Error(`Nombre de hoja no válido: ${nombre}`);
    }
    const clave = nombre.toLowerCase();
    if (vistos.has(clave)) throw new Error(`Hoja repetida: ${nombre}`);
    vistos.add(clave);
  });
}

// Las partes del libro, en orden: [{ nombre, contenido }]. Separado de crearXlsx para poder probarlas.
// `hojas`: [{ nombre, filas }], con `filas[0]` la cabecera; cada valor, número, texto o null (vacío).
export function partesXlsx(hojas) {
  const lista = hojas || [];
  if (!lista.length) throw new Error("Un libro de Excel necesita al menos una hoja.");
  comprobarNombres(lista);
  const n = lista.length;
  const indices = lista.map((_, i) => i + 1);
  const tipos = CABECERA_XML
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + indices.map((i) => `<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + "</Types>";
  const relsRaiz = CABECERA_XML
    + `<Relationships xmlns="${NS_PAQUETE_REL}">`
    + `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>`
    + "</Relationships>";
  const libro = CABECERA_XML
    + `<workbook xmlns="${NS_HOJA}" xmlns:r="${NS_REL}"><sheets>`
    + lista.map((h, i) => `<sheet name="${textoXml(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")
    + "</sheets></workbook>";
  const relsLibro = CABECERA_XML
    + `<Relationships xmlns="${NS_PAQUETE_REL}">`
    + indices.map((i) => `<Relationship Id="rId${i}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${i}.xml"/>`).join("")
    + `<Relationship Id="rId${n + 1}" Type="${NS_REL}/styles" Target="styles.xml"/>`
    + "</Relationships>";
  return [
    { nombre: "[Content_Types].xml", contenido: tipos },
    { nombre: "_rels/.rels", contenido: relsRaiz },
    { nombre: "xl/workbook.xml", contenido: libro },
    { nombre: "xl/_rels/workbook.xml.rels", contenido: relsLibro },
    { nombre: "xl/styles.xml", contenido: ESTILOS },
    ...lista.map((h, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, contenido: hojaXml(h.filas || []) })),
  ];
}

// El libro entero, como Uint8Array (un ZIP: logica/zip.js).
export function crearXlsx(hojas, fecha = new Date()) {
  return crearZip(partesXlsx(hojas), fecha);
}
