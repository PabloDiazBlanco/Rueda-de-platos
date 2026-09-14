import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getMessaging, getToken, deleteToken } from "firebase/messaging";
import { t, IDIOMAS_DISPONIBLES, leerIdiomaGuardado, guardarIdiomaLocal } from "i18n";

// Identificador público de tu proyecto de Firebase (no es una clave secreta, es normal que
// se vea en el código fuente de cualquier web que use Firebase).
const firebaseConfig = {
  apiKey: "AIzaSyDFTu5zVLHA7KjXiW7tKM1Ufa-vY2L8A_o",
  authDomain: "rueda-de-platos.firebaseapp.com",
  projectId: "rueda-de-platos",
  storageBucket: "rueda-de-platos.firebasestorage.app",
  messagingSenderId: "477523566905",
  appId: "1:477523566905:web:130cdede8cb500cbdac8e8",
};

const firebaseApp = initializeApp(firebaseConfig);

// App Check: añade un "sello" a cada petición para demostrar que viene de verdad de esta web,
// y no de alguien que ha copiado la configuración pública. Debe activarse antes de usar
// cualquier otro servicio de Firebase (Auth, Firestore, AI Logic...).
initializeAppCheck(firebaseApp, {
  provider: new ReCaptchaV3Provider("6LdZOYItAAAAADUcPXKC-RGNnc_b35H2qxgfGu0f"),
  isTokenAutoRefreshEnabled: true,
});

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const functions = getFunctions(firebaseApp);

// ---------- Lectura de etiquetas nutricionales por foto ----------
// La llamada a Gemini en sí ya no vive aquí: vive en functions/analyzeFoodPhoto.js, detrás de una
// Cloud Function que comprueba que la cuenta es premium y aplica la cuota mensual de forma
// atómica ANTES de gastar nada. Un límite comprobado solo en el navegador no protegería nada —
// cualquiera podría saltárselo llamando a Gemini directo, como se hacía antes de tener varios
// usuarios (ver la hoja de ruta de publicación, Fase 2). Aquí solo queda invocar la función y
// traducir sus posibles errores; el resto de la app (app.jsx) sigue llamando a
// window.analyzeFoodPhoto exactamente igual que siempre, sin enterarse del cambio.
const analyzeFoodPhotoCallable = httpsCallable(functions, "analyzeFoodPhoto");

window.analyzeFoodPhoto = async function (photoDataUrl) {
  try {
    const respuesta = await analyzeFoodPhotoCallable({ photoDataUrl });
    return respuesta.data;
  } catch (err) {
    // Los mensajes de error que lanza la función ya vienen en español y listos para mostrar
    // (ver HttpsError en analyzeFoodPhoto.js) — err.message los trae tal cual.
    throw new Error(err.message || "No se ha podido analizar la foto. Inténtalo de nuevo.");
  }
};

// ---------- Suscripción premium: Checkout y portal de gestión de Stripe ----------
// Ambas funciones devuelven { url } — la app solo tiene que redirigir a esa URL
// (window.location.href = url), Stripe se encarga de todo lo demás (formulario de pago, o el
// portal de cancelación/cambio de tarjeta). Ver createCheckoutSession.js y
// createPortalSession.js para el porqué de cada dato que se manda.
const createCheckoutSessionCallable = httpsCallable(functions, "createCheckoutSession");
const createPortalSessionCallable = httpsCallable(functions, "createPortalSession");

window.createCheckoutSession = async function () {
  try {
    const respuesta = await createCheckoutSessionCallable();
    return respuesta.data.url;
  } catch (err) {
    throw new Error(err.message || "No se ha podido iniciar el pago. Inténtalo de nuevo.");
  }
};

window.createPortalSession = async function () {
  try {
    const respuesta = await createPortalSessionCallable();
    return respuesta.data.url;
  } catch (err) {
    throw new Error(err.message || "No se ha podido abrir la gestión de tu suscripción. Inténtalo de nuevo.");
  }
};

