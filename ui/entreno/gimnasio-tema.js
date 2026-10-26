// ---------- ui/entreno/gimnasio-tema.js ----------
// Colores del gimnasio dibujado de FitDraft (parte estética, 26-oct-2026; maquetas v3-01 a v3-03 de
// local/ideas/esteticas/). Como el tema de la cocina (ui/despensa/tema.js), los componentes del dibujo nunca
// escriben un color a mano: lo leen de aquí, para que otro estilo sea solo otra entrada. Los de la interfaz
// que va encima del dibujo (botones, hojas) son las variables de Shell de siempre.
//
// Retro de planta vista desde arriba: el verde de la app en los cojines, el mostaza en los aros y la ruta,
// metal gris verdoso, madera clara en la oficina y baldosa en la recepción.
export const TEMA_GIMNASIO = {
  marco: "#8d8a7c", marcoOsc: "#6f6c60",
  cojin: "#2f6b4f", cojinClaro: "#3f7d60", cojinOsc: "#1f4d38",
  disco: "#3a3d38", discoClaro: "#55584f", discoLinea: "#6b6e66", discoNegro: "#26282a",
  menta: "#9fc1ad", madera: "#c99d62", maderaClara: "#e2bf8c", maderaOsc: "#a87a45", maderaMuyOsc: "#7a5a33", maderaLibros: "#8f6a3d",
  metal: "#aab5ba", metalClaro: "#d5dadd", tinta: "#2b2b26", crema: "#fffdf7",
  mostaza: "#d9a441", mostazaOsc: "#b9862d", oxido: "#c2452d",
  paredTop: "#8a8676", paredCara: "#efe9da", fachada: "#e8e2d2", fachadaLinea: "#c9c3b2", ventanaFachada: "#cfe3d8", ventanaMarco: "#b9bcb2",
  planta: "#5aa35a", plantaOsc: "#4b8f4b", plantaClara: "#6db86d", maceta: "#c9773b", macetaOsc: "#a85f2c",
  piel: "#e8c9a6", mofletes: "#e8a68a", pelo: "#3a3d38", pantalon: "#3a3d38",
  // suelos
  acera: "#d9d6cd", aceraLinea: "#c9c5b9", calzada: "#9aa197", bordillo: "#c3bfb2",
  caucho: "#cfd3c9", cauchoLinea: "#c4c9be", baldosa: "#e6dcc6", baldosaLinea: "#d6caae",
  tarima: "#e8d6b3", tarimaLinea: "#d8c39a", tarimaLinea2: "#ddc9a3", pasillo: "#e8e2c9", fondo: "#e7e3d6",
  // esterillas
  esterilla1: "#7fb08f", esterilla2: "#9fc1ad", esterilla3: "#d9c27a", esterillaOsc: "#5c9e78",
  // corcho y pizarra
  corcho: "#d4a46a", corchoMarco: "#a87a45", corchoPunto: "#b98a52",
  pizarra: "#2c4a3e", tiza: "#f4f1e8", tizaVerde: "#b6e3bf", tizaAmarilla: "#f6e59d", tizaNaranja: "#f6c29d",
  mostrador: "#b38b55", plataforma: "#4a4d47", agua: "#8fc9e8", luzTorno: "#7ff0a6", hojaLibro: "#cfc8b6", cafe: "#6b4423",
  espejo: "#dfeceb", espejoMarco: "#b9c2bb", cuerda: "#8a7a5c", banco: "#c7ccc0",
  puerta: "rgba(170,215,200,0.6)", puertaLuz: "#fff4c2", alfeizar: "#d9c9a6",
  // zonas: el suelo de cada una, y los tintes de la semana (verde = entrenada; gris = olvidada)
  suelo: { pierna: "#d6dacd", espalda: "#d4d9d1", pecho: "#dbd7cb", hombros: "#d5dacf", brazos: "#dad7cd", core: "#d2ddcf", cardio: "#d8d8d0" },
  tinteOlvidada: "#7d7a6c", insigniaVerde: "#b6e3bf", insigniaGris: "#d8d3c4", telarana: "#fffdf7",
};
