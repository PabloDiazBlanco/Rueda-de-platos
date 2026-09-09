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
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

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

// ---------- Lectura de etiquetas nutricionales por foto (Firebase AI Logic / Gemini) ----------
// Usa el proveedor "Gemini Developer API" (sin necesidad de plan de pago) y el modelo más barato
// disponible. Si algún día Google retira este modelo en concreto, solo hay que cambiar el nombre aquí.
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
const visionModel = getGenerativeModel(ai, {
  model: "gemini-3.1-flash-lite",
  generationConfig: { responseMimeType: "application/json" },
});

const FOOD_PHOTO_PROMPT =
  "Eres un asistente que lee etiquetas de información nutricional de productos alimenticios envasados.\n" +
  "Analiza la foto adjunta y devuelve ÚNICAMENTE un JSON (sin texto adicional, sin bloques de código, sin explicaciones) con esta forma exacta:\n" +
  '{"kcal": number|null, "prot": number|null, "fat": number|null, "carb": number|null, "sal": number|null, "azucares": number|null, "fibra": number|null, "grasaSaturada": number|null}\n' +
  "Reglas:\n" +
  "- Todos los valores son por cada 100 g (o 100 ml) de producto, tal como aparezca en la tabla nutricional de la foto.\n" +
  "- \"prot\" = proteínas, \"fat\" = grasas totales, \"carb\" = hidratos de carbono totales, \"grasaSaturada\" = de las cuales saturadas, \"azucares\" = de los cuales azúcares.\n" +
  "- Si la tabla da los valores por ración y no por 100 g, calcula tú el equivalente por 100 g si es posible.\n" +
  "- Si algún dato no aparece con claridad en la foto, o no estás razonablemente seguro de haberlo leído bien, pon null en ese campo. No inventes ni redondees de forma creativa.";

// Convierte un data URL (data:image/jpeg;base64,....) en las partes que necesita Gemini.
function dataUrlToInlinePart(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error("La imagen no tiene un formato reconocible.");
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

const NUMERIC_FIELDS = ["kcal", "prot", "fat", "carb", "sal", "azucares", "fibra", "grasaSaturada"];

window.analyzeFoodPhoto = async function (photoDataUrl) {
  let result;
  try {
    result = await visionModel.generateContent([dataUrlToInlinePart(photoDataUrl), FOOD_PHOTO_PROMPT]);
  } catch (err) {
    throw new Error("No se ha podido contactar con el lector de etiquetas. Comprueba tu conexión e inténtalo de nuevo.");
  }

  let text;
  try {
    text = result.response.text();
  } catch (err) {
    throw new Error("La respuesta no se pudo leer. Prueba con otra foto.");
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error("La foto no se ha podido interpretar como una tabla nutricional. Prueba con otra imagen más nítida.");
  }

  const clean = {};
  NUMERIC_FIELDS.forEach((key) => {
    const v = parsed[key];
    clean[key] = typeof v === "number" && Number.isFinite(v) ? v : null;
  });
  return clean;
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

// ---------- Pantalla de login ----------
// ---------- Pantalla de bienvenida (antes del login) ----------
function WelcomeScreen({ onLogin }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1ede0", padding: 20, boxSizing: "border-box", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🍽️</div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 26, color: "#1f4d38", marginBottom: 8 }}>Rueda de Platos</div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: 15, color: "#6b6a5e", maxWidth: 260, margin: "0 auto", lineHeight: 1.5 }}>
          Come variado, sin pensarlo cada día.
        </div>
        <div style={{ width: 120, height: 120, margin: "1.5rem auto", borderRadius: "50%", border: "6px solid #d9a441", borderTopColor: "#2f6b4f", borderRightColor: "#6b4423" }} />
        <div style={{ marginTop: "2.5rem" }}>
          <button
            onClick={onLogin}
            style={{ background: "none", border: "none", color: "#1f4d38", fontSize: 13, fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// Envuelve el login: primero la bienvenida, y solo al pulsar "Iniciar sesión" aparece el formulario real.
function LoggedOutFlow() {
  const [showLogin, setShowLogin] = useState(false);
  return showLogin ? <LoginScreen /> : <WelcomeScreen onLogin={() => setShowLogin(true)} />;
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

function LoginScreen() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function traducirError(code) {
    const map = {
      "auth/invalid-email": "El email no es válido.",
      "auth/user-not-found": "No existe ninguna cuenta con ese email.",
      "auth/wrong-password": "Contraseña incorrecta.",
      "auth/invalid-credential": "Email o contraseña incorrectos.",
      "auth/email-already-in-use": "Ya existe una cuenta con ese email. Prueba a iniciar sesión.",
      "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
      "auth/popup-closed-by-user": "Has cerrado la ventana de Google antes de terminar.",
    };
    return map[code] || `Ha ocurrido un error (${code}). Inténtalo de nuevo.`;
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1ede0", padding: 20, boxSizing: "border-box" }}>
      <div style={{ background: "#fffdf7", borderRadius: 14, padding: "28px 26px", width: "100%", maxWidth: 340, border: "1px solid #ddd6bf", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>🍽️</div>
          <div style={{ fontSize: 20, color: "#1f4d38", fontFamily: "Georgia, 'Times New Roman', serif" }}>Rueda de Platos</div>
          <div style={{ fontSize: 12, color: "#6b6a5e", marginTop: 4 }}>
            {mode === "login" ? "Inicia sesión para ver tus datos" : "Crea tu cuenta"}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" required placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, marginTop: 10 }} />
          {error && <div style={{ color: "#9c4a2b", fontSize: 12, marginTop: 8 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", marginTop: 14, padding: "10px 12px", borderRadius: 8, border: "none", background: "#2f6b4f", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {loading ? "Un momento…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </form>

        <button onClick={handleGoogle} disabled={loading} style={{ width: "100%", marginTop: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd6bf", background: "#fff", color: "#2b2b26", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
          Continuar con Google
        </button>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: "#6b6a5e" }}>
          {mode === "login" ? (
            <span>
              ¿No tienes cuenta?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); setError(""); }} style={{ color: "#2f6b4f", fontWeight: 700 }}>
                Créala aquí
              </a>
            </span>
          ) : (
            <span>
              ¿Ya tienes cuenta?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setError(""); }} style={{ color: "#2f6b4f", fontWeight: 700 }}>
                Inicia sesión
              </a>
            </span>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#a5a394" }}>
          <a href="privacidad.html" style={{ color: "#a5a394" }}>Política de privacidad</a>
          {" · "}
          <a href="terminos.html" style={{ color: "#a5a394" }}>Términos de uso</a>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1ede0", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#6b6a5e" }}>
      Cargando…
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
