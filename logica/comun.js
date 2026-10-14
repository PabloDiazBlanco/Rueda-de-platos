// ---------- Utilidades comunes ----------
// Módulo de lógica pura (sin JSX): piezas mínimas compartidas entre app.jsx y el resto de
// módulos (identificadores y nombres de los días), para no duplicarlas en varios sitios.

export const uid = () => Math.random().toString(36).slice(2, 10);

export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
