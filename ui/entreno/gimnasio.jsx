// ---------- ui/entreno/gimnasio.jsx ----------
// El mapa del gimnasio de FitDraft (parte estética, 26-oct-2026): el sistema «híbrido» de la maqueta v3-01
// (D), elegido por el usuario. Es el mismo componente en tres sitios:
// - `modo="explorar"`: la vista Dibujo de Entrenar (ui/entreno/gimnasio-vista.jsx);
// - `modo="rutina"`: añadir ejercicios a una rutina (ui/entreno/mapa-rutina.jsx), con la rutina como ruta;
// - `modo="mini"`: el mini-mapa del descanso entre ejercicios (ui/entreno/mini-mapa.jsx), que no se toca
//   salvo para saltarlo.
//
// Cómo se mueve uno (explorar y rutina):
// - **Mapa**: arrastrar, pellizcar, doble toque para acercar, rueda del ratón y los botones + / − (los pinta
//   la vista). El zoom es la jerarquía: de lejos se leen las zonas; de cerca, las máquinas. Tocar una zona o
//   una máquina la encuadra y avisa (`onZona`); tocar un sitio de la oficina o la recepción, igual (`onSitio`).
// - **Pasear** (`pasear`): la cámara sigue al avatar y un joystick flotante nace donde se pone el pulgar,
//   con una zona muerta de 10 px y un radio de 46 px (la velocidad crece con la distancia). Junto a una
//   máquina o un sitio sale encima del avatar «Usar · …», que hace lo mismo que tocarla en el mapa.
//
// Lo que cambia muchas veces por segundo (la cámara, el avatar, el joystick, las piernas al andar) se mueve
// tocando el SVG directamente con refs, sin pasar por React, como la lámpara de la cocina: el dibujo del
// plano se pinta una vez y solo vuelve a pintarse si cambia lo que enseña (tinte, ruta, aro...).
// Con «reducir movimiento», nada se anima: la cámara salta, el avatar aparece donde iba y no hay puerta.
import React, { useRef, useEffect, useMemo, useState, useImperativeHandle, forwardRef } from "react";
import { t } from "i18n";
import {
  ANCHO, ALTO, FONDO, ZONA, ESTACION, ESTACIONES, SITIO, SITIOS, ENTRADA_FUERA, ENTRADA_DENTRO, libre, aEstrella, largoRuta, puntoDe,
} from "gimnasio";
import { FUENTE_TEXTO } from "../estilos.js";
import { TEMA_GIMNASIO } from "./gimnasio-tema.js";
import { PlanoGimnasio, EstilosGimnasio } from "./gimnasio-dibujo.jsx";
import { AvatarChibi } from "../comun/avatar.jsx";
import { prefiereMenosMovimiento } from "./comun.jsx";

const S_MAX = 3.2;
const S_MIN = 0.42;
// Por debajo de este zoom se ven los rótulos de las zonas; por encima, los de las máquinas.
const S_CERCA = 0.95;
const ZONA_MUERTA = 10;
const RADIO_JOY = 46;
// Donde empieza la ruta de una rutina: delante del torno, ya dentro.
const INICIO_RUTA = [ENTRADA_DENTRO.x, ENTRADA_DENTRO.y - 150];

const cosaDe = (tipo, id) => (tipo === "est" ? ESTACION[id] : tipo === "sitio" ? SITIO[id] : ZONA[id]);

