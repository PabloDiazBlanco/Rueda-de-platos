// ---------- ui/despensa/despensa.jsx ----------
// Pantalla «¿Qué tengo?»: lo que hay en casa, por zonas (despensa, nevera y congelador), con gramos
// aproximados o, para verdura y fruta, solo "tengo / se acabó". Tiene dos vistas del mismo contenido,
// y las dos leen el mismo hook, useDespensa:
// - Dibujo (Fase B): la nevera retro y el estante, que se abren al tocarlos (ui/despensa/cocina.jsx).
// - Lista (Fase A): las tres zonas con cada cosa editable en su fila (ui/despensa/lista.jsx), más
//   rápida para cambiar muchas cosas seguidas.
// Se añade buscando en el propio catálogo de alimentos (ui/despensa/anadir.jsx), porque la despensa
// solo puede compararse con el menú por alimento.
import React, { useState } from "react";
import { Plus, Refrigerator, List } from "lucide-react";
import { t } from "i18n";
import { ZONAS } from "despensa";
import { SectionIntro } from "../comun/tarjetas.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { VistaDibujo } from "./cocina.jsx";
import { VistaLista } from "./lista.jsx";
import { AnadirAlimentoModal } from "./anadir.jsx";
import { temaNevera, TEMA_NEVERA_POR_DEFECTO } from "./tema.js";

// La vista elegida se recuerda en este dispositivo (como el idioma antes de iniciar sesión): es una
// comodidad de cada pantalla, no un dato de la cuenta. Si el navegador no deja guardar, se empieza
// siempre por el dibujo.
const CLAVE_VISTA = "fooddraft:vista-despensa";
function leerVista() {
  try {
    return localStorage.getItem(CLAVE_VISTA) === "lista" ? "lista" : "dibujo";
  } catch (e) {
    return "dibujo";
  }
}
function guardarVista(vista) {
  try {
    localStorage.setItem(CLAVE_VISTA, vista);
  } catch (e) {
    // sin almacenamiento local: la elección solo dura mientras la pantalla está abierta
  }
}

export function DespensaView({ data, despensa, idioma }) {
  const [vista, setVista] = useState(leerVista);
  const [anadiendo, setAnadiendo] = useState(false);
  const total = ZONAS.reduce((s, z) => s + despensa.porZona[z].length, 0);
  // Un solo estilo por ahora (el retro); el día que haya selector, la clave elegida vendría del perfil.
  const tema = temaNevera(TEMA_NEVERA_POR_DEFECTO);

  function cambiarVista(v) {
    setVista(v);
    guardarVista(v);
  }

  const botonVista = (v, Icon, clave) => (
    <button
      onClick={() => cambiarVista(v)}
      aria-pressed={vista === v}
      style={{
        display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
        fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, padding: "7px 12px", border: "none", borderRadius: 7,
        background: vista === v ? "var(--card)" : "transparent", color: vista === v ? "var(--green-dark)" : "var(--ink-soft)",
        boxShadow: vista === v ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
      }}
    >
      <Icon size={14} /> {t(idioma, clave)}
    </button>
  );

  return (
    <>
      <h2 style={{ fontFamily: FUENTE_TITULOS, fontSize: 20, fontWeight: 400, color: "var(--green-dark)", margin: "0 0 4px" }}>
        {t(idioma, "despensa.titulo")}
      </h2>
      <SectionIntro text={t(idioma, "despensa.intro")} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 9, background: "var(--line)" }}>
          {botonVista("dibujo", Refrigerator, "despensa.vista.dibujo")}
          {botonVista("lista", List, "despensa.vista.lista")}
        </div>
        <button
          onClick={() => setAnadiendo(true)}
          style={{
            fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--green)",
            border: "none", borderRadius: 8, padding: "9px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          }}
        >
          <Plus size={14} /> {t(idioma, "despensa.anadir")}
        </button>
      </div>

      {total === 0 && (
        <div
          style={{
            border: "1.5px dashed var(--line)", borderRadius: 12, padding: vista === "lista" ? "28px 20px" : "14px 16px", textAlign: "center",
            color: "var(--ink-soft)", fontFamily: FUENTE_TEXTO, fontSize: 13, lineHeight: 1.5, marginBottom: 14,
          }}
        >
          {t(idioma, "despensa.vacia")}
        </div>
      )}

      {vista === "dibujo" ? (
        <VistaDibujo data={data} despensa={despensa} tema={tema} idioma={idioma} />
      ) : (
        total > 0 && <VistaLista data={data} despensa={despensa} idioma={idioma} />
      )}

      {anadiendo && <AnadirAlimentoModal data={data} despensa={despensa} onClose={() => setAnadiendo(false)} idioma={idioma} />}
    </>
  );
}
