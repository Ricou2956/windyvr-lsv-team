export const ROUTE_STYLES = [
  { color: '#2563eb', dashArray: null },
  { color: '#38bdf8', dashArray: '10 6' },
  { color: '#7c3aed', dashArray: '3 5' },
  { color: '#c026d3', dashArray: '12 4 3 4' },
  { color: '#facc15', dashArray: '18 6' },
  { color: '#64748b', dashArray: '2 4 8 4' },
];

export const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function routeStyleForIndex(index = 0) {
  const normalized = ((Number(index) || 0) % ROUTE_STYLES.length + ROUTE_STYLES.length) % ROUTE_STYLES.length;
  return { ...ROUTE_STYLES[normalized], index: normalized };
}

export function nextRouteStyleIndex(routes = []) {
  const used = new Set(routes.map(route => Number(route?.styleIndex)).filter(Number.isInteger));
  for (let index = 0; index < ROUTE_STYLES.length; index += 1) {
    if (!used.has(index)) return index;
  }
  return routes.length % ROUTE_STYLES.length;
}

export function focusableElements(container) {
  if (!container?.querySelectorAll) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(element => element?.getAttribute?.('aria-hidden') !== 'true');
}

export function trapFocus(event, container, activeElement = globalThis.document?.activeElement) {
  if (event?.key !== 'Tab' || !container) return false;
  const elements = focusableElements(container);
  if (!elements.length) {
    event.preventDefault?.();
    container.focus?.();
    return true;
  }
  const first = elements[0];
  const last = elements[elements.length - 1];
  const outside = !container.contains?.(activeElement);
  if (event.shiftKey && (activeElement === first || outside)) {
    event.preventDefault?.();
    last.focus?.();
    return true;
  }
  if (!event.shiftKey && (activeElement === last || outside)) {
    event.preventDefault?.();
    first.focus?.();
    return true;
  }
  return false;
}
