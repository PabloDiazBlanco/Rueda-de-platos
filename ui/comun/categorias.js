// ---------- ui/comun/categorias.js ----------
// Metadatos visuales de cada categoría de ingrediente (icono, color, etiqueta) y los grupos en que se
// enseñan (Macros / Comidas especiales). Sin JSX, pero en ui/ porque depende de los iconos de lucide.
import { Utensils, Wheat, Salad, Package, Sparkles, Coffee, Cookie, Apple, Droplet } from "lucide-react";

export const CATEGORY_META = {
  proteina: { labelKey: "categoria.proteina", icon: Utensils, color: "var(--green)", bg: "var(--green-soft)" },
  carbo: { labelKey: "categoria.carbo", icon: Wheat, color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
  verdura: { labelKey: "categoria.verdura", icon: Salad, color: "var(--green)", bg: "var(--green-soft)" },
  grasa: { labelKey: "categoria.grasa", icon: Droplet, color: "var(--olive)", bg: "var(--olive-soft)" },
  desayuno: { labelKey: "mealType.Desayuno", icon: Coffee, color: "var(--coffee)", bg: "var(--coffee-soft)" },
  media_manana: { labelKey: "mealType.Media mañana", icon: Apple, color: "var(--citrus)", bg: "var(--citrus-soft)" },
  merienda: { labelKey: "mealType.Merienda", icon: Cookie, color: "var(--berry)", bg: "var(--berry-soft)" },
  cerrado: { labelKey: "categoria.cerrado", icon: Package, color: "var(--rust)", bg: "var(--rust-soft)" },
  especial: { labelKey: "categoria.especial", icon: Sparkles, color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
};

// Qué categorías "hoja" pertenecen a cada grupo de la pantalla de Configuración.
// Un único origen de datos: sirve tanto para saber a qué grupo pertenece una categoría
// (para el botón "volver") como para pintar las tarjetas de cada grupo.
export const MACRO_CATS = ["proteina", "carbo", "verdura", "grasa"];

export const ESPECIALES_CATS = ["desayuno", "media_manana", "merienda", "cerrado", "especial"];

function groupOfCat(cat) {
  if (MACRO_CATS.includes(cat)) return "macros-root";
  if (ESPECIALES_CATS.includes(cat)) return "especiales-root";
  return "config-root";
}
