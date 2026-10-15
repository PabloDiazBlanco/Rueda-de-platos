// ---------- ui/estado/despensa.js ----------
// Hook de la despensa (Fase A de la idea F1, ver logica/despensa.js): lo que hay en casa, guardado
// en su propia clave, y las acciones que lo cambian. Lo usan la pantalla «¿Qué tengo?»
// (ui/despensa/despensa.jsx) y el Menú completo (confirmar el menú, lista de la compra neta y
// descontar al marcar una comida como hecha). La nevera dibujada de la Fase B se apoyará solo en
// lo que devuelve este hook, sin tocar la lógica.
// Como el resto de hooks de ui/estado/, no importa ningún otro: los datos y el menú le llegan desde
// app.jsx, que es quien los combina (por ejemplo, el aviso de useCatalogo al borrar un alimento).
import { useState, useEffect, useRef } from "react";
import { getFood } from "macros";
import { fechaISO } from "peso";
import {
  ZONAS, migrarDespensa, anadirItem, editarItem, quitarItem, quitarAlimento, menuEstaConfirmado, confirmarMenu,
  quitarConfirmacion, descontarComida, devolverComida, consumoDe, marcarComprado, desmarcarComprado,
} from "despensa";
import { necesidadesComida, calcularListaNeta } from "lista-compra-neta";

// Documento aparte de los datos principales (STORAGE_KEY en datos.js), con su propia versión: ver
// la cabecera de logica/despensa.js.
export const CLAVE_DESPENSA = "rueda-de-platos:despensa-v1";

// `menu` es el del Menú completo: el único que se confirma y descuenta (el Menú simple queda fuera
// de la despensa, decisión del usuario).
export function useDespensa(data, menu) {
  const [despensa, setDespensa] = useState(null);
  const saveTimer = useRef(null);
  // Lo último que hay guardado en la nube (como texto), para no reescribir lo mismo que se acaba
  // de leer — y para que una cuenta que nunca usa la despensa no cree ningún documento hasta que
  // apunta algo.
  const ultimoGuardado = useRef(null);

  async function cargar() {
    let guardado = null;
    try {
      const res = await window.storage.get(CLAVE_DESPENSA, false);
      if (res && res.value) guardado = JSON.parse(res.value);
    } catch (e) {
      // sin despensa guardada todavía (o ilegible): se empieza vacía, igual que useDatos
    }
    const { despensa: migrada, changed } = migrarDespensa(guardado);
    ultimoGuardado.current = guardado && changed ? null : JSON.stringify(migrada);
    setDespensa(migrada);
  }

  // Guardado automático con un pequeño retardo, como los datos principales: varias acciones
  // seguidas (tachar media lista de la compra) acaban en una sola escritura.
  useEffect(() => {
    if (!despensa) return;
    const texto = JSON.stringify(despensa);
    if (texto === ultimoGuardado.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      window.storage.set(CLAVE_DESPENSA, texto, false).then(() => { ultimoGuardado.current = texto; }).catch(() => {});
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [despensa]);

  const hoy = () => fechaISO(new Date());
  function cambiar(fn) {
    setDespensa((prev) => (prev ? fn(prev) : prev));
  }

  const confirmado = menuEstaConfirmado(despensa, menu);
  const items = (despensa && despensa.items) || [];
  const porZona = Object.fromEntries(ZONAS.map((z) => [z, items.filter((i) => i.zona === z)]));

  // Se llama junto con toggleComidaCompletada (ui/estado/menu.js) al marcar o desmarcar una comida
  // del Menú completo como hecha hoy. Descontar, solo con el menú confirmado (un borrador no toca la
  // despensa); devolver, siempre que se hubiera descontado algo para esa comida, aunque entretanto
  // se haya quitado la confirmación — lo descontado salió de verdad y tiene que poder volver.
  function alMarcarComida(meal, hecha) {
    if (!meal) return;
    const fecha = hoy();
    if (!hecha) cambiar((d) => devolverComida(d, { fecha, mealType: meal.mealType }));
    else if (confirmado) {
      const necesidades = necesidadesComida(data, meal);
      cambiar((d) => descontarComida(d, { fecha, mealType: meal.mealType, slotId: meal.id, necesidades }));
    }
  }

  return {
    despensa, cargar, porZona, confirmado,
    confirmar: () => cambiar((d) => confirmarMenu(d, menu, hoy())),
    quitarConfirmacion: () => cambiar(quitarConfirmacion),
    anadir(foodId, opciones) {
      const food = getFood(data, foodId);
      if (food) cambiar((d) => anadirItem(d, food, opciones));
    },
    editar: (itemId, cambios) => cambiar((d) => editarItem(d, itemId, cambios)),
    quitar: (itemId) => cambiar((d) => quitarItem(d, itemId)),
    // Lista de la compra neta de una semana (1, 2) o del ciclo entero ("todo"): ver calcularListaNeta.
    listaNeta: (alcance) => calcularListaNeta(data, menu, alcance, despensa),
    comprar: (fila) => cambiar((d) => marcarComprado(d, fila, getFood(data, fila.foodId))),
    desComprar: (fila) => cambiar((d) => desmarcarComprado(d, fila)),
    alMarcarComida,
    consumoDeHoy: (mealType) => consumoDe(despensa, hoy(), mealType),
    // Lo conecta app.jsx con useCatalogo: un alimento borrado del catálogo sale también de aquí.
    alBorrarAlimento: (foodId) => cambiar((d) => quitarAlimento(d, foodId)),
  };
}
