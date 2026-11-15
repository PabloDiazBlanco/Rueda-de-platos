// ---------- ui/comun/compartir.jsx ----------
// Compartir algo de la app (la lista de la compra, el menú de la semana, un entreno, el seguimiento de peso,
// el catálogo de alimentos) como TEXTO o como IMAGEN.
// Sustituye a las antiguas exportaciones a PDF (window.print): la del menú se quitó en octubre de 2026 porque
// en el móvil iba mal, y las del seguimiento de peso y el catálogo, en noviembre, porque salían con mal
// formato y en iPhone no se podían usar. Las dos salidas parten del mismo «documento»:
//   { titulo, subtitulo?, nota?: una frase bajo la cabecera (o bajo la gráfica), casillas?: bool,
//     vacio?: texto si no hay nada,
//     grafica?: { puntos: [{ x, y, destacado? }], rango: { minX, maxX, minY, maxY },
//                 tendencia?: { intercepto, pendiente }, etiquetasX: [inicio, mitad, fin] },
//     secciones: [{ titulo, lineas: [{ etiqueta?, texto, detalle? }] }] }
// - Texto: líneas «- Etiqueta: texto: detalle», listas para pegar en Notas, Keep o WhatsApp. La gráfica no
//   tiene versión en texto: la sustituye la lista de valores, que ya va en las secciones.
// - Imagen: el mismo documento dibujado en un <canvas> (sin librerías externas: el CLAUDE.md no permite
//   añadirlas, y para títulos, líneas de texto y una gráfica de puntos no hace falta ninguna), en PNG de
//   1080 px de ancho, que se lee bien en cualquier móvil y se puede guardar en la galería.
// Las dos se mandan con el menú de compartir del propio sistema (navigator.share). Donde no existe, el
// texto se copia al portapapeles y la imagen se descarga.
import React, { useState, useRef } from "react";
import { Share2, Check, FileText, Image as IconoImagen, X } from "lucide-react";
import { t } from "i18n";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

// ---------- Texto ----------

export function documentoATexto(doc) {
  const cabecera = [doc.titulo, doc.subtitulo, doc.nota].filter(Boolean).join("\n");
  const secciones = (doc.secciones || []).filter((s) => s.lineas.length);
  if (!secciones.length) return `${cabecera}\n\n${doc.vacio || ""}`.trim();
  const cuerpo = secciones.map((s) => {
    const lineas = s.lineas.map((l) => `- ${l.etiqueta ? `${l.etiqueta}: ` : ""}${l.texto}${l.detalle ? `: ${l.detalle}` : ""}`);
    return `${s.titulo.toUpperCase()}\n${lineas.join("\n")}`;
  });
  return [cabecera, ...cuerpo].join("\n\n");
}

// ---------- Imagen ----------
// Los colores son los del tema de la app (Shell, ui/marco/cabecera.jsx), escritos aquí en hexadecimal
// porque un canvas no entiende variables CSS.
const COLORES = {
  fondo: "#f1ede0", tarjeta: "#fffdf7", verde: "#1f4d38", verdeMedio: "#2f6b4f", verdeClaro: "#cfe0d4",
  tinta: "#2b2b26", suave: "#6b6a5e", linea: "#ddd6bf", mostaza: "#a9721f", mostazaClaro: "#d9a441",
};
const ANCHO = 1080;
const MARGEN = 64;
const ALTO_LINEA = 46;
const ALTO_GRAFICA = 380;
// iOS (Safari, y con él cualquier navegador del iPhone) no pinta un lienzo de más de unos 16,7 millones de
// píxeles (4096 × 4096): por encima, toBlob devuelve null y la imagen no sale. Con 1080 px de ancho eso son
// unos 15 500 de alto, y un catálogo de alimentos o un histórico de peso de años pueden pasar de ahí. En ese
// caso se dibuja todo a escala (letra más pequeña, pero la imagen sale y se puede ampliar).
const AREA_MAXIMA = 16000000;

