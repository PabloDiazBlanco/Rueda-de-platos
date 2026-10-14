// ---------- ui/estado/perfil.js ----------
// Hook del perfil y del alta: guardar el perfil (recalculando los objetivos), los pasos del alta
// (asistente de perfil y cuestionario de catálogo) y repetir el cuestionario desde Ajustes.
import { calcularObjetivosPerfil } from "objetivos";

export function usePerfil(setData) {
  function updateObjetivos(objetivos) {
    setData((prev) => ({ ...prev, objetivos }));
  }

  // Guarda el perfil (datos personales) y marca que la pantalla de bienvenida ya no debe repetirse,
  // tanto si se rellena como si se salta explícitamente. Al guardar el perfil, se recalculan
  // los objetivos automáticamente a partir de él. Si la etapa (mantenimiento/volumen/definición)
  // cambia respecto a la guardada, se resetea la calibración por peso — estaba pensada para la
  // intensidad de la etapa anterior, no debe arrastrarse a una nueva sin querer.
  function savePerfil(perfil) {
    setData((prev) => {
      const objetivoCambiado = (prev.perfil?.objetivo || "mantenimiento") !== (perfil.objetivo || "mantenimiento");
      const perfilFinal = { ...perfil, calibracionKcal: objetivoCambiado ? 0 : (prev.perfil?.calibracionKcal || 0) };
      const objetivosCalculados = calcularObjetivosPerfil(perfilFinal);
      return {
        ...prev,
        perfil: perfilFinal,
        perfilOnboardingDone: true,
        objetivos: objetivosCalculados || prev.objetivos,
      };
    });
  }
  function skipPerfil() {
    setData((prev) => ({ ...prev, perfilOnboardingDone: true }));
  }

  // Igual que savePerfil, pero sin marcar perfilOnboardingDone: la usa solo el primer asistente
  // (ProfileOnboarding), para poder pasar al cuestionario de catálogo justo después sin que el
  // gate del componente principal salte ya a la app completa. Los usos normales de "guardar el
  // perfil" en el resto de la app (Perfil, Actividad diaria, Reparto de comidas, y el propio
  // SettingsView) siguen usando savePerfil, que si ya estaba a true lo deja igual — no hay ningún
  // otro sitio donde este matiz importe.
  function guardarPerfilInicial(perfil) {
    setData((prev) => ({ ...prev, perfil, objetivos: calcularObjetivosPerfil(perfil) || prev.objetivos }));
  }

  // Cierra el alta del todo: guarda lo que haya elegido el cuestionario de catálogo (o nada, si
  // llega vacío porque el usuario no seleccionó ningún alimento) y ya sí marca perfilOnboardingDone.
  function completarOnboardingConCatalogo(ingredients) {
    setData((prev) => ({ ...prev, ingredients, perfilOnboardingDone: true }));
  }

  // "Saltar todo" desde el cuestionario de catálogo: el catálogo se queda tal cual estaba
  // (ingredients/blocks vacíos, de initialData()) — el usuario podrá configurarlo él mismo más
  // adelante desde Configuración de comidas, sin prisa.
  function saltarCatalogoOnboarding() {
    setData((prev) => ({ ...prev, perfilOnboardingDone: true }));
  }

  // Repetir el cuestionario de catálogo desde Ajustes (por si alguien se arrepiente o lo saltó sin
  // querer). Solo toca perfilOnboardingDone, nunca perfil: como data.perfil ya existe, el gate del
  // componente principal lleva directo a CatalogoOnboarding, sin pasar otra vez por
  // ProfileOnboarding — y al completarlo o saltarlo se reutilizan completarOnboardingConCatalogo/
  // saltarCatalogoOnboarding de siempre, que ya dejan perfilOnboardingDone a true al terminar.
  function repetirCuestionarioCatalogo() {
    setData((prev) => ({ ...prev, perfilOnboardingDone: false }));
  }

  return {
    updateObjetivos, savePerfil, skipPerfil, guardarPerfilInicial, completarOnboardingConCatalogo,
    saltarCatalogoOnboarding, repetirCuestionarioCatalogo,
  };
}
