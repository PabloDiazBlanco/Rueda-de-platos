// ---------- ui/estado/catalogo.js ----------
// Hook de la configuración de comidas: crear, editar y borrar ingredientes, alimentos, reglas de
// combinación y bloques, más el estado de los modales que lo hacen (qué se está editando o a punto
// de borrarse). Los modales en sí están en ui/catalogo/modales.jsx.
import { useState } from "react";

export function useCatalogo(setData) {
  const [editing, setEditing] = useState(null); // { mode: 'new'|'edit', category, ingredient }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingFrequency, setEditingFrequency] = useState(null);
  const [editingFood, setEditingFood] = useState(null);
  const [confirmDeleteFood, setConfirmDeleteFood] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [confirmDeleteRule, setConfirmDeleteRule] = useState(null);

  function upsertIngredient(ingredient) {
    setData((prev) => {
      const exists = prev.ingredients.some((i) => i.id === ingredient.id);
      return {
        ...prev,
        ingredients: exists
          ? prev.ingredients.map((i) => (i.id === ingredient.id ? ingredient : i))
          : [...prev.ingredients, ingredient],
      };
    });
  }

  function deleteIngredient(id) {
    setData((prev) => ({ ...prev, ingredients: prev.ingredients.filter((i) => i.id !== id) }));
    setConfirmDelete(null);
  }

  function upsertFood(food) {
    setData((prev) => {
      const foods = prev.foods || [];
      const exists = foods.some((f) => f.id === food.id);
      return { ...prev, foods: exists ? foods.map((f) => (f.id === food.id ? food : f)) : [...foods, food] };
    });
  }

  // Al borrar un alimento, se desvincula de cualquier ingrediente que lo usara,
  // para no dejar referencias rotas que darían macros incorrectos silenciosamente.
  function deleteFood(id) {
    setData((prev) => ({
      ...prev,
      foods: (prev.foods || []).filter((f) => f.id !== id),
      ingredients: prev.ingredients.map((i) => (i.foodId === id ? { ...i, foodId: undefined } : i)),
    }));
    setConfirmDeleteFood(null);
  }

  function upsertRule(rule) {
    setData((prev) => {
      const rules = prev.rules || [];
      const exists = rules.some((r) => r.id === rule.id);
      return { ...prev, rules: exists ? rules.map((r) => (r.id === rule.id ? rule : r)) : [...rules, rule] };
    });
  }

  function deleteRule(id) {
    setData((prev) => ({ ...prev, rules: (prev.rules || []).filter((r) => r.id !== id) }));
    setConfirmDeleteRule(null);
  }

  function updateBlock(blockId, patch) {
    setData((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    }));
  }

  return {
    editing, setEditing, confirmDelete, setConfirmDelete, editingFrequency, setEditingFrequency,
    editingFood, setEditingFood, confirmDeleteFood, setConfirmDeleteFood, editingRule, setEditingRule,
    confirmDeleteRule, setConfirmDeleteRule,
    upsertIngredient, deleteIngredient, upsertFood, deleteFood, upsertRule, deleteRule, updateBlock,
  };
}
