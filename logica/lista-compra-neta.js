// ---------- Lista de la compra neta (lógica) ----------
// Módulo de lógica pura (sin JSX, sin React): la lista de la compra del Menú completo descontando
// lo que ya hay en casa (Fase A de la despensa, ver local/ideas/despensa-fase-a-plan.md). Para cada
// alimento: cuánto pide el menú ("necesitas"), cuánto hay ("tienes") y la diferencia ("comprar").
//
// No sustituye a calcularListaCompra (logica/comida-calculo.js), que sigue intacta para el Menú
// simple: aquella agrupa por ingrediente (el mismo alimento puede salir dos veces si lo usan dos
// ingredientes distintos) y por categoría de ingrediente; esta agrupa por ALIMENTO, que es lo único
// que se puede comparar con lo que hay en la despensa. Un caso de validacion/tests.js comprueba que
// las dos piden los mismos gramos de cada alimento para el mismo menú.
import { getFood } from "macros";
import { mealComponents } from "comida-calculo";
import { usaCantidad, stockAlimento, slotsConsumidos } from "despensa";

// Qué alimentos (y cuántos gramos) lleva una comida del menú, ya con sus raciones ajustadas. Sale de
// mealComponents, igual que el detalle de la comida y la lista de la compra de siempre, para que
// nunca puedan discrepar. Cada necesidad es { foodId, nombre, gramos }, con `gramos: null` para lo
// que se apunta sin cantidad (verdura y fruta: ver usaCantidad en logica/despensa.js).
// - Los platos compuestos (desayuno, merienda, platos cerrados) se abren en sus alimentos reales.
// - La verdura de Comida/Cena llega sin ingrediente a propósito (no cuenta en las macros); aquí se
//   busca su ingrediente por nombre para saber de qué alimento es. Si no tiene ninguno vinculado,
//   sale con `foodId: null` y solo su nombre: se sigue apuntando en la lista, pero no se puede
//   comparar con la despensa.
// - Lo que no tiene datos (un ingrediente sin alimento vinculado) se deja fuera, igual que en
//   calcularListaCompra: sin alimento no hay gramos que sumar.
export function necesidadesComida(data, meal) {
  const necesidades = [];
  mealComponents(data, meal).forEach((c) => {
    if (c.sinCalculo) {
      const ingVerdura = data.ingredients.find((i) => i.name === c.label);
      const food = ingVerdura ? getFood(data, ingVerdura.foodId) : null;
      if (!food) necesidades.push({ foodId: null, nombre: c.label, gramos: null });
      // Raro, pero posible: una "verdura" enlazada a un alimento de otra carpeta (que sí lleva
      // cantidad). Como la comida no calcula su ración, se usa la ración base del ingrediente.
      else necesidades.push({ foodId: food.id, nombre: food.name, gramos: usaCantidad(food) ? Number(ingVerdura.gramos) || 0 : null });
      return;
    }
    const ing = c.ingredient;
    if (!ing) return;
    if (Array.isArray(ing.composicion) && ing.composicion.length) {
      ing.composicion.forEach((item) => {
        const food = getFood(data, item.foodId);
        necesidades.push({
          foodId: item.foodId,
          nombre: food ? food.name : item.foodId,
          gramos: usaCantidad(food) ? Number(item.gramos) * c.raciones : null,
        });
      });
    } else if (c.macros) {
      const food = getFood(data, ing.foodId);
      necesidades.push({ foodId: ing.foodId, nombre: food ? food.name : c.label, gramos: usaCantidad(food) ? c.macros.gramos : null });
    }
  });
  return necesidades;
}

// La lista neta de un menú (una semana o el ciclo completo, como la lista de siempre) frente a lo
// que hay en la despensa. Solo cuenta las comidas PENDIENTES: una comida ya marcada como hecha (con
// su consumo guardado) ya salió de la despensa, así que tampoco hace falta comprar para ella.
//
// Devuelve una fila por alimento, ordenadas por nombre:
//   { key, foodId, nombre, categoria, sinCantidad, necesito, tengo, comprar, comprado, compra }
// - Con cantidad: necesito/tengo/comprar en gramos enteros; comprar = máx(necesito − tengo, 0).
// - Sin cantidad (verdura, fruta): necesito = true, tengo = sí/no, comprar = !tengo.
// - `tengo` NO cuenta lo que entró tachando esta misma lista (despensa.compras): si contara, al
//   tachar una fila su "comprar" pasaría a cero y desaparecería de lo pendiente; así la fila tachada
//   se queda tal cual, enseñando lo que se compró.
// - `categoria` es la carpeta del alimento en el catálogo (proteinas, panes...), la misma que usa la
//   despensa — no la del ingrediente, porque un mismo alimento puede venir de varios.
export function calcularListaNeta(data, menu, weekFilter, despensa) {
  if (!data || !menu) return [];
  const consumidos = slotsConsumidos(despensa);
  const compras = (despensa && despensa.compras) || {};
  const pendientes = menu.filter((s) => (weekFilter === "todo" || s.week === weekFilter) && !consumidos.has(s.id));

  const filas = {};
  pendientes.forEach((meal) => {
    necesidadesComida(data, meal).forEach((n) => {
      const key = n.foodId || `nombre:${n.nombre}`;
      if (!filas[key]) {
        const food = n.foodId ? getFood(data, n.foodId) : null;
        filas[key] = {
          key, foodId: n.foodId, nombre: n.nombre,
          categoria: food ? food.categoria || null : n.foodId ? null : "vegetales",
          sinCantidad: n.foodId ? !usaCantidad(food) : true,
          exacto: 0, aparece: false,
        };
      }
      if (n.gramos === null) filas[key].aparece = true;
      else if (n.gramos > 0) { filas[key].exacto += n.gramos; filas[key].aparece = true; }
    });
  });

  return Object.values(filas)
    .filter((f) => f.aparece)
    .map(({ exacto, aparece, ...f }) => {
      const compra = compras[f.key] || null;
      if (f.sinCantidad) {
        // Sin alimento vinculado no hay con qué comparar: siempre a comprar.
        const tengo = f.foodId ? stockAlimento(despensa, f.foodId).tengo && !compra : false;
        return { ...f, necesito: true, tengo, comprar: !tengo, comprado: !!compra, compra };
      }
      const necesito = Math.round(exacto);
      const enCasa = f.foodId ? stockAlimento(despensa, f.foodId).gramos : 0;
      const tengo = Math.max(0, Math.round(enCasa - (compra && compra.delta ? compra.delta : 0)));
      return { ...f, necesito, tengo, comprar: Math.max(0, necesito - tengo), comprado: !!compra, compra };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
