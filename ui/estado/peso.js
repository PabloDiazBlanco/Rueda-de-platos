// ---------- ui/estado/peso.js ----------
// Hook del seguimiento de peso: registrar pesadas, pausar y reanudar el ciclo, cambiar su
// configuración y cerrarlo (con el ajuste de calibración que se decida). La lógica de tendencia y
// evaluación vive en logica/peso.js; aquí solo se aplica sobre los datos guardados.
import { uid } from "comun";
import { calcularObjetivosPerfil } from "objetivos";
import { defaultPesoTracking, fechaISO, calcularTendenciaPeso, evaluarTendencia } from "peso";

export function usePeso(setData) {
  // Añade (o corrige, si ya hay una pesada guardada hoy) la pesada del día. Si es la primera del
  // ciclo, arranca el ciclo en la fecha de hoy.
  function addPesoEntrada(peso, atipico, motivo) {
    setData((prev) => {
      const pt = prev.pesoTracking || defaultPesoTracking();
      const hoyISO = fechaISO(new Date());
      const idx = pt.entradas.findIndex((e) => e.fecha === hoyISO);
      const entrada = { id: idx >= 0 ? pt.entradas[idx].id : uid(), fecha: hoyISO, peso, atipico: !!atipico, motivo: motivo || "" };
      const entradas = idx >= 0 ? pt.entradas.map((e, i) => (i === idx ? entrada : e)) : [...pt.entradas, entrada];
      return {
        ...prev,
        pesoTracking: { ...pt, entradas, cicloInicio: pt.cicloInicio || hoyISO },
      };
    });
  }

  // Pausa el ciclo activo (viaje, enfermedad...) con un motivo opcional en texto libre. Mientras
  // esté pausado, esos días no cuentan para el cierre del ciclo ni disparan el recordatorio.
  function pausarCiclo(motivo) {
    setData((prev) => {
      const pt = prev.pesoTracking || defaultPesoTracking();
      const hoyISO = fechaISO(new Date());
      return { ...prev, pesoTracking: { ...pt, pausas: [...(pt.pausas || []), { inicio: hoyISO, fin: null, motivo: motivo || "" }] } };
    });
  }

  // Cierra la pausa abierta: el ciclo retoma la cuenta exactamente donde se quedó.
  function reanudarCiclo() {
    setData((prev) => {
      const pt = prev.pesoTracking || defaultPesoTracking();
      const hoyISO = fechaISO(new Date());
      const pausas = (pt.pausas || []).map((p, i, arr) => (i === arr.length - 1 && p.fin === null ? { ...p, fin: hoyISO } : p));
      return { ...prev, pesoTracking: { ...pt, pausas } };
    });
  }

  function actualizarConfigPeso(patch) {
    setData((prev) => ({
      ...prev,
      pesoTracking: { ...(prev.pesoTracking || defaultPesoTracking()), ...patch },
    }));
  }

  function descartarRecordatorioHoy() {
    setData((prev) => ({
      ...prev,
      pesoTracking: { ...(prev.pesoTracking || defaultPesoTracking()), recordatorioDescartadoFecha: fechaISO(new Date()) },
    }));
  }

  // Cierra el ciclo actual: calcula la tendencia real; si se decide aplicar el ajuste sugerido, lo
  // suma a la calibración existente (nunca cambia de etapa, solo afina dentro de ella); si se decide
  // actualizar el peso del perfil, se usa la última pesada normal (no atípica) del ciclo. Las pesadas
  // del ciclo pasan al historial permanente (nunca se borran) y se vacía el ciclo activo para el siguiente.
  function cerrarCicloPeso({ aplicarKcal, actualizarPeso }) {
    setData((prev) => {
      const pt = prev.pesoTracking || defaultPesoTracking();
      const tendencia = calcularTendenciaPeso(pt.entradas);
      const evaluacion = tendencia ? evaluarTendencia(tendencia.pctSemana, prev.perfil?.objetivo) : null;
      const aplicaKcal = aplicarKcal && evaluacion && evaluacion.sugerenciaKcal;

      const ultimaNormal = [...pt.entradas].reverse().find((e) => !e.atipico);
      const aplicaPeso = actualizarPeso && ultimaNormal;

      let perfilNuevo = prev.perfil;
      if (aplicaKcal || aplicaPeso) {
        perfilNuevo = { ...prev.perfil };
        if (aplicaKcal) perfilNuevo.calibracionKcal = (prev.perfil?.calibracionKcal || 0) + evaluacion.sugerenciaKcal;
        if (aplicaPeso) perfilNuevo.peso = ultimaNormal.peso;
      }

      const hoyISO = fechaISO(new Date());
      // Si quedaba una pausa abierta al cerrar el ciclo, se cierra también aquí para no dejar
      // un hueco sin fecha de fin en el historial.
      const pausasCerradas = (pt.pausas || []).map((p) => (p.fin === null ? { ...p, fin: hoyISO } : p));

      const cicloArchivado = {
        inicio: pt.cicloInicio,
        fin: hoyISO,
        pctSemana: tendencia ? tendencia.pctSemana : null,
        nivel: evaluacion ? evaluacion.nivel : null,
        ajusteKcalAplicado: aplicaKcal ? evaluacion.sugerenciaKcal : 0,
        pesoActualizado: !!aplicaPeso,
        pausas: pausasCerradas,
      };

      // Si el perfil cambió (peso y/o calibración), los objetivos guardados se recalculan ya mismo,
      // igual que al guardar el perfil a mano — si no, el motor de menú y las gráficas seguirían
      // usando el objetivo antiguo hasta la próxima visita a "Datos personales".
      const objetivosNuevos = perfilNuevo !== prev.perfil ? calcularObjetivosPerfil(perfilNuevo) : null;

      return {
        ...prev,
        perfil: perfilNuevo,
        objetivos: objetivosNuevos || prev.objetivos,
        pesoTracking: {
          ...pt,
          entradas: [],
          historial: [...(pt.historial || []), ...pt.entradas],
          cicloInicio: null,
          recordatorioDescartadoFecha: null,
          historialCiclos: [cicloArchivado, ...(pt.historialCiclos || [])].slice(0, 12),
          pausas: [],
        },
      };
    });
  }

  return { addPesoEntrada, pausarCiclo, reanudarCiclo, actualizarConfigPeso, descartarRecordatorioHoy, cerrarCicloPeso };
}
