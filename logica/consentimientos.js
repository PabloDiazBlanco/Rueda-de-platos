// ---------- logica/consentimientos.js ----------
// Consentimientos y edad mínima (auditoría de noviembre de 2026, etapa 2: `02` L1, L2, L3 y L18; decisiones D2,
// D8 y D13). Las decisiones, sin tocar Firebase: qué falta por firmar, si un año de nacimiento vale y qué
// documentos se escriben. Lo que toca Firebase (leer lo firmado al entrar y escribir la firma) vive en
// auth-bootstrap.jsx y se limita a hacer lo que se decide aquí, como con el buzón de avisos.
//
// Por qué existe: casi todo lo que guarda FoodDraft son datos de salud (perfil, peso, comidas hechas, sueño,
// período). El RGPD los prohíbe salvo una excepción del art. 9.2, y la única que encaja con esta app es el
// **consentimiento explícito** (9.2.a): una declaración expresa (una casilla sin marcar, no «usar la función»), que
// además hay que **poder demostrar** (art. 7.1: quién, cuándo y a qué texto). Antes no se guardaba en ningún sitio.
// Los términos, por su parte, son un contrato, y conviene poder demostrar que se aceptaron (L3). Y la app calcula
// déficits calóricos y sigue el peso, que no es para menores sin supervisión: edad mínima de 18 años (D2).
//
// Dónde se guarda: `users/{uid}/consentimientos/{id}`, un documento por firma, que la app crea y las reglas de
// Firestore protegen como un libro de firmas: la hora la pone el servidor (`fecha == request.time`), una firma no se
// puede cambiar ni borrar desde la app (solo desaparece con «Eliminar cuenta», que borra `users/{uid}` entero) y la
// declaración de edad tiene que ser de alguien con 18 años o más según la hora del servidor. Sin Cloud Function a
// propósito: daría la misma garantía (una app modificada podría llamarla igual que escribe el documento) y no se
// podría probar en `localhost`, cuyo proyecto de pruebas no tiene funciones. Forma y límites, en firestore.rules.
//
// Tres firmas, independientes entre sí:
// - `edad`: la declaración del año de nacimiento. Una sola vez por cuenta. El asistente de perfil reutiliza ese año
//   en vez de volver a preguntarlo.
// - `terminos-<versión>`: aceptar los términos (y haber tenido delante la política de privacidad).
// - `salud-<versión>`: el consentimiento explícito para tratar los datos de salud. Obligatorio para usar la app:
//   retirarlo equivale a eliminar la cuenta (D13), porque sin esos datos la app no puede funcionar.
// La versión va en el nombre del documento: así, al cambiar un texto, se pide solo esa firma otra vez (la anterior
// se queda como prueba de lo que se aceptó entonces) y para saber si falta algo basta con leer tres documentos
// sueltos por su nombre, sin listar la colección.
//
// El consentimiento para estudios (D8) se añadirá cuando haya un estudio concreto: un consentimiento tiene que decir
// para qué es, y «para estudios» sin más no vale. Será un tipo más aquí y en las reglas.

// Edad mínima para usar la app (D2, 10-nov-2026). La LOPDGDD (art. 7) permite consentir desde los 14, pero una app de
// déficit calórico y seguimiento del peso no es adecuada para menores sin supervisión, y con 18 no hacen falta ni el
// consentimiento de los padres ni las normas de Google Play para apps con menores. **firestore.rules lleva el mismo
// número** (una prueba de las reglas lo lee de aquí y comprueba los bordes).
export const EDAD_MINIMA = 18;
// Por encima de esta edad el año está mal escrito (un año de dos cifras, 1826 por 1926...). Generosa a propósito:
// rechazar a alguien de verdad sería peor que aceptar una errata. También en firestore.rules.
export const EDAD_MAXIMA = 120;

