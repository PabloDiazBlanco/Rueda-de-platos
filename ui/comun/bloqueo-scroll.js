// ---------- ui/comun/bloqueo-scroll.js ----------
// Bloqueo del desplazamiento de la página mientras hay una capa a pantalla completa encima (la sesión de
// entreno, `CapaCompleta`, los paneles de la nevera).
//
// Hasta el 27-oct-2026 cada capa guardaba el `overflow` que tenía el body al abrirse y lo devolvía al
// cerrarse. Eso falla en cuanto dos capas se solapan y no se cierran en el orden inverso al de apertura: la
// de debajo guardó "" y la de encima "hidden", y si se cierra primero la de debajo (o las dos a la vez,
// porque React limpia los efectos de un árbol que desaparece de padre a hijo, p. ej. al guardar un entreno
// con «Terminar» abierto), la última en limpiar deja el body en "hidden" para siempre: la página dejaba de
// desplazarse hasta recargar («se queda pillado el scroll»). Ahora todas comparten un contador: la primera
// capa bloquea y solo la última en cerrarse desbloquea, se cierren en el orden que se cierren.
import { useEffect } from "react";

let capas = 0;
let previo = "";

// Bloquea y devuelve la función que suelta este bloqueo (una sola vez, aunque se llame más).
export function bloquearScroll() {
  if (capas === 0) {
    previo = document.body.style.overflow === "hidden" ? "" : document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  capas++;
  let suelto = false;
  return () => {
    if (suelto) return;
    suelto = true;
    capas = Math.max(0, capas - 1);
    if (capas === 0) document.body.style.overflow = previo;
  };
}

// Mientras el componente esté montado (y `activo`), la página de debajo no se desplaza.
export function useBloqueoScroll(activo = true) {
  useEffect(() => (activo ? bloquearScroll() : undefined), [activo]);
}
