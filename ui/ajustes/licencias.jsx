// ---------- ui/ajustes/licencias.jsx ----------
// «Licencias de terceros» (26-oct-2026): sección al final de Ajustes, justo antes de cerrar sesión. El texto
// del mapa corporal es el aprobado por el usuario el 26-oct (local/ideas/esteticas/registro.md, «Textos
// legales aprobados», B), en los cinco idiomas; la licencia MIT se enseña entera y **en inglés, sin
// traducir**, porque es el texto legal que obliga a conservar. Va de la mano del aviso de
// ui/comun/mapa-trazados.js, del párrafo de terceros del `LICENSE` y de terminos.propiedadTexto.
//
// Además, las librerías que carga la app, con su licencia comprobada el 26-oct-2026 en el archivo LICENSE /
// package.json de la versión que usa el importmap de index.html (React 18.3.1 y react-dom: MIT, Facebook;
// lucide-react 0.383.0: ISC, Lucide Contributors y Cole Bemis por Feather; Firebase JS SDK 12.17.1:
// Apache-2.0, Google; Babel Standalone 7: MIT, Sebastian McKenzie y colaboradores). Todas se cargan desde
// su CDN, no se copian al repositorio.
import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { t } from "i18n";
import { FUENTE_TEXTO, FUENTE_TITULOS, FUENTE_MONO } from "../estilos.js";

const MIT_MAPA = `MIT License

Copyright (c) 2022 ELABBASSI Hicham

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

// Nombre, licencia y titular de cada librería (nombres propios: no se traducen).
const LIBRERIAS = [
  { nombre: "React", licencia: "MIT", titular: "Facebook, Inc. and its affiliates" },
  { nombre: "Firebase JavaScript SDK", licencia: "Apache-2.0", titular: "Google LLC" },
  { nombre: "lucide-react", licencia: "ISC", titular: "Lucide Contributors; Cole Bemis (Feather)" },
  { nombre: "Babel Standalone", licencia: "MIT", titular: "Sebastian McKenzie and other contributors" },
];

export function SeccionLicencias({ idioma }) {
  const [abierta, setAbierta] = useState(false);
  const p = { fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink)", lineHeight: 1.55, margin: "8px 0 0" };
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", marginTop: 16, maxWidth: 480 }}>
      <h2 style={{ margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 19, color: "var(--green-dark)" }}>{t(idioma, "cuerpo.licencias.titulo")}</h2>
      <p style={p}>{t(idioma, "cuerpo.licencias.intro")}</p>
      <p style={p}><b>{t(idioma, "cuerpo.licencias.mapaTitulo")}</b> {t(idioma, "cuerpo.licencias.mapaTexto")}</p>
      <button
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, background: "none", border: "none", padding: 0, minHeight: 36, fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700, color: "var(--green-dark)" }}
      >
        {abierta ? <ChevronUp size={15} /> : <ChevronDown size={15} />} {t(idioma, abierta ? "cuerpo.licencias.ocultar" : "cuerpo.licencias.ver")}
      </button>
      {abierta && (
        // El mismo texto, en párrafos: con los saltos de línea originales, en un móvil se cortaría a trozos.
        <div lang="en" style={{ fontFamily: FUENTE_MONO, fontSize: 10.5, lineHeight: 1.5, color: "var(--ink)", background: "var(--paper)", borderRadius: 8, padding: "10px 12px", margin: "6px 0 0" }}>
          {MIT_MAPA.split("\n\n").map((parrafo, i) => <p key={i} style={{ margin: i ? "8px 0 0" : 0 }}>{parrafo.replace(/\n/g, " ")}</p>)}
        </div>
      )}
      <p style={{ ...p, marginTop: 12 }}><b>{t(idioma, "cuerpo.licencias.librerias")}</b></p>
      <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.6 }}>
        {LIBRERIAS.map((l) => (
          <li key={l.nombre}><span style={{ color: "var(--ink)", fontWeight: 700 }}>{l.nombre}</span> · {t(idioma, "cuerpo.licencias.licencia", { licencia: l.licencia })} · © {l.titular}</li>
        ))}
      </ul>
    </div>
  );
}
