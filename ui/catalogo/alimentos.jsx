// ---------- ui/catalogo/alimentos.jsx ----------
// Base de datos de alimentos: lista con buscador, edición (también desde foto de etiqueta),
// borrado e impresión.
import React, { useState, useRef } from "react";
import { Plus, Trash2, Pencil, AlertCircle, Search, Link2, Download, Camera, ChevronDown } from "lucide-react";
import { fmt } from "macros";
import { uid } from "comun";
import { fechaISO, formatFechaCorta } from "peso";
import { t } from "i18n";
import { CATEGORIAS_ALIMENTOS } from "datos-iniciales";
import { ModalShell, Field, inputStyle, ModalBtn, IconBtn } from "../comun/modal.jsx";
import { SectionIntro, MacroPill } from "../comun/tarjetas.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

export function FoodsView({ foods, ingredients, onEdit, onNew, onDelete, onNewFromPhoto, idioma }) {
  const [query, setQuery] = useState("");
  // Igual que el menú lateral: cada categoría se expande de forma independiente, varias pueden
  // estar abiertas a la vez (no es un acordeón de "una sola a la vez").
  const [expandido, setExpandido] = useState({});
  const [exportando, setExportando] = useState(false);
  const fileInputRef = useRef(null);

  // Mismo mecanismo que la exportación del menú y del seguimiento de peso: deja el contenido
  // listo en el DOM (oculto en pantalla) y espera a que React lo pinte antes de abrir "Imprimir".
  function exportarCatalogo() {
    setExportando(true);
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  const usageCount = (foodId) => ingredients.filter((i) => i.foodId === foodId).length;
  // Alimentos creados antes de la categorización (Tanda 1) o con una categoria que ya no existe
  // caen en "sin categoría" — nunca desaparecen de la lista por una categoria vacía o inválida.
  const bucketKeyFor = (f) => (CATEGORIAS_ALIMENTOS.some((c) => c.key === f.categoria) ? f.categoria : "__sin_categoria");
  const hayAlimentosSinCategoria = foods.some((f) => bucketKeyFor(f) === "__sin_categoria");
  const categorias = [
    ...CATEGORIAS_ALIMENTOS,
    ...(hayAlimentosSinCategoria ? [{ key: "__sin_categoria", labelKey: "categoriaAlimento.sinCategoria", emoji: "🗂️" }] : []),
  ];

  // El buscador filtra a la vez por nombre de categoría (si coincide, se enseña entera) y por
  // nombre de alimento suelto dentro de cada categoría (si no, solo los que coincidan). Sin
  // buscador, se listan las 12/13 categorías completas, colapsadas hasta que se toquen.
  const q = query.trim().toLowerCase();
  const grupos = categorias
    .map((cat) => {
      const todos = foods.filter((f) => bucketKeyFor(f) === cat.key);
      if (!q) return { cat, items: todos, coincide: true };
      const labelCoincide = t(idioma, cat.labelKey).toLowerCase().includes(q);
      const items = labelCoincide ? todos : todos.filter((f) => f.name.toLowerCase().includes(q));
      return { cat, items, coincide: labelCoincide || items.length > 0 };
    })
    .filter((g) => g.coincide);
  const totalVisible = grupos.reduce((s, g) => s + g.items.length, 0);
  // Mientras se busca, las categorías con alguna coincidencia se muestran ya desplegadas, sin
  // depender de lo que el usuario tuviera plegado/desplegado a mano — al borrar el buscador, se
  // vuelve a respetar ese estado manual tal cual estaba.
  const estaAbierta = (key) => (q ? true : !!expandido[key]);
  function alternar(key) {
    setExpandido((e) => ({ ...e, [key]: !e[key] }));
  }

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // permite volver a elegir la misma foto si hace falta repetir
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onNewFromPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  return (
    <>
      <SectionIntro text={t(idioma, "foodsView.intro")} />

      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--ink-soft)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(idioma, "foodsView.buscar")}
          style={{ ...inputStyle, paddingLeft: 32, width: "100%" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{
            fontFamily: FUENTE_TEXTO,
            fontSize: 13, fontWeight: 700, color: "var(--green-dark)", background: "var(--green-soft)",
            border: "none", borderRadius: 8, padding: "9px 14px",
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
          }}
        >
          <Camera size={14} /> {t(idioma, "foodsView.anadirConFoto")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <button
          onClick={onNew}
          style={{
            fontFamily: FUENTE_TEXTO,
            fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--green)",
            border: "none", borderRadius: 8, padding: "9px 14px",
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
          }}
        >
          <Plus size={14} /> {t(idioma, "foodsView.nuevoAlimento")}
        </button>
        <button
          onClick={exportarCatalogo}
          style={{
            fontFamily: FUENTE_TEXTO,
            fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", background: "transparent",
            border: "1px solid var(--line)", borderRadius: 8, padding: "9px 14px",
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
          }}
        >
          <Download size={14} /> {t(idioma, "foodsView.exportarCatalogo")}
        </button>
      </div>

      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 8 }}>
        {t(idioma, "foodsView.deTotal", { n: totalVisible, total: foods.length })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {grupos.map(({ cat, items }) => {
          const abierta = estaAbierta(cat.key);
          return (
            <div key={cat.key}>
              <button
                onClick={() => alternar(cat.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
                  fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700,
                  padding: "10px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: abierta ? "var(--green-soft)" : "transparent",
                  color: abierta ? "var(--green-dark)" : "var(--ink)",
                }}
              >
                <span style={{ fontSize: 17, flexShrink: 0 }}>{cat.emoji}</span>
                <span style={{ flex: 1 }}>{t(idioma, cat.labelKey)}</span>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-soft)" }}>({items.length})</span>
                <ChevronDown size={15} color="var(--ink-soft)" style={{ flexShrink: 0, transform: abierta ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              </button>

              {abierta && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 15, borderLeft: "1.5px solid var(--line)", paddingLeft: 10, marginTop: 6, marginBottom: 6 }}>
                  {items.length === 0 && (
                    <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", padding: "4px 2px" }}>
                      {t(idioma, "foodsView.categoriaVacia")}
                    </div>
                  )}
                  {items.map((f) => {
                    const uses = usageCount(f.id);
                    return (
                      <div
                        key={f.id}
                        style={{
                          background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10,
                          padding: "11px 13px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14.5, lineHeight: 1.3 }}>{f.name}</div>
                            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 10.5, color: "var(--ink-soft)", marginTop: 3 }}>
                              {f.fuente}
                              {uses > 0 && (
                                <span style={{ color: "var(--green)", fontWeight: 700 }}>
                                  {" · "}<Link2 size={9} style={{ verticalAlign: "middle" }} /> {t(idioma, "foodsView.usadoEn", { n: uses })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                            <IconBtn onClick={() => onEdit(f)}><Pencil size={13} /></IconBtn>
                            <IconBtn onClick={() => onDelete(f)}><Trash2 size={13} /></IconBtn>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                          <MacroPill label="kcal" value={f.kcal} color="var(--rust)" bg="var(--rust-soft)" />
                          <MacroPill label="P" value={`${f.prot} g`} color="var(--green-dark)" bg="var(--green-soft)" />
                          <MacroPill label="G" value={`${f.fat} g`} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
                          <MacroPill label="C" value={`${f.carb} g`} color="var(--coffee)" bg="var(--coffee-soft)" />
                          <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 10, color: "var(--ink-soft)", alignSelf: "center" }}>
                            {t(idioma, "foodsView.por100g")}
                          </span>
                        </div>
                        {(f.grasaSaturada !== undefined || f.azucares !== undefined || f.fibra !== undefined || f.sal !== undefined) && (
                          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 10, color: "var(--ink-soft)", marginTop: 6 }}>
                            {[
                              f.grasaSaturada !== undefined && t(idioma, "foodsView.saturada", { n: f.grasaSaturada }),
                              f.azucares !== undefined && t(idioma, "foodsView.azucares", { n: f.azucares }),
                              f.fibra !== undefined && t(idioma, "foodsView.fibra", { n: f.fibra }),
                              f.sal !== undefined && t(idioma, "foodsView.sal", { n: f.sal }),
                            ].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {grupos.length === 0 && (
          <div style={{
            border: "1.5px dashed var(--line)", borderRadius: 10, padding: "26px 16px",
            textAlign: "center", color: "var(--ink-soft)",
            fontFamily: FUENTE_TEXTO, fontSize: 13,
          }}>
            {t(idioma, "foodsView.sinCoincidencias", { query })}
          </div>
        )}
      </div>

      {exportando && <PrintFoods foods={foods} idioma={idioma} />}
    </>
  );
}

// Ficha imprimible del catálogo de alimentos completo — mismo mecanismo que PrintSeguimiento
// (ui/peso/grafica.jsx): oculto en pantalla, visible solo al imprimir vía window.print().
function PrintFoods({ foods, idioma }) {
  const ordenados = [...foods].sort((a, b) => a.name.localeCompare(b.name, "es"));
  return (
    <div id="print-foods">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-foods, #print-foods * { visibility: visible; }
          #print-foods { position: absolute; left: 0; top: 0; width: 100%; }
        }
        @media screen {
          #print-foods { display: none; }
        }
      `}</style>
      <div style={{ padding: 24, fontFamily: FUENTE_TITULOS, color: "#2b2b26" }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#6b6a5e" }}>
            FoodDraft
          </div>
          <h1 style={{ fontSize: 26, color: "#1f4d38", margin: "2px 0 0 0" }}>{t(idioma, "printFoods.titulo")}</h1>
        </div>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "#6b6a5e", marginBottom: 16 }}>
          {t(idioma, "printFoods.resumen", { n: ordenados.length, fecha: formatFechaCorta(fechaISO(new Date()), idioma) })}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FUENTE_TEXTO, fontSize: 10.5 }}>
          <thead>
            <tr style={{ background: "#1f4d38", color: "#fff" }}>
              {[
                t(idioma, "printFoods.alimento"), "kcal", t(idioma, "printFoods.prot"), t(idioma, "printFoods.grasa"),
                t(idioma, "printFoods.carb"), t(idioma, "printFoods.sal"), t(idioma, "printFoods.azuc"),
                t(idioma, "printFoods.fibra"), t(idioma, "printFoods.sat"), t(idioma, "printFoods.origen"),
              ].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px 7px", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenados.map((f, i) => (
              <tr key={f.id} style={{ background: i % 2 === 1 ? "#f1ede0" : "transparent", pageBreakInside: "avoid" }}>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{f.name}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.kcal)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.prot)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.fat)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.carb)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.sal)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.azucares)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.fibra)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.grasaSaturada)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf", fontSize: 9.5, color: "#6b6a5e" }}>{f.fuente}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 9.5, color: "#999", textAlign: "center", marginTop: 20 }}>
          {t(idioma, "printFoods.pie")}
        </div>
      </div>
    </div>
  );
}

export function FoodEditModal({ state, onClose, onSave, idioma }) {
  const existing = state.food;
  const [name, setName] = useState(existing ? existing.name : "");
  const [categoria, setCategoria] = useState(existing?.categoria || CATEGORIAS_ALIMENTOS[0].key);
  const [kcal, setKcal] = useState(existing ? existing.kcal : "");
  const [prot, setProt] = useState(existing ? existing.prot : "");
  const [fat, setFat] = useState(existing ? existing.fat : "");
  const [carb, setCarb] = useState(existing ? existing.carb : "");
  const [grasaSaturada, setGrasaSaturada] = useState(existing?.grasaSaturada ?? "");
  const [azucares, setAzucares] = useState(existing?.azucares ?? "");
  const [fibra, setFibra] = useState(existing?.fibra ?? "");
  const [sal, setSal] = useState(existing?.sal ?? "");
  const [fuente, setFuente] = useState(existing ? existing.fuente || "" : "");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  // window.analyzeFoodPhoto solo existe en la versión web (conectada a Firebase AI Logic).
  // Dentro de Claude, esta función no está disponible y se mantiene el aviso de "rellena a mano".
  const canAnalyze = state.photo && typeof window !== "undefined" && typeof window.analyzeFoodPhoto === "function";

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const result = await window.analyzeFoodPhoto(state.photo);
      if (result.kcal !== null && result.kcal !== undefined) setKcal(result.kcal);
      if (result.prot !== null && result.prot !== undefined) setProt(result.prot);
      if (result.fat !== null && result.fat !== undefined) setFat(result.fat);
      if (result.carb !== null && result.carb !== undefined) setCarb(result.carb);
      if (result.grasaSaturada !== null && result.grasaSaturada !== undefined) setGrasaSaturada(result.grasaSaturada);
      if (result.azucares !== null && result.azucares !== undefined) setAzucares(result.azucares);
      if (result.fibra !== null && result.fibra !== undefined) setFibra(result.fibra);
      if (result.sal !== null && result.sal !== undefined) setSal(result.sal);
      if (!fuente) setFuente("Foto (IA) — revisar");
      setAnalyzed(true);
    } catch (err) {
      setAnalyzeError(
        (err && err.message) ||
        t(idioma, "foodEditModal.errorLectura")
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function toNumOrUndefined(v) {
    return v === "" || v === null || v === undefined ? undefined : Number(v);
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: existing ? existing.id : "f_" + uid(),
      name: name.trim(),
      categoria,
      kcal: Number(kcal) || 0,
      prot: Number(prot) || 0,
      fat: Number(fat) || 0,
      carb: Number(carb) || 0,
      grasaSaturada: toNumOrUndefined(grasaSaturada),
      azucares: toNumOrUndefined(azucares),
      fibra: toNumOrUndefined(fibra),
      sal: toNumOrUndefined(sal),
      fuente: fuente.trim() || "Manual",
    });
  }

  return (
    <ModalShell onClose={onClose} title={state.mode === "new" ? t(idioma, "foodEditModal.nuevoAlimento") : t(idioma, "foodEditModal.editarAlimento")}>
      {state.photo && (
        <div style={{ marginBottom: 14 }}>
          <img
            src={state.photo}
            alt="Foto de la etiqueta"
            style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }}
          />

          {canAnalyze ? (
            <>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                style={{
                  width: "100%", marginTop: 8, padding: "9px 12px", borderRadius: 8, border: "none",
                  background: "var(--green)", color: "#fff", fontWeight: 700, fontSize: 13,
                  fontFamily: FUENTE_TEXTO, display: "flex",
                  alignItems: "center", justifyContent: "center", gap: 6, cursor: analyzing ? "default" : "pointer",
                  opacity: analyzing ? 0.7 : 1,
                }}
              >
                {analyzing ? t(idioma, "foodEditModal.leyendoEtiqueta") : analyzed ? t(idioma, "foodEditModal.volverALeer") : t(idioma, "foodEditModal.leerDeFoto")}
              </button>
              {analyzeError && (
                <div style={{
                  fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--rust)",
                  background: "var(--rust-soft)", borderRadius: 6, padding: "7px 10px", marginTop: 8,
                }}>
                  {analyzeError}
                </div>
              )}
              {analyzed && !analyzeError && (
                <div style={{
                  fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--green-dark)",
                  background: "var(--green-soft)", borderRadius: 6, padding: "7px 10px", marginTop: 8,
                }}>
                  {t(idioma, "foodEditModal.datosRellenados")}
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--mustard-dark)",
                background: "var(--mustard-soft)", borderRadius: 6, padding: "7px 10px", marginTop: 8,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <AlertCircle size={12} style={{ flexShrink: 0 }} />
              {t(idioma, "foodEditModal.lecturaNoDisponible")}
            </div>
          )}
        </div>
      )}

      <Field label={t(idioma, "foodEditModal.nombre")}>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder={t(idioma, "foodEditModal.nombrePlaceholder")} />
      </Field>

      <Field label={t(idioma, "foodEditModal.categoria")}>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={inputStyle}>
          {CATEGORIAS_ALIMENTOS.map((c) => (
            <option key={c.key} value={c.key}>{c.emoji} {t(idioma, c.labelKey)}</option>
          ))}
        </select>
      </Field>

      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginBottom: 8 }}>
        {t(idioma, "foodEditModal.valoresPor100g")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label={t(idioma, "foodEditModal.calorias")}>
          <input type="number" value={kcal} onChange={(e) => setKcal(e.target.value)} style={inputStyle} />
        </Field>
        <Field label={t(idioma, "foodEditModal.proteina")}>
          <input type="number" step="0.1" value={prot} onChange={(e) => setProt(e.target.value)} style={inputStyle} />
        </Field>
        <Field label={t(idioma, "foodEditModal.grasa")}>
          <input type="number" step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} style={inputStyle} />
        </Field>
        <Field label={t(idioma, "foodEditModal.carbohidratos")}>
          <input type="number" step="0.1" value={carb} onChange={(e) => setCarb(e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5, margin: "14px 0 8px" }}>
        {t(idioma, "foodEditModal.detalleAdicional")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label={t(idioma, "foodEditModal.saturadas")}>
          <input type="number" step="0.1" value={grasaSaturada} onChange={(e) => setGrasaSaturada(e.target.value)} style={inputStyle} placeholder="—" />
        </Field>
        <Field label={t(idioma, "foodEditModal.azucares")}>
          <input type="number" step="0.1" value={azucares} onChange={(e) => setAzucares(e.target.value)} style={inputStyle} placeholder="—" />
        </Field>
        <Field label={t(idioma, "foodEditModal.fibra")}>
          <input type="number" step="0.1" value={fibra} onChange={(e) => setFibra(e.target.value)} style={inputStyle} placeholder="—" />
        </Field>
        <Field label={t(idioma, "foodEditModal.sal")}>
          <input type="number" step="0.01" value={sal} onChange={(e) => setSal(e.target.value)} style={inputStyle} placeholder="—" />
        </Field>
      </div>

      <Field label={t(idioma, "foodEditModal.fuente")}>
        <input value={fuente} onChange={(e) => setFuente(e.target.value)} style={inputStyle} placeholder={t(idioma, "foodEditModal.fuentePlaceholder")} />
      </Field>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={handleSave} variant="solid">{t(idioma, "common.guardar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

export function ConfirmFoodDeleteModal({ food, usedBy, onCancel, onConfirm, idioma }) {
  return (
    <ModalShell onClose={onCancel} title={t(idioma, "confirmFoodDelete.titulo")}>
      <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 13.5, color: "var(--ink)", margin: 0 }}>
        {t(idioma, "confirmFoodDelete.textoPre")}<strong>{food.name}</strong>{t(idioma, "confirmFoodDelete.textoPost")}
      </p>
      {usedBy.length > 0 && (
        <div
          style={{
            background: "var(--rust-soft)", borderLeft: "3px solid var(--rust)", borderRadius: 4,
            padding: "10px 12px", marginTop: 12,
            fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--rust)",
          }}
        >
          {t(idioma, "confirmFoodDelete.enlazado", { n: usedBy.length, plural: usedBy.length > 1 ? "s" : "", lista: usedBy.map((i) => i.name).join(", ") })}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onCancel} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={onConfirm} variant="danger">{t(idioma, "confirmFoodDelete.titulo")}</ModalBtn>
      </div>
    </ModalShell>
  );
}
