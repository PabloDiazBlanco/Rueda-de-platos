// ---------- ui/estado/entreno.js ----------
// Hook del módulo de entreno: el catálogo (ejercicios propios, personalización, rutinas, ajustes), el
// índice, la sesión en curso (borrador) con su guardado seguro, los meses de entrenos bajo demanda y la
// cola de envíos pendientes. Toda la lógica pura está en logica/entreno-*.js; aquí solo se lee y escribe
// con window.storage y localStorage, y se envuelven las operaciones para las pantallas de ui/entreno/.
// Como el resto de hooks de ui/estado/, no importa ningún otro: los datos (para el peso corporal del
// perfil) le llegan desde app.jsx.
//
// Reglas de guardado (CLAUDE.md, «Entrenamiento»; diseño en local/ideas/gimnasio/03-…, §5.3):
// 1. Cada cambio del borrador va al instante a localStorage y, con 2,5 s de retraso y al ocultarse la app,
//    a la nube. Al cargar gana el de `actualizado` mayor (este dispositivo o la nube).
// 2. Al terminar, la sesión entra en la cola local; se escribe en su mes y, si va bien, se actualiza el
//    índice y sale de la cola. Si falla (sin conexión en el gimnasio), se reintenta al cargar y con `online`.
// 3. Editar o borrar una sesión pasada reescribe su mes y reconstruye el índice.
// 4. Nunca window.storage.list(): los meses se conocen por el índice.
import { useState, useEffect, useRef, useMemo } from "react";
import { uid } from "comun";
import { listaEjercicios, ejercicioPorId } from "entreno-ejercicios";
import { anteriorEquivalente, fechaLocal } from "entreno-calculo";
import * as S from "entreno-sesion";
import {
  CLAVE_CATALOGO, CLAVE_INDICE, CLAVE_BORRADOR, claveMes, mesDe, migrarCatalogo, migrarMes, migrarIndice,
  migrarBorrador, anadirSesionAMes, quitarSesionDeMes, reconstruirIndice, actualizarIndiceConSesion,
  elegirBorrador, encolar, quitarDeCola, mesesDelIndice, indiceVacio,
} from "entreno-almacen";

// Copias de este dispositivo (comodidad y red de seguridad, ver la excepción documentada en el diseño:
// aquí localStorage guarda el borrador para que no dependa de la red, pero los datos definitivos siguen
// en la cuenta).
const LOCAL_BORRADOR = "fooddraft:entreno-borrador";
const LOCAL_COLA = "fooddraft:entreno-pendientes";
const RETRASO_NUBE_MS = 2500;

function leerLocal(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v ? JSON.parse(v) : porDefecto;
  } catch (e) {
    return porDefecto;
  }
}
function escribirLocal(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (e) {
    // sin localStorage (navegación privada muy restrictiva) solo queda la nube
  }
}

async function leerNube(clave) {
  const res = await window.storage.get(clave, false);
  return res && res.value ? JSON.parse(res.value) : null;
}
const escribirNube = (clave, valor) => window.storage.set(clave, JSON.stringify(valor), false);

const mesActual = () => fechaLocal(Date.now()).slice(0, 7);

