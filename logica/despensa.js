// ---------- Despensa, nevera y congelador (lógica) ----------
// Módulo de lógica pura (sin JSX, sin React): qué hay en casa y cómo cambia. Es la Fase A de la
// idea F1 (ver local/ideas/despensa-fase-a-plan.md): el stock vive en su propia clave de
// almacenamiento (`rueda-de-platos:despensa-v1`, la lee y guarda useDespensa en
// ui/estado/despensa.js), aparte de los datos principales, así que no pasa por migrateData — tiene
// su propia versión y su propia migración (migrarDespensa, más abajo).
//
// Forma de lo guardado:
//   { version: 1,
//     items: [ { id, foodId, zona: "despensa"|"nevera"|"congelador", gramos } |
//              { id, foodId, zona, tengo: true|false } ],
//     menuConfirmadoId: <id de menu[0]> | null,
//     consumos: { "2026-10-15": { Comida: { slotId, items: [{ itemId, foodId, zona, gramos }] } } },
//     compras:  { <clave de fila de la lista>: { itemId, delta, creado } } }
//
// Las cantidades son gramos aproximados (sin paquetes ni unidades: decisión del usuario). Verdura y
// fruta se apuntan solo como "tengo / no tengo": nadie pesa la lechuga que le queda, y a efectos de
// la lista de la compra basta con saber si hay o no.
import { uid } from "comun";

export const DESPENSA_VERSION = 1;

// Orden en el que se enseñan las zonas (el mismo del título de la pantalla).
export const ZONAS = ["despensa", "nevera", "congelador"];

// Orden en el que se gasta lo que hay al cocinar: primero lo fresco de la nevera, luego la despensa
// y, en último lugar, el congelador — lo congelado es justo lo que se guarda para más adelante.
const ORDEN_CONSUMO = ["nevera", "despensa", "congelador"];

// Zona en la que cae un alimento al añadirlo, según su carpeta del catálogo (CATEGORIAS_ALIMENTOS).
// Es solo el punto de partida: el usuario lo mueve a otra zona cuando quiera (el pollo que va al
// congelador, por ejemplo). Ninguna carpeta va al congelador por defecto, porque depende de cada
// casa; un alimento sin carpeta (creado a mano antes de que existieran) va a la despensa.
const ZONA_POR_CATEGORIA = {
  proteinas: "nevera", embutido_fiambre: "nevera", vegetales: "nevera", frutas: "nevera", lacteos: "nevera",
  carbohidratos: "despensa", panes: "despensa", cereales: "despensa", legumbres: "despensa",
  grasas: "despensa", frutos_secos: "despensa", snacks_procesados: "despensa",
};

// Carpetas que se apuntan sin cantidad (solo "tengo / no tengo").
const CATEGORIAS_SIN_CANTIDAD = ["vegetales", "frutas"];

export function despensaVacia() {
  return { version: DESPENSA_VERSION, items: [], menuConfirmadoId: null, consumos: {}, compras: {} };
}

export function zonaPorDefecto(food) {
  return (food && ZONA_POR_CATEGORIA[food.categoria]) || "despensa";
}

// Un alimento que no está en el catálogo (o sin carpeta) se trata como "con cantidad": es lo
// habitual, y así nunca se pierde la información de cuánto hace falta.
export function usaCantidad(food) {
  return !(food && CATEGORIAS_SIN_CANTIDAD.includes(food.categoria));
}

const tieneGramos = (item) => typeof item.gramos === "number";
const redondear = (n) => Math.round(Number(n) || 0);

// Lo que hay de un alimento, sumando todas sus zonas (el mismo pollo puede estar a la vez en la
// nevera y en el congelador). `tengo` es cierto si hay algo: una entrada marcada como "tengo" o una
// con gramos por encima de cero — así, si un alimento cambia de carpeta después de apuntarlo (de
// verdura a otra cosa o al revés), lo ya apuntado se sigue entendiendo.
export function stockAlimento(despensa, foodId) {
  const items = ((despensa && despensa.items) || []).filter((i) => i.foodId === foodId);
  const gramos = items.reduce((s, i) => s + (tieneGramos(i) ? i.gramos : 0), 0);
  const tengo = items.some((i) => (tieneGramos(i) ? i.gramos > 0 : !!i.tengo));
  return { gramos, tengo, items };
}

