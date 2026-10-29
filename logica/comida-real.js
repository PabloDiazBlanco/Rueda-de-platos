// ---------- Lo comido de verdad (B1 + B3, 25-oct-2026) ----------
// Módulo de lógica pura (sin JSX, sin React). Una comida del Menú completo se puede dar por hecha tal
// cual («Hecha») o decir qué se cambió («Cambié algo»): cada cosa que lleva (proteína, carbohidrato,
// verdura, cada alimento de un plato compuesto...) se puede cambiar por otro alimento del catálogo o
// marcar como «no lo comí». Lo no tocado cuenta como comido tal cual; lo cambiado, como lo que se comió.
//
// Decisiones del usuario (local/ideas/registro-2026-10-25.md, B1+B3):
// - Solo alimentos del catálogo propio («por un día que se come diferente no es relevante, no se buscan
//   obsesiones»): nada de texto libre ni de buscar en bases de datos externas.
// - La cantidad que se propone al cambiar es la que da las **mismas kcal** que lo sustituido, redondeada
//   a una cantidad razonable sin alejarse más de un ±10 % (redondearRazonable). Los gramos se pueden
//   cambiar a mano (los 300 g de ñoquis).
// - Las kcal y macros del día enseñan lo comido de verdad, **sin reajustar nada** del menú ni del ciclo:
//   ni porcentajes, ni raciones, ni el resto de la semana. El menú generado no se toca nunca desde aquí.
// - La despensa descuenta lo realmente comido (no lo planificado), con el mismo mecanismo de siempre
//   (descontarComida/devolverComida en despensa.js, que devuelven exactamente lo descontado).
//
// Forma de lo guardado, en data.comidasCompletadas[fecha][tipoDeComida] (antes era solo `true`; ver el
// parche de migrateData):
//   { hecha: true,
//     slotId,            // id de la comida del menú que se comió (para enseñar sus kcal reales)
//     macros: { kcal, prot, fat, carb },  // lo comido, redondeado: sirve aunque ese menú ya no exista
//     cambios: { [clave de la línea]: { foodId, gramos } | { omitido: true } } }   // solo si hubo cambios
// Un registro migrado de antes (`{ hecha: true }` sin más) cuenta como comida hecha, sin detalle.
import { getFood, macrosFor, emptyMacros, addMacros } from "macros";
import { mealComponents, mealTotals, ingredientePorNombre } from "comida-calculo";
import { usaCantidad } from "despensa";
import { CATEGORIAS_ALIMENTOS } from "datos-iniciales";

// Carpetas que el menú no cuenta en las kcal: la verdura de Comida y Cena sale sin ingrediente a
// propósito (ver mealComponents). Si se cambia la verdura por otra verdura o por fruta, sigue sin contar;
// si se cambia por otra cosa (unas patatas fritas), sí cuenta: eso ya no es «la verdura de siempre».
const CARPETAS_SIN_KCAL = ["vegetales", "frutas"];

// ---------- Líneas de una comida ----------
// Lo que se enseña en «Cambié algo»: cada alimento de la comida con sus gramos de hoy (con las raciones
// ya aplicadas), en el orden del detalle. `clave` identifica la línea para guardar su cambio:
// el componente (`protein`, `carbo`, `garbanzos`, `verdura`, `grasaExtra`...) o, en los platos
// compuestos, el componente y la posición del alimento (`closedDish:0`, `item:2`). `cuenta` dice si el
// menú la suma en las kcal (todo menos la verdura). Lo que no tiene alimento vinculado no se puede
// cambiar por nada comparable y se deja fuera, igual que en la lista de la compra.
export function lineasComida(data, meal) {
  const lineas = [];
  mealComponents(data, meal).forEach((c) => {
    if (c.sinCalculo) {
      const ing = ingredientePorNombre(data, c.label, "verdura");
      const food = ing ? getFood(data, ing.foodId) : null;
      lineas.push({ clave: c.slotKey, componente: c.slotKey, foodId: food ? food.id : null, nombre: food ? food.name : c.label, gramos: food ? Number(ing.gramos) || 0 : 0, cuenta: false });
      return;
    }
    const ing = c.ingredient;
    if (!ing) return;
    if (Array.isArray(ing.composicion) && ing.composicion.length) {
      ing.composicion.forEach((item, i) => {
        const food = getFood(data, item.foodId);
        if (!food) return;
        lineas.push({ clave: `${c.slotKey}:${i}`, componente: c.slotKey, foodId: food.id, nombre: food.name, gramos: Number(item.gramos) * c.raciones, cuenta: true });
      });
    } else if (c.macros) {
      const food = getFood(data, ing.foodId);
      lineas.push({ clave: c.slotKey, componente: c.slotKey, foodId: ing.foodId, nombre: food ? food.name : c.label, gramos: c.macros.gramos, cuenta: true });
    }
  });
  return lineas;
}