// ---------- "Qué puedo cocinar con lo que tengo" ----------
// Igual que analyzeFoodPhoto: la lógica de verdad (premium, cuota, prompt a Gemini) vive en
// functions/suggestMeals.js. Aquí solo se invoca y se traducen los errores — el catálogo de
// alimentos hay que mandarlo desde app.jsx en cada llamada, porque la función no tiene forma de
// leer el JSON de datos de la app (vive bajo una clave opaca en Firestore que solo entiende
// app.jsx, no la Cloud Function).
const suggestMealsCallable = httpsCallable(functions, "suggestMeals");

window.suggestMeals = async function ({ photoDataUrl, especias, otrosIngredientes, catalogo }) {
  try {
    const respuesta = await suggestMealsCallable({ photoDataUrl, especias, otrosIngredientes, catalogo });
    return respuesta.data.sugerencias;
  } catch (err) {
    throw new Error(err.message || "No se han podido generar sugerencias. Inténtalo de nuevo.");
  }
};

// ---------- Notificaciones push: recordatorio de pesaje (Fase 6) ----------
// Clave pública VAPID del proyecto de Firebase — no es secreta (viaja en el propio navegador,
// igual que firebaseConfig de arriba), pero hay que generarla a mano una sola vez en la consola
// de Firebase (Configuración del proyecto → Cloud Messaging → pestaña "Web Push certificates" →
// generar par de claves) y pegarla aquí. Sin esto, requestPushPermission falla con un error de
// Firebase al pedir el token — no hay forma de evitar este paso manual desde el código.
const VAPID_PUBLIC_KEY = "BOVHvRG5q0ac0_Cg8w4WzbPUfvifxWw72x5wnb_YLDFNIx_lDUdmZabecAH98YKoQKLaJS2Hy3MplSUNr0rSJz4";

// Misma "keys" que el resto de datos de la app (ver makeFirestoreStorage más abajo) — así el
// token vive bajo las mismas reglas de seguridad de siempre (cada usuario solo lee/escribe las
// suyas), sin necesitar ninguna regla nueva. La Cloud Function programada
// (functions/sendWeighInReminders.js) lee esta clave para saber a quién mandar el push cada día.
const PUSH_TOKEN_KEY = "rueda-de-platos:push-token-v1";

function soportaPushNotifications() {
  return typeof Notification !== "undefined" && "serviceWorker" in navigator;
}

// Pide permiso de notificaciones al navegador, registra el token de FCM y lo guarda en Firestore.
// Lanza errores con un `.code` reconocible (mismo patrón que window.deleteAccount) para que
// PerfilView, en app.jsx, pueda traducirlos a un mensaje en el idioma de la interfaz en vez de
// mostrar el texto en español de aquí abajo, que es solo un mensaje de repuesto.
window.requestPushPermission = async function () {
  if (!soportaPushNotifications()) {
    const err = new Error("Este navegador no admite notificaciones push.");
    err.code = "unsupported";
    throw err;
  }

  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    const err = new Error("No se ha concedido el permiso de notificaciones.");
    err.code = "permission-denied";
    throw err;
  }

  // getToken necesita el registro del service worker para saber a qué archivo (sw.js, con su
  // manejador onBackgroundMessage) asociar los mensajes que lleguen con la app cerrada.
  const registration = (await window.swRegistrationPromise) || undefined;

  let token;
  try {
    const messaging = getMessaging(firebaseApp);
    token = await getToken(messaging, { vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: registration });
  } catch (e) {
    const err = new Error("No se ha podido generar el token de notificaciones.");
    err.code = "token-failed";
    throw err;
  }
  if (!token) {
    const err = new Error("No se ha podido generar el token de notificaciones.");
    err.code = "token-failed";
    throw err;
  }

  const user = auth.currentUser;
  if (user) {
    await setDoc(doc(db, "users", user.uid, "keys", PUSH_TOKEN_KEY), { value: token });
  }
  return token;
};

