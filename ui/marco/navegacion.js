// ---------- ui/marco/navegacion.js ----------
// Descripción de la navegación por áreas («muchas aplicaciones en una», octubre de 2026). La app se
// reparte en tres áreas — FoodDraft (nutrición), Entrenamiento y Cuerpo — más una zona común sin área
// (Compartir, Ayuda, Documentos, Premium, Ajustes, Perfil). Cada área tiene:
// - `pestanas`: lo principal, a una mano, en su barra inferior flotante (ui/marco/barra-inferior.jsx).
//   Cada pestaña tiene un destino raíz y la lista de destinos que «cuelgan» de ella (`incluye`), que
//   sirve para resaltarla y para saber en qué área está una pantalla cualquiera.
// - `menu`: todas sus funciones, en el orden en que salen bajo su nombre en el menú lateral
//   (ui/marco/menu-lateral.jsx).
// Los destinos son los mismos `tab` de siempre (las claves de PANTALLAS en ui/pantallas.jsx): esta
// descripción no cambia ninguna pantalla por dentro, solo dice dónde cae cada una.
//
// Las listas `incluye` se escriben a mano, sin importar PANTALLAS_CATEGORIA ni nada de otro archivo de
// ui/: este módulo se lee al cargarse (AREAS es una constante), y la regla del cargador es no usar al
// cargar un módulo nada importado de otro archivo de ui/ (ver CLAUDE.md, "Cómo se carga la interfaz").
// Para que no se quede atrás ninguna pantalla, validacion/ (grupo «Navegación por áreas») comprueba
// que todo destino de PANTALLAS está en una pestaña, en el menú de un área o en COMUNES.
//
// Sin JSX: solo datos y dos funciones de consulta. Las etiquetas son claves de logica/i18n.js.
import {
  Utensils, Dumbbell, PersonStanding, CalendarDays, ListChecks, Refrigerator, ChefHat, Apple, Package,
  Shuffle, Camera, PieChart, Scale, Activity, Ruler, Share2, Mail, FileText, Sparkles, Settings, User,
  ClipboardList, BookOpen, History,
} from "lucide-react";

