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
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const saveTimer = useRef(null);
  // Solo se guarda lo que se ha leído bien de la nube (o una cuenta nueva de verdad): ver cargar().
  const cargaFiable = useRef(false);
  const ultimoDato = useRef(null);
  ultimoDato.current = data;

  // Idioma de la interfaz: mientras no haya perfil cargado (o si nunca se completó el onboarding),
  // se usa el que se eligió/detectó en la pantalla de bienvenida (ver logica/i18n.js); en cuanto
  // hay un perfil real con idioma propio, ese manda. `idiomaFallback` se calcula una sola vez al
  // montar, no en cada render, para no releer localStorage sin necesidad.
  const [idiomaFallback] = useState(() => leerIdiomaGuardado());
  const idioma = (data && data.perfil && data.perfil.idioma) || idiomaFallback;

  // Carga los datos guardados, aplicándoles migrateData; si la migración cambió algo, lo guarda ya
  // migrado. Sin datos (cuenta nueva), se arranca de initialData().
  //
  // Una lectura que falla NO es una cuenta nueva (riesgo D1 del diagnóstico de octubre de 2026): antes se
  // arrancaba igualmente de initialData(), la app enseñaba el alta y completarla o saltarla escribía un
  // documento vacío encima de todos los datos de la cuenta. Ahora el error (sin conexión, documento
  // ilegible...) se lanza: useCargaInicial lo recoge, app.jsx enseña «No se han podido cargar tus datos ·
  // Reintentar» y aquí no se guarda nada mientras la carga no haya ido bien (`cargaFiable`).
  async function cargar() {
    const res = await window.storage.get(STORAGE_KEY, false);
    if (res && res.value) {
      const parsed = JSON.parse(res.value);
      const { data: migrated, changed } = migrateData(parsed);
      cargaFiable.current = true;
      setData(migrated);
      if (changed) {
        window.storage.set(STORAGE_KEY, JSON.stringify(migrated), false).catch(() => {});
      }
    } else {
      cargaFiable.current = true;
      setData(initialData());
    }
  }

  // Guardado. Si falla (no por falta de conexión: sin red, Firestore deja la escritura en cola y la manda
  // al volver; sí por reglas, App Check o un documento demasiado grande), la cabecera dice «Sin guardar»
  // en vez de esconder el indicador (riesgo D12), y se reintenta al volver la conexión o con el siguiente
  // cambio.
  async function guardar(valor) {
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(valor), false);
      setSaveState("saved");
    } catch (e) {
      console.warn("No se han podido guardar los datos:", (e && (e.code || e.message)) || e);
      setSaveState("error");
    }
  }

  useEffect(() => {
    if (!data || loading || !cargaFiable.current) return;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => guardar(data), 500);
    return () => clearTimeout(saveTimer.current);
  }, [data]);

  useEffect(() => {
    if (saveState !== "error") return undefined;
    const reintentar = () => { if (ultimoDato.current && cargaFiable.current) guardar(ultimoDato.current); };
    window.addEventListener("online", reintentar);
    return () => window.removeEventListener("online", reintentar);
  }, [saveState]);

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
// historial, menú simple y su historial, despensa, entreno, cuerpo). Que algo no exista todavía (no hay
// menú generado, nunca se usó la despensa) no es un error: cada cargador lo resuelve solo. Un cargador
// que lanza es que **no se ha podido leer** lo que hay: los demás se cargan igual y `alTerminar(fallos)`
// recibe la lista, para que app.jsx enseñe la pantalla de reintento en vez de seguir con datos vacíos.
// Devuelve `reintentar`, que vuelve a ejecutar solo los cargadores que fallaron.
export function useCargaInicial(cargadores, alTerminar) {
  const actuales = useRef(cargadores);
  actuales.current = cargadores;
  const fin = useRef(alTerminar);
  fin.current = alTerminar;
  const pendientes = useRef(null);

  async function ejecutar() {
    const indices = pendientes.current || actuales.current.map((_, i) => i);
    const fallos = [];
    for (const i of indices) {
      try {
        await actuales.current[i]();
      } catch (e) {
        console.warn("No se ha podido cargar una parte de los datos:", (e && (e.code || e.message)) || e);
        fallos.push(i);
      }
    }
    pendientes.current = fallos.length ? fallos : null;
    fin.current(fallos);
  }

  useEffect(() => { ejecutar(); }, []);
  return ejecutar;
}
