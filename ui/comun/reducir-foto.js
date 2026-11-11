// ---------- ui/comun/reducir-foto.js ----------
// Prepara una foto antes de mandarla a Gemini (lector de etiquetas y «¿Qué cocino?»): la vuelve a dibujar en un
// <canvas>, como mucho a 1600 píxeles por el lado largo, y la guarda como un JPEG nuevo (auditoría de noviembre de
// 2026, etapa 3: `03` R14 y `02` L5).
//
// Por qué: antes se mandaba el archivo original del móvil (FileReader.readAsDataURL). Eso tenía tres pegas:
// 1. Privacidad: el archivo lleva dentro sus metadatos EXIF, casi siempre con la **ubicación GPS exacta** (la casa
//    de la persona, que es donde está la nevera), el modelo del móvil y la hora. Todo eso le llegaba a Google sin que
//    la app lo necesitara. Un JPEG hecho con canvas.toDataURL es una imagen nueva hecha solo con los píxeles: no
//    lleva EXIF porque nadie se lo pone. Como fotocopiar una carta sin el sobre.
// 2. Fallos: una foto de móvil pesa 3-8 MB, y en base64 un tercio más. Las funciones callable no aceptan más de
//    10 MB por petición, y con una foto grande la lectura fallaba con un error genérico. Reducida pesa unos 200-500 KB.
// 3. Coste y tiempo: menos que subir con datos móviles y menos imagen que procesar para Gemini.
//
// Lo que no quita: lo que se ve en la imagen. Una cara o una dirección que salgan en la foto llegan igual.
//
// 1600 px por el lado largo: de sobra para leer la letra de una etiqueta (Gemini trocea las imágenes en piezas de
// menos de eso). Si una etiqueta de letra muy pequeña empezara a leerse peor, se sube aquí.
//
// Sin JSX ni imports: lo importan ui/catalogo/alimentos.jsx y ui/premium/que-cocino.jsx, y validacion/ prueba
// medidasReducidas directamente.

export const LADO_MAXIMO_FOTO = 1600;
// Calidad del JPEG: 0,85 deja la letra nítida y pesa poco (por encima de 0,9 el tamaño crece mucho sin que se note).
export const CALIDAD_FOTO = 0.85;

// Medidas de la foto reducida: el lado largo como mucho `ladoMax`, la misma proporción y **nunca más grande** que la
// original (ampliar no añade detalle, solo peso). `null` si las medidas no valen (una imagen que no se ha podido abrir).
export function medidasReducidas(ancho, alto, ladoMax = LADO_MAXIMO_FOTO) {
  if (!(ancho > 0) || !(alto > 0) || !(ladoMax > 0)) return null;
  const escala = Math.min(1, ladoMax / Math.max(ancho, alto));
  return {
    ancho: Math.max(1, Math.round(ancho * escala)),
    alto: Math.max(1, Math.round(alto * escala)),
  };
}

// Abre el archivo en una <img>. Los navegadores de hoy (Chrome 81+, Firefox 77+, Safari 13.1+) aplican la orientación
// que guarda el EXIF al pintar una imagen (`image-orientation: from-image` por defecto), así que naturalWidth y
// naturalHeight ya vienen girados y la foto reducida sale derecha aunque el móvil la guardara «tumbada». Por eso una
// <img> y no createImageBitmap, cuya opción para eso (`imageOrientation: "from-image"`) no tienen todos los navegadores.
function abrirImagen(archivo) {
  return new Promise((listo, fallo) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      listo(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      fallo(new Error("No se ha podido abrir la foto"));
    };
    img.src = url;
  });
}

// La foto lista para mandar, como data URL `data:image/jpeg;base64,…` (la forma que ya esperan las funciones). Si el
// navegador no puede abrir el archivo (un formato que no entiende), lanza: quien la usa enseña un error en vez de
// mandar el original con sus datos ocultos.
export async function reducirFoto(archivo, { ladoMax = LADO_MAXIMO_FOTO, calidad = CALIDAD_FOTO } = {}) {
  const img = await abrirImagen(archivo);
  const medidas = medidasReducidas(img.naturalWidth, img.naturalHeight, ladoMax);
  if (!medidas) throw new Error("La foto no tiene medidas válidas");
  const lienzo = document.createElement("canvas");
  lienzo.width = medidas.ancho;
  lienzo.height = medidas.alto;
  const ctx = lienzo.getContext("2d");
  // Fondo blanco: un PNG con transparencias (una captura de pantalla de una etiqueta) saldría negro al pasar a JPEG,
  // que no tiene transparencia. Es el fondo de la imagen, no un color de la interfaz: no va con variables de tema.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, medidas.ancho, medidas.alto);
  // Al reducir mucho (de 4000 a 1600 px) el suavizado por defecto deja dientes de sierra en la letra pequeña.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, medidas.ancho, medidas.alto);
  return lienzo.toDataURL("image/jpeg", calidad);
}