export function useEntreno(data) {
  const [catalogo, setCatalogo] = useState(null);
  const [indice, setIndice] = useState(indiceVacio());
  const [borrador, setBorrador] = useState(null);
  const [meses, setMeses] = useState({});
  const [cola, setCola] = useState(() => leerLocal(LOCAL_COLA, []));
  const [sesionVisible, setSesionVisible] = useState(false);
  // "ok" | "pendiente": si algo (el borrador o un entreno terminado) aún no ha llegado a la nube. Lo
  // enseña la sesión como «Guardado en este móvil».
  const [nube, setNube] = useState("ok");

  const pesoCorporal = (data && data.perfil && Number(data.perfil.peso)) || null;
  const ref = useRef({});
  ref.current.borrador = borrador;
  ref.current.indice = indice;
  ref.current.catalogo = catalogo;
  ref.current.meses = meses;
  ref.current.pesoCorporal = pesoCorporal;
  const temporizadorNube = useRef(null);
  const ultimoCatalogo = useRef(null);
  // Si la carga de un documento falló (sin conexión al abrir), no se escribe encima hasta haberlo leído
  // bien: escribir un catálogo vacío sobre el bueno sería perder las rutinas.
  const cargaFiable = useRef({ catalogo: false, indice: false });
  const indiceIncompleto = useRef(false);
  const procesandoCola = useRef(false);

  const ejercicioDe = (id) => ejercicioPorId(ref.current.catalogo, id);

  // ---------- Carga ----------
  async function cargarCatalogo() {
    try {
      const guardado = await leerNube(CLAVE_CATALOGO);
      const { valor, changed } = migrarCatalogo(guardado);
      ultimoCatalogo.current = guardado && changed ? null : JSON.stringify(valor);
      cargaFiable.current.catalogo = true;
      setCatalogo(valor);
    } catch (e) {
      if (!ref.current.catalogo) setCatalogo(migrarCatalogo(null).valor);
    }
  }

  async function cargarIndice() {
    try {
      const { valor, reconstruir: incompleto } = migrarIndice(await leerNube(CLAVE_INDICE));
      cargaFiable.current.indice = true;
      // Un índice de antes de G4 no sabe la última sesión de cada rutina: se reconstruye una vez, cuando
      // ya hay datos (ver el efecto de «comprobado» más abajo).
      indiceIncompleto.current = incompleto;
      setIndice(valor);
      return valor;
    } catch (e) {
      return ref.current.indice;
    }
  }

  async function cargarBorrador() {
    const local = leerLocal(LOCAL_BORRADOR, null);
    let enNube = null;
    try {
      enNube = migrarBorrador(await leerNube(CLAVE_BORRADOR)).valor;
    } catch (e) {
      setNube("pendiente");
    }
    // Se comparan los envoltorios ({ sesion, actualizado }): un «no hay borrador» más reciente (se terminó
    // el entreno) gana a una sesión vieja que quedó en la nube sin borrar.
    const elegido = elegirBorrador(local, enNube && { ...enNube, actualizado: enNube.actualizado || (enNube.sesion && enNube.sesion.actualizado) || 0 });
    let sesion = (elegido && elegido.sesion) || null;
    // Un entreno que ya está terminado (en la cola) no puede volver como borrador.
    if (sesion && leerLocal(LOCAL_COLA, []).some((s) => s.id === sesion.id)) sesion = null;
    setBorrador(sesion);
  }

  async function cargar() {
    await cargarCatalogo();
    await cargarIndice();
    await cargarBorrador();
    await cargarMes(mesActual());
  }

  // Lee un mes (una sola vez: queda en memoria). Devuelve su documento.
  async function cargarMes(mes, { forzar = false } = {}) {
    if (!forzar && ref.current.meses[mes]) return ref.current.meses[mes];
    let doc;
    try {
      doc = migrarMes(await leerNube(claveMes(mes)), mes).valor;
    } catch (e) {
      doc = ref.current.meses[mes] || migrarMes(null, mes).valor;
    }
    ref.current.meses = { ...ref.current.meses, [mes]: doc };
    setMeses((m) => ({ ...m, [mes]: doc }));
    return doc;
  }

  // Todos los meses que tienen entrenos (exportar, gráficas de todo el periodo, reconstruir el índice).
  // `extra`: meses que aún no están en el índice (los que acaba de escribir una importación).
  async function cargarTodosLosMeses(extra = []) {
    const lista = [...new Set([...mesesDelIndice(ref.current.indice), mesActual(), ...extra])].sort();
    const docs = [];
    for (const mes of lista) docs.push(await cargarMes(mes));
    return docs;
  }

  async function guardarIndice(nuevo) {
    ref.current.indice = nuevo;
    setIndice(nuevo);
    if (!cargaFiable.current.indice) {
      // No se leyó bien al abrir: se intenta leer ahora antes de pisar nada.
      try { migrarIndice(await leerNube(CLAVE_INDICE)); cargaFiable.current.indice = true; } catch (e) { return; }
    }
    try { await escribirNube(CLAVE_INDICE, nuevo); } catch (e) { /* se corrige solo: ver comprobarIndice */ }
  }

  async function reconstruir(extra = []) {
    const docs = await cargarTodosLosMeses(extra);
    const nuevo = reconstruirIndice(docs, ejercicioDe, ref.current.pesoCorporal);
    await guardarIndice(nuevo);
    return nuevo;
  }

  // Comprobación del índice: si el nº de sesiones del mes actual no cuadra con lo que dice el índice (otra
  // copia de la app terminó un entreno y no llegó a actualizarlo, o se perdió una escritura), se
  // reconstruye leyendo los meses.
  async function comprobarIndice() {
    const mes = mesActual();
    const doc = await cargarMes(mes);
    const enIndice = (ref.current.indice.meses || {})[mes] || 0;
    if ((doc.sesiones || []).length !== enIndice) await reconstruir();
  }

  // ---------- Cola de envíos ----------
  async function procesarCola() {
    if (procesandoCola.current) return;
    procesandoCola.current = true;
    try {
      let pendientes = leerLocal(LOCAL_COLA, []);
      for (const sesion of pendientes) {
        const mes = mesDe(sesion.inicio);
        let doc;
        try {
          doc = migrarMes(await leerNube(claveMes(mes)), mes).valor;
          const yaEstaba = doc.sesiones.some((s) => s.id === sesion.id);
          doc = anadirSesionAMes(doc, sesion);
          await escribirNube(claveMes(mes), doc);
          ref.current.meses = { ...ref.current.meses, [mes]: doc };
          setMeses((m) => ({ ...m, [mes]: doc }));
          // Si ya estaba (un reintento tras escribir el mes pero sin llegar a quitarlo de la cola), sumarla
          // otra vez descuadraría el índice: se reconstruye.
          if (yaEstaba) await reconstruir();
          else await guardarIndice(actualizarIndiceConSesion(ref.current.indice, sesion, ejercicioDe, ref.current.pesoCorporal));
        } catch (e) {
          setNube("pendiente");
          return;
        }
        pendientes = quitarDeCola(leerLocal(LOCAL_COLA, []), sesion.id);
        escribirLocal(LOCAL_COLA, pendientes);
        setCola(pendientes);
      }
      if (!pendientes.length) setNube((n) => (n === "pendiente" && !temporizadorNube.current ? "ok" : n));
    } finally {
      procesandoCola.current = false;
    }
  }

  // ---------- Borrador ----------
  function subirBorrador() {
    clearTimeout(temporizadorNube.current);
    temporizadorNube.current = null;
    const sesion = ref.current.borrador;
    const envoltorio = { version: 1, sesion, actualizado: sesion ? sesion.actualizado : Date.now() };
    escribirNube(CLAVE_BORRADOR, envoltorio).then(
      () => setNube(leerLocal(LOCAL_COLA, []).length ? "pendiente" : "ok"),
      () => setNube("pendiente")
    );
  }

  // Todo cambio de la sesión en curso pasa por aquí: se sella con la hora, se guarda al instante en este
  // dispositivo y se programa la subida a la nube.
  function fijarBorrador(sesion) {
    const sellada = sesion ? { ...sesion, actualizado: Date.now() } : null;
    ref.current.borrador = sellada;
    setBorrador(sellada);
    escribirLocal(LOCAL_BORRADOR, { sesion: sellada, actualizado: sellada ? sellada.actualizado : Date.now() });
    // `nube` no pasa a «pendiente» aquí: los 2,5 s de espera son lo normal y avisar en cada toque sería
    // ruido. Solo cambia si la subida falla (ver subirBorrador).
    clearTimeout(temporizadorNube.current);
    temporizadorNube.current = setTimeout(subirBorrador, RETRASO_NUBE_MS);
  }

  function cambiar(fn) {
    const actual = ref.current.borrador;
    if (!actual) return;
    const nueva = fn(actual);
    if (nueva !== actual) fijarBorrador(nueva);
  }

  // Al ocultarse la app (se bloquea el móvil, se cambia de app) se sube ya lo pendiente; al volver la
  // conexión, también, y se vacía la cola.
  useEffect(() => {
    function alCambiarVisibilidad() {
      if (document.visibilityState === "hidden" && temporizadorNube.current) subirBorrador();
    }
    function alVolverConexion() {
      if (!cargaFiable.current.catalogo) cargarCatalogo();
      if (temporizadorNube.current || nube === "pendiente") subirBorrador();
      procesarCola();
    }
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("online", alVolverConexion);
    return () => {
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("online", alVolverConexion);
    };
  });

  // Cuando ya hay datos (el peso corporal hace falta para el volumen de los ejercicios de peso corporal):
  // vaciar la cola y comprobar el índice, una vez.
  const comprobado = useRef(false);
  useEffect(() => {
    if (!catalogo || !data || comprobado.current) return;
    comprobado.current = true;
    (async () => {
      await procesarCola();
      try {
        if (indiceIncompleto.current) {
          await reconstruir();
          indiceIncompleto.current = false;
        } else await comprobarIndice();
      } catch (e) { /* se reintentará la próxima vez */ }
    })();
  }, [catalogo, data]);

  // ---------- Catálogo: guardado con retraso, como la despensa ----------
  useEffect(() => {
    if (!catalogo) return undefined;
    const texto = JSON.stringify(catalogo);
    if (texto === ultimoCatalogo.current || !cargaFiable.current.catalogo) return undefined;
    const id = setTimeout(() => {
      window.storage.set(CLAVE_CATALOGO, texto, false).then(() => { ultimoCatalogo.current = texto; }).catch(() => {});
    }, 500);
    return () => clearTimeout(id);
  }, [catalogo]);

  function cambiarCatalogo(fn) {
    setCatalogo((c) => (c ? fn(c) : c));
  }

  const lista = useMemo(() => listaEjercicios(catalogo), [catalogo]);
  const ajustes = (catalogo && catalogo.ajustes) || migrarCatalogo(null).valor.ajustes;
  // «Anterior» de un ejercicio. Con `contexto` ({ rutinaId, ocurrencia }), el equivalente de G4: lo que se
  // hizo en la última sesión de esa rutina; sin él, la última vez a secas.
  const anteriorDe = (id, contexto) => anteriorEquivalente(ref.current.indice, id, contexto || {});
  const descansoDe = (id) => {
    const e = ejercicioDe(id);
    return e && e.descansoSeg !== undefined && e.descansoSeg !== null ? e.descansoSeg : null;
  };
  const opcionesSesion = () => ({ ajustes: ref.current.catalogo ? ref.current.catalogo.ajustes : ajustes, anteriorDe, descansoDe });
  // Descanso con el que entra un ejercicio nuevo en una rutina o en un entreno (G3).
  const descansoInicial = (id) => S.descansoInicial(id, opcionesSesion());

  // Sesiones de un mes para pintar: las del documento más las terminadas que aún esperan en la cola.
  function sesionesDeMes(mes) {
    const doc = meses[mes];
    const enDoc = (doc && doc.sesiones) || [];
    const pendientes = cola.filter((s) => mesDe(s.inicio) === mes && !enDoc.some((d) => d.id === s.id));
    return [...enDoc, ...pendientes].sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
  }

  // ---------- Acciones ----------
  return {
    cargar, cargado: !!catalogo, catalogo, ajustes, lista, indice, borrador, meses, cola, nube, pesoCorporal,
    ejercicioDe, anteriorDe, descansoInicial,
    recordsDe: (id) => ((indice.ejercicios || {})[id] || {}).records || {},
    cargarMes, cargarTodosLosMeses, sesionesDeMes, mesActual, reconstruir,

    // Visibilidad de la capa a pantalla completa de la sesión (la pastilla la vuelve a abrir).
    sesionVisible: sesionVisible && !!borrador,
    mostrarSesion: () => setSesionVisible(true),
    ocultarSesion: () => setSesionVisible(false),

    // Sesión en curso
    empezar(rutina = null) {
      fijarBorrador(S.nuevaSesion({ rutina, ahora: Date.now(), ...opcionesSesion() }));
      setSesionVisible(true);
    },
    anadirEjercicios: (ids) => cambiar((s) => S.anadirEjercicios(s, ids, opcionesSesion())),
    quitarEjercicio: (inst) => cambiar((s) => S.quitarEjercicio(s, inst)),
    anadirSerie: (inst) => cambiar((s) => S.anadirSerie(s, inst)),
    quitarSerie: (inst, id) => cambiar((s) => S.quitarSerie(s, inst, id)),
    cambiarTipoSerie: (inst, id, tipo) => cambiar((s) => S.cambiarTipoSerie(s, inst, id, tipo)),
    editarSerie: (inst, id, valores) => cambiar((s) => S.editarSerie(s, inst, id, valores)),
    marcarHecha: (inst, id) => cambiar((s) => S.marcarHecha(s, inst, id, Date.now(), opcionesSesion().ajustes)),
    desmarcar: (inst, id) => cambiar((s) => S.desmarcar(s, inst, id)),
    ajustarDescanso: (seg) => cambiar((s) => S.ajustarDescanso(s, seg)),
    descansoEjercicio: (inst, seg) => cambiar((s) => S.descansoEjercicio(s, inst, seg)),
    saltarDescanso: () => cambiar(S.saltarDescanso),
    // Descanso a mano (botón ⏱ de la barra de la sesión), sin marcar ninguna serie.
    iniciarDescanso: (segundos) => cambiar((s) => {
      const ahora = Date.now();
      return { ...s, descanso: { inicio: ahora, hasta: ahora + segundos * 1000, inst: null, avisado: false } };
    }),
    descansoAvisado: () => cambiar(S.descansoAvisado),
    sustituirHoy: (inst, id) => cambiar((s) => S.sustituirHoy(s, inst, id)),
    reordenar: (desde, hasta) => cambiar((s) => S.reordenar(s, desde, hasta)),
    notaEjercicio: (inst, texto) => cambiar((s) => S.notaEjercicio(s, inst, texto)),
    renombrarSesion: (nombre) => cambiar((s) => ({ ...s, nombre })),
    pausar: () => cambiar((s) => S.pausar(s, Date.now())),
    reanudar: () => cambiar((s) => S.reanudar(s, Date.now())),

    // Terminar: la sesión pasa a la cola (ya es definitiva en este dispositivo) y se intenta subir.
    // `actualizarRutina`: pasar a la rutina los cambios de estructura (ejercicios, orden, series) y de
    // descanso.
    async terminar(opciones = {}, { actualizarRutina = false } = {}) {
      const actual = ref.current.borrador;
      if (!actual) return null;
      const final = S.terminarSesion(actual, Date.now(), opciones);
      if (actualizarRutina && actual.rutinaId) {
        const hoy = fechaLocal(Date.now());
        cambiarCatalogo((c) => ({ ...c, rutinas: c.rutinas.map((r) => (r.id === actual.rutinaId ? S.aplicarARutina(r, final, hoy) : r)) }));
      }
      const nuevaCola = encolar(leerLocal(LOCAL_COLA, []), final);
      escribirLocal(LOCAL_COLA, nuevaCola);
      setCola(nuevaCola);
      setSesionVisible(false);
      fijarBorrador(null);
      subirBorrador();
      await procesarCola();
      return final;
    },
    descartar() {
      setSesionVisible(false);
      fijarBorrador(null);
      subirBorrador();
    },

    // Historial: corregir o borrar una sesión pasada (reescribe su mes y reconstruye el índice).
    async guardarSesionPasada(sesion) {
      const mes = mesDe(sesion.inicio);
      const doc = anadirSesionAMes(await cargarMes(mes, { forzar: true }), { ...sesion, actualizado: Date.now() });
      await escribirNube(claveMes(mes), doc);
      ref.current.meses = { ...ref.current.meses, [mes]: doc };
      setMeses((m) => ({ ...m, [mes]: doc }));
      await reconstruir();
    },
    async borrarSesionPasada(sesion) {
      const mes = mesDe(sesion.inicio);
      const doc = quitarSesionDeMes(await cargarMes(mes, { forzar: true }), sesion.id);
      await escribirNube(claveMes(mes), doc);
      ref.current.meses = { ...ref.current.meses, [mes]: doc };
      setMeses((m) => ({ ...m, [mes]: doc }));
      await reconstruir();
    },

    // Rutinas
    guardarRutina(rutina) {
      const conId = rutina.id ? rutina : { ...rutina, id: "rt_" + uid() };
      const hoy = fechaLocal(Date.now());
      cambiarCatalogo((c) => {
        const existe = c.rutinas.some((r) => r.id === conId.id);
        const final = { ...conId, actualizado: hoy };
        return { ...c, rutinas: existe ? c.rutinas.map((r) => (r.id === conId.id ? final : r)) : [...c.rutinas, final] };
      });
      return conId.id;
    },
    borrarRutina: (id) => cambiarCatalogo((c) => ({ ...c, rutinas: c.rutinas.filter((r) => r.id !== id) })),
    rutinaDesdeSesion(sesion, nombre) {
      const r = S.rutinaDesdeSesion(sesion, nombre, fechaLocal(Date.now()));
      cambiarCatalogo((c) => ({ ...c, rutinas: [...c.rutinas, r] }));
      return r.id;
    },

    // Ejercicios propios y personalización (favorito, nota fija, descanso propio)
    crearPropio(ejercicio) {
      const id = "exp_" + uid();
      cambiarCatalogo((c) => ({ ...c, propios: [...c.propios, { secundarios: [], ...ejercicio, id, creado: fechaLocal(Date.now()), archivado: false }] }));
      return id;
    },
    editarPropio: (id, cambios) => cambiarCatalogo((c) => ({ ...c, propios: c.propios.map((e) => (e.id === id ? { ...e, ...cambios } : e)) })),
    // Un propio no se borra: se archiva, para que las sesiones antiguas sigan sabiendo cómo se llamaba.
    archivarPropio: (id) => cambiarCatalogo((c) => ({ ...c, propios: c.propios.map((e) => (e.id === id ? { ...e, archivado: true } : e)) })),
    personalizar: (id, cambios) => cambiarCatalogo((c) => ({ ...c, personalizados: { ...c.personalizados, [id]: { ...(c.personalizados[id] || {}), ...cambios } } })),

    // Importar de Hevy o Lyfta (G10): `resultado` es el de construirImportacion (logica/entreno-importar.js).
    // Primero los ejercicios propios nuevos (también en ref, porque reconstruir el índice los necesita ya),
    // después cada mes (leer → añadir → escribir, como al terminar un entreno) y al final el índice entero.
    async importar(resultado, app) {
      const { lote, propios, sesiones } = resultado;
      const actual = ref.current.catalogo;
      const nuevo = {
        ...actual,
        propios: [...actual.propios, ...propios],
        importaciones: [...(actual.importaciones || []), { lote, app, fecha: fechaLocal(Date.now()), sesiones: sesiones.length }],
      };
      ref.current.catalogo = nuevo;
      setCatalogo(nuevo);
      const porMes = {};
      sesiones.forEach((s) => { (porMes[mesDe(s.inicio)] = porMes[mesDe(s.inicio)] || []).push(s); });
      for (const [mes, lista] of Object.entries(porMes)) {
        let doc = migrarMes(await leerNube(claveMes(mes)), mes).valor;
        lista.forEach((s) => { doc = anadirSesionAMes(doc, s); });
        await escribirNube(claveMes(mes), doc);
        ref.current.meses = { ...ref.current.meses, [mes]: doc };
        setMeses((m) => ({ ...m, [mes]: doc }));
      }
      await reconstruir(Object.keys(porMes));
    },
    // Deshacer una importación entera: quita de cada mes las sesiones de ese lote, archiva los ejercicios
    // propios que creó (no se borran: alguna sesión hecha después en la app podría usarlos) y reconstruye.
    async deshacerImportacion(lote) {
      const docs = await cargarTodosLosMeses();
      for (const doc of docs) {
        const quedan = (doc.sesiones || []).filter((s) => s.lote !== lote);
        if (quedan.length === (doc.sesiones || []).length) continue;
        const limpio = { ...doc, sesiones: quedan };
        await escribirNube(claveMes(doc.mes), limpio);
        ref.current.meses = { ...ref.current.meses, [doc.mes]: limpio };
        setMeses((m) => ({ ...m, [doc.mes]: limpio }));
      }
      const actual = ref.current.catalogo;
      const nuevo = {
        ...actual,
        propios: actual.propios.map((e) => (e.lote === lote ? { ...e, archivado: true } : e)),
        importaciones: (actual.importaciones || []).filter((i) => i.lote !== lote),
      };
      ref.current.catalogo = nuevo;
      setCatalogo(nuevo);
      await reconstruir();
    },

    cambiarAjustes: (cambios) => cambiarCatalogo((c) => ({ ...c, ajustes: { ...c.ajustes, ...cambios } })),
    cambiarAviso: (cambios) => cambiarCatalogo((c) => ({ ...c, aviso: { ...c.aviso, ...cambios } })),
  };
}
