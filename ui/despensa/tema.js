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
    interiorMueble: "#5f9a8d",  // dentro del mueble de debajo del fregadero (con sus cañerías)
    tuberia: "#f7f6f0",         // el sifón de plástico blanco
    tuberiaSombra: "#d6d5ca",
    botella: "#b5dc8a",         // la botella de detergente que recoge el agua del grifo
    botellaOscura: "#7fb24f",   // la rosca de su boca
    charco: "#968e5e",          // agua sucia (la de la botella y la del charco): a propósito, de color feo
    charcoOscuro: "#77703f",
    charcoBrillo: "#c9c095",
    alerta: "#c2452d",          // cantidades de lo que se está acabando
    // Los detalles de la cocina (estética del 26-oct-2026, ui/despensa/detalles.jsx): el frutero de la
    // repisa, las hojas de la planta, su mosca y la mancha que deja, y el cable de la lámpara.
    mimbre: "#d9b06a",
    mimbreOscuro: "#b38b55",
    hoja: "#6fbb6f",
    mosca: "#2b2b26",
    alaMosca: "#dfe9ef",
    ojoMosca: "#c2452d",
    mancha: "#3f5a2a",          // verde oscuro, no rojo, para que no sea desagradable
    cable: "#8a7a5c",
  },
};

export const TEMA_NEVERA_POR_DEFECTO = "retro";

export function temaNevera(clave) {
  return TEMAS_NEVERA[clave] || TEMAS_NEVERA[TEMA_NEVERA_POR_DEFECTO];
}
