// ---------- ui/entreno/superserie.jsx ----------
// «Superserie con…» (27-oct-2026, petición del usuario): desde el ⋮ de un ejercicio, en el entreno en curso y
// en el editor de rutinas, se elige con cuál hacer la superserie, esté donde esté en la lista. El elegido se
// coloca justo detrás (superserieCon, logica/entreno-sesion.js). Hasta entonces solo se podía unir un
// ejercicio con el que tenía debajo, y había que reordenar antes a mano.
import React from "react";
import { Link2 } from "lucide-react";
import { t } from "i18n";
import { grupoDe } from "entreno-sesion";
import { HojaInferior, OpcionHoja, TextoSuave } from "./comun.jsx";

// `lista`: los ejercicios (de la sesión o de la rutina); `indice`: el del ⋮; `nombre(ej)`: su nombre en pantalla.
// No se ofrecen el propio ejercicio ni los que ya van en su superserie.
export function HojaSuperserieCon({ lista, indice, nombre, onElegir, onCerrar, idioma }) {
  const grupo = grupoDe(lista, indice);
  const candidatos = lista
    .map((ej, k) => ({ ej, k }))
    .filter(({ k }) => k !== indice && !(grupo && k >= grupo.inicio && k <= grupo.fin));
  return (
    <HojaInferior titulo={t(idioma, "entreno.superserie.conTitulo")} onCerrar={onCerrar} idioma={idioma}>
      <TextoSuave style={{ fontSize: 12.5, margin: "0 2px 6px" }}>{t(idioma, "entreno.superserie.unirAyuda")}</TextoSuave>
      {!candidatos.length && <TextoSuave style={{ padding: "10px 2px" }}>{t(idioma, "entreno.superserie.sinOtros")}</TextoSuave>}
      {candidatos.map(({ ej, k }) => {
        const suyo = grupoDe(lista, k);
        return (
          <OpcionHoja
            key={k}
            icono={Link2}
            onClick={() => onElegir(k)}
            detalle={suyo ? t(idioma, "entreno.superserie.etiqueta", { n: suyo.numero }) : null}
          >
            {nombre(ej)}
          </OpcionHoja>
        );
      })}
    </HojaInferior>
  );
}