// Desactivar: revoca el token en el propio navegador y borra la copia guardada en Firestore, para
// que la Cloud Function programada deje de intentar mandarle nada a esta cuenta. Nunca lanza —se
// llama también al desmarcar la casilla sin que la interfaz tenga que gestionar un posible error.
window.disablePushNotifications = async function () {
  try {
    if (soportaPushNotifications()) {
      await deleteToken(getMessaging(firebaseApp));
    }
  } catch (e) {
    // Si ya no había token, o el navegador no coopera al revocarlo, no pasa nada: lo importante
    // es borrar la copia en Firestore, que es lo que de verdad consulta la Cloud Function.
  }
  const user = auth.currentUser;
  if (user) {
    await deleteDoc(doc(db, "users", user.uid, "keys", PUSH_TOKEN_KEY)).catch(() => {});
  }
};

// ---------- Almacenamiento respaldado por Firestore, ligado al usuario que ha iniciado sesión ----------
// Misma forma que window.storage (get/set/delete/list), para que el resto de la app
// (app.jsx) funcione exactamente igual sin tener que tocarlo.
function makeFirestoreStorage(uid) {
  return {
    async get(key) {
      const ref = doc(db, "users", uid, "keys", key);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return { key, value: snap.data().value, shared: false };
    },
    async set(key, value) {
      const ref = doc(db, "users", uid, "keys", key);
      await setDoc(ref, { value });
      return { key, value, shared: false };
    },
    async delete(key) {
      const ref = doc(db, "users", uid, "keys", key);
      await deleteDoc(ref);
      return { key, deleted: true, shared: false };
    },
    async list(prefix) {
      const snaps = await getDocs(collection(db, "users", uid, "keys"));
      const keys = [];
      snaps.forEach((d) => {
        if (!prefix || d.id.startsWith(prefix)) keys.push(d.id);
      });
      return { keys, prefix, shared: false };
    },
  };
}

// ---------- Eliminar cuenta: borra todos los datos y la cuenta de Auth, sin dejar restos ----------
// Firebase exige una sesión "reciente" para operaciones sensibles como borrar una cuenta, así que
// primero se reautentica siempre (con Google vía popup, o con la contraseña que pase quien llama)
// y solo después se borra nada. El orden de borrado importa: los documentos de Firestore se borran
// ANTES que la cuenta de Auth, porque las reglas de seguridad exigen seguir autenticado como ese
// uid para poder borrarlos — si se hiciera al revés, el usuario se quedaría sin cuenta pero con
// datos huérfanos e imposibles de limpiar desde el cliente.
window.deleteAccount = async function (password) {
  const user = auth.currentUser;
  if (!user) throw new Error("No hay ninguna sesión activa.");

  const esGoogle = user.providerData[0]?.providerId === "google.com";
  if (esGoogle) {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  } else {
    if (!password) {
      const err = new Error("Introduce tu contraseña para confirmar.");
      err.code = "needs-password";
      throw err;
    }
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  }

  const snaps = await getDocs(collection(db, "users", user.uid, "keys"));
  await Promise.all(snaps.docs.map((d) => deleteDoc(d.ref)));

  await deleteUser(user);
};

// ---------- Estado premium, en vivo ----------
// El campo "premium" de users/{uid} solo lo escribe el webhook de Stripe (ver Fase 2 y las
// reglas de Firestore) — el cliente aquí solo LEE, y lo hace con onSnapshot para que la app se
// desbloquee sola en cuanto el webhook confirme el pago, sin que el usuario tenga que recargar
// la página. app.jsx llama a esto una vez al montar y guarda el resultado en su propio estado de
// React (mismo patrón que window.storage: el puente con Firebase vive aquí, app.jsx no sabe nada
// de Firestore). Devuelve la función de "dejar de escuchar" de onSnapshot, para poder limpiarla
// si el componente se desmonta.
window.subscribePremiumStatus = function (callback) {
  const user = auth.currentUser;
  if (!user) {
    callback({ active: false });
    return () => {};
  }
  return onSnapshot(doc(db, "users", user.uid), (snap) => {
    const datos = snap.data() || {};
    callback(datos.premium || { active: false });
  });
};