// ---------- Cantidad propuesta ----------
// Una cantidad «de cocina»: al gramo por debajo de 30 g (aceite, frutos secos), de 5 en 5 hasta 100 g,
// de 10 en 10 hasta 300 g y de 25 en 25 por encima. Con esos pasos el redondeo nunca se aleja más de un
// 10 % de la cantidad exacta (el peor caso es 30 g: ±2,5 g = 8 %), que es el margen acordado. Cuando
// existan los envases y las unidades indivisibles (idea D2), aquí se redondeará a la unidad más cercana.
export function redondearRazonable(gramos) {
  const g = Number(gramos) || 0;
  if (g <= 0) return 0;
  const paso = g < 30 ? 1 : g < 100 ? 5 : g < 300 ? 10 : 25;
  return Math.max(paso, Math.round(g / paso) * paso);
}

const kcalDe = (food, gramos) => (food ? (Number(food.kcal) || 0) * (Number(gramos) || 0) / 100 : 0);
const gramosDefecto = (food) => ((CATEGORIAS_ALIMENTOS.find((c) => c.key === (food && food.categoria)) || {}).gramosDefecto) || 100;

// Gramos del alimento nuevo que dan las mismas kcal que la línea que sustituye. Si no hay con qué
// comparar (la línea no tenía kcal, como una verdura sin alimento, o el nuevo no tiene kcal, como el
// agua o un café solo), se propone la cantidad de partida de su carpeta del catálogo.
export function propuestaGramos(data, linea, foodIdNuevo) {
  const nuevo = getFood(data, foodIdNuevo);
  if (!nuevo) return 0;
  const kcalOriginal = kcalDe(getFood(data, linea.foodId), linea.gramos);
  if (kcalOriginal <= 0 || !(Number(nuevo.kcal) > 0)) return gramosDefecto(nuevo);
  return redondearRazonable((kcalOriginal / Number(nuevo.kcal)) * 100);
}

// Catálogo para elegir el sustituto: todos los alimentos, primero los de la misma carpeta que lo que se
// cambia y después el resto, cada grupo por nombre. No se excluye nada (si alguien cambia la carne por
// lechuga, se le deja), y el propio alimento queda fuera de la lista solo si es el mismo.
export function opcionesCambio(data, linea) {
  const original = getFood(data, linea.foodId);
  const carpeta = original ? original.categoria : null;
  const porNombre = (a, b) => a.name.localeCompare(b.name, "es");
  const todos = (data.foods || []).filter((f) => f.id !== linea.foodId);
  return {
    mismaCarpeta: carpeta ? todos.filter((f) => f.categoria === carpeta).sort(porNombre) : [],
    resto: todos.filter((f) => !carpeta || f.categoria !== carpeta).sort(porNombre),
  };
}

// ---------- Lo comido ----------
// Aplica los cambios a las líneas de la comida. Devuelve:
//   lineas:      cada línea con su `cambio` (si lo hay)
//   comido:      lo que se comió de verdad: [{ foodId, gramos, cuenta }] (sin lo marcado «no lo comí»)
//   macros:      sus macros (lo que cuenta)
//   planificadas: las macros del menú para esa comida, para enseñar la diferencia
//   hayCambios
export function comidaReal(data, meal, cambios = {}) {
  const lineas = lineasComida(data, meal).map((l) => ({ ...l, cambio: (cambios && cambios[l.clave]) || null }));
  const comido = [];
  lineas.forEach((l) => {
    if (l.cambio && l.cambio.omitido) return;
    if (l.cambio && l.cambio.foodId) {
      const food = getFood(data, l.cambio.foodId);
      const cuenta = l.cuenta || !(food && CARPETAS_SIN_KCAL.includes(food.categoria));
      comido.push({ foodId: l.cambio.foodId, gramos: Number(l.cambio.gramos) || 0, cuenta });
      return;
    }
    if (l.foodId) comido.push({ foodId: l.foodId, gramos: l.gramos, cuenta: l.cuenta });
  });
  const macros = comido
    .filter((c) => c.cuenta)
    .reduce((acc, c) => addMacros(acc, macrosFor(data, { foodId: c.foodId, gramos: c.gramos })), emptyMacros());
  const hayCambios = lineas.some((l) => l.cambio);
  return { lineas, comido, macros, planificadas: mealTotals(data, meal), hayCambios };
}