export const AREAS = [
  {
    clave: "fooddraft", etiqueta: "area.fooddraft", titulo: "header.tuRecetario", icono: Utensils,
    pestanas: [
      { clave: "menus", destino: "menus-root", etiqueta: "barra.menus", icono: CalendarDays,
        incluye: ["menus-root", "menu", "menu-simple"] },
      // «¿Qué cocino?» desde la vitrocerámica de la cocina dibujada vuelve a «¿Qué tengo?», así que
      // cuelga de esta pestaña (el otro «¿Qué cocino?», `cocinar`, cuelga de Mis comidas).
      { clave: "despensa", destino: "despensa", etiqueta: "barra.queTengo", icono: Refrigerator,
        incluye: ["despensa", "cocinar-desde-cocina"] },
      { clave: "comidas", destino: "config-root", etiqueta: "barra.misComidas", icono: ChefHat,
        incluye: ["config-root", "macros-root", "especiales-root", "combos", "cocinar", "reparto-comidas",
                  "proteina", "carbo", "verdura", "grasa", "desayuno", "media_manana", "merienda", "cerrado", "especial"] },
      { clave: "alimentos", destino: "alimentos", etiqueta: "barra.alimentos", icono: Apple, incluye: ["alimentos"] },
    ],
    menu: [
      { destino: "menu", etiqueta: "drawer.menuCompleto", icono: CalendarDays },
      { destino: "menu-simple", etiqueta: "drawer.menuSimple", icono: ListChecks },
      { destino: "despensa", etiqueta: "drawer.queTengo", icono: Refrigerator },
      { destino: "config-root", etiqueta: "drawer.configuracionComidas", icono: ChefHat },
      { destino: "macros-root", etiqueta: "nav.macros", icono: Utensils },
      { destino: "especiales-root", etiqueta: "nav.comidasEspeciales", icono: Package },
      { destino: "combos", etiqueta: "nav.combinaciones", icono: Shuffle },
      { destino: "alimentos", etiqueta: "nav.alimentos", icono: Apple },
      { destino: "cocinar", etiqueta: "nav.queCocino", icono: Camera },
      { destino: "reparto-comidas", etiqueta: "perfilView.repartoComidas.titulo", icono: PieChart },
    ],
  },
  {
    // El módulo de entreno (octubre de 2026). El entreno en curso no es ninguna pestaña: es una capa a
    // pantalla completa (ui/entreno/sesion.jsx) que se abre desde cualquier sitio con la pastilla.
    clave: "entreno", etiqueta: "area.entreno", titulo: "header.tuEntreno", icono: Dumbbell,
    pestanas: [
      { clave: "entrenar", destino: "entreno", etiqueta: "barra.entrenar", icono: Dumbbell, incluye: ["entreno"] },
      { clave: "rutinas", destino: "entreno-rutinas", etiqueta: "barra.rutinas", icono: ClipboardList, incluye: ["entreno-rutinas", "entreno-rutina"] },
      { clave: "ejercicios", destino: "entreno-ejercicios", etiqueta: "barra.ejercicios", icono: BookOpen, incluye: ["entreno-ejercicios"] },
      { clave: "historial", destino: "entreno-historial", etiqueta: "barra.historial", icono: History, incluye: ["entreno-historial", "entreno-sesion"] },
    ],
    menu: [
      { destino: "entreno", etiqueta: "barra.entrenar", icono: Dumbbell },
      { destino: "entreno-rutinas", etiqueta: "barra.rutinas", icono: ClipboardList },
      { destino: "entreno-ejercicios", etiqueta: "barra.ejercicios", icono: BookOpen },
      { destino: "entreno-historial", etiqueta: "barra.historial", icono: History },
      { destino: "entreno-ajustes", etiqueta: "entreno.ajustes.titulo", icono: Settings },
    ],
  },
  {
    // El peso, las medidas y la actividad diaria los usan por igual la nutrición (objetivos de
    // calorías) y el entreno, así que tienen área propia. Medidas no tiene pestaña (hoy es
    // «próximamente»), pero cuelga de Peso, que es donde estaba antes.
    clave: "cuerpo", etiqueta: "area.cuerpo", titulo: "header.tuCuerpo", icono: PersonStanding,
    pestanas: [
      { clave: "peso", destino: "perfil-peso", etiqueta: "barra.peso", icono: Scale,
        incluye: ["perfil-peso", "perfil-medidas"] },
      { clave: "actividad", destino: "actividad-diaria", etiqueta: "barra.actividad", icono: Activity, incluye: ["actividad-diaria"] },
      { clave: "resumen", destino: "perfil-resumen", etiqueta: "barra.resumen", icono: PieChart, incluye: ["perfil-resumen"] },
    ],
    menu: [
      { destino: "perfil-peso", etiqueta: "drawer.registroPeso", icono: Scale },
      { destino: "perfil-medidas", etiqueta: "perfilRoot.medidasCorporales", icono: Ruler },
      { destino: "actividad-diaria", etiqueta: "drawer.actividadDiaria", icono: Activity },
      { destino: "perfil-resumen", etiqueta: "perfilRoot.resumenMensual", icono: PieChart },
    ],
  },
];

// Zona común: abajo en el menú lateral, sin barra inferior. Premium cambia de etiqueta según si ya
// se tiene (`etiquetaPremium`) o no.
export const COMUNES = [
  { destino: "compartir", etiqueta: "drawer.compartir", icono: Share2 },
  { destino: "feedback", etiqueta: "drawer.feedback", icono: Mail },
  { destino: "perfil-documentos", etiqueta: "perfilRoot.documentos", icono: FileText },
  { destino: "perfil-premium", etiqueta: "perfilRoot.hazteremium", etiquetaPremium: "perfilRoot.premium", icono: Sparkles, color: "var(--mustard-dark)" },
  { destino: "ajustes", etiqueta: "drawer.ajustes", icono: Settings },
  { destino: "perfil-datos", etiqueta: "tab.perfil", icono: User },
];

// Título de la cabecera en la zona común (las áreas llevan el suyo en `titulo`).
export const TITULO_COMUN = "header.tuCuenta";

// Área de un destino: la de la pestaña que lo incluye o, si no lo incluye ninguna, la del menú que lo
// lista. null = zona común o destino desconocido (no se pinta barra).
export function areaDe(destino) {
  for (const area of AREAS) {
    if (area.pestanas.some((p) => p.incluye.includes(destino))) return area.clave;
  }
  for (const area of AREAS) {
    if (area.menu.some((m) => m.destino === destino)) return area.clave;
  }
  return null;
}

// Clave de la pestaña que incluye un destino (para resaltarla en la barra), o null.
export function pestanaDe(destino) {
  for (const area of AREAS) {
    const p = area.pestanas.find((p) => p.incluye.includes(destino));
    if (p) return p.clave;
  }
  return null;
}

// La descripción completa de un área por su clave (o undefined).
export function areaPorClave(clave) {
  return AREAS.find((a) => a.clave === clave);
}
