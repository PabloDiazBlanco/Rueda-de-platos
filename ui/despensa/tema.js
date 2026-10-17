// ---------- ui/despensa/tema.js ----------
// Estilos de dibujo de la nevera, el congelador y la despensa (Fase B). El usuario eligió el «retro»
// (menta, esquinas muy redondas, tiradores cromados, congelador arriba) entre cuatro propuestas
// (local/ideas/diseno-nevera/, con su galería y el generador de los dibujos). Todo lo que pinta la
// nevera sale de uno de estos objetos, nunca de un color escrito a mano en los componentes, para que
// el día que se quiera ofrecer otro estilo (un selector en Ajustes, quizá como extra premium) baste con
// añadir aquí su entrada y guardar la clave elegida en el perfil.
//
// No son variables de tema de la app (las de Shell, en ui/marco/cabecera.jsx): son los colores de una
// ilustración, igual que los de la comida dibujada (ui/despensa/dibujos.jsx).

export const TEMAS_NEVERA = {
  retro: {
    cuerpo: "#9ad4c6",          // chapa de la nevera
    cuerpoOscuro: "#6fb5a6",    // juntas, bisagras, patas, canto de la puerta
    brillo: "#c8eee5",          // reflejo vertical de la chapa
    interior: "#f4fbf9",
    interiorSombra: "#dcefe9",  // pared del fondo, algo más oscura, para dar profundidad
    balda: "#b9e0d7",           // baldas de cristal y frente del cajón
    puertaInterior: "#e2f3ef",
    tirador: "#d5dadd",         // cromado
    tiradorOscuro: "#9aa3a8",
    escarcha: "#e8f5fa",        // interior del congelador
    luz: "#fff4c2",
    madera: "#e2bf8c",          // estante de la despensa
    maderaOscura: "#c99d62",
    fondoEstante: "#f3e6d0",
    texto: "#1f4d38",           // títulos y etiquetas dentro del dibujo
    textoSuave: "#4f7f73",
    radio: 34,                  // esquinas de la nevera (en unidades del dibujo, 200 de ancho)
    // La cocina de alrededor (capas 2 y 3): pared, azulejos, encimera y muebles, suelo, y lo que hay
    // encima de la encimera (fregadero con su grifo y vitrocerámica).
    pared: "#f9f3e6",           // algo más cálida que el fondo de la app, para que la cocina se distinga
    azulejo: "#e3f1ec",
    juntas: "#cfe5de",
    encimera: "#d9cdb4",
    encimeraCanto: "#c8b996",
    mueble: "#9ad4c6",
    muebleOscuro: "#6fb5a6",
    suelo: "#d8c8a8",
    metal: "#aab5ba",           // grifo y fregadero
    metalClaro: "#d5dadd",
    vitro: "#2f302c",
    fuego: "#e05a3f",
    agua: "#8fc9e8",
    planta: "#5aa35a",
    maceta: "#c9773b",
  },
};

export const TEMA_NEVERA_POR_DEFECTO = "retro";

export function temaNevera(clave) {
  return TEMAS_NEVERA[clave] || TEMAS_NEVERA[TEMA_NEVERA_POR_DEFECTO];
}