const redondearMacros = (m) => ({
  kcal: Math.round(m.kcal), prot: Math.round(m.prot * 10) / 10, fat: Math.round(m.fat * 10) / 10, carb: Math.round(m.carb * 10) / 10,
});

// El registro que se guarda al marcar la comida: «Hecha» (sin cambios) o con lo que se cambió. Los
// cambios que no cambian nada (el mismo alimento con los mismos gramos) no se guardan.
export function registroComida(data, meal, cambios = null) {
  const limpios = {};
  const lineas = lineasComida(data, meal);
  Object.entries(cambios || {}).forEach(([clave, c]) => {
    const l = lineas.find((x) => x.clave === clave);
    if (!l || !c) return;
    if (c.omitido) limpios[clave] = { omitido: true };
    else if (c.foodId && !(c.foodId === l.foodId && Math.round(Number(c.gramos)) === Math.round(l.gramos))) {
      limpios[clave] = { foodId: c.foodId, gramos: Math.max(0, Math.round(Number(c.gramos) || 0)) };
    }
  });
  const real = comidaReal(data, meal, limpios);
  const registro = { hecha: true, slotId: meal.id, macros: redondearMacros(real.macros) };
  if (Object.keys(limpios).length) registro.cambios = limpios;
  return registro;
}

// Lo que hay que descontar de la despensa por lo comido: el mismo formato que necesidadesComida
// (logica/lista-compra-neta.js), con `gramos: null` para lo que se apunta sin cantidad (verdura, fruta).
export function necesidadesComidaReal(data, meal, cambios) {
  return comidaReal(data, meal, cambios).comido.map((c) => {
    const food = getFood(data, c.foodId);
    return { foodId: c.foodId, nombre: food ? food.name : c.foodId, gramos: usaCantidad(food) ? c.gramos : null };
  });
}

// ---------- Leer lo guardado ----------
export const estaHecha = (valor) => !!valor && (valor === true || valor.hecha !== false);

// Registros por id de comida del menú: si la misma comida se marcó en dos fechas, gana la más reciente.
// Se calcula una vez por pantalla y se reutiliza para todas sus comidas.
export function indiceRegistros(comidasCompletadas) {
  const indice = new Map();
  Object.keys(comidasCompletadas || {}).sort().forEach((fecha) => {
    Object.values(comidasCompletadas[fecha] || {}).forEach((r) => {
      if (r && typeof r === "object" && r.slotId) indice.set(r.slotId, r);
    });
  });
  return indice;
}

export function registroDeSlot(comidasCompletadas, slotId) {
  return (slotId && indiceRegistros(comidasCompletadas).get(slotId)) || null;
}

// Las macros de una comida del menú como se comió: las reales si se marcó con cambios; si no, las del menú.
export function totalesComidaReal(data, meal, indice = indiceRegistros(data && data.comidasCompletadas)) {
  const r = meal && indice.get(meal.id);
  if (r && r.cambios && Object.keys(r.cambios).length) return { ...comidaReal(data, meal, r.cambios).macros, cambiada: true };
  return { ...mealTotals(data, meal), cambiada: false };
}

// Lo mismo para un día del menú (semana y día): suma lo comido de verdad en las comidas cambiadas y lo
// del menú en el resto. `cambiadas` cuenta las comidas con cambios, para avisarlo en pantalla.
export function totalesDiaReal(data, menu, week, day) {
  const indice = indiceRegistros(data && data.comidasCompletadas);
  let total = emptyMacros();
  let cambiadas = 0;
  (menu || []).filter((s) => s.week === week && s.day === day).forEach((meal) => {
    const t = totalesComidaReal(data, meal, indice);
    if (t.cambiada) cambiadas += 1;
    total = addMacros(total, t);
  });
  return { ...total, cambiadas };
}