// Versión vigente de cada texto: la fecha (`AAAA-MM-DD`) en que cambió **de fondo** (qué datos, para qué, con quién,
// qué se acepta). Súbela solo entonces: cada subida hace que todas las cuentas vuelvan a ver la pantalla «Antes de
// empezar» con esa firma. Una errata o una traducción mejorada no la cambian. Las reglas aceptan cualquier fecha con
// esa forma (no una lista), para que subir una versión no obligue a publicar también las reglas.
export const VERSIONES = {
  terminos: "2026-11-10",
  salud: "2026-11-10",
};

// En este orden se piden y se enseñan: primero la edad (si no se llega a 18 no tiene sentido lo demás), luego los
// términos y por último los datos de salud.
export const TIPOS = ["edad", "terminos", "salud"];

// Nombre del documento de cada firma. La edad no lleva versión: se declara una vez.
export function idsConsentimientos(versiones = VERSIONES) {
  return {
    edad: "edad",
    terminos: `terminos-${versiones.terminos}`,
    salud: `salud-${versiones.salud}`,
  };
}

// Qué firmas faltan, en el orden de TIPOS. `registro` es lo leído de la nube con los nombres de idsConsentimientos:
// `{ edad, terminos, salud }`, cada uno el contenido del documento o `null` si no existe. **Una lectura que falla no
// llega aquí**: no es «no ha firmado nada», es «no se sabe», y quien lee tiene que enseñar el error y reintentar en
// vez de esta pantalla (como la carga de datos, documentacion/datos.md). Sin registro, falta todo.
export function consentimientosPendientes(registro) {
  const leido = registro && typeof registro === "object" ? registro : {};
  return TIPOS.filter((tipo) => !(leido[tipo] && typeof leido[tipo] === "object"));
}

// Qué dice un año de nacimiento escrito en la pantalla (texto del campo o número), con el año de hoy del aparato:
// - «vacio»: aún no se ha escrito nada (la pantalla no enseña ningún error).
// - «invalido»: no es un año de cuatro cifras, es posterior a hoy o más antiguo que EDAD_MAXIMA.
// - «menor»: no llega a EDAD_MINIMA ni aunque ya haya cumplido años este año.
// - «confirmar»: cumple EDAD_MINIMA este año. Con solo el año no se sabe si ya los ha cumplido (en noviembre de 2026,
//   alguien de 2008 puede tener todavía 17): la pantalla lo pregunta («¿has cumplido ya los 18?»).
// - «valido»: tiene EDAD_MINIMA o más aunque aún no haya cumplido años este año.
// Devuelve también el año como número (o `null`), para no volver a convertirlo.
export function evaluarAnioNacimiento(valor, anioActual) {
  if (valor === null || valor === undefined) return { estado: "vacio", anio: null };
  let anio;
  if (typeof valor === "number") {
    anio = valor;
  } else if (typeof valor === "string") {
    const texto = valor.trim();
    if (texto === "") return { estado: "vacio", anio: null };
    if (!/^\d{4}$/.test(texto)) return { estado: "invalido", anio: null };
    anio = Number(texto);
  } else {
    return { estado: "invalido", anio: null };
  }
  if (!Number.isInteger(anio) || anio > anioActual || anio < anioActual - EDAD_MAXIMA) {
    return { estado: "invalido", anio: null };
  }
  // Los años que cumple (o ha cumplido) este año.
  const edadEsteAnio = anioActual - anio;
  if (edadEsteAnio > EDAD_MINIMA) return { estado: "valido", anio };
  if (edadEsteAnio === EDAD_MINIMA) return { estado: "confirmar", anio };
  return { estado: "menor", anio };
}

// ¿Puede seguir? Con «confirmar», solo si ha dicho que ya ha cumplido EDAD_MINIMA (`true` exacto, no algo que lo
// parezca: la casilla manda un sí/no).
export function edadSuficiente(estado, cumplidosEsteAnio) {
  if (estado === "valido") return true;
  if (estado === "confirmar") return cumplidosEsteAnio === true;
  return false;
}