// ---------- Migración: traer, una sola vez, los datos que ya hubiera en este navegador ----------
async function migrateLocalDataIfNeeded(uid) {
  const localKeys = Object.keys(localStorage).filter((k) => k.startsWith("rueda-de-platos:"));
  if (!localKeys.length) return;

  const marker = `rueda-de-platos:migrated:${uid}`;
  if (localStorage.getItem(marker)) return; // ya se preguntó antes para esta cuenta en este dispositivo

  const existing = await getDoc(doc(db, "users", uid, "keys", "rueda-de-platos:data-v1"));
  if (existing.exists()) {
    // Ya hay datos en la cuenta (quizá de otro dispositivo): no pisamos nada sin preguntar.
    localStorage.setItem(marker, "1");
    return;
  }

  const quiere = window.confirm(
    "Hemos encontrado datos guardados en este dispositivo (ingredientes, menús...).\n\n" +
    "¿Quieres importarlos a tu cuenta nueva? Se copiarán una sola vez."
  );
  if (quiere) {
    for (const key of localKeys) {
      const value = localStorage.getItem(key);
      await setDoc(doc(db, "users", uid, "keys", key), { value });
    }
  }
  localStorage.setItem(marker, "1");
}

// ---------- Botón flotante de cerrar sesión (fuera de la app, para no tocar su código) ----------
function renderLogoutButton() {
  if (document.getElementById("logout-btn")) return;
  const btn = document.createElement("button");
  btn.id = "logout-btn";
  btn.textContent = "Cerrar sesión";
  btn.style.cssText =
    "position:fixed;top:10px;right:10px;z-index:9999;font-family:'Helvetica Neue',Arial,sans-serif;" +
    "font-size:12px;font-weight:700;color:#1f4d38;background:#e6efe6;border:none;" +
    "border-radius:20px;padding:7px 12px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.15);";
  btn.onclick = () => signOut(auth);
  document.body.appendChild(btn);
}
function removeLogoutButton() {
  const btn = document.getElementById("logout-btn");
  if (btn) btn.remove();
}

// ---------- Bandera de un idioma, dibujada a mano en SVG ----------
// Copia exacta de la de app.jsx — no se comparte entre los dos archivos porque no hay ninguna capa
// de componentes UI compartida entre auth-bootstrap.jsx y app.jsx (Logica/ es solo lógica sin JSX,
// ver CLAUDE.md), y son cinco SVG pequeños, no compensa montar nada para evitar esta duplicación.
// No se usan emoji de bandera a propósito: catalán, gallego y euskera no tienen código de país
// ISO, así que su emoji de bandera no existe de forma fiable en la mayoría de sistemas.
function FlagIcon({ lang, size = 20 }) {
  const w = Math.round(size * 1.5);
  const vb = "0 0 30 20";
  const wrapStyle = { borderRadius: 3, display: "block", flexShrink: 0 };
  if (lang === "es") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#AA151B" />
        <rect y="5" width="30" height="10" fill="#F1BF00" />
      </svg>
    );
  }
  if (lang === "en") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#00247D" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#fff" strokeWidth="4" />
        <line x1="30" y1="0" x2="0" y2="20" stroke="#fff" strokeWidth="4" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#CF142B" strokeWidth="1.8" />
        <line x1="30" y1="0" x2="0" y2="20" stroke="#CF142B" strokeWidth="1.8" />
        <line x1="15" y1="0" x2="15" y2="20" stroke="#fff" strokeWidth="6" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#fff" strokeWidth="6" />
        <line x1="15" y1="0" x2="15" y2="20" stroke="#CF142B" strokeWidth="3" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#CF142B" strokeWidth="3" />
      </svg>
    );
  }
  if (lang === "ca") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#FCDD09" />
        {[1, 3, 5, 7].map((i) => (
          <rect key={i} y={(20 / 9) * i} width="30" height={20 / 9} fill="#DA121A" />
        ))}
      </svg>
    );
  }
  if (lang === "gl") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#fff" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#0090C4" strokeWidth="5" />
      </svg>
    );
  }
  if (lang === "eu") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#D52B1E" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#009B48" strokeWidth="4.5" />
        <line x1="30" y1="0" x2="0" y2="20" stroke="#009B48" strokeWidth="4.5" />
        <line x1="15" y1="0" x2="15" y2="20" stroke="#fff" strokeWidth="5" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#fff" strokeWidth="5" />
      </svg>
    );
  }
  return null;
}