export const MapaGimnasio = forwardRef(function MapaGimnasio(props, ref) {
  const {
    pre, idioma, genero = "mujer", estados, tinte = true, pizarra, semana, paradas = [], siguiente = null, resaltada = null,
    modo = "explorar", pasear = false, onZona, onSitio, onTocar, onCamara, alEntrar, saluda = false,
    margenArriba = 40, margenAbajo = 90, estilo,
  } = props;
  const lienzoRef = useRef(null);
  const mundoRef = useRef(null);
  const avatarRef = useRef(null);
  const lejosRef = useRef(null);
  const cercaRef = useRef(null);
  const puertaRef = useRef(null);
  const joyRef = useRef(null);
  const pomoRef = useRef(null);
  const accionRef = useRef(null);
  const [camino, setCamino] = useState(null); // la ruta que está andando el avatar (puntos de Maps)
  const [cerca, setCerca] = useState(null); // { tipo, id } de lo que hay al lado al pasear

  // Todo lo que cambia sin repintar vive en una sola ref.
  const m = useRef(null);
  if (!m.current) {
    m.current = {
      cam: { x: ANCHO / 2, y: 500, s: 0.6 }, vista: { w: 375, h: 600 },
      av: { x: ENTRADA_DENTRO.x, y: ENTRADA_DENTRO.y, dir: 1, ruta: null, paso: 1, alLlegar: null, vel: 300 },
      joy: { activo: false, ox: 0, oy: 0, vx: 0, vy: 0, movido: false },
      punteros: new Map(), gesto: null, ultimoToque: { t: 0, x: 0, y: 0 },
      animCam: null, vivo: false, tPrev: 0, ultimoPaso: 0, enEntrada: false, tiempos: [], montado: true, cerca: null,
    };
  }
  // Las props que leen los manejadores (siempre las últimas, sin volver a crear los manejadores).
  const p = useRef(props);
  p.current = props;
  const reducido = () => prefiereMenosMovimiento();
  const seguir = () => p.current.pasear || p.current.modo === "mini";

  // ---------- cámara ----------
  const medir = () => {
    const el = lienzoRef.current;
    if (el) m.current.vista = { w: el.clientWidth || 375, h: el.clientHeight || 600 };
  };
  const sAjuste = () => {
    const { w, h } = m.current.vista;
    return Math.min(w / ANCHO, Math.max(0.2, (h - margenAbajo - margenArriba) / FONDO));
  };
  function limitar(c) {
    const { w, h } = m.current.vista;
    c.s = Math.max(Math.min(S_MIN, sAjuste()), Math.min(S_MAX, c.s));
    const vw = w / c.s, vh = h / c.s, abajo = margenAbajo / c.s, arriba = margenArriba / c.s;
    const y0 = -arriba, y1 = ALTO + abajo;
    c.x = ANCHO <= vw ? ANCHO / 2 : Math.max(vw / 2, Math.min(ANCHO - vw / 2, c.x));
    c.y = y1 - y0 <= vh ? (y0 + y1) / 2 : Math.max(y0 + vh / 2, Math.min(y1 - vh / 2, c.y));
    return c;
  }
  function aplicar() {
    const { cam, vista } = m.current;
    limitar(cam);
    if (mundoRef.current) mundoRef.current.setAttribute("transform", `translate(${(vista.w / 2 - cam.x * cam.s).toFixed(1)},${(vista.h / 2 - cam.y * cam.s).toFixed(1)}) scale(${cam.s.toFixed(4)})`);
    const lejos = cam.s < S_CERCA;
    if (lejosRef.current) lejosRef.current.style.display = lejos ? "" : "none";
    if (cercaRef.current) cercaRef.current.style.display = lejos ? "none" : "";
    colocarAccion();
    if (p.current.onCamara) p.current.onCamara();
  }
  const aPantalla = (x, y) => {
    const { cam, vista } = m.current;
    return [(x - cam.x) * cam.s + vista.w / 2, (y - cam.y) * cam.s + vista.h / 2];
  };
  const aMundo = (px, py) => {
    const { cam, vista } = m.current;
    return [(px - vista.w / 2) / cam.s + cam.x, (py - vista.h / 2) / cam.s + cam.y];
  };
  function moverCamara(dest, ms = 450, alFin) {
    const st = m.current;
    const ini = { ...st.cam };
    const fin = limitar({ ...st.cam, ...dest });
    if (st.animCam) st.animCam.parar();
    if (reducido() || ms <= 0) { st.cam = fin; aplicar(); if (alFin) alFin(); return; }
    const t0 = performance.now();
    let parado = false, id = 0;
    const paso = (ahora) => {
      if (parado || !st.montado) return;
      const k = Math.min(1, (ahora - t0) / ms);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      st.cam = { x: ini.x + (fin.x - ini.x) * e, y: ini.y + (fin.y - ini.y) * e, s: ini.s + (fin.s - ini.s) * e };
      aplicar();
      if (k < 1) id = requestAnimationFrame(paso);
      else { st.animCam = null; if (alFin) alFin(); }
    };
    id = requestAnimationFrame(paso);
    // Si el navegador no pinta (pestaña oculta), se llega igual al final.
    const respaldo = setTimeout(() => {
      if (!parado && st.animCam) { parado = true; cancelAnimationFrame(id); st.cam = fin; aplicar(); st.animCam = null; if (alFin) alFin(); }
    }, ms + 250);
    st.animCam = { parar: () => { parado = true; cancelAnimationFrame(id); clearTimeout(respaldo); st.animCam = null; } };
  }
  function vistaInicial() {
    if (seguir()) return { x: m.current.av.x, y: m.current.av.y - 20, s: 1.15 };
    const s = sAjuste();
    return { x: ANCHO / 2, y: (m.current.vista.h / 2 - margenArriba) / s, s };
  }
  // Encuadre de una cosa: que quepa con aire, sin pasar de `sMax`, y un poco subida (`subir`, en fracción de
  // pantalla) para que la hoja de abajo no la tape.
  function encuadrar(cosa, sMax = 2.2, subir = 0.2) {
    const { vista } = m.current;
    const s = Math.min(sMax, vista.w / (cosa.w + 40), vista.h / (cosa.h + 60));
    return { x: cosa.x + cosa.w / 2, y: cosa.y + cosa.h / 2 + (vista.h * subir) / s, s };
  }

  // ---------- el avatar ----------
  function colocarAvatar() {
    const { av } = m.current;
    if (avatarRef.current) avatarRef.current.setAttribute("transform", `translate(${av.x.toFixed(1)},${av.y.toFixed(1)}) scale(${av.dir},1)`);
  }
  function piernas(ahora, andando) {
    const el = avatarRef.current;
    if (!el) return;
    const a = el.querySelector('[data-pierna="a"]'), b = el.querySelector('[data-pierna="b"]'), c = el.querySelector("[data-cuerpo]");
    if (!a || !b || !c) return;
    if (!andando || reducido()) { a.removeAttribute("transform"); b.removeAttribute("transform"); c.removeAttribute("transform"); return; }
    if (ahora - m.current.ultimoPaso < 140) return;
    m.current.ultimoPaso = ahora;
    const uno = a.getAttribute("transform");
    a.setAttribute("transform", uno ? "" : "translate(0,-2)");
    b.setAttribute("transform", uno ? "translate(0,-2)" : "");
    c.setAttribute("transform", "translate(0,-0.8)");
  }
  function caminar(destino, alLlegar, opc = {}) {
    const st = m.current;
    const ruta = aEstrella(st.av.x, st.av.y, destino[0], destino[1]);
    if (!ruta) { if (alLlegar) alLlegar(); return; }
    if (reducido() || opc.saltar) {
      st.av.x = destino[0]; st.av.y = destino[1]; st.av.ruta = null;
      colocarAvatar();
      if (seguir()) moverCamara({ x: st.av.x, y: st.av.y - 20 }, 0);
      if (alLlegar) alLlegar();
      return;
    }
    st.av.ruta = ruta; st.av.paso = 1; st.av.alLlegar = alLlegar;
    st.av.vel = opc.duracion ? Math.max(60, largoRuta(ruta) / (opc.duracion / 1000)) : opc.vel || 320;
    if (!opc.sinCamino) setCamino(ruta);
    despertar();
  }
  function terminarCamino() {
    const st = m.current;
    st.av.ruta = null;
    setCamino(null);
    colocarAvatar();
    if (seguir() && p.current.modo !== "mini") moverCamara({ x: st.av.x, y: st.av.y - 20 }, 200);
    const fn = st.av.alLlegar;
    st.av.alLlegar = null;
    if (fn) fn();
  }
  function llegarYa() {
    const { av } = m.current;
    if (!av.ruta) return;
    const fin = av.ruta[av.ruta.length - 1];
    av.x = fin[0]; av.y = fin[1];
    terminarCamino();
  }

  // ---------- bucle de animación (andar, joystick, cámara que sigue) ----------
  function despertar() {
    const st = m.current;
    if (st.vivo) return;
    st.vivo = true;
    st.tPrev = performance.now();
    requestAnimationFrame(bucle);
  }
  function bucle(ahora) {
    const st = m.current;
    if (!st.montado) { st.vivo = false; return; }
    const dt = Math.min(0.05, (ahora - st.tPrev) / 1000);
    st.tPrev = ahora;
    const { av, joy } = st;
    let andando = false;
    if (av.ruta) {
      let avance = av.vel * dt;
      while (avance > 0 && av.ruta) {
        const [tx, ty] = av.ruta[av.paso];
        const dx = tx - av.x, dy = ty - av.y, d = Math.hypot(dx, dy);
        if (Math.abs(dx) > 0.01) av.dir = dx < 0 ? -1 : 1;
        if (d <= avance) {
          av.x = tx; av.y = ty; avance -= d; av.paso++;
          if (av.paso >= av.ruta.length) { terminarCamino(); break; }
        } else { av.x += (dx / d) * avance; av.y += (dy / d) * avance; avance = 0; }
      }
      andando = !!av.ruta;
    } else if (joy.activo && (joy.vx || joy.vy)) {
      const vel = 210 * dt, nx = av.x + joy.vx * vel, ny = av.y + joy.vy * vel;
      if (Math.abs(joy.vx) > 0.01) av.dir = joy.vx < 0 ? -1 : 1;
      if (libre(nx, av.y)) av.x = nx;
      if (libre(av.x, ny)) av.y = ny;
      andando = true;
    }
    colocarAvatar();
    piernas(ahora, andando);
    if (seguir() && (andando || joy.activo)) {
      const k = p.current.modo === "mini" ? 0.35 : 0.2;
      st.cam.x += (av.x - st.cam.x) * k;
      st.cam.y += (av.y - 20 - st.cam.y) * k;
      aplicar();
    }
    if (p.current.pasear) comprobarCerca();
    if (andando || joy.activo || av.ruta) requestAnimationFrame(bucle);
    else { st.vivo = false; piernas(ahora, false); }
  }

  // ---------- al pasear: lo que hay al lado ----------
  function comprobarCerca() {
    const { av } = m.current;
    let nuevo = null;
    for (const e of ESTACIONES) if (av.x > e.x - 26 && av.x < e.x + e.w + 26 && av.y > e.y - 26 && av.y < e.y + e.h + 30) { nuevo = { tipo: "est", id: e.id }; break; }
    if (!nuevo) for (const s of SITIOS) if (av.x > s.x - 26 && av.x < s.x + s.w + 26 && av.y > s.y - 26 && av.y < s.y + s.h + 34) { nuevo = { tipo: "sitio", id: s.id }; break; }
    const antes = m.current.cerca;
    if ((nuevo && nuevo.id) !== (antes && antes.id)) { m.current.cerca = nuevo; setCerca(nuevo); }
    colocarAccion();
  }
  function colocarAccion() {
    const el = accionRef.current;
    if (!el) return;
    const { av, cam, vista } = m.current;
    const [px, py] = aPantalla(av.x, av.y);
    el.style.left = `${Math.max(90, Math.min(vista.w - 90, px))}px`;
    el.style.top = `${Math.max(60, py - 52 * Math.max(1, cam.s))}px`;
  }

  // ---------- ir a una cosa ----------
  function abrir(tipo, id) {
    if (tipo === "sitio") { if (p.current.onSitio) p.current.onSitio(id); return; }
    if (tipo === "est") { if (p.current.onZona) p.current.onZona(ESTACION[id].zona, id); return; }
    if (p.current.onZona) p.current.onZona(id, null);
  }
  function irA(tipo, id) {
    const cosa = cosaDe(tipo, id);
    if (!cosa) return;
    if (p.current.pasear) {
      const { av } = m.current;
      const destino = tipo === "zona" ? [cosa.x + cosa.w / 2, cosa.y + cosa.h / 2] : puntoDe(cosa, [av.x, av.y]);
      caminar(destino, () => abrir(tipo, id));
      return;
    }
    if (tipo === "zona") moverCamara(encuadrar(cosa, 2, -0.07), 450);
    else moverCamara(encuadrar(cosa, 1.9, 0.22), 420);
    abrir(tipo, id);
  }

  // ---------- gestos ----------
  function posicion(ev) {
    const rc = lienzoRef.current.getBoundingClientRect();
    return [ev.clientX - rc.left, ev.clientY - rc.top];
  }
  function tocar(ev) {
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const est = el && el.closest("[data-est]"), sit = el && el.closest("[data-sitio]"), zona = el && el.closest("[data-zona-chip]");
    if (est) return irA("est", est.getAttribute("data-est"));
    if (sit) return irA("sitio", sit.getAttribute("data-sitio"));
    if (zona) return irA("zona", zona.getAttribute("data-zona-chip"));
    // Doble toque en el suelo: acercar ahí.
    const [px, py] = posicion(ev);
    const st = m.current;
    const ahora = performance.now();
    if (ahora - st.ultimoToque.t < 320 && Math.hypot(px - st.ultimoToque.x, py - st.ultimoToque.y) < 30) {
      const [wx, wy] = aMundo(px, py);
      const s = st.cam.s * 1.8;
      moverCamara({ s, x: wx - (px - st.vista.w / 2) / s, y: wy - (py - st.vista.h / 2) / s }, 300);
      st.ultimoToque.t = 0;
      return;
    }
    st.ultimoToque = { t: ahora, x: px, y: py };
  }
  function alPulsar(ev) {
    const st = m.current;
    if (st.enEntrada) { saltarEntrada(); return; }
    if (p.current.modo === "mini") { if (p.current.onTocar) p.current.onTocar(); return; }
    try { lienzoRef.current.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura, sigue funcionando */ }
    const [x, y] = posicion(ev);
    st.punteros.set(ev.pointerId, { x, y });
    if (st.animCam) st.animCam.parar();
    if (p.current.pasear && st.punteros.size === 1) {
      // Joystick flotante: nace donde se pone el pulgar.
      Object.assign(st.joy, { activo: true, ox: x, oy: y, vx: 0, vy: 0, movido: false });
      if (joyRef.current) { joyRef.current.style.left = `${x}px`; joyRef.current.style.top = `${y}px`; joyRef.current.style.display = "block"; }
      if (pomoRef.current) pomoRef.current.style.transform = "";
      despertar();
      return;
    }
    if (st.punteros.size === 1) st.gesto = { tipo: "toque", x0: x, y0: y, cam0: { ...st.cam } };
    else if (st.punteros.size === 2 && !p.current.pasear) {
      const [p1, p2] = [...st.punteros.values()];
      st.gesto = { tipo: "pellizco", d0: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1, m0: [(p1.x + p2.x) / 2, (p1.y + p2.y) / 2], cam0: { ...st.cam } };
    }
  }
  function alMover(ev) {
    const st = m.current;
    if (!st.punteros.has(ev.pointerId)) return;
    const [x, y] = posicion(ev);
    st.punteros.set(ev.pointerId, { x, y });
    if (st.joy.activo) {
      let dx = x - st.joy.ox, dy = y - st.joy.oy;
      const d = Math.hypot(dx, dy);
      if (d > RADIO_JOY) { dx = (dx / d) * RADIO_JOY; dy = (dy / d) * RADIO_JOY; }
      if (pomoRef.current) pomoRef.current.style.transform = `translate(${dx}px,${dy}px)`;
      if (d < ZONA_MUERTA) { st.joy.vx = 0; st.joy.vy = 0; }
      else {
        const f = Math.min(1, 0.35 + ((Math.min(d, RADIO_JOY) - ZONA_MUERTA) / (RADIO_JOY - ZONA_MUERTA)) * 0.65);
        st.joy.vx = (dx / Math.min(d, RADIO_JOY)) * f;
        st.joy.vy = (dy / Math.min(d, RADIO_JOY)) * f;
        st.joy.movido = true;
      }
      return;
    }
    const g = st.gesto;
    if (!g) return;
    if (g.tipo === "toque" && Math.hypot(x - g.x0, y - g.y0) > 7) g.tipo = "arrastre";
    if (g.tipo === "arrastre") {
      st.cam = { ...g.cam0, x: g.cam0.x - (x - g.x0) / g.cam0.s, y: g.cam0.y - (y - g.y0) / g.cam0.s };
      aplicar();
    }
    if (g.tipo === "pellizco" && st.punteros.size === 2) {
      const [p1, p2] = [...st.punteros.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y), mid = [(p1.x + p2.x) / 2, (p1.y + p2.y) / 2];
      const s = g.cam0.s * (d / g.d0);
      const wx = (g.m0[0] - st.vista.w / 2) / g.cam0.s + g.cam0.x, wy = (g.m0[1] - st.vista.h / 2) / g.cam0.s + g.cam0.y;
      st.cam = { s, x: wx - (mid[0] - st.vista.w / 2) / s, y: wy - (mid[1] - st.vista.h / 2) / s };
      aplicar();
    }
  }
  function alSoltar(ev) {
    const st = m.current;
    if (!st.punteros.has(ev.pointerId)) return;
    st.punteros.delete(ev.pointerId);
    if (st.joy.activo) {
      st.joy.activo = false; st.joy.vx = 0; st.joy.vy = 0;
      if (joyRef.current) joyRef.current.style.display = "none";
      // Un toque sin mover también sirve para usar lo que hay al lado, si se toca encima.
      if (!st.joy.movido && st.cerca) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const cosa = el && el.closest("[data-est],[data-sitio]");
        if (cosa && (cosa.getAttribute("data-est") || cosa.getAttribute("data-sitio")) === st.cerca.id) abrir(st.cerca.tipo, st.cerca.id);
      }
      return;
    }
    if (st.gesto && st.gesto.tipo === "toque" && st.punteros.size === 0 && ev.type === "pointerup") tocar(ev);
    if (st.punteros.size === 0) st.gesto = null;
  }

  // La rueda del ratón acerca y aleja hacia donde está el puntero (no en el paseo ni en el mini-mapa).
  useEffect(() => {
    const el = lienzoRef.current;
    function rueda(ev) {
      if (p.current.pasear || p.current.modo === "mini") return;
      ev.preventDefault();
      const st = m.current;
      const [px, py] = posicion(ev);
      const [wx, wy] = aMundo(px, py);
      const s = st.cam.s * (ev.deltaY < 0 ? 1.15 : 1 / 1.15);
      st.cam = { s, x: wx - (px - st.vista.w / 2) / s, y: wy - (py - st.vista.h / 2) / s };
      aplicar();
    }
    el.addEventListener("wheel", rueda, { passive: false });
    return () => el.removeEventListener("wheel", rueda);
  }, []);

  // ---------- la puerta: entrar andando (solo la primera vez al día, lo decide la vista) ----------
  function puertas(abiertas) {
    const g = puertaRef.current;
    if (!g) return;
    g.querySelectorAll("[data-hoja]").forEach((hoja) => {
      hoja.style.transform = abiertas ? `translateX(${hoja.getAttribute("data-hoja") === "izq" ? -42 : 42}px)` : "";
    });
  }
  function colocarDentro() {
    const st = m.current;
    st.av.x = ENTRADA_DENTRO.x; st.av.y = ENTRADA_DENTRO.y; st.av.ruta = null;
    colocarAvatar();
    st.cam = limitar(vistaInicial());
    aplicar();
  }
  function saltarEntrada() {
    const st = m.current;
    st.tiempos.forEach(clearTimeout);
    st.tiempos = [];
    st.enEntrada = false;
    puertas(false);
    colocarDentro();
    if (p.current.alEntrar) p.current.alEntrar(true);
  }
  function entrada() {
    const st = m.current;
    st.tiempos.forEach(clearTimeout);
    st.tiempos = [];
    if (reducido()) { colocarDentro(); if (p.current.alEntrar) p.current.alEntrar(false); return; }
    st.enEntrada = true;
    st.av.x = ENTRADA_FUERA.x; st.av.y = ENTRADA_FUERA.y; st.av.dir = 1;
    colocarAvatar();
    st.cam = { x: ENTRADA_FUERA.x, y: 930, s: 1.8 };
    aplicar();
    puertas(false);
    st.tiempos.push(setTimeout(() => puertas(true), 450));
    st.tiempos.push(setTimeout(() => {
      st.av.ruta = [[st.av.x, st.av.y], [ENTRADA_DENTRO.x, ENTRADA_DENTRO.y]]; st.av.paso = 1; st.av.vel = 120; st.av.alLlegar = null;
      despertar();
    }, 1050));
    st.tiempos.push(setTimeout(() => {
      st.enEntrada = false;
      puertas(false);
      st.av.ruta = null; st.av.x = ENTRADA_DENTRO.x; st.av.y = ENTRADA_DENTRO.y;
      colocarAvatar();
      moverCamara(vistaInicial(), 650, () => { if (p.current.alEntrar) p.current.alEntrar(false); });
    }, 2050));
  }

  // ---------- montaje ----------
  useEffect(() => {
    const st = m.current;
    st.montado = true;
    medir();
    colocarDentro();
    const obs = new ResizeObserver(() => { medir(); aplicar(); });
    obs.observe(lienzoRef.current);
    return () => {
      st.montado = false;
      obs.disconnect();
      st.tiempos.forEach(clearTimeout);
      if (st.animCam) st.animCam.parar();
    };
  }, []);

  // Pasear o dejar de pasear: la cámara va al avatar o vuelve a ver el edificio entero.
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return; }
    const st = m.current;
    st.joy.activo = false;
    if (joyRef.current) joyRef.current.style.display = "none";
    if (pasear) { moverCamara({ x: st.av.x, y: st.av.y - 20, s: 1.15 }, 450); comprobarCerca(); }
    else { st.cerca = null; setCerca(null); moverCamara(vistaInicial(), 450); }
  }, [pasear]);

  useImperativeHandle(ref, () => ({
    irA,
    verTodo: () => moverCamara(vistaInicial(), 400),
    zoom: (f) => moverCamara({ s: m.current.cam.s * f }, 250),
    entrada,
    saltarEntrada,
    enEntrada: () => m.current.enEntrada,
    // Para el mini-mapa: poner al avatar en una máquina, mover la cámara y andar a otra.
    ponerEn(estId) {
      const pt = puntoDe(ESTACION[estId]);
      const st = m.current;
      st.av.x = pt[0]; st.av.y = pt[1]; st.av.ruta = null;
      colocarAvatar();
    },
    caminarA(estId, opc = {}) {
      const st = m.current;
      caminar(puntoDe(ESTACION[estId], [st.av.x, st.av.y]), opc.alLlegar, opc);
    },
    llegarYa,
    camara: (c, ms = 0) => moverCamara(c, ms),
    centroDe: (estId) => { const e = ESTACION[estId]; return { x: e.x + e.w / 2, y: e.y + e.h / 2 }; },
    aPantalla,
    vista: () => m.current.vista,
  }));

  // ---------- la ruta de una rutina: paradas numeradas, la siguiente iluminada ----------
  const C = TEMA_GIMNASIO;
  const ruta = useMemo(() => {
    if (!paradas.length) return null;
    const puntos = modo === "mini" ? [] : [INICIO_RUTA];
    paradas.forEach((pa) => puntos.push(puntoDe(ESTACION[pa.estacion])));
    let d = "";
    for (let i = 1; i < puntos.length; i++) {
      const tramo = aEstrella(puntos[i - 1][0], puntos[i - 1][1], puntos[i][0], puntos[i][1]) || [puntos[i - 1], puntos[i]];
      d += tramo.map((q, k) => `${k ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ") + " ";
    }
    return (
      <g pointerEvents="none">
        {d && <path d={d} stroke={C.crema} strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />}
        {d && <path d={d} stroke={C.mostaza} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 6" />}
        {paradas.map((pa, i) => {
          const e = ESTACION[pa.estacion];
          const hecha = siguiente !== null && i < siguiente;
          const sig = i === siguiente;
          // Dos paradas en la misma máquina (la rutina vuelve a ella): la segunda un poco al lado.
          const repetida = paradas.slice(0, i).filter((q) => q.estacion === pa.estacion).length;
          return (
            <g key={i} transform={`translate(${e.x + e.w / 2 + repetida * 20},${e.y - 4})`}>
              <circle r="11" fill={hecha ? C.cojin : sig ? C.mostaza : C.crema} stroke={C.cojinOsc} strokeWidth="2" />
              <text y="4" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily={FUENTE_TEXTO} fill={hecha ? C.crema : C.cojinOsc}>{hecha ? "✓" : i + 1}</text>
            </g>
          );
        })}
      </g>
    );
  }, [paradas, siguiente, modo]);

  const caminoDibujo = camino && modo !== "mini" ? (() => {
    const d = camino.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
    const fin = camino[camino.length - 1];
    return (
      <g pointerEvents="none">
        <path d={d} stroke={C.crema} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <path d={d} stroke={C.cojin} strokeWidth="3.5" fill="none" strokeDasharray="1 7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={fin[0]} cy={fin[1]} r="6" fill={C.mostaza} stroke={C.crema} strokeWidth="2" />
      </g>
    );
  })() : null;

  const siguienteEst = siguiente !== null && paradas[siguiente] ? paradas[siguiente].estacion : null;
  const resaltadaVista = pasear ? (cerca && cerca.id) : resaltada;
  const plano = useMemo(() => (
    <PlanoGimnasio
      pre={pre} estados={estados} tinte={tinte} idioma={idioma} pizarra={pizarra} semana={semana}
      resaltada={resaltadaVista} siguiente={siguienteEst} saluda={saluda} reducido={reducido()}
      ruta={<>{ruta}{caminoDibujo}</>}
      avatar={<g ref={avatarRef} pointerEvents="none"><AvatarChibi genero={genero} /></g>}
      refLejos={lejosRef} refCerca={cercaRef} puertaRef={puertaRef}
    />
  ), [pre, estados, tinte, idioma, pizarra, semana, resaltadaVista, siguienteEst, saluda, ruta, camino, genero]);

  // Tras cada pintado, la cámara y el avatar vuelven a su sitio (React no toca esos atributos, pero un
  // avatar nuevo —al cambiar de género— nace sin colocar).
  useEffect(() => { colocarAvatar(); aplicar(); });

  const nombreCerca = cerca ? t(idioma, cerca.tipo === "est" ? "fitdraft.maquina." + cerca.id : "fitdraft.sitio." + cerca.id) : "";
  return (
    <div
      ref={lienzoRef}
      onPointerDown={alPulsar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      style={{ position: "absolute", inset: 0, touchAction: "none", overflow: "hidden", userSelect: "none", WebkitUserSelect: "none", background: TEMA_GIMNASIO.fondo, cursor: modo === "mini" ? "pointer" : "grab", ...estilo }}
    >
      <EstilosGimnasio />
      <svg width="100%" height="100%" style={{ display: "block" }} role="img" aria-label={t(idioma, "fitdraft.mapa.aria")}>
        <g ref={mundoRef}>{plano}</g>
      </svg>
      {/* El joystick flotante: aparece donde se pone el pulgar al pasear. */}
      <div ref={joyRef} style={{ position: "absolute", zIndex: 4, width: 104, height: 104, margin: "-52px 0 0 -52px", borderRadius: "50%", background: "rgba(31,77,56,0.12)", border: "2px solid rgba(31,77,56,0.28)", pointerEvents: "none", display: "none" }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 24, height: 24, margin: "-12px 0 0 -12px", borderRadius: "50%", border: "1.5px dashed rgba(31,77,56,0.35)" }} />
        <div ref={pomoRef} style={{ position: "absolute", left: "50%", top: "50%", width: 44, height: 44, margin: "-22px 0 0 -22px", borderRadius: "50%", background: "rgba(255,253,247,0.95)", border: "2px solid var(--green)", boxShadow: "0 3px 10px rgba(0,0,0,0.18)" }} />
      </div>
      {/* «Usar · …»: encima del avatar, en el centro, para cualquiera de las dos manos. */}
      {pasear && cerca && (
        <button
          ref={accionRef}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => abrir(cerca.tipo, cerca.id)}
          style={{ position: "absolute", zIndex: 5, transform: "translate(-50%, -100%)", border: "none", background: "var(--mustard)", color: "var(--green-dark)", fontFamily: FUENTE_TEXTO, fontWeight: 700, fontSize: 12.5, borderRadius: 999, padding: "8px 14px", minHeight: 36, boxShadow: "0 4px 12px rgba(0,0,0,0.18)", whiteSpace: "nowrap" }}
        >
          {t(idioma, "fitdraft.usar", { cosa: nombreCerca })}
        </button>
      )}
    </div>
  );
});
