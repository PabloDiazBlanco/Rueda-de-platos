// ---------- ui/catalogo/categoria.jsx ----------
// Pantalla de una categoría de la configuración de comidas (proteína, carbohidrato, verdura...):
// sus tarjetas de ingredientes y bloques y el botón de añadir. Antes eran nueve bloques casi
// idénticos dentro del componente principal de app.jsx; ahora es una sola pantalla con la tabla de
// abajo, que recoge en qué se diferenciaba cada una.
import React from "react";
import { t } from "i18n";
import { SectionIntro, ProbabilitySumBadge, CardGrid, AddCard, BackLink } from "../comun/tarjetas.jsx";
import { IngredientCard, BlockCard } from "./platos.jsx";

// grupo: a qué pantalla vuelve el enlace de arriba (Macros o Comidas especiales).
// suma: muestra la suma de probabilidades (las categorías que se sortean por probabilidad).
// items / bloques: qué tarjetas enseña. anadir: texto del botón de añadir (sin él, no hay botón).
export const PANTALLAS_CATEGORIA = {
  proteina: { grupo: "macros", intro: "catalogo.proteina.intro", items: true, bloques: true, anadir: "catalogo.anadirProteina" },
  carbo: { grupo: "macros", intro: "catalogo.carbo.intro", suma: true, items: true, anadir: "catalogo.anadirCarbohidrato" },
  verdura: { grupo: "macros", intro: "catalogo.verdura.intro", suma: true, items: true, anadir: "catalogo.anadirVerdura" },
  grasa: { grupo: "macros", intro: "catalogo.grasa.intro", suma: true, items: true, anadir: "catalogo.anadirGrasa" },
  desayuno: { grupo: "especiales", intro: "catalogo.desayuno.intro", suma: true, items: true, anadir: "catalogo.anadirDesayuno" },
  media_manana: { grupo: "especiales", intro: "catalogo.mediaManana.intro", suma: true, items: true, anadir: "catalogo.anadirMediaManana" },
  merienda: { grupo: "especiales", intro: "catalogo.merienda.intro", suma: true, items: true, anadir: "catalogo.anadirMerienda" },
  // Platos cerrados: solo bloques (cada plato es miembro de un bloque), con sus probabilidades.
  cerrado: { grupo: "especiales", intro: "catalogo.cerrado.intro", bloques: true, mostrarProbabilidades: true },
  especial: { grupo: "especiales", intro: "catalogo.especial.intro", items: true, notaExtra: "catalogo.especial.extraNote", anadir: "catalogo.anadirEspecial" },
};

const VOLVER = {
  macros: { etiqueta: "nav.macros", destino: "macros-root" },
  especiales: { etiqueta: "nav.comidasEspeciales", destino: "especiales-root" },
};

export function PantallaCategoria({ categoria, data, catalogo, setTab, idioma }) {
  const cfg = PANTALLAS_CATEGORIA[categoria];
  const volver = VOLVER[cfg.grupo];
  const { setEditing, setConfirmDelete, setEditingFrequency, updateBlock } = catalogo;
  const items = data.ingredients.filter((i) => i.category === categoria && i.ruleType !== "bloque_miembro");
  const bloques = data.blocks.filter((b) => b.category === categoria);
  const membersOfBlock = (blockId) => data.ingredients.filter((i) => i.blockId === blockId);
  const total = items.reduce((s, i) => s + (i.probabilidad || 0), 0);

  return (
    <>
      <BackLink label={t(idioma, volver.etiqueta)} onClick={() => setTab(volver.destino)} />
      <SectionIntro text={t(idioma, cfg.intro)} />
      {cfg.suma && <ProbabilitySumBadge total={total} idioma={idioma} />}
      <CardGrid>
        {cfg.items && items.map((ing) => (
          <IngredientCard
            key={ing.id}
            ingredient={ing}
            data={data}
            onEdit={() => setEditing({ mode: "edit", category: categoria, ingredient: ing })}
            onDelete={() => setConfirmDelete(ing)}
            {...(cfg.notaExtra ? { extraNote: t(idioma, cfg.notaExtra) } : {})}
            idioma={idioma}
          />
        ))}
        {cfg.bloques && bloques.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            data={data}
            members={membersOfBlock(block.id)}
            onUpdateBlock={(patch) => updateBlock(block.id, patch)}
            onEditMember={(m) => setEditing({ mode: "edit", category: categoria, ingredient: m, blockId: block.id })}
            onDeleteMember={(m) => setConfirmDelete(m)}
            onAddMember={() => setEditing({ mode: "new", category: categoria, blockId: block.id })}
            onEditFrequency={(b) => setEditingFrequency(b)}
            {...(cfg.mostrarProbabilidades ? { showProbabilities: true } : {})}
            idioma={idioma}
          />
        ))}
        {cfg.anadir && <AddCard label={t(idioma, cfg.anadir)} onClick={() => setEditing({ mode: "new", category: categoria })} />}
      </CardGrid>
    </>
  );
}
