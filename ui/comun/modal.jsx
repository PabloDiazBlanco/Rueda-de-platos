// ---------- ui/comun/modal.jsx ----------
// Piezas básicas de formulario y modal que usa casi toda la interfaz: la caja del modal, el campo
// con etiqueta, los botones y el estilo común de los <input>.
import React from "react";
import { X } from "lucide-react";
import { FUENTE_TEXTO } from "../estilos.js";

export function IconBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        background: "var(--paper)",
        borderRadius: 7,
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink-soft)",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// La caja de todos los modales de la app (añadir o editar un alimento, un plato, una regla, los objetivos,
// el detalle de una comida, las confirmaciones...). C1 (25-oct-2026): en el móvil, un modal más alto que la
// pantalla (el de alimento, el de un plato con varios ingredientes, el de los objetivos con el teclado
// abierto) quedaba cortado por arriba y por abajo, centrado y sin poder desplazarse, y su botón de Guardar
// era inalcanzable. Ahora el fondo oscuro es el que se desplaza (`overflowY: auto`) y la caja se centra
// con `margin: auto` en vez de con `alignItems: center`: si cabe, sale centrada como siempre; si no, empieza
// arriba y se baja con el dedo hasta el último botón. `overscrollBehavior: contain` evita que, al llegar al
// final, se arrastre la pantalla de debajo. Los márgenes respetan la muesca y la barra del sistema.
export function ModalShell({ children, onClose, title }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(31,77,56,0.35)",
        display: "flex",
        padding: "max(16px, env(safe-area-inset-top)) 14px max(16px, env(safe-area-inset-bottom))",
        zIndex: 50,
        overflowY: "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          borderRadius: 14,
          padding: "20px 22px 22px",
          width: "100%",
          maxWidth: 360,
          margin: "auto",
          flexShrink: 0,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 17 }}>{title}</div>
          <IconBtn onClick={onClose}><X size={14} /></IconBtn>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

export const inputStyle = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: 7,
  border: "1px solid var(--line)",
  fontSize: 13.5,
  background: "#fff",
  color: "var(--ink)",
};

export function ModalBtn({ children, onClick, variant, disabled }) {
  const styles = {
    ghost: { background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--line)" },
    solid: { background: "var(--green)", color: "#fff", border: "none" },
    danger: { background: "var(--rust)", color: "#fff", border: "none" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: FUENTE_TEXTO,
        fontSize: 13,
        fontWeight: 600,
        padding: "9px 16px",
        borderRadius: 8,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "default" : "pointer",
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}