// ---------- Migración de lo guardado ----------
// Igual que migrateData con los datos principales: completa lo que falte sin pisar nada de lo que
// el usuario ya tenía. Con `version: 1` desde el principio, el día que la forma cambie se añade aquí
// el parche (y su caso en validacion/tests.js) en función de la versión guardada.
export function migrarDespensa(guardado) {
  if (!guardado || typeof guardado !== "object" || Array.isArray(guardado)) {
    return { despensa: despensaVacia(), changed: true };
  }
  const items = (Array.isArray(guardado.items) ? guardado.items : [])
    .filter((i) => i && i.foodId)
    .map((i) => {
      const item = { ...i };
      if (!item.id) item.id = uid();
      if (!ZONAS.includes(item.zona)) item.zona = "despensa";
      if (!tieneGramos(item) && typeof item.tengo !== "boolean") item.gramos = redondear(item.gramos);
      return item;
    });
  const despensa = {
    ...guardado,
    version: DESPENSA_VERSION,
    items,
    menuConfirmadoId: guardado.menuConfirmadoId || null,
    consumos: guardado.consumos && typeof guardado.consumos === "object" ? guardado.consumos : {},
    compras: guardado.compras && typeof guardado.compras === "object" ? guardado.compras : {},
  };
  return { despensa, changed: JSON.stringify(despensa) !== JSON.stringify(guardado) };
}

// ---------- Operaciones sobre el stock (las usa la pantalla «¿Qué tengo?») ----------
// Todas devuelven una despensa nueva, sin tocar la que reciben (mismo patrón que setData).

// Añade un alimento. Si ya hay una entrada suya en esa misma zona, se suma a ella en vez de crear
// otra: dos filas de "Arroz" en la despensa no aportan nada y complican descontar.
export function anadirItem(despensa, food, { zona, gramos, tengo } = {}) {
  if (!food || !food.id) return despensa;
  const destino = ZONAS.includes(zona) ? zona : zonaPorDefecto(food);
  const conCantidad = usaCantidad(food);
  const existente = despensa.items.find((i) => i.foodId === food.id && i.zona === destino && tieneGramos(i) === conCantidad);
  if (existente) {
    return editarItem(despensa, existente.id, conCantidad ? { gramos: existente.gramos + redondear(gramos) } : { tengo: tengo !== false });
  }
  const item = conCantidad
    ? { id: uid(), foodId: food.id, zona: destino, gramos: Math.max(0, redondear(gramos)) }
    : { id: uid(), foodId: food.id, zona: destino, tengo: tengo !== false };
  return { ...despensa, items: [...despensa.items, item] };
}

// Cambia gramos, "tengo" o zona de una entrada. Al moverla a una zona donde ya está ese mismo
// alimento, las dos se juntan en una (mismo motivo que en anadirItem).
export function editarItem(despensa, itemId, cambios) {
  const item = despensa.items.find((i) => i.id === itemId);
  if (!item) return despensa;
  const nuevo = { ...item };
  if (cambios.gramos !== undefined && tieneGramos(item)) nuevo.gramos = Math.max(0, redondear(cambios.gramos));
  if (cambios.tengo !== undefined && !tieneGramos(item)) nuevo.tengo = !!cambios.tengo;
  if (cambios.zona !== undefined && ZONAS.includes(cambios.zona)) nuevo.zona = cambios.zona;

  const companero = nuevo.zona !== item.zona
    ? despensa.items.find((i) => i.id !== item.id && i.foodId === item.foodId && i.zona === nuevo.zona && tieneGramos(i) === tieneGramos(item))
    : null;
  if (companero) {
    const unido = tieneGramos(item)
      ? { ...companero, gramos: companero.gramos + nuevo.gramos }
      : { ...companero, tengo: companero.tengo || nuevo.tengo };
    return { ...despensa, items: despensa.items.filter((i) => i.id !== item.id).map((i) => (i.id === companero.id ? unido : i)) };
  }
  return { ...despensa, items: despensa.items.map((i) => (i.id === itemId ? nuevo : i)) };
}

export function quitarItem(despensa, itemId) {
  return { ...despensa, items: despensa.items.filter((i) => i.id !== itemId) };
}

// Un alimento borrado del catálogo desaparece también de la despensa (decisión del usuario: sin él
// en el catálogo el menú no puede usarlo, y una fila con un nombre que ya no existe solo confunde).
// Se limpia de las compras y de los consumos guardados, para que desmarcar una comida o una compra
// no lo vuelva a crear.
export function quitarAlimento(despensa, foodId) {
  const compras = { ...despensa.compras };
  delete compras[foodId];
  const consumos = {};
  Object.entries(despensa.consumos).forEach(([fecha, delDia]) => {
    consumos[fecha] = {};
    Object.entries(delDia).forEach(([mealType, c]) => {
      consumos[fecha][mealType] = { ...c, items: (c.items || []).filter((x) => x.foodId !== foodId) };
    });
  });
  return { ...despensa, items: despensa.items.filter((i) => i.foodId !== foodId), compras, consumos };
}

