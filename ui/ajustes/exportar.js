// ---------- ui/ajustes/exportar.js ----------
// «Descargar mis datos» (Ajustes → Privacidad; auditoría de noviembre de 2026, etapa 4, punto 12b): reúne todo lo de
// la cuenta, lo pasa por logica/exportacion.js, lo empaqueta en un ZIP (logica/zip.js) y lo descarga. Es el **único**
// sitio de la app desde el que se descargan los datos: antes había un botón en Ajustes que solo bajaba los datos
// principales (`data-v1`) y dos en los ajustes del entreno (CSV y JSON de los entrenos); los tres se quitaron para no
// tener copias parciales que parecen completas.
//
// De dónde sale cada cosa:
// - Lo que la app ya tiene cargado en sus hooks (datos principales, menús, despensa, catálogo y cola del entreno,
//   sueño y pasos): es lo mismo que se ve en pantalla, ya migrado. La app solo enseña sus pantallas si todo eso se
//   leyó bien al abrir (`useCargaInicial`), así que aquí no hay un «a medias».
// - Los meses del entreno, que se leen bajo demanda: `cargarTodosLosMeses`, que lanza si alguno no se puede leer.
// - La ficha de la cuenta, las firmas, el buzón y lo de Authentication: `window.leerCuentaParaExportar`
//   (auth-bootstrap.jsx), leídos del servidor en el momento.
// - El período, del aparato (`leerPeriodoLocal`, ui/cuerpo/periodo.jsx): nunca sube a la nube.
// Si cualquiera de las lecturas falla, no se descarga nada (una copia incompleta presentada como completa es peor que
// un error) y la pantalla lo dice. Antes de entregar el ZIP se relee entero y se comprueba (`leerZip`).
import { construirExportacion, archivosExportacion, nombreArchivoExportacion } from "exportacion";
import { crearZip, leerZip } from "zip";
import { leerPeriodoLocal } from "../cuerpo/periodo.jsx";

function zonaHorariaDelAparato() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch (e) {
    return null;
  }
}

// Igual que la descarga de «Compartir» (ui/comun/compartir.jsx): un enlace temporal. La URL se libera un poco
// después, no al instante: algunos navegadores cancelan la descarga si se revoca justo tras el clic.
function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// `fuentes`: { data, menuCompleto, menuSimple, despensa, entreno, cuerpo } (los hooks de ui/estado/, como llegan a las
// pantallas). Devuelve { nombre } si se ha descargado. Lanza un error con `lectura: true` si no se ha podido leer algo
// (normalmente, sin conexión); cualquier otro error, tal cual.
export async function descargarTodosMisDatos({ data, menuCompleto, menuSimple, despensa, entreno, cuerpo }, idioma) {
  let meses;
  let cuenta;
  try {
    [meses, cuenta] = await Promise.all([entreno.cargarTodosLosMeses(), window.leerCuentaParaExportar()]);
  } catch (e) {
    console.warn("Descargar mis datos: no se ha podido leer todo:", (e && (e.code || e.message)) || e);
    const error = new Error("lectura");
    error.lectura = true;
    throw error;
  }

  const ahora = Date.now();
  const exportacion = construirExportacion({
    ahora,
    zonaHoraria: zonaHorariaDelAparato(),
    idioma,
    cuenta,
    datos: data,
    menus: {
      completo: { menu: menuCompleto.menu, historial: menuCompleto.historial },
      simple: { menu: menuSimple.menu, historial: menuSimple.historial },
    },
    despensa: despensa.despensa,
    entreno: { catalogo: entreno.catalogo, meses, cola: entreno.cola, enCurso: entreno.borrador },
    cuerpo: { diario: cuerpo.diario, favoritos: cuerpo.favoritos },
    periodo: leerPeriodoLocal(),
  });
  const archivos = archivosExportacion(exportacion, idioma);
  const zip = crearZip(archivos, new Date(ahora));

  // Se relee el ZIP (cada CRC-32) y se compara con lo que se quería meter: si algo no cuadra, no se entrega.
  const releido = leerZip(zip);
  const esperados = archivos.map((a) => a.nombre).join("|");
  if (releido.map((a) => a.nombre).join("|") !== esperados) throw new Error("El ZIP no contiene lo que debería.");
  const json = new TextDecoder().decode(releido.find((a) => a.nombre === "datos.json").contenido);
  if (json !== archivos.find((a) => a.nombre === "datos.json").contenido) throw new Error("El JSON del ZIP no coincide.");

  const nombre = nombreArchivoExportacion(ahora);
  descargar(new Blob([zip], { type: "application/zip" }), nombre);
  return { nombre };
}