// ---------- Selector de idioma (bienvenida/login) ----------
// Solo cambia el idioma de estas pantallas de antes de iniciar sesión (y se recuerda en
// localStorage vía guardarIdiomaLocal, ver Logica/i18n.js) — una vez dentro de la app con sesión
// iniciada, manda perfil.idioma, elegible también desde Perfil (Ajustes, en el menú lateral).
function IdiomaSwitch({ idioma, onChange }) {
  return (
    <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 5 }}>
      {IDIOMAS_DISPONIBLES.map((i) => (
        <button
          key={i.key}
          onClick={() => onChange(i.key)}
          aria-label={i.label}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "3px 5px 4px", borderRadius: 8, border: "1.5px solid",
            borderColor: idioma === i.key ? "#1f4d38" : "transparent",
            background: "#fffdf7", cursor: "pointer",
          }}
        >
          <FlagIcon lang={i.key} size={15} />
          <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 9, fontWeight: 700, color: idioma === i.key ? "#1f4d38" : "#6b6a5e" }}>
            {i.key.toUpperCase()}
          </span>
        </button>
      ))}
    </div>
  );
}

// ---------- Pantalla de login ----------
// ---------- Pantalla de bienvenida (antes del login) ----------
function WelcomeScreen({ onLogin, idioma, onChangeIdioma }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1ede0", padding: 20, boxSizing: "border-box", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <IdiomaSwitch idioma={idioma} onChange={onChangeIdioma} />
      <div style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🍽️</div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 26, color: "#1f4d38", marginBottom: 8 }}>FoodDraft</div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: 15, color: "#6b6a5e", maxWidth: 260, margin: "0 auto", lineHeight: 1.5 }}>
          {t(idioma, "app.eslogan")}
        </div>
        <div style={{ width: 120, height: 120, margin: "1.5rem auto", borderRadius: "50%", border: "6px solid #d9a441", borderTopColor: "#2f6b4f", borderRightColor: "#6b4423" }} />
        <div style={{ marginTop: "2.5rem" }}>
          <button
            onClick={onLogin}
            style={{ background: "none", border: "none", color: "#1f4d38", fontSize: 13, fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}
          >
            {t(idioma, "welcome.iniciarSesion")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Envuelve el login: primero la bienvenida, y solo al pulsar "Iniciar sesión" aparece el formulario real.
// El idioma elegido aquí (o el recordado de la última vez) se comparte entre ambas pantallas y se
// guarda en localStorage, para que sobreviva a un cierre de sesión y sirva de punto de partida al
// crear una cuenta nueva (ver migrateData/ProfileOnboarding en app.jsx).
function LoggedOutFlow() {
  const [showLogin, setShowLogin] = useState(false);
  const [idioma, setIdioma] = useState(() => leerIdiomaGuardado());

  function cambiarIdioma(nuevo) {
    setIdioma(nuevo);
    guardarIdiomaLocal(nuevo);
  }

  return showLogin
    ? <LoginScreen idioma={idioma} onChangeIdioma={cambiarIdioma} />
    : <WelcomeScreen onLogin={() => setShowLogin(true)} idioma={idioma} onChangeIdioma={cambiarIdioma} />;
}

// ---------- Pantalla de "por qué existe esta app" (se muestra una sola vez, justo tras completar
// o saltar el perfil por primera vez). No toca nada de app.jsx: vigila los datos guardados desde fuera. ----------
function HistoriaScreen({ onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "#f1ede0",
        overflowY: "auto", fontFamily: "'Helvetica Neue', Arial, sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, color: "#1f4d38" }}>Por qué existe esta app</div>
        </div>

        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14.5, lineHeight: 1.7, color: "#2b2b26", margin: "0 0 14px" }}>
          Cada día se toman cientos de pequeñas decisiones sobre comida: qué preparar, qué pedir, qué picar entre
          horas. Ese desgaste tiene nombre — <em>fatiga de decisión</em> — y la psicología lleva décadas
          estudiándolo en ámbitos como la medicina o la justicia. La evidencia es clara: cuanto más agotada está
          la capacidad de decidir, más se recurre a lo automático e impulsivo, y con la comida eso suele
          traducirse en menos autocontrol y elecciones menos saludables.
        </p>
        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14.5, lineHeight: 1.7, color: "#2b2b26", margin: "0 0 22px" }}>
          Esta app parte de esa idea: si las comidas de siempre rotan solas, se ahorra ese desgaste diario — y
          con menos decisiones que tomar, hay menos margen para que la fatiga acabe en un atracón. No busca
          controlar las calorías al gramo. Busca algo más simple: quitar peso mental de encima, para que comer
          deje de ser una decisión más que arrastrar cada día.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 26 }}>
          {[
            ["🔄", "Variedad automática", "para no caer siempre en lo mismo"],
            ["🧠", "Menos decisiones", "la app elige, tú solo cocinas"],
            ["🌱", "Sin obsesión", "los números guían, no condenan"],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ background: "#fffdf7", border: "1px solid #ddd6bf", borderRadius: 9, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1f4d38" }}>{title}</div>
                <div style={{ fontSize: 11.5, color: "#6b6a5e" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{ width: "100%", background: "#2f6b4f", color: "#fff", border: "none", borderRadius: 9, padding: 12, fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
        >
          Vamos allá
        </button>
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#6b6a5e", fontSize: 12, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}
          >
            Saltar
          </button>
        </div>
      </div>
    </div>
  );
}

// Vigila (desde fuera, sin tocar app.jsx) el momento en que se completa o se salta el perfil por primera
// vez, y muestra HistoriaScreen justo entonces. Si el perfil ya estaba resuelto de antes (usuario ya
// conocido), no se muestra nunca — es solo para la primera vez.
function watchForFirstProfileCompletion(uid) {
  const dataDocRef = doc(db, "users", uid, "keys", "rueda-de-platos:data-v1");
  let unsub = null;

  function showOverlay() {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const overlayRoot = ReactDOM.createRoot(container);
    overlayRoot.render(
      <HistoriaScreen
        onClose={() => {
          overlayRoot.unmount();
          container.remove();
        }}
      />
    );
  }

  getDoc(dataDocRef)
    .catch(() => null)
    .then((snap) => {
      let yaResuelto = false;
      if (snap && snap.exists()) {
        try {
          yaResuelto = !!JSON.parse(snap.data().value).perfilOnboardingDone;
        } catch (e) {}
      }
      if (yaResuelto) return; // usuario ya conocido: no volver a mostrarla

      unsub = onSnapshot(dataDocRef, (s) => {
        if (!s.exists()) return;
        try {
          if (JSON.parse(s.data().value).perfilOnboardingDone) {
            showOverlay();
            if (unsub) unsub();
          }
        } catch (e) {}
      });
    });
}

function LoginScreen({ idioma, onChangeIdioma }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function traducirError(code) {
    const map = {
      "auth/invalid-email": "error.emailInvalido",
      "auth/user-not-found": "error.usuarioNoExiste",
      "auth/wrong-password": "error.passwordIncorrecta",
      "auth/invalid-credential": "error.credencialInvalida",
      "auth/email-already-in-use": "error.emailEnUso",
      "auth/weak-password": "error.passwordDebil",
      "auth/popup-closed-by-user": "error.popupCerrado",
    };
    return map[code] ? t(idioma, map[code]) : t(idioma, "error.generico", { code });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(traducirError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(traducirError(err.code));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd6bf",
    fontSize: 14, boxSizing: "border-box", fontFamily: "'Helvetica Neue', Arial, sans-serif",
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1ede0", padding: 20, boxSizing: "border-box" }}>
      <IdiomaSwitch idioma={idioma} onChange={onChangeIdioma} />
      <div style={{ background: "#fffdf7", borderRadius: 14, padding: "28px 26px", width: "100%", maxWidth: 340, border: "1px solid #ddd6bf", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>🍽️</div>
          <div style={{ fontSize: 20, color: "#1f4d38", fontFamily: "Georgia, 'Times New Roman', serif" }}>FoodDraft</div>
          <div style={{ fontSize: 12, color: "#6b6a5e", marginTop: 4 }}>
            {mode === "login" ? t(idioma, "login.subtituloLogin") : t(idioma, "login.subtituloSignup")}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input type="email" required placeholder={t(idioma, "login.email")} value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" required placeholder={t(idioma, "login.password")} value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, marginTop: 10 }} />
          {error && <div style={{ color: "#9c4a2b", fontSize: 12, marginTop: 8 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", marginTop: 14, padding: "10px 12px", borderRadius: 8, border: "none", background: "#2f6b4f", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {loading ? t(idioma, "login.entrando") : mode === "login" ? t(idioma, "login.iniciarSesion") : t(idioma, "login.crearCuenta")}
          </button>
        </form>

        <button onClick={handleGoogle} disabled={loading} style={{ width: "100%", marginTop: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd6bf", background: "#fff", color: "#2b2b26", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
          {t(idioma, "login.continuarGoogle")}
        </button>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: "#6b6a5e" }}>
          {mode === "login" ? (
            <span>
              {t(idioma, "login.noTienesCuenta")}{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); setError(""); }} style={{ color: "#2f6b4f", fontWeight: 700 }}>
                {t(idioma, "login.creaAqui")}
              </a>
            </span>
          ) : (
            <span>
              {t(idioma, "login.yaTienesCuenta")}{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setError(""); }} style={{ color: "#2f6b4f", fontWeight: 700 }}>
                {t(idioma, "login.iniciaSesionLink")}
              </a>
            </span>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#a5a394" }}>
          <a href="privacidad.html" style={{ color: "#a5a394" }}>{t(idioma, "login.privacidad")}</a>
          {" · "}
          <a href="terminos.html" style={{ color: "#a5a394" }}>{t(idioma, "login.terminos")}</a>
        </div>
      </div>
    </div>
  );
}

// privacidad.html/terminos.html ya tienen su propio selector ES/EN y leen/guardan el idioma con el
// mismo Logica/i18n.js (ver su <script type="module">) — no heredan el idioma de esta pantalla vía
// props porque son páginas HTML sueltas, no parte de esta SPA, así que abren siempre con el idioma
// que ya estuviera guardado en localStorage.
function LoadingScreen() {
  const idioma = leerIdiomaGuardado();
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1ede0", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#6b6a5e" }}>
      {t(idioma, "loading.cargando")}
    </div>
  );
}

// ---------- Arranque ----------
// Se reutiliza SIEMPRE el mismo "root" de React (login, carga, o la app real),
// para evitar el problema de montar dos raíces distintas sobre el mismo hueco del DOM.
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(LoadingScreen));

// app.jsx (el componente de la app en sí) se descarga y se prepara una sola vez,
// y solo se ejecuta cuando window.storage ya está listo (tras iniciar sesión).
let mainAppModulePromise = null;
function loadMainApp() {
  if (!mainAppModulePromise) {
    mainAppModulePromise = fetch("app.jsx")
      .then((r) => r.text())
      .then((code) => Babel.transform(code, { presets: ["react"], sourceType: "module" }).code)
      .then((transformed) => {
        const blob = new Blob([transformed], { type: "text/javascript" });
        return import(URL.createObjectURL(blob));
      });
  }
  return mainAppModulePromise;
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    window.storage = makeFirestoreStorage(user.uid);
    window.authProvider = user.providerData[0]?.providerId === "google.com" ? "google" : "password";
    await migrateLocalDataIfNeeded(user.uid);
    renderLogoutButton();
    watchForFirstProfileCompletion(user.uid);
    const mod = await loadMainApp();
    root.render(React.createElement(mod.default));
  } else {
    removeLogoutButton();
    root.render(React.createElement(LoggedOutFlow));
  }
});