// ---------- Menú confirmado ----------
// Un menú recién generado es un borrador: no tiene lista de la compra "de verdad" ni descuenta nada
// de la despensa hasta que se confirma (decisión del usuario). Se guarda el id de su primera
// comida, que es único por cada generación, no cambia al ajustar raciones (updateMeal conserva los
// ids) y vuelve a coincidir si se genera otro y luego se pulsa "Deshacer" — así el menú confirmado
// sobrevive a esa vuelta atrás sin tener que guardar una copia del menú entero.
export function menuEstaConfirmado(despensa, menu) {
  return !!(despensa && despensa.menuConfirmadoId && menu && menu.length && menu[0].id === despensa.menuConfirmadoId);
}

// Al confirmar empieza una lista de la compra nueva: se olvidan las filas tachadas de la anterior
// (lo que se compró ya está en el stock, no se quita). Los consumos se recortan a los que todavía
// pueden servir: los de hoy (se pueden desmarcar y hay que poder devolverlos) y los de comidas de
// este mismo menú (dicen qué comidas ya no están pendientes). El resto ya no puede desmarcarse —
// "completada" solo se marca para hoy — y se borra, para que no crezca sin límite.
export function confirmarMenu(despensa, menu, hoy) {
  if (!menu || !menu.length || menuEstaConfirmado(despensa, menu)) return despensa;
  const slotIds = new Set(menu.map((s) => s.id));
  const consumos = {};
  Object.entries(despensa.consumos).forEach(([fecha, delDia]) => {
    const conservados = Object.entries(delDia).filter(([, c]) => fecha === hoy || slotIds.has(c.slotId));
    if (conservados.length) consumos[fecha] = Object.fromEntries(conservados);
  });
  return { ...despensa, menuConfirmadoId: menu[0].id, consumos, compras: {} };
}

// Vuelve a dejar el menú como borrador. No devuelve nada de lo ya descontado ni quita lo ya
// comprado (eso pasó de verdad); solo olvida qué filas estaban tachadas.
export function quitarConfirmacion(despensa) {
  return { ...despensa, menuConfirmadoId: null, compras: {} };
}

// ---------- Comidas hechas: descontar y devolver ----------

// Ids de las comidas del menú que ya se han cocinado (y descontado). La lista de la compra neta
// solo cuenta las que faltan: lo que ya se cocinó salió de la despensa y, a la vez, deja de hacer
// falta, así que nunca se cuenta dos veces.
export function slotsConsumidos(despensa) {
  const ids = new Set();
  Object.values((despensa && despensa.consumos) || {}).forEach((delDia) => {
    Object.values(delDia).forEach((c) => { if (c && c.slotId) ids.add(c.slotId); });
  });
  return ids;
}

export function consumoDe(despensa, fecha, mealType) {
  return ((despensa && despensa.consumos && despensa.consumos[fecha]) || {})[mealType] || null;
}

// Descuenta lo que lleva una comida al marcarla como hecha. `necesidades` es la lista de
// necesidadesComida (logica/lista-compra-neta.js): solo cuenta lo que tiene gramos — la verdura y
// la fruta no se descuentan, porque no se sabe si se acabaron. Nunca baja de cero (si apuntaste
// menos de lo que había, simplemente se queda a cero) y se guarda lo que se descontó DE VERDAD, no
// lo que pedía la comida: al desmarcarla se devuelve exactamente eso, ni un gramo más.
// Va ligado a fecha + tipo de comida, igual que comidasCompletadas (que solo se marca para hoy).
// La comida queda registrada aunque no se haya podido descontar nada: ya está hecha, no pendiente.
export function descontarComida(despensa, { fecha, mealType, slotId, necesidades }) {
  // Si ya había un consumo para esa comida de hoy (marcada desde otro dispositivo, por ejemplo), se
  // devuelve antes: nunca se descuenta dos veces la misma comida.
  const d = consumoDe(despensa, fecha, mealType) ? devolverComida(despensa, { fecha, mealType }) : despensa;

  const porAlimento = {};
  (necesidades || []).forEach((n) => {
    if (n.foodId && typeof n.gramos === "number" && n.gramos > 0) porAlimento[n.foodId] = (porAlimento[n.foodId] || 0) + n.gramos;
  });

  const items = d.items.map((i) => ({ ...i }));
  const descontado = [];
  Object.entries(porAlimento).forEach(([foodId, gramos]) => {
    let resta = redondear(gramos);
    ORDEN_CONSUMO.forEach((zona) => {
      items
        .filter((i) => i.foodId === foodId && i.zona === zona && tieneGramos(i) && i.gramos > 0)
        .forEach((i) => {
          if (resta <= 0) return;
          const quito = Math.min(i.gramos, resta);
          i.gramos -= quito;
          resta -= quito;
          descontado.push({ itemId: i.id, foodId, zona: i.zona, gramos: quito });
        });
    });
  });

  const delDia = { ...(d.consumos[fecha] || {}), [mealType]: { slotId, items: descontado } };
  return { ...d, items, consumos: { ...d.consumos, [fecha]: delDia } };
}

