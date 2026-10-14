// ---------- ui/estilos.js ----------
// Tipografías de la interfaz, en un solo sitio. Hasta octubre de 2026 cada componente escribía el
// valor a mano (la de texto aparecía unas 250 veces): cambiar de fuente obligaba a tocar decenas de
// archivos. Los colores no están aquí porque ya son variables CSS de tema (--ink, --green...,
// definidas en Shell, ui/marco/cabecera.jsx).
// Ojo: el CSS escrito como texto (los <style> de Shell y de impresión) no puede usar estas
// constantes y repite los mismos valores; si se cambia una fuente, buscar también allí.
export const FUENTE_TEXTO = "'Helvetica Neue', Arial, sans-serif";
export const FUENTE_TITULOS = "Georgia, 'Times New Roman', serif";
export const FUENTE_MONO = "'IBM Plex Mono', monospace";
