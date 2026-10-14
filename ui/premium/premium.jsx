// ---------- ui/premium/premium.jsx ----------
// Pantalla de Premium (ventajas, pago y gestión de la suscripción) y el aviso que se enseña en
// las funciones premium sin suscripción.
import React, { useState } from "react";
import { Sparkles, CalendarDays, Camera, Scale, ThumbsUp } from "lucide-react";
import { t } from "i18n";

// ---------- Premium ----------

const VENTAJAS_PREMIUM = [
  { icon: Camera, textoKey: "premiumView.ventaja1" },
  { icon: Scale, textoKey: "premiumView.ventaja2" },
  { icon: Sparkles, textoKey: "premiumView.ventaja3" },
  { icon: CalendarDays, textoKey: "premiumView.ventaja4" },
  { icon: ThumbsUp, textoKey: "premiumView.ventaja5" },
];

// Pantalla única para hacerse premium o gestionar la suscripción ya activa — la diferencia entre
// las dos la decide "premium.active", que llega desde Firestore en vivo (ver
// window.subscribePremiumStatus en auth-bootstrap.jsx). El botón redirige entero a Stripe
// (Checkout o el portal de facturación, según el caso) — no hay formulario de tarjeta propio en
// ningún sitio de esta app.
export function PremiumView({ premium, idioma }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function irA(crearSesion) {
    setError("");
    setLoading(true);
    try {
      const url = await crearSesion();
      window.location.href = url;
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Sparkles size={30} color="var(--mustard-dark)" style={{ marginBottom: 8 }} />
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 24, color: "var(--green-dark)", margin: "0 0 4px" }}>
          {premium.active ? t(idioma, "premiumView.yaEres") : t(idioma, "premiumView.hazte")}
        </h1>
        {!premium.active && (
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)" }}>
            {t(idioma, "premiumView.precio")}
          </div>
        )}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {VENTAJAS_PREMIUM.map(({ icon: Icon, textoKey }) => (
            <div key={textoKey} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Icon size={16} color="var(--mustard-dark)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)" }}>{t(idioma, textoKey)}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--rust)",
            background: "var(--rust-soft)", borderRadius: 8, padding: "9px 12px", marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {premium.active ? (
        <button
          onClick={() => irA(window.createPortalSession)}
          disabled={loading}
          style={{
            width: "100%", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "var(--green-dark)", background: "#fff", border: "1px solid var(--line)",
            borderRadius: 9, padding: "12px", cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? t(idioma, "premiumView.unMomento") : t(idioma, "premiumView.gestionarSuscripcion")}
        </button>
      ) : (
        <button
          onClick={() => irA(window.createCheckoutSession)}
          disabled={loading}
          style={{
            width: "100%", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "#fff", background: "var(--mustard-dark)", border: "none",
            borderRadius: 9, padding: "12px", cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? t(idioma, "premiumView.unMomento") : t(idioma, "premiumView.suscribirme")}
        </button>
      )}
    </div>
  );
}

// Aviso reutilizable para cualquier sitio de la app que quiera bloquear contenido a quien no sea
// premium — hoy solo lo usa el seguimiento de peso, pero está pensado para poder reutilizarlo
// tal cual con la función de "qué puedo cocinar" en cuanto se construya.
export function PremiumRequiredNotice({ titulo, texto, onGoPremium, idioma }) {
  return (
    <div
      style={{
        background: "var(--mustard-soft)", border: "1px dashed var(--mustard-dark)", borderRadius: 12,
        padding: "24px 20px", textAlign: "center", maxWidth: 460,
      }}
    >
      <Sparkles size={26} color="var(--mustard-dark)" style={{ marginBottom: 10 }} />
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
        {titulo}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 16, lineHeight: 1.5 }}>
        {texto}
      </div>
      <button
        onClick={onGoPremium}
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700,
          color: "#fff", background: "var(--mustard-dark)", border: "none", borderRadius: 8,
          padding: "9px 16px", cursor: "pointer",
        }}
      >
        {t(idioma, "premiumNotice.verPremium")}
      </button>
    </div>
  );
}
