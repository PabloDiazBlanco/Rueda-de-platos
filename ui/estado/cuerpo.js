// ---------- ui/estado/cuerpo.js ----------
// Hook del área Cuerpo (26-oct-2026): el diario del cuerpo (sueño y pasos de cada día) y los favoritos de
// los informes, cada uno en su clave con su versión y su migración (logica/cuerpo-diario.js). Lo usan la
// pantalla Sueño (ui/cuerpo/sueno.jsx), los pasos de Actividad diaria (ui/cuerpo/pasos.jsx), los informes
// cruzados y el constructor. Como los demás hooks de ui/estado/, no importa ningún otro.
//
// Igual que la despensa: se lee al cargar la app, se guarda con un pequeño retardo y no se crea ningún
// documento hasta que se apunta algo (una cuenta que nunca usa el sueño ni las estrellas no escribe nada).
import { useState, useEffect, useRef } from "react";
import { fechaISO } from "peso";
import {
  migrarDiario, migrarFavoritos, apuntarSueno, quitarSueno, apuntarPasos, ultimoSueno, ultimosDias,
  alternarFavorito, tieneFavorito,
} from "cuerpo-diario";

export const CLAVE_DIARIO = "rueda-de-platos:cuerpo-diario-v1";
export const CLAVE_FAVORITOS = "rueda-de-platos:informes-favoritos-v1";

async function leer(clave) {
  try {
    const res = await window.storage.get(clave, false);
    return res && res.value ? JSON.parse(res.value) : null;
  } catch (e) {
    return null; // sin documento todavía (o ilegible): se empieza vacío, como la despensa
  }
}

// Guardado automático con retardo de un documento: no reescribe lo que se acaba de leer.
function useGuardado(clave, valor, ultimo) {
  const temporizador = useRef(null);
  useEffect(() => {
    if (!valor) return;
    const texto = JSON.stringify(valor);
    if (texto === ultimo.current) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      window.storage.set(clave, texto, false).then(() => { ultimo.current = texto; }).catch(() => {});
    }, 500);
    return () => clearTimeout(temporizador.current);
  }, [valor]);
}

export function useCuerpo() {
  const [diario, setDiario] = useState(null);
  const [favoritos, setFavoritos] = useState(null);
  const ultimoDiario = useRef(null);
  const ultimoFavoritos = useRef(null);

  async function cargar() {
    const [d, f] = await Promise.all([leer(CLAVE_DIARIO), leer(CLAVE_FAVORITOS)]);
    const md = migrarDiario(d);
    const mf = migrarFavoritos(f);
    // Si no había nada guardado, lo vacío no se escribe (hasta que se apunte algo); si la migración cambió
    // algo, sí, para que la nube quede ya con la forma nueva.
    ultimoDiario.current = d && md.changed ? null : JSON.stringify(md.diario);
    ultimoFavoritos.current = f && mf.changed ? null : JSON.stringify(mf.favoritos);
    setDiario(md.diario);
    setFavoritos(mf.favoritos);
  }

  useGuardado(CLAVE_DIARIO, diario, ultimoDiario);
  useGuardado(CLAVE_FAVORITOS, favoritos, ultimoFavoritos);

  const hoy = () => fechaISO(new Date());
  const cambiarDiario = (fn) => setDiario((prev) => (prev ? fn(prev) : prev));

  return {
    cargar,
    diario,
    favoritos,
    hoy,
    // Sueño: la noche que termina en `fecha` (por defecto, anoche = hoy).
    apuntarSueno: (horas, calidad, fecha = hoy()) => cambiarDiario((d) => apuntarSueno(d, fecha, horas, calidad)),
    quitarSueno: (fecha) => cambiarDiario((d) => quitarSueno(d, fecha)),
    ultimoSueno: (fecha = hoy()) => (diario ? ultimoSueno(diario, fecha) : null),
    // Pasos de un día (null o vacío lo borra).
    apuntarPasos: (pasos, fecha = hoy()) => cambiarDiario((d) => apuntarPasos(d, fecha, pasos)),
    ultimosDias: (n, hasta = hoy()) => ultimosDias(diario, hasta, n),
    // Favoritos de los informes y del constructor.
    esFavorito: (id) => tieneFavorito(favoritos, id),
    alternarFavorito: (item) => setFavoritos((prev) => (prev ? alternarFavorito(prev, item) : prev)),
  };
}
