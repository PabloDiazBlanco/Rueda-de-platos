// ---------- ui/menu/exportar.js ----------
// El menú de una semana como «documento» para compartirlo como texto o como imagen (BotonCompartir,
// ui/comun/compartir.jsx). Lo usan el Menú completo y el Menú simple; sustituye a la antigua versión
// imprimible (exportar a PDF con window.print), que se quitó en octubre de 2026 porque en el móvil iba mal.
// - En texto, cada comida con sus ingredientes (y sus gramos en el Menú completo), como venía el PDF:
//   es lo que hace falta para cocinar con el móvil al lado.
// - En imagen, los platos tal como se ven en pantalla (y, en el Menú completo, las kcal de cada comida):
//   con los gramos de cada ingrediente la imagen sería demasiado larga para leerla en un móvil.
import { DAYS } from "comun";
import { mealExportParts, mealTotals } from "comida-calculo";
import { t } from "i18n";

// El nombre del plato como sale en la pantalla del menú.
function nombrePlato(m, idioma) {
  if (m.closedDish) return m.closedDish;
  if (m.item) return m.item;
  const partes = [m.protein, m.carbo, m.verdura].filter(Boolean).join(" + ");
  return m.garbanzos ? `${partes} ${t(idioma, "menu.garbanzos5050")}` : partes || "—";
}

export function documentoMenu(data, menu, semana, idioma, { conCantidades = true, formato = "texto" } = {}) {
  const secciones = DAYS.map((day) => {
    const comidas = (menu || []).filter((s) => s.week === semana && s.day === day);
    return {
      titulo: t(idioma, "dia." + day),
      lineas: comidas.map((m) => {
        const etiqueta = t(idioma, "mealType." + m.mealType);
        if (formato === "texto") return { etiqueta, texto: mealExportParts(data, m, { conCantidades }).join(", ") || "—" };
        const kcal = conCantidades ? Math.round(mealTotals(data, m).kcal) : 0;
        return { etiqueta, texto: nombrePlato(m, idioma), detalle: kcal > 0 ? t(idioma, "menu.kcal", { n: kcal }) : null };
      }),
    };
  });
  return {
    titulo: t(idioma, "print.tuMenu"),
    subtitulo: t(idioma, "menu.semana", { n: semana }),
    secciones,
    vacio: t(idioma, "menu.sinMenuTodavia"),
  };
}
