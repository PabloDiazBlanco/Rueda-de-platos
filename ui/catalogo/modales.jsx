// ---------- ui/catalogo/modales.jsx ----------
// Los modales de la configuración de comidas que se abren desde varias pantallas (editar o borrar
// un ingrediente, cambiar la frecuencia de un bloque, editar o borrar un alimento o una regla). Su
// estado (qué se está editando) vive en el hook useCatalogo (ui/estado/catalogo.js).
import React from "react";
import { FoodEditModal, ConfirmFoodDeleteModal } from "./alimentos.jsx";
import { RuleEditModal, ConfirmRuleDeleteModal } from "./reglas.jsx";
import { EditModal, ConfirmModal, FrequencyModal } from "./platos.jsx";

export function ModalesCatalogo({ catalogo, data, idioma }) {
  const {
    editing, setEditing, confirmDelete, setConfirmDelete, editingFrequency, setEditingFrequency,
    editingFood, setEditingFood, confirmDeleteFood, setConfirmDeleteFood, editingRule, setEditingRule,
    confirmDeleteRule, setConfirmDeleteRule,
    upsertIngredient, deleteIngredient, upsertFood, deleteFood, upsertRule, deleteRule, updateBlock,
  } = catalogo;

  return (
    <>
      {editing && (
        <EditModal
          state={editing}
          foods={data.foods || []}
          onClose={() => setEditing(null)}
          onSave={(ing) => {
            upsertIngredient(ing);
            setEditing(null);
          }}
          idioma={idioma}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          ingredient={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteIngredient(confirmDelete.id)}
          idioma={idioma}
        />
      )}

      {editingFrequency && (
        <FrequencyModal
          block={editingFrequency}
          onClose={() => setEditingFrequency(null)}
          idioma={idioma}
          onSave={(n) => {
            updateBlock(editingFrequency.id, { cicloFrecuencia: n });
            setEditingFrequency(null);
          }}
        />
      )}

      {editingFood && (
        <FoodEditModal
          state={editingFood}
          onClose={() => setEditingFood(null)}
          onSave={(food) => {
            upsertFood(food);
            setEditingFood(null);
          }}
          idioma={idioma}
        />
      )}

      {confirmDeleteFood && (
        <ConfirmFoodDeleteModal
          food={confirmDeleteFood}
          usedBy={data.ingredients.filter((i) => i.foodId === confirmDeleteFood.id)}
          onCancel={() => setConfirmDeleteFood(null)}
          onConfirm={() => deleteFood(confirmDeleteFood.id)}
          idioma={idioma}
        />
      )}

      {editingRule && (
        <RuleEditModal
          state={editingRule}
          ingredients={data.ingredients}
          onClose={() => setEditingRule(null)}
          onSave={(rule) => {
            upsertRule(rule);
            setEditingRule(null);
          }}
          idioma={idioma}
        />
      )}

      {confirmDeleteRule && (
        <ConfirmRuleDeleteModal
          rule={confirmDeleteRule}
          ingredients={data.ingredients}
          onCancel={() => setConfirmDeleteRule(null)}
          onConfirm={() => deleteRule(confirmDeleteRule.id)}
          idioma={idioma}
        />
      )}
    </>
  );
}
