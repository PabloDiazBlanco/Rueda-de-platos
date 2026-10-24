// ---------- ui/entreno/rutinas.jsx ----------
// «Rutinas» (diseño, §4.4): las plantillas de entreno. Tocar «Empezar» abre el entreno con sus ejercicios
// y series ya puestos; tocar la tarjeta, su editor (ui/entreno/editor-rutina.jsx). Sin límite de rutinas:
// las apps que limitan a 3 o 4 se llevan las peores reseñas, y aquí guardarlas no cuesta nada.
import React, { useState } from "react";
import { Plus, Play, MoreVertical, Copy, Trash2, Pencil, Folder } from "lucide-react";
import { t } from "i18n";
import { ModalShell, ModalBtn } from "../comun/modal.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { BotonPrincipal, TextoSuave, HojaInferior, OpcionHoja, nombreDe } from "./comun.jsx";

function grupos(rutinas) {
  const porCarpeta = {};
  rutinas.forEach((r) => {
    const c = (r.carpeta || "").trim();
    (porCarpeta[c] = porCarpeta[c] || []).push(r);
  });
  return Object.keys(porCarpeta).sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b))).map((c) => ({ carpeta: c, lista: porCarpeta[c] }));
}

export function RutinasView({ entreno, idioma, navegar }) {
  const rutinas = (entreno.catalogo && entreno.catalogo.rutinas) || [];
  const [menu, setMenu] = useState(null); // rutina
  const [borrar, setBorrar] = useState(null); // rutina
  const [reemplazar, setReemplazar] = useState(null); // rutina a empezar con un entreno ya en curso

  function empezar(r) {
    if (entreno.borrador) setReemplazar(r);
    else entreno.empezar(r);
  }

  function duplicar(r) {
    const { id, ...resto } = r;
    entreno.guardarRutina({ ...resto, nombre: t(idioma, "entreno.rutinas.copia", { nombre: r.nombre }) });
  }

  return (
    <div>
      <BotonPrincipal onClick={() => navegar("entreno-rutina", { id: null })}>
        <Plus size={18} /> {t(idioma, "entreno.rutinas.nueva")}
      </BotonPrincipal>

      {!rutinas.length && <TextoSuave style={{ marginTop: 16 }}>{t(idioma, "entreno.inicio.sinRutinas")}</TextoSuave>}

      {/* Agrupadas por carpeta (opcional C11): primero las que no tienen, y luego cada carpeta por orden
          alfabético con su título. Sin carpetas, la lista se ve como siempre. */}
      {grupos(rutinas).map(({ carpeta, lista }) => (
        <div key={carpeta || ""} style={{ marginTop: 16 }}>
          {carpeta && <h3 style={{ margin: "0 0 8px", fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 17, color: "var(--green-dark)", display: "flex", alignItems: "center", gap: 6 }}><Folder size={16} /> {carpeta}</h3>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lista.map((r) => (
              <div key={r.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <button
                    onClick={() => navegar("entreno-rutina", { id: r.id })}
                    style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "12px 14px 8px" }}
                  >
                    <div style={{ fontFamily: FUENTE_TITULOS, fontSize: 18, color: "var(--ink)" }}>{r.nombre}</div>
                    <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.45 }}>
                      {r.ejercicios.length
                        ? r.ejercicios.map((re) => nombreDe(entreno, re.ejercicioId, idioma)).join(" · ")
                        : t(idioma, "entreno.rutinas.sinEjercicios")}
                    </div>
                  </button>
                  <button onClick={() => setMenu(r)} aria-label={t(idioma, "entreno.rutinas.opciones")} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)" }}>
                    <MoreVertical size={18} />
                  </button>
                </div>
                <div style={{ padding: "0 14px 12px" }}>
                  <button
                    onClick={() => empezar(r)}
                    disabled={!r.ejercicios.length}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: "0 14px", borderRadius: 8, border: "none",
                      background: "var(--green-soft)", color: "var(--green-dark)", fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700,
                      cursor: r.ejercicios.length ? "pointer" : "default", opacity: r.ejercicios.length ? 1 : 0.5,
                    }}
                  >
                    <Play size={14} /> {t(idioma, "entreno.inicio.empezar")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {menu && (
        <HojaInferior titulo={menu.nombre} onCerrar={() => setMenu(null)} idioma={idioma}>
          <OpcionHoja icono={Pencil} onClick={() => { navegar("entreno-rutina", { id: menu.id }); setMenu(null); }}>{t(idioma, "entreno.rutinas.editar")}</OpcionHoja>
          <OpcionHoja icono={Copy} onClick={() => { duplicar(menu); setMenu(null); }}>{t(idioma, "entreno.rutinas.duplicar")}</OpcionHoja>
          <OpcionHoja icono={Trash2} peligro onClick={() => { setBorrar(menu); setMenu(null); }}>{t(idioma, "entreno.rutinas.borrar")}</OpcionHoja>
        </HojaInferior>
      )}

      {borrar && (
        <ModalShell title={t(idioma, "entreno.rutinas.borrarTitulo")} onClose={() => setBorrar(null)}>
          <TextoSuave style={{ marginBottom: 16 }}>{t(idioma, "entreno.rutinas.borrarTexto", { nombre: borrar.nombre })}</TextoSuave>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <ModalBtn variant="ghost" onClick={() => setBorrar(null)}>{t(idioma, "common.cancelar")}</ModalBtn>
            <ModalBtn variant="danger" onClick={() => { entreno.borrarRutina(borrar.id); setBorrar(null); }}>{t(idioma, "entreno.rutinas.borrar")}</ModalBtn>
          </div>
        </ModalShell>
      )}

      {reemplazar && (
        <ModalShell title={t(idioma, "entreno.inicio.reemplazarTitulo")} onClose={() => setReemplazar(null)}>
          <TextoSuave style={{ marginBottom: 16 }}>{t(idioma, "entreno.inicio.reemplazarTexto")}</TextoSuave>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <ModalBtn variant="ghost" onClick={() => { setReemplazar(null); entreno.mostrarSesion(); }}>{t(idioma, "entreno.inicio.continuar")}</ModalBtn>
            <ModalBtn variant="danger" onClick={() => { entreno.descartar(); entreno.empezar(reemplazar); setReemplazar(null); }}>{t(idioma, "entreno.inicio.reemplazar")}</ModalBtn>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