// Parte un texto en renglones que quepan en `ancho` con la fuente que tenga puesta el contexto.
function envolver(ctx, texto, ancho) {
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  const renglones = [];
  let actual = "";
  palabras.forEach((p) => {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width <= ancho || !actual) actual = prueba;
    else {
      renglones.push(actual);
      actual = p;
    }
  });
  if (actual) renglones.push(actual);
  return renglones.length ? renglones : [""];
}

const fuente = (tamano, peso = "normal", familia = FUENTE_TEXTO) => `${peso} ${tamano}px ${familia}`;

// La gráfica de puntos de un documento (hoy, la del seguimiento de peso), con el mismo dibujo que la de la
// pantalla (PesoLineChart, ui/peso/grafica.jsx): tres líneas de referencia con su valor, la línea gris que une
// los puntos, la recta de tendencia en verde discontinuo y los puntos en verde oscuro, o en mostaza los
// `destacado` (las pesadas atípicas). El rango llega ya calculado para que las dos gráficas coincidan.
function dibujarGrafica(ctx, g, y0) {
  const izq = MARGEN + 84, der = ANCHO - MARGEN - 12, arriba = y0 + 16, abajo = y0 + ALTO_GRAFICA - 48;
  const { minX, maxX, minY, maxY } = g.rango;
  const sx = (x) => izq + ((x - minX) / (maxX - minX || 1)) * (der - izq);
  const sy = (v) => abajo - ((v - minY) / (maxY - minY || 1)) * (abajo - arriba);

  ctx.font = fuente(24);
  ctx.textAlign = "right";
  [minY, (minY + maxY) / 2, maxY].forEach((v) => {
    ctx.strokeStyle = COLORES.linea;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(izq, sy(v));
    ctx.lineTo(der, sy(v));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORES.suave;
    ctx.fillText(String(Math.round(v * 10) / 10), izq - 14, sy(v) + 8);
  });
  ctx.textAlign = "left";

  ctx.strokeStyle = COLORES.linea;
  ctx.lineWidth = 4;
  ctx.beginPath();
  g.puntos.forEach((p, i) => (i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y))));
  ctx.stroke();

  if (g.tendencia) {
    ctx.strokeStyle = COLORES.verdeMedio;
    ctx.lineWidth = 5;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(sx(minX), sy(g.tendencia.intercepto + g.tendencia.pendiente * minX));
    ctx.lineTo(sx(maxX), sy(g.tendencia.intercepto + g.tendencia.pendiente * maxX));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  g.puntos.forEach((p) => {
    ctx.beginPath();
    ctx.arc(sx(p.x), sy(p.y), p.destacado ? 10 : 9, 0, Math.PI * 2);
    ctx.fillStyle = p.destacado ? COLORES.mostazaClaro : COLORES.verde;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  ctx.font = fuente(24);
  ctx.fillStyle = COLORES.suave;
  const ultima = g.etiquetasX.length - 1;
  g.etiquetasX.forEach((texto, i) => {
    ctx.textAlign = i === 0 ? "left" : i === ultima ? "right" : "center";
    ctx.fillText(texto, i === 0 ? izq : i === ultima ? der : (izq + der) / 2, abajo + 38);
  });
  ctx.textAlign = "left";
}

// Dibuja el documento. Se hace en dos pasadas: la primera solo mide (para saber cuánto alto hace falta,
// que depende de cuántos renglones ocupa cada línea) y la segunda pinta en un lienzo ya de su tamaño.
export function dibujarDocumento(doc) {
  const secciones = (doc.secciones || []).filter((s) => s.lineas.length);
  const anchoUtil = ANCHO - MARGEN * 2;
  const casilla = doc.casillas ? 44 : 0;

  function recorrer(ctx, pintar) {
    let y = 0;
    // cabecera verde
    const altoCabecera = doc.subtitulo ? 210 : 170;
    if (pintar) {
      ctx.fillStyle = COLORES.verde;
      ctx.fillRect(0, 0, ANCHO, altoCabecera);
      ctx.fillStyle = COLORES.verdeClaro;
      ctx.font = fuente(24, "bold");
      ctx.fillText("FOODDRAFT", MARGEN, 62);
      ctx.fillStyle = "#ffffff";
      ctx.font = fuente(54, "normal", FUENTE_TITULOS);
      ctx.fillText(doc.titulo, MARGEN, 126);
      if (doc.subtitulo) {
        ctx.fillStyle = COLORES.verdeClaro;
        ctx.font = fuente(30);
        ctx.fillText(doc.subtitulo, MARGEN, 178);
      }
    }
    y = altoCabecera + 40;

    if (doc.grafica) {
      if (pintar) dibujarGrafica(ctx, doc.grafica, y);
      y += ALTO_GRAFICA + 16;
    }
    if (doc.nota) {
      ctx.font = fuente(30, "bold");
      envolver(ctx, doc.nota, anchoUtil).forEach((r) => {
        if (pintar) { ctx.fillStyle = COLORES.verde; ctx.fillText(r, MARGEN, y + 30); }
        y += ALTO_LINEA;
      });
      y += 10;
    }

    if (!secciones.length) {
      ctx.font = fuente(32);
      const renglones = envolver(ctx, doc.vacio || "", anchoUtil);
      renglones.forEach((r) => {
        if (pintar) { ctx.fillStyle = COLORES.suave; ctx.fillText(r, MARGEN, y + 32); }
        y += ALTO_LINEA;
      });
    }

    secciones.forEach((s) => {
      y += 18;
      if (pintar) {
        ctx.fillStyle = COLORES.verde;
        ctx.font = fuente(28, "bold");
        ctx.fillText(s.titulo.toUpperCase(), MARGEN, y + 28);
        ctx.fillStyle = COLORES.linea;
        ctx.fillRect(MARGEN, y + 44, anchoUtil, 3);
      }
      y += 64;
      s.lineas.forEach((l) => {
        // detalle a la derecha (cantidades): se reserva su ancho antes de partir el texto
        ctx.font = fuente(32, "bold");
        const anchoDetalle = l.detalle ? ctx.measureText(l.detalle).width + 24 : 0;
        ctx.font = fuente(32, "bold");
        const etiqueta = l.etiqueta ? `${l.etiqueta}  ` : "";
        const anchoEtiqueta = etiqueta ? ctx.measureText(etiqueta).width : 0;
        ctx.font = fuente(32);
        const renglones = envolver(ctx, l.texto, anchoUtil - casilla - anchoEtiqueta - anchoDetalle);
        if (pintar) {
          if (casilla) {
            ctx.strokeStyle = COLORES.suave;
            ctx.lineWidth = 3;
            ctx.strokeRect(MARGEN + 2, y + 8, 28, 28);
          }
          if (etiqueta) {
            ctx.fillStyle = COLORES.mostaza;
            ctx.font = fuente(32, "bold");
            ctx.fillText(etiqueta, MARGEN + casilla, y + 32);
          }
          ctx.fillStyle = COLORES.tinta;
          ctx.font = fuente(32);
          renglones.forEach((r, i) => ctx.fillText(r, MARGEN + casilla + anchoEtiqueta, y + 32 + i * ALTO_LINEA));
          if (l.detalle) {
            ctx.fillStyle = COLORES.verde;
            ctx.font = fuente(32, "bold");
            ctx.textAlign = "right";
            ctx.fillText(l.detalle, ANCHO - MARGEN, y + 32);
            ctx.textAlign = "left";
          }
        }
        y += renglones.length * ALTO_LINEA + 8;
      });
      y += 12;
    });

    y += 30;
    if (pintar) {
      ctx.fillStyle = COLORES.suave;
      ctx.font = fuente(22);
      ctx.textAlign = "center";
      ctx.fillText("FoodDraft", ANCHO / 2, y + 22);
      ctx.textAlign = "left";
    }
    return y + 60;
  }

  const medidor = document.createElement("canvas").getContext("2d");
  const alto = Math.ceil(recorrer(medidor, false));
  const escala = Math.min(1, Math.sqrt(AREA_MAXIMA / (ANCHO * alto)));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.floor(ANCHO * escala);
  lienzo.height = Math.floor(alto * escala);
  const ctx = lienzo.getContext("2d");
  ctx.scale(escala, escala);
  ctx.fillStyle = COLORES.tarjeta;
  ctx.fillRect(0, 0, ANCHO, alto);
  recorrer(ctx, true);
  return lienzo;
}

function lienzoAArchivo(lienzo, nombre) {
  return new Promise((resolver) => {
    lienzo.toBlob((blob) => resolver(blob ? new File([blob], nombre, { type: "image/png" }) : null), "image/png");
  });
}

// ---------- Mandarlo ----------

async function compartirTexto(titulo, texto) {
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: texto });
      return "compartido";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelado"; // lo cerró el usuario: no es un error
      // si compartir no está permitido aquí, se intenta copiar
    }
  }
  try {
    await navigator.clipboard.writeText(texto);
    return "copiado";
  } catch (e) {
    return "error";
  }
}

