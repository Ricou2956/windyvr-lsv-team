/**
 * Petit contrôleur idempotent pour le cycle de vie du plugin.
 * Il permet d'utiliser à la fois onMount/onDestroy (API Windy actuelle)
 * et onopen/onclose lorsque l'hôte les déclenche, sans doubler les effets.
 */
export function createPluginLifecycle({ onActivate, onDeactivate } = {}) {
  let active = false;

  return {
    activate() {
      if (active) return false;
      active = true;
      onActivate?.();
      return true;
    },
    deactivate() {
      if (!active) return false;
      active = false;
      onDeactivate?.();
      return true;
    },
    isActive() {
      return active;
    },
  };
}

export function markerOpacityForPosition(position) {
  return position?.outOfRange ? 0.28 : 1;
}
