// ---------- Recordatorio de pesaje: notificación push diaria (Fase 6) ----------
// Primera Cloud Function programada del proyecto (onSchedule) — hasta ahora todas se disparaban
// por petición (el webhook de Stripe, las funciones callable del cliente). Cada día, a la hora
// fijada, revisa qué cuentas tienen activadas las notificaciones push y, de esas, a quién le toca
// hoy pesarse (misma regla que ya usa la app, ver logica/peso.js → esDiaSugeridoPeso) y todavía no
// lo ha hecho — y les manda el recordatorio por FCM.
//
// Desde noviembre de 2026 (R8) parte de los buzones de avisos (buzonAvisos.js) en vez de leer todos los
// documentos de todas las cuentas, y avisa a todos los aparatos de la lista, no solo al último (R17). Desde la tanda
// B (M3) pide solo los buzones con el recordatorio activado, por páginas, y trata unas pocas cuentas a la vez
// (recorrerBuzones, en buzonAvisos.js, con el porqué y el plan B si falta el índice): antes abría a la vez el
// `data-v1` de todas, y cada uno puede pesar hasta 1 MiB.
//
// Para decidir hace falta saber si hoy le toca, si el ciclo está en pausa y si ya se ha pesado. Dos caminos:
// - **Con el buzón** (tanda B, M2): la app de ahora deja en el buzón `pesoVecesSemana`, `pesoPausado` y
//   `ultimaPesada` (nunca el peso: logica/buzon-avisos.js, datosPesajeBuzon). Con ellos se decide **sin abrir ningún
//   dato de la cuenta**. El buzón es entonces la única fuente, como ya lo era para el aviso de descongelar: ya no
//   se mira el perfil «por si acaso», porque abrir `data-v1` para eso es justo lo que se quería evitar. La app pone el
//   buzón al día al cambiar el interruptor, también desde un aparato sin permiso (F4), y lo borra al quitar los dos.
// - **Con `data-v1`**, como antes: si el buzón no trae los tres datos (lo escribió una copia de la app anterior a
//   la tanda B, o un dato no tiene la forma esperada) o dice «sin seguimiento» (`pesoVecesSemana: null`, que con el
//   recordatorio activado solo sale de un buzón a medias: pesajeDelBuzon). Abre los datos de esa cuenta y, si el
//   perfil dice que el recordatorio está desactivado, manda el perfil. Este camino se queda mientras pueda haber
//   buzones de antes; con el tiempo, cada cuenta pasa sola al otro en cuanto abre la app nueva.
// Los dos deciden exactamente igual (motivoParaNoAvisar), y una prueba lo comprueba con los mismos seguimientos
// por los dos caminos (functions/pruebas-funciones/).
//
// Por qué esDiaSugeridoPeso se repite aquí en vez de importarse: logica/peso.js es un módulo ESM
// pensado para el navegador (usa bare-specifiers como "i18n" que solo resuelve el importmap de
// index.html) y esta carpeta es un proyecto Node CommonJS aparte, sin bundler ni paso de
// transformación entre los dos mundos (ver CLAUDE.md, "no hay build"). Si cambia la regla de días
// sugeridos en logica/peso.js, hay que replicar el cambio aquí también — son solo dos líneas.
const { onSchedule } = require("firebase-functions/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { recorrerBuzones, enviarAlBuzon } = require("./buzonAvisos");

const STORAGE_KEY = "rueda-de-platos:data-v1";

// Copia exacta de logica/peso.js — ver el porqué arriba.
const DIAS_SUGERIDOS_PESO = { 2: [1, 4], 3: [1, 3, 5] };
function esDiaSugeridoPeso(vecesSemana, fecha) {
  const dias = DIAS_SUGERIDOS_PESO[vecesSemana] || DIAS_SUGERIDOS_PESO[3];
  return dias.includes(fecha.getDay());
}
function fechaISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Por qué no se avisa hoy a una cuenta, o `null` si hay que avisarla. La misma decisión por los dos caminos (arriba),
// en el mismo orden que antes de la tanda B:
// - Sin seguimiento de peso, no hay días de pesaje.
// - Mientras el ciclo esté pausado (viaje, enfermedad...) no se dispara el recordatorio: mismo criterio que la
//   propia app (ui/peso/seguimiento.jsx).
// - Solo los días sugeridos para su frecuencia (esDiaSugeridoPeso).
// - Si ya se ha pesado hoy, no hace falta recordárselo.
function motivoParaNoAvisar({ conSeguimiento, vecesSemana, pausado, pesadoHoy }, hoy) {
  if (!conSeguimiento) return "sin seguimiento de peso configurado";
  if (pausado) return "ciclo de peso en pausa";
  if (!esDiaSugeridoPeso(vecesSemana, hoy)) return `hoy no es día sugerido (vecesSemana=${vecesSemana})`;
  if (pesadoHoy) return "ya registrado hoy";
  return null;
}

// El seguimiento sacado del buzón (tanda B). Siempre hay seguimiento: un buzón con `pesoVecesSemana: null` no llega
// aquí, va por `data-v1` (pesajeDelBuzon, en buzonAvisos.js, con el porqué). `ultimaPesada` es la fecha más reciente
// del ciclo sin contar las posteriores a hoy (logica/buzon-avisos.js, datosPesajeBuzon): si alguna pesada es de hoy,
// es esa.
function seguimientoDelBuzon({ vecesSemana, pausado, ultimaPesada }, hoyISO) {
  return { conSeguimiento: true, vecesSemana, pausado, pesadoHoy: ultimaPesada === hoyISO };
}

// El seguimiento sacado de `data-v1` (camino de antes), con las mismas comprobaciones que antes de la tanda B.
function seguimientoDeSusDatos(pesoTracking, hoyISO) {
  if (!pesoTracking) return { conSeguimiento: false };
  return {
    conSeguimiento: true,
    vecesSemana: pesoTracking.vecesSemana,
    pausado: (pesoTracking.pausas || []).some((p) => !!p && p.fin === null),
    pesadoHoy: (pesoTracking.entradas || []).some((e) => !!e && e.fecha === hoyISO),
  };
}

// Mensaje del push en el idioma de cada cuenta (el del buzón, copia de `perfil.idioma`). Son solo dos textos
// fijos y muy puntuales — no compensa tirar de todo logica/i18n.js (pensado para el navegador, con 500+
// claves) por esto.
const TEXTOS_PUSH = {
  es: { titulo: "Toca pesarse", cuerpo: "Hoy es uno de tus días de seguimiento de peso en FoodDraft." },
  en: { titulo: "Time to weigh in", cuerpo: "Today is one of your weigh-in days in FoodDraft." },
  ca: { titulo: "Toca pesar-se", cuerpo: "Avui és un dels teus dies de seguiment de pes a FoodDraft." },
  gl: { titulo: "Toca pesarse", cuerpo: "Hoxe é un dos teus días de seguimento de peso en FoodDraft." },
  eu: { titulo: "Pisatzeko eguna", cuerpo: "Gaur FoodDraft aplikazioko zure pisu-jarraipeneko egunetako bat da." },
};

exports.sendWeighInReminders = onSchedule(
  {
    // Una vez al día. Hora local de España (fija todo el año pese al cambio de horario, a
    // diferencia de fijar una hora en UTC): media mañana, un momento razonable para un recordatorio
    // sin resultar molesto a primera hora.
    schedule: "0 9 * * *",
    timeZone: "Europe/Madrid",
    // Más margen que el de serie (60 s y 256 MiB) para cuando haya muchas cuentas (tanda B, M3). Esta es la que
    // más lo necesita: de cada cuenta con un buzón de antes (sin los datos de pesaje) abre `data-v1` (hasta 1 MiB,
    // y varias veces eso al convertirlo en objeto), con 20 cuentas a la vez; 512 MiB los aguantan con holgura. Cuando
    // todos los buzones traigan esos datos le sobrará memoria, pero no cuesta nada tenerla. 540 s (9 minutos) dan
    // para decenas de miles de cuentas; con pocas termina en segundos y no cuesta más: se paga el tiempo que
    // corre, no el tope. Firebase pone también ese tope como plazo del trabajo de Cloud Scheduler que la lanza (si
    // no, la daría por fallida a los 3 minutos aunque siguiera bien). Sin reintentos (los de serie): repetir una
    // ejecución que se cortó a medias mandaría el aviso dos veces a quien ya lo recibió.
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (evento) => {
    // El día de la ejecución programada (`scheduleTime`, las 9:00 de Madrid en UTC), no el del reloj: si la
    // ejecución se retrasa o Google la reintenta, sigue contando el día que tocaba. Y permite probar la función
    // con cualquier día (functions/pruebas-funciones/). Las funciones corren en UTC, y las 9:00 de Madrid caen
    // siempre en el mismo día en UTC (8:00 en invierno, 7:00 en verano).
    const hoy = evento && evento.scheduleTime ? new Date(evento.scheduleTime) : new Date();
    const hoyISO = fechaISO(hoy);

    // Registro de diagnóstico (añadido el 20-sep-2026, investigando un recordatorio que no llegó): una línea al
    // día con cuántas cuentas tocan y, por cada una, por qué se le manda o se omite. Se queda a propósito: es
    // lo que permite comprobar en el registro de Google Cloud, sin esperar a que alguien se queje, que la
    // función se ejecuta y decide bien (así se comprobó el 5-nov-2026, antes de R8). No incluye ningún dato de
    // salud: solo el uid y el motivo.
    let candidatos;
    let conBuzon = 0; // decididos con los datos del buzón (tanda B), sin abrir nada de la cuenta
    let conDatos = 0; // decididos abriendo `data-v1`, como antes (buzón de una app sin actualizar)
    try {
      candidatos = await recorrerBuzones("pesaje", "Recordatorio de pesaje", async (buzon) => {
        const { uid } = buzon;
        let seguimiento;
        let segun;
        if (buzon.pesoEnBuzon) {
          conBuzon++;
          seguimiento = seguimientoDelBuzon(buzon.pesoEnBuzon, hoyISO);
          segun = "según el buzón";
        } else {
          conDatos++;
          let datos;
          try {
            const snap = await admin.firestore().doc(`users/${uid}/keys/${STORAGE_KEY}`).get();
            if (!snap.exists) {
              logger.info(`${uid}: sin documento de datos guardado, se omite`);
              return;
            }
            datos = JSON.parse(snap.data().value);
          } catch (err) {
            logger.error(`No se han podido leer los datos de ${uid} para el recordatorio de pesaje`, err);
            return;
          }

          // El buzón es una copia del perfil que pone al día la app. Si alguna vez no coincidieran (un aparato que
          // escribió tarde), manda el perfil: más vale no avisar que avisar a quien lo ha quitado.
          if (datos.perfil && datos.perfil.notificacionesPush === false) {
            logger.info(`${uid}: recordatorio de pesaje desactivado en el perfil, se omite`);
            return;
          }
          seguimiento = seguimientoDeSusDatos(datos.pesoTracking, hoyISO);
          segun = "según sus datos";
        }

        const motivo = motivoParaNoAvisar(seguimiento, hoy);
        if (motivo) {
          logger.info(`${uid}: ${motivo}, se omite (${segun})`);
          return;
        }

        const { titulo, cuerpo } = TEXTOS_PUSH[buzon.idioma] || TEXTOS_PUSH.es;
        try {
          // Sin etiqueta: sw.js usa «recordatorio-pesaje» por defecto.
          const { enviados } = await enviarAlBuzon(buzon, { titulo, cuerpo });
          logger.info(`${uid}: recordatorio enviado a ${enviados} de ${buzon.tokens.length} aparato(s) (${segun})`);
        } catch (err) {
          logger.error(`No se ha podido enviar el recordatorio de pesaje a ${uid}`, err);
        }
      });
    } catch (err) {
      logger.error("Recordatorio de pesaje: no se han podido leer los buzones de avisos", err);
      return;
    }
    // Al final, porque con las páginas el total no se sabe hasta leer la última. Dice también cuántos se han decidido
    // por cada camino: cuando «abriendo sus datos» se quede en 0 de forma estable, ya no quedan buzones de antes.
    logger.info(
      `Recordatorio de pesaje: ${candidatos} candidato(s) con el recordatorio activado ` +
        `(${conBuzon} decidido(s) con el buzón y ${conDatos} abriendo sus datos)`
    );
  }
);