// Devuelve lo descontado al desmarcar la comida. Si la entrada de donde salió ya no existe (la
// quitaste a mano entretanto), se suma a otra del mismo alimento o se vuelve a crear en su zona.
export function devolverComida(despensa, { fecha, mealType }) {
  const consumo = consumoDe(despensa, fecha, mealType);
  if (!consumo) return despensa;
  let items = despensa.items.map((i) => ({ ...i }));
  (consumo.items || []).forEach((x) => {
    const destino = items.find((i) => i.id === x.itemId && tieneGramos(i)) || items.find((i) => i.foodId === x.foodId && tieneGramos(i));
    if (destino) destino.gramos += x.gramos;
    else items = [...items, { id: x.itemId || uid(), foodId: x.foodId, zona: x.zona || "despensa", gramos: x.gramos }];
  });
  const delDia = { ...despensa.consumos[fecha] };
  delete delDia[mealType];
  const consumos = { ...despensa.consumos };
  if (Object.keys(delDia).length) consumos[fecha] = delDia;
  else delete consumos[fecha];
  return { ...despensa, items, consumos };
}

// ---------- Lista de la compra: tachar y destachar ----------
// Tachar una fila de la lista neta (calcularListaNeta) mete en el stock lo que decía "comprar"; la
// verdura y la fruta pasan a "tengo". Se apunta qué se hizo en `compras`, por la clave de la fila,
// para dos cosas: destachar deshace exactamente eso, y la lista sigue enseñando la fila tachada (la
// calcula sin contar lo que entró por aquí). La fila de una verdura sin alimento vinculado no tiene
// nada que meter en la despensa: solo se apunta como tachada.
export function marcarComprado(despensa, fila, food) {
  if (!fila || despensa.compras[fila.key]) return despensa;
  if (!fila.foodId) return { ...despensa, compras: { ...despensa.compras, [fila.key]: { sinStock: true } } };

  const zona = zonaPorDefecto(food);
  const propios = despensa.items.filter((i) => i.foodId === fila.foodId);
  if (fila.sinCantidad) {
    const apagado = propios.find((i) => !tieneGramos(i) && !i.tengo);
    if (apagado) {
      return { ...editarItem(despensa, apagado.id, { tengo: true }), compras: { ...despensa.compras, [fila.key]: { itemId: apagado.id, creado: false } } };
    }
    const item = { id: uid(), foodId: fila.foodId, zona, tengo: true };
    return { ...despensa, items: [...despensa.items, item], compras: { ...despensa.compras, [fila.key]: { itemId: item.id, creado: true } } };
  }

  const delta = Math.max(0, redondear(fila.comprar));
  const destino = propios.find((i) => tieneGramos(i) && i.zona === zona) || propios.find((i) => tieneGramos(i));
  if (destino) {
    return {
      ...despensa,
      items: despensa.items.map((i) => (i.id === destino.id ? { ...i, gramos: i.gramos + delta } : i)),
      compras: { ...despensa.compras, [fila.key]: { itemId: destino.id, delta, creado: false } },
    };
  }
  const item = { id: uid(), foodId: fila.foodId, zona, gramos: delta };
  return { ...despensa, items: [...despensa.items, item], compras: { ...despensa.compras, [fila.key]: { itemId: item.id, delta, creado: true } } };
}

// Deshace un tachado: quita lo que entró (sin bajar de cero) y, si la entrada la había creado el
// propio tachado y se queda vacía, la borra — así tachar y destachar deja la despensa como estaba.
export function desmarcarComprado(despensa, fila) {
  const compra = fila && despensa.compras[fila.key];
  if (!compra) return despensa;
  const compras = { ...despensa.compras };
  delete compras[fila.key];
  const item = despensa.items.find((i) => i.id === compra.itemId);
  if (compra.sinStock || !item) return { ...despensa, compras };

  if (!tieneGramos(item)) {
    const items = compra.creado
      ? despensa.items.filter((i) => i.id !== item.id)
      : despensa.items.map((i) => (i.id === item.id ? { ...i, tengo: false } : i));
    return { ...despensa, items, compras };
  }
  const gramos = Math.max(0, item.gramos - (compra.delta || 0));
  const items = compra.creado && gramos === 0
    ? despensa.items.filter((i) => i.id !== item.id)
    : despensa.items.map((i) => (i.id === item.id ? { ...i, gramos } : i));
  return { ...despensa, items, compras };
}
