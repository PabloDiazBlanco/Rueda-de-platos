// ---------- ui/marco/barra-inferior.jsx ----------
// Barra inferior flotante «de cristal» de cada área (navegación por áreas, octubre de 2026): una
// píldora fija abajo, separada de los bordes, a través de la que se ve la pantalla que se desplaza por
// detrás. Lleva las pestañas principales del área en la que se está (ui/marco/navegacion.js); en la zona
// común (Ajustes, Perfil, Premium...) no se pinta, porque esas pantallas no son de ningún área.
//
// Decisiones de diseño (ver local/ideas/gimnasio/03-diseno-modulo-entreno.md, §3.3):
// - Cristal claro (fondo del color de las tarjetas al 72 % + desenfoque), no oscuro como el «liquid
//   glass» de iPhone, para ir con el papel beige y los verdes de FoodDraft. Sin soporte de
//   backdrop-filter, o con «reducir transparencia» activado en el sistema, el fondo es sólido.
// - Solo la pestaña activa enseña su nombre: así caben cinco pestañas en los cinco idiomas. Las demás
//   lo llevan como aria-label y como title (que se ve al pasar el ratón en escritorio).
// - Se esconde mientras se escribe en un campo de texto: en el móvil, el teclado la subiría justo
//   encima de lo que se está tecleando (pesos, nombres...).
// - Capa (z-index) 30: por debajo de la pastilla de entreno (31), del menú lateral (40/41), de la sesión
//   de entreno y los paneles de la nevera (45) y de los modales (50), que así la tapan.
import React, { useState, useEffect } from "react";
import { t } from "i18n";
import { FUENTE_TEXTO } from "../estilos.js";
import { areaPorClave, pestanaDe, visibleCon } from "./navegacion.js";

// Altura que ocupa la barra con su margen: lo que <main> deja libre abajo para que lo último de cada
// pantalla no quede escondido detrás (lo usa app.jsx).
export const RELLENO_BARRA = "calc(96px + env(safe-area-inset-bottom))";

function prefiereMenosMovimiento() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
}

// ¿Es un campo en el que se escribe con el teclado? Casillas, radios, botones y deslizadores no lo son:
// enfocarlos no saca el teclado del móvil, así que no hace falta esconder la barra.
function esCampoDeTexto(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea" || tag === "select") return true;
  if (tag !== "input") return !!el.isContentEditable;
  const tipo = (el.getAttribute("type") || "text").toLowerCase();
  return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image", "hidden"].includes(tipo);
}

// Se esconde mientras haya un campo de texto con el foco. Se mira document.activeElement un instante
// después de cada cambio de foco, para no hacerla parpadear al saltar de un campo a otro. (Lo usa también
// la pastilla del entreno en curso, ui/entreno/pastilla.jsx.)
export function useEscribiendo() {
  const [escribiendo, setEscribiendo] = useState(false);
  useEffect(() => {
    let temporizador = null;
    function revisar() {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => setEscribiendo(esCampoDeTexto(document.activeElement)), 0);
    }
    document.addEventListener("focusin", revisar);
    document.addEventListener("focusout", revisar);
    return () => {
      clearTimeout(temporizador);
      document.removeEventListener("focusin", revisar);
      document.removeEventListener("focusout", revisar);
    };
  }, []);
  return escribiendo;
}

export function BarraInferior({ area, tab, navegar, idioma, perfil }) {
  const [reducido] = useState(prefiereMenosMovimiento);
  const escribiendo = useEscribiendo();
  const descripcion = areaPorClave(area);
  if (!descripcion || !descripcion.pestanas.length) return null;
  // Pestañas que dependen del perfil (hoy, «Período»: solo con sexo femenino).
  const pestanas = descripcion.pestanas.filter((p) => visibleCon(p, perfil));
  const activa = pestanaDe(tab);

  return (
    <>
      {/* Lo que no se puede escribir en línea: el desenfoque con su prefijo de Safari y las dos salidas
          a fondo sólido (navegador sin backdrop-filter y «reducir transparencia»). */}
      <style>{`
        .barra-cristal {
          background: var(--cristal);
          -webkit-backdrop-filter: blur(18px) saturate(1.6);
          backdrop-filter: blur(18px) saturate(1.6);
        }
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .barra-cristal { background: var(--card); }
        }
        @media (prefers-reduced-transparency: reduce) {
          .barra-cristal { background: var(--card); -webkit-backdrop-filter: none; backdrop-filter: none; }
        }
      `}</style>
      <nav
        className="barra-cristal"
        aria-label={t(idioma, descripcion.etiqueta)}
        aria-hidden={escribiendo ? true : undefined}
        style={{
          position: "fixed", left: 12, right: 12, bottom: "calc(12px + env(safe-area-inset-bottom))",
          maxWidth: 420, margin: "0 auto", height: 60, zIndex: 30, boxSizing: "border-box",
          display: "flex", alignItems: "center", gap: 4, padding: "0 6px",
          borderRadius: 999, border: "1px solid var(--cristal-borde)",
          boxShadow: "0 6px 24px rgba(31,77,56,0.12), 0 1px 3px rgba(31,77,56,0.08)",
          transform: escribiendo ? "translateY(calc(100% + 24px + env(safe-area-inset-bottom)))" : "none",
          transition: reducido ? "none" : "transform 150ms ease-out",
          pointerEvents: escribiendo ? "none" : "auto",
        }}
      >
        {pestanas.map((p) => {
          const esActiva = p.clave === activa;
          const Icono = p.icono;
          const nombre = t(idioma, p.etiqueta);
          return (
            <button
              key={p.clave}
              type="button"
              onClick={() => navegar(p.destino)}
              aria-label={nombre}
              title={nombre}
              aria-current={esActiva ? "page" : undefined}
              tabIndex={escribiendo ? -1 : 0}
              style={{
                flex: esActiva ? "0 1 auto" : "1 1 0", minWidth: 44, height: 48, minHeight: 44,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: esActiva ? "0 14px" : 0, borderRadius: 999, border: "none",
                background: esActiva ? "var(--cristal-activo)" : "transparent",
                color: esActiva ? "var(--green-dark)" : "var(--ink-soft)", overflow: "hidden",
              }}
            >
              <Icono size={22} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              {esActiva && (
                <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {nombre}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
