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
} from "firebase/firestore";

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
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

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
    const mod = await loadMainApp();
    root.render(React.createElement(mod.default));
  } else {
    removeLogoutButton();
    root.render(React.createElement(LoginScreen));
  }
});
