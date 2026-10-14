// ---------- ui/ajustes/compartir.jsx ----------
// Pantallas sencillas del menú lateral: Compartir, Ayuda y comentarios, y Documentos.
import React, { useState } from "react";
import { Sparkles, AlertCircle, Link2, FileText, Share2, Mail, Lightbulb, Globe, Lock } from "lucide-react";
import { t } from "i18n";
import { SectionIntro } from "../comun/tarjetas.jsx";

// ---------- Compartir ----------
// FoodDraft no está en ninguna tienda de apps todavía (y aunque lo esté, tampoco se puede buscar
// por marca como Instagram) — la única forma de que alguien llegue es que le pasen el enlace.
// El botón de compartir usa la Web Share API nativa del navegador (navigator.share) — nada de
// librerías: abre el panel del propio sistema (WhatsApp, Telegram, correo...). No está disponible
// en todos los navegadores de escritorio, así que se detecta y, si no existe, sencillamente no se
// muestra el botón — el enlace copiable de arriba siempre funciona como alternativa universal.
export function CompartirView({ idioma }) {
  const [copiado, setCopiado] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const soportaCompartir = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      // Sin permiso de portapapeles (poco común) — no pasa nada, el enlace sigue visible para copiarlo a mano.
    }
  }

  async function compartir() {
    try {
      await navigator.share({ title: "FoodDraft", text: t(idioma, "compartir.mensaje"), url });
    } catch (e) {
      // El usuario cerró el panel de compartir sin elegir nada, o el navegador lo canceló — no es un error que avisar.
    }
  }

  return (
    <>
      <SectionIntro text={t(idioma, "compartir.intro")} />
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px" }}>
          <Link2 size={15} color="var(--ink-soft)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {url}
          </span>
          <button
            onClick={copiarEnlace}
            style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--green-dark)" }}
          >
            {copiado ? t(idioma, "compartir.copiado") : t(idioma, "compartir.copiar")}
          </button>
        </div>

        {soportaCompartir && (
          <button
            onClick={compartir}
            style={{
              width: "100%", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700,
              color: "#fff", background: "var(--green)", border: "none", borderRadius: 9, padding: "11px 18px", cursor: "pointer",
            }}
          >
            <Share2 size={16} /> {t(idioma, "compartir.compartirApps")}
          </button>
        )}
      </div>
    </>
  );
}

// ---------- Ayuda y comentarios ----------
// Cada categoría abre el cliente de correo del propio dispositivo (mailto:) con el asunto ya
// puesto — deliberadamente así de simple: nada de backend, ni Cloud Function, ni servicio de envío
// de correo de terceros, coherente con que functions/ hoy solo tiene lo justo (Stripe y Gemini).
// El correo también se deja visible en texto plano por si el dispositivo no tiene cliente de correo
// configurado (raro en móvil, no tan raro en escritorio) y el enlace mailto: no hace nada.
const FEEDBACK_CATEGORIAS = [
  { key: "bug", icon: AlertCircle, color: "var(--rust)" },
  { key: "idea", icon: Lightbulb, color: "var(--mustard-dark)" },
  { key: "traduccion", icon: Globe, color: "var(--olive)" },
  { key: "premium", icon: Sparkles, color: "var(--coffee)" },
  { key: "privacidad", icon: Lock, color: "var(--green)" },
  { key: "otro", icon: Mail, color: "var(--ink-soft)" },
];

export function FeedbackView({ idioma }) {
  function abrirCorreo(key) {
    const asunto = encodeURIComponent(t(idioma, `feedback.${key}.asunto`));
    const cuerpo = encodeURIComponent(t(idioma, `feedback.${key}.cuerpo`));
    window.location.href = `mailto:draftedfood@gmail.com?subject=${asunto}&body=${cuerpo}`;
  }

  return (
    <>
      <SectionIntro text={t(idioma, "feedback.intro")} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480 }}>
        {FEEDBACK_CATEGORIAS.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => abrirCorreo(cat.key)}
              style={{
                display: "flex", alignItems: "center", gap: 12, textAlign: "left", width: "100%",
                background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "13px 14px", cursor: "pointer",
              }}
            >
              <Icon size={19} color={cat.color} style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                {t(idioma, `feedback.${cat.key}`)}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginTop: 14, maxWidth: 480 }}>
        {t(idioma, "feedback.correoVisible", { correo: "draftedfood@gmail.com" })}
      </div>
    </>
  );
}

// Documentos de apoyo: los PDFs divulgativos de la app. Desde octubre de 2026 viven en
// local/divulgacion/, fuera del repositorio a propósito (el repo es público y GitHub Pages publica
// todo lo versionado; ver CLAUDE.md, "Carpeta local/"), así que ya no se pueden servir como archivo
// estático junto a la app. Cómo publicarlos para esta pantalla está por decidir (p. ej. Firebase
// Storage, o el futuro cambio de hosting). Se deja vacío hasta entonces — cada entrada solo necesita
// { titulo, descripcion, archivo } con la URL del PDF.
const DOCUMENTOS_ADJUNTOS = [];

export function DocumentosView({ idioma }) {
  return (
    <div style={{ maxWidth: 480 }}>
      <SectionIntro text={t(idioma, "documentos.intro")} />

      {DOCUMENTOS_ADJUNTOS.length === 0 ? (
        <div
          style={{
            background: "var(--card)", border: "1px dashed var(--line)", borderRadius: 12,
            padding: "34px 22px", textAlign: "center",
          }}
        >
          <FileText size={26} color="var(--ink-soft)" style={{ marginBottom: 10 }} />
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
            {t(idioma, "documentos.sinDocumentos")}
          </div>
          <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0 }}>
            {t(idioma, "documentos.sinDocumentos.desc")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DOCUMENTOS_ADJUNTOS.map((doc) => (
            <a
              key={doc.archivo}
              href={doc.archivo}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, textDecoration: "none",
                background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px",
              }}
            >
              <FileText size={20} color="var(--olive)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                  {doc.titulo}
                </div>
                {doc.descripcion && (
                  <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
                    {doc.descripcion}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
