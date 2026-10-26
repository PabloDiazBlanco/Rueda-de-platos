// ---------- Colocación en la nevera, el congelador y la despensa (lógica) ----------
// Módulo de lógica pura (sin JSX, sin React) de la Fase B de la despensa (la nevera dibujada): decide en
// qué hueco va cada alimento (qué balda, la puerta, el cajón...) y con qué dibujo se pinta. La pantalla
// (ui/despensa/) solo pinta lo que esto decide, así que la colocación se puede probar sin dibujar nada
// (ver el grupo «Colocación en la nevera» de validacion/tests.js).
//
// Criterio (petición del usuario, 2026-10-17): que la nevera se entienda de un vistazo, como una de
// verdad — bebidas en las baldas de la puerta, lo parecido junto en las baldas de dentro, y la fruta y
// la verdura abajo, en el cajón de la humedad.
//
// El catálogo no tiene una carpeta «bebidas» (CATEGORIAS_ALIMENTOS), así que si algo es una bebida se
// deduce del nombre (esBebida). Es una decisión provisional: si se queda corta, la alternativa
// pendiente es marcarlo en el propio alimento. Los nombres son datos del usuario, en el idioma que él
// los escribiera, por eso las listas de palabras incluyen las más comunes de los cinco idiomas.

// Huecos de cada zona, en el orden en que se pintan (de arriba abajo). `siempre` = se pinta aunque esté
// vacío (una balda vacía también es parte del dibujo); los que no lo llevan solo aparecen si tienen algo.
export const HUECOS = {
  nevera: [
    { clave: "puerta", siempre: true },
    { clave: "lacteos", siempre: true },
    { clave: "carne", siempre: true },
    { clave: "embutido", siempre: true },
    { clave: "otros" },
    { clave: "frutaVerdura", siempre: true },
  ],
  congelador: [
    { clave: "carne", siempre: true },
    { clave: "frutaVerdura", siempre: true },
    { clave: "otros", siempre: true },
  ],
  despensa: [
    { clave: "cereales", siempre: true },
    { clave: "conservas", siempre: true },
    { clave: "aceites", siempre: true },
    { clave: "pan", siempre: true },
  ],
};