function descargar(archivo) {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo.name;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function compartirImagen(titulo, archivo) {
  if (!archivo) return "error";
  if (navigator.canShare && navigator.share) {
    try {
      if (navigator.canShare({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: titulo });
        return "compartido";
      }
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelado";
      // si el sistema no deja compartir archivos (o se perdió el permiso del toque), se descarga
    }
  }
  try {
    descargar(archivo);
    return "descargada";
  } catch (e) {
    return "error";
  }
}

// ---------- El botón ----------
// Al pulsarlo ofrece «Texto» o «Imagen». La imagen se prepara en ese mismo momento, antes de elegir:
// algunos navegadores (Safari) solo dejan abrir el menú de compartir justo después de un toque, y si
// la imagen se dibujase después de elegir «Imagen» podría llegar tarde.
// `construirDocumento(formato)` recibe "texto" o "imagen" (el menú, por ejemplo, lleva los gramos en
// texto pero no en la imagen). `aspecto`: "modal" (botón claro, dentro de un modal) o "pastilla" (como
// los botones de encima del menú).
export function BotonCompartir({ construirDocumento, nombreArchivo, idioma, aspecto = "modal" }) {
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState(null);
  const imagen = useRef(null);

  function abrir() {
    setAbierto(true);
    const doc = construirDocumento("imagen");
    imagen.current = lienzoAArchivo(dibujarDocumento(doc), nombreArchivo);
  }

  function avisar(resultado) {
    const claves = { copiado: "exportar.copiado", descargada: "exportar.descargada", error: "exportar.error" };
    if (claves[resultado]) {
      setAviso(t(idioma, claves[resultado]));
      setTimeout(() => setAviso(null), 2200);
    }
  }

  async function comoTexto() {
    setAbierto(false);
    const doc = construirDocumento("texto");
    avisar(await compartirTexto(doc.titulo, documentoATexto(doc)));
  }

  async function comoImagen() {
    setAbierto(false);
    const archivo = await imagen.current;
    avisar(await compartirImagen(construirDocumento("imagen").titulo, archivo));
  }

  const base = aspecto === "pastilla"
    ? {
        fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--green-dark)", background: "var(--green-soft)",
        border: "none", borderRadius: 8, padding: "7px 12px",
      }
    : {
        fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", background: "transparent",
        border: "1px solid var(--line)", borderRadius: 8, padding: "9px 14px",
      };
  const boton = { ...base, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" };

  if (abierto) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={comoTexto} style={boton}><FileText size={14} /> {t(idioma, "exportar.texto")}</button>
        <button onClick={comoImagen} style={boton}><IconoImagen size={14} /> {t(idioma, "exportar.imagen")}</button>
        <button onClick={() => setAbierto(false)} aria-label={t(idioma, "common.cerrar")} style={{ ...boton, padding: "7px 8px" }}>
          <X size={14} />
        </button>
      </span>
    );
  }
  return (
    <button onClick={abrir} style={boton}>
      {aviso ? <Check size={14} /> : <Share2 size={14} />} {aviso || t(idioma, "exportar.boton")}
    </button>
  );
}
