// ---------- Período (I1, 25-oct-2026) ----------
// Módulo de lógica pura (sin JSX, sin React) de la pestaña «Período» del área Cuerpo, que solo ve quien tiene
// sexo femenino en el perfil. Es gratis y sus datos **solo viven en el dispositivo** (localStorage, en
// ui/cuerpo/periodo.jsx), nunca en la nube: decisión del usuario, que acepta que se pierdan al cambiar de móvil
// a cambio de no subir datos tan íntimos. Se apuntan los días de regla y los días con relaciones, y se predice
// el siguiente inicio de la forma más sencilla posible, sin «estimaciones inteligentes» (también decisión del
// usuario): último inicio + la distancia entre los dos últimos inicios; con un solo inicio, 28 días. Es
// informativo: no sirve como método anticonceptivo, y así se dice en pantalla.
//
// Forma de lo guardado: { version: 1, regla: ["AAAA-MM-DD", ...], relaciones: ["AAAA-MM-DD", ...] }.

export const VERSION_PERIODO = 1;
export const CICLO_POR_DEFECTO = 28;

export function periodoVacio() {
  return { version: VERSION_PERIODO, regla: [], relaciones: [] };
}

const esFecha = (f) => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f);
const limpia = (lista) => [...new Set((Array.isArray(lista) ? lista : []).filter(esFecha))].sort();

// Completa lo que falte sin perder nada (fechas mal formadas fuera, sin repetidas y en orden).
export function migrarPeriodo(guardado) {
  if (!guardado || typeof guardado !== "object") return periodoVacio();
  return { version: VERSION_PERIODO, regla: limpia(guardado.regla), relaciones: limpia(guardado.relaciones) };
}

// Pone o quita un día de una de las dos listas («regla» o «relaciones»).
export function alternarDia(periodo, lista, fecha) {
  const actual = periodo[lista] || [];
  const nueva = actual.includes(fecha) ? actual.filter((f) => f !== fecha) : [...actual, fecha].sort();
  return { ...periodo, [lista]: nueva };
}

// Días entre dos fechas «AAAA-MM-DD» (b − a), en UTC para que el cambio de hora no reste un día.
function dias(a, b) {
  const utc = (f) => Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));
  return Math.round((utc(b) - utc(a)) / 86400000);
}
function sumar(fecha, n) {
  const d = new Date(Date.UTC(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1, Number(fecha.slice(8, 10)) + n));
  return d.toISOString().slice(0, 10);
}

// Los días en que empieza cada regla: un día de regla cuyo día anterior no lo es.
export function iniciosDeRegla(regla) {
  const lista = limpia(regla);
  const set = new Set(lista);
  return lista.filter((f) => !set.has(sumar(f, -1)));
}

// Siguiente inicio previsto: { fecha, ciclo, base: "dos" | "uno" } o null si no hay ninguno apuntado.
export function prediccionPeriodo(periodo) {
  const inicios = iniciosDeRegla(periodo && periodo.regla);
  if (!inicios.length) return null;
  const ultimo = inicios[inicios.length - 1];
  if (inicios.length === 1) return { fecha: sumar(ultimo, CICLO_POR_DEFECTO), ciclo: CICLO_POR_DEFECTO, base: "uno" };
  const ciclo = dias(inicios[inicios.length - 2], ultimo);
  return { fecha: sumar(ultimo, ciclo), ciclo, base: "dos" };
}