// Minúsculas y sin tildes, para comparar nombres sin depender de cómo se escribieran («Plátano» y
// «platano» son lo mismo).
export function normalizar(texto) {
  return String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Palabras completas (o con plural), nunca trozos: «pan» no debe coincidir con «panceta» ni «pasta»
// con «pastel». Cada patrón es una palabra o un grupo de alternativas; se busca como palabra entera
// con una «s» o «es» opcional al final.
function tiene(nombre, palabras) {
  const n = normalizar(nombre);
  return palabras.some((p) => new RegExp(`(^|[^a-z])(${p})(e?s)?([^a-z]|$)`).test(n));
}

const PALABRAS_BEBIDA = [
  "leche", "bebida", "zumo", "jugo", "gazpacho", "salmorejo", "agua", "refresco", "cola", "cerveza", "vino",
  "batido", "kefir", "horchata", "cafe", "infusion", "caldo", "smoothie",
  "milk", "juice", "water", "drink", "soda", "beer", "wine",
  "llet", "suc", "aigua", "beguda", "cervesa", "leite", "zume", "auga", "esne", "zuku", "garagardo", "ardo",
];
// Lo que lleva «leche» en el nombre pero no se bebe: un queso de leche cruda no va en la puerta.
const PALABRAS_LACTEO_SOLIDO = ["yogur", "yogurt", "iogurt", "queso", "formatge", "queixo", "gazta", "cheese", "requeson", "cuajada", "natillas", "flan", "nata", "cream"];
const PALABRAS_HUEVO = ["huevo", "egg", "ou", "ovo", "arrautza"];
// Lo que en casa va en una cesta, fuera de la nevera: patatas, cebollas, ajos... La patata está en la
// carpeta «carbohidratos» del catálogo, pero nadie la guarda junto al arroz.
const PALABRAS_CESTA = ["patata", "potato", "pataca", "cebolla", "onion", "ceba", "cebola", "tipula", "boniato", "ajo"];
const PALABRAS_PUERTA = ["mantequilla", "margarina", "butter", "mantega", "manteiga", "gurin", "ketchup", "mayonesa", "mahonesa", "mostaza", "salsa", "tomate frito", "alioli", "pesto"];

export function esBebida(nombre) {
  return tiene(nombre, PALABRAS_BEBIDA) && !tiene(nombre, PALABRAS_LACTEO_SOLIDO);
}

// En qué hueco de la zona va un alimento. `food` puede faltar (un alimento que ya no está en el
// catálogo): entonces va a «otros», o al hueco más neutro de la zona.
export function huecoDe(food, zona) {
  const categoria = food ? food.categoria : null;
  const nombre = food ? food.name : "";
  if (zona === "nevera") {
    if (esBebida(nombre) || tiene(nombre, PALABRAS_HUEVO) || tiene(nombre, PALABRAS_PUERTA)) return "puerta";
    if (categoria === "lacteos") return "lacteos";
    if (categoria === "proteinas") return "carne";
    if (categoria === "embutido_fiambre") return "embutido";
    if (categoria === "vegetales" || categoria === "frutas") return "frutaVerdura";
    return "otros";
  }
  if (zona === "congelador") {
    if (categoria === "proteinas" || categoria === "embutido_fiambre") return "carne";
    if (categoria === "vegetales" || categoria === "frutas") return "frutaVerdura";
    return "otros";
  }
  // despensa: arriba lo de cocer (arroz, pasta, cereales), luego legumbres y latas (incluido el atún o
  // el embutido curado), luego aceites, bebidas (leche de brik, agua...) y picoteo, y abajo el pan y la
  // fruta y verdura que no van a la nevera (patatas, cebollas, plátanos...), como una cesta.
  if (tiene(nombre, PALABRAS_CESTA)) return "pan";
  if (categoria === "carbohidratos" || categoria === "cereales") return "cereales";
  if (categoria === "legumbres" || categoria === "proteinas" || categoria === "embutido_fiambre") return "conservas";
  if (categoria === "panes" || categoria === "vegetales" || categoria === "frutas") return "pan";
  return "aceites";
}

// Con qué dibujo se pinta un alimento. Primero por el nombre (para que la leche parezca un brik y no un
// yogur), y si el nombre no dice nada, uno genérico de su carpeta. El orden importa: lo más concreto
// va antes: «tomate frito» es una salsa y no un tomate, «queso de leche» es queso, las «sardinas en
// aceite» son una lata, el «pan de hamburguesa» es pan y la «ensalada con tomate» es una lechuga.
const FORMAS_POR_NOMBRE = [
  ["salsa", ["tomate frito", "ketchup", "mayonesa", "mahonesa", "mostaza", "salsa", "alioli", "pesto"]],
  ["queso", PALABRAS_LACTEO_SOLIDO.filter((p) => !["yogur", "yogurt", "iogurt", "natillas", "flan"].includes(p))],
  ["yogur", ["yogur", "yogurt", "iogurt", "natillas", "flan", "kefir"]],
  ["mantequilla", ["mantequilla", "margarina", "butter", "mantega", "manteiga", "gurin"]],
  ["huevos", PALABRAS_HUEVO],
  ["gazpacho", ["gazpacho", "salmorejo"]],
  ["zumo", ["zumo", "jugo", "juice", "suc", "zume", "zuku", "batido", "smoothie", "horchata"]],
  ["agua", ["agua", "water", "aigua", "auga", "refresco", "soda", "cola"]],
  ["leche", ["leche", "milk", "llet", "leite", "esne", "cafe", "bebida", "beguda", "caldo", "infusion"]],
  ["vino", ["vino", "wine", "cerveza", "beer", "cervesa", "garagardo", "ardo"]],
  ["helado", ["helado", "ice cream", "gelat", "xeado", "izozki"]],
  ["pescado", ["pescado", "salmon", "merluza", "pescada", "bacalao", "atun fresco", "dorada", "lubina", "trucha", "fish", "peix", "peixe", "arrain", "gambas", "langostinos"]],
  ["lata", ["atun", "sardina", "conserva", "lata", "bote", "garbanzo", "lenteja", "alubia", "judia", "frijol", "tomate triturado"]],
  ["aceite", ["aceite", "aceite de oliva", "oil", "oli", "olio", "vinagre"]],
  ["embutido", ["chorizo", "salchichon", "fuet", "longaniza", "sobrasada", "salami", "morcilla"]],
  ["fiambre", ["jamon", "lomo embuchado", "fiambre", "mortadela", "cecina", "bacon", "beicon", "pernil", "xamon"]],
  ["pan", ["pan", "baguette", "chapata", "tostada", "biscote", "bread", "pa", "ogi", "brioche"]],
  ["carne", ["pollo", "pavo", "pechuga", "ternera", "cerdo", "cordero", "conejo", "carne", "hamburguesa", "picada", "filete", "chicken", "beef", "pork", "pollastre", "polo", "oilasko"]],
  ["snack", ["nachos", "patatas fritas", "chips", "galleta", "chocolate", "guacamole", "hummus", "snack"]],
  ["platano", ["platano", "banana", "platan", "banano"]],
  ["manzana", ["manzana", "apple", "poma", "mazan", "sagar"]],
  ["naranja", ["naranja", "mandarina", "orange", "taronja", "laranxa", "laranja", "limon"]],
  ["fresa", ["fresa", "fresas", "maduixa", "morango", "marrubi", "strawberr"]],
  ["lechuga", ["lechuga", "ensalada", "espinaca", "canonigo", "rucula", "col", "lettuce", "salad", "enciam", "leituga", "letxuga"]],
  ["tomate", ["tomate", "tomato", "tomaquet"]],
  ["zanahoria", ["zanahoria", "carrot", "pastanaga", "cenoria", "azenario"]],
  ["patata", PALABRAS_CESTA],
  ["arroz", ["arroz", "rice", "arros", "arroza", "harina", "cuscus", "quinoa", "avena"]],
  ["pasta", ["pasta", "macarron", "espagueti", "fideo", "tallarin", "gnocchi", "noodle", "spaghetti", "makarroi"]],
  ["cereales", ["cereal", "muesli", "granola", "corn flakes"]],
  ["frutosSecos", ["anacardo", "pistacho", "almendra", "nuez", "nueces", "avellana", "cacahuete", "pipa", "fruto seco", "frutos secos"]],
];

const FORMA_POR_CATEGORIA = {
  proteinas: "carne", embutido_fiambre: "fiambre", carbohidratos: "arroz", panes: "pan", cereales: "cereales",
  legumbres: "lata", vegetales: "verdura", frutas: "fruta", lacteos: "yogur", grasas: "aceite",
  frutos_secos: "frutosSecos", snacks_procesados: "snack",
};

export function formaDe(food) {
  if (!food) return "generico";
  const porNombre = FORMAS_POR_NOMBRE.find(([, palabras]) => tiene(food.name, palabras));
  if (porNombre) return porNombre[0];
  return FORMA_POR_CATEGORIA[food.categoria] || "generico";
}

// Dibujo propio de un alimento del catálogo base (estética de la cocina, 26-oct-2026): cada uno de los
// 43 de FOODS_SEED tiene el suyo (ui/despensa/alimentos.jsx), que sustituye en la nevera, el estante y la
// lista al dibujo genérico de su forma y a la pegatina del emoji. Devuelve la clave del dibujo (el id del
// alimento, que es fijo) o null si no tiene: los alimentos que crea el usuario siguen con su emoji (y,
// sin emoji, el de su carpeta), como antes.
//
// Excepción: si el usuario le cambió el emoji a uno de la semilla (F3), ha elegido cómo quiere verlo, así
// que se respeta el suyo. Borrarlo (emoji "") no cuenta como elegir otro: entonces sale el dibujo.
//
// `semilla` es FOODS_SEED (o lo que haga sus veces en las pruebas). Llega como parámetro para que este
// módulo siga sin importar nada, como el resto de la colocación.
export function dibujoPropio(food, semilla) {
  if (!food) return null;
  const original = (semilla || []).find((f) => f.id === food.id);
  if (!original) return null;
  if (food.emoji && food.emoji !== original.emoji) return null;
  return food.id;
}

// Reparte las entradas de una zona en sus huecos, en el orden en que se pintan y con su dibujo ya
// decidido. Devuelve [{ clave, entradas: [{ item, food, forma, dibujo }] }] (`dibujo`: el propio del
// alimento, ver dibujoPropio, o null), con los huecos `siempre` aunque estén vacíos y el resto solo si
// tienen algo. Dentro de cada hueco, por nombre.
export function repartirEnHuecos(items, foods, zona, semilla) {
  const porId = new Map((foods || []).map((f) => [f.id, f]));
  const grupos = {};
  (items || []).filter((i) => i.zona === zona).forEach((item) => {
    const food = porId.get(item.foodId) || null;
    const clave = huecoDe(food, zona);
    (grupos[clave] = grupos[clave] || []).push({ item, food, forma: formaDe(food), dibujo: dibujoPropio(food, semilla) });
  });
  const nombre = (e) => (e.food ? e.food.name : e.item.foodId);
  return (HUECOS[zona] || [])
    .filter((h) => h.siempre || grupos[h.clave])
    .map((h) => ({ clave: h.clave, entradas: (grupos[h.clave] || []).sort((a, b) => nombre(a).localeCompare(nombre(b), "es")) }));
}

// La fruta del frutero que hay en la repisa de encima de la vitrocerámica (estética de la cocina,
// 26-oct-2026): solo decorado, enseña la fruta que hay en casa. Cuenta la de la nevera y la de la
// despensa, pero no la congelada (nadie pone fresas congeladas en un frutero) ni la que se ha acabado;
// cada fruta una vez aunque esté en dos sitios, por nombre y como mucho `max`, que es lo que cabe en
// el bol. Mismo formato que las entradas de repartirEnHuecos, para pintarlas igual.
export function frutasDelFrutero(items, foods, semilla, max = 5) {
  const porId = new Map((foods || []).map((f) => [f.id, f]));
  const vistas = new Set();
  const frutas = [];
  (items || []).forEach((item) => {
    const food = porId.get(item.foodId);
    if (!food || food.categoria !== "frutas" || item.zona === "congelador" || vistas.has(food.id)) return;
    const queda = typeof item.gramos === "number" ? item.gramos > 0 : !!item.tengo;
    if (!queda) return;
    vistas.add(food.id);
    frutas.push({ item, food, forma: formaDe(food), dibujo: dibujoPropio(food, semilla) });
  });
  return frutas.sort((a, b) => a.food.name.localeCompare(b.food.name, "es")).slice(0, max);
}
