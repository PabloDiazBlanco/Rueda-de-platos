// ---------- ui/estado/datos.js ----------
// Hooks del estado principal de la app: los datos guardados del usuario (perfil, catálogo, pesadas,
// listas...), su carga inicial con migración y su guardado automático; el estado premium en vivo; y
// la secuencia de carga inicial de todo lo guardado. Hasta octubre de 2026 todo esto vivía dentro
// del componente principal de app.jsx (ver CLAUDE.md, "Arquitectura de módulos").
import { useState, useEffect, useRef } from "react";
import { leerIdiomaGuardado } from "i18n";
import { initialData } from "datos-iniciales";
import { migrateData } from "migraciones";

export const STORAGE_KEY = "rueda-de-platos:data-v1";

// `loading` lo lleva el componente principal (abarca también la carga de los menús): mientras dura,
// el guardado automático no se dispara, para no reescribir en la nube lo que se acaba de leer.
export function useDatos(loading) {
  const [data, setData] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const saveTimer = useRef(null);

  // Idioma de la interfaz: mientras no haya perfil cargado (o si nunca se completó el onboarding),
  // se usa el que se eligió/detectó en la pantalla de bienvenida (ver logica/i18n.js); en cuanto
  // hay un perfil real con idioma propio, ese manda. `idiomaFallback` se calcula una sola vez al
  // montar, no en cada render, para no releer localStorage sin necesidad.
  const [idiomaFallback] = useState(() => leerIdiomaGuardado());
  const idioma = (data && data.perfil && data.perfil.idioma) || idiomaFallback;

  // Carga los datos guardados, aplicándoles migrateData; si la migración cambió algo, lo guarda ya
  // migrado. Sin datos (cuenta nueva) o con un error de lectura, se arranca de initialData().
  async function cargar() {
    try {
      const res = await window.storage.get(STORAGE_KEY, false);
      if (res && res.value) {
        const parsed = JSON.parse(res.value);
        const { data: migrated, changed } = migrateData(parsed);
        setData(migrated);
        if (changed) {
          window.storage.set(STORAGE_KEY, JSON.stringify(migrated), false).catch(() => {});
        }
      } else {
        setData(initialData());
      }
    } catch (e) {
      setData(initialData());
    }
  }

  useEffect(() => {
    if (!data || loading) return;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(data), false);
        setSaveState("saved");
      } catch (e) {
        setSaveState("idle");
      }
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [data]);

  return { data, setData, saveState, idioma, idiomaFallback, cargar };
}

// El estado premium vive de verdad en Firestore (users/{uid}.premium, escrito solo por el
// webhook de Stripe) — aquí solo nos suscribimos a los cambios en vivo, vía el puente que
// expone auth-bootstrap.jsx. Así, si pagas mientras tienes la app abierta, se desbloquea sola
// en cuanto el webhook confirma el pago, sin recargar nada.
export function usePremium() {
  const [premium, setPremium] = useState({ active: false });
  useEffect(() => {
    if (typeof window.subscribePremiumStatus !== "function") return;
    const unsub = window.subscribePremiumStatus(setPremium);
    return unsub;
  }, []);
  return premium;
}

// Carga inicial de todo lo guardado, una sola vez al montar y en orden (datos, menú completo y su
// historial, menú simple y su historial, despensa): cada cargador ya captura sus propios errores,
// así que un fallo en uno (por ejemplo, no hay menú generado todavía) no impide cargar los demás.
export function useCargaInicial(cargadores, alTerminar) {
  useEffect(() => {
    (async () => {
      try {
        for (const cargar of cargadores) await cargar();
      } finally {
        alTerminar();
      }
    })();
  }, []);
}