// Lo que hay que escribir para firmar lo pendiente: `{ id: datos }`, sin la `fecha`, que la pone auth-bootstrap.jsx
// con `serverTimestamp()` (las reglas no aceptan otra). Se escribe todo en un solo lote: o se guardan todas las
// firmas o ninguna. Si falta la edad y no es suficiente, no se firma nada (`null`): no tiene sentido guardar los
// términos o la salud de alguien que no puede usar la app. `cumplidosEsteAnio` solo va cuando hizo falta preguntarlo
// (el año justo): es la prueba de que se preguntó, y las reglas lo exigen en ese caso.
export function documentosAFirmar({ pendientes, anio, cumplidosEsteAnio, anioActual, versiones = VERSIONES }) {
  const ids = idsConsentimientos(versiones);
  const documentos = {};
  for (const tipo of TIPOS) {
    if (!pendientes.includes(tipo)) continue;
    if (tipo === "edad") {
      const { estado, anio: anioValido } = evaluarAnioNacimiento(anio, anioActual);
      if (!edadSuficiente(estado, cumplidosEsteAnio)) return null;
      documentos[ids.edad] = {
        tipo: "edad",
        anioNacimiento: anioValido,
        ...(estado === "confirmar" ? { cumplidosEsteAnio: true } : {}),
      };
    } else {
      documentos[ids[tipo]] = { tipo, version: versiones[tipo] };
    }
  }
  return documentos;
}

// El año declarado en la firma de la edad, para el asistente de perfil (que ya no lo pregunta) y para Ajustes. `null`
// si no hay firma o no tiene un año entero (no debería pasar: las reglas lo exigen).
export function anioDeclarado(registro) {
  const anio = registro && registro.edad && registro.edad.anioNacimiento;
  return Number.isInteger(anio) ? anio : null;
}

// Lo firmado, para enseñarlo en Ajustes («Privacidad»): qué, cuándo y qué versión. `fecha` llega de Firestore como un
// Timestamp (con `toDate`); aquí se convierte en Date, o `null` si falta o no lo es (una firma recién escrita sin
// releer, por ejemplo). Lo que no esté firmado sale como `null` entero.
export function resumenFirmas(registro) {
  const leido = registro && typeof registro === "object" ? registro : {};
  const fechaDe = (firma) => (firma && firma.fecha && typeof firma.fecha.toDate === "function" ? firma.fecha.toDate() : null);
  const conVersion = (firma) => (firma && typeof firma === "object" ? { version: typeof firma.version === "string" ? firma.version : null, fecha: fechaDe(firma) } : null);
  return {
    edad: leido.edad && typeof leido.edad === "object" ? { anio: anioDeclarado(leido), fecha: fechaDe(leido.edad) } : null,
    terminos: conVersion(leido.terminos),
    salud: conVersion(leido.salud),
  };
}

// Una fecha como número, sin depender de que el navegador traiga el formato de cada idioma (gallego y euskera no
// siempre están): día/mes/año, y en euskera año/mes/día, que es su orden. Es un registro, no un texto bonito.
export function fechaDeFirma(fecha, idioma) {
  if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return null;
  const dos = (n) => String(n).padStart(2, "0");
  const [d, m, a] = [dos(fecha.getDate()), dos(fecha.getMonth() + 1), fecha.getFullYear()];
  return idioma === "eu" ? `${a}/${m}/${d}` : `${d}/${m}/${a}`;
}

// Límites del campo «Año de nacimiento» de Perfil, calculados con el año de hoy y no con números fijos (antes eran
// 1926 y 2012, que con los años dejaban pasar a menores). El máximo admite a quien cumple EDAD_MINIMA este año:
// eso ya se le preguntó en la pantalla «Antes de empezar».
export function rangoAnioNacimiento(anioActual) {
  return { min: anioActual - EDAD_MAXIMA, max: anioActual - EDAD_MINIMA };
}
