import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ROUTE_STYLES, nextRouteStyleIndex, routeStyleForIndex, trapFocus } from '../src/uiUtils.js';

const riskColors = new Set(['#31c96b', '#ff9f1a', '#ef4444']);
assert.equal(ROUTE_STYLES.length, 6);
for (const style of ROUTE_STYLES) assert.equal(riskColors.has(style.color.toLowerCase()), false, `La couleur de route ${style.color} ne doit pas reprendre une couleur de risque`);
assert.equal(routeStyleForIndex(7).index, 1);
assert.equal(nextRouteStyleIndex([{ styleIndex: 0 }, { styleIndex: 2 }]), 1, 'Une couleur libérée doit pouvoir être réutilisée sans recolorer les routes existantes');

let focused = null;
const first = { focus: () => { focused = 'first'; }, getAttribute: () => null };
const last = { focus: () => { focused = 'last'; }, getAttribute: () => null };
const container = {
  querySelectorAll: () => [first, last],
  contains: element => element === first || element === last,
  focus: () => { focused = 'container'; },
};
let prevented = false;
trapFocus({ key: 'Tab', shiftKey: false, preventDefault: () => { prevented = true; } }, container, last);
assert.equal(prevented, true);
assert.equal(focused, 'first');
prevented = false; focused = null;
trapFocus({ key: 'Tab', shiftKey: true, preventDefault: () => { prevented = true; } }, container, first);
assert.equal(prevented, true);
assert.equal(focused, 'last');

const source = fs.readFileSync(new URL('../src/plugin.svelte', import.meta.url), 'utf8');
assert.match(source, /<svelte:window on:keydown=\{handleWindowKeydown\}/);
assert.match(source, /role="dialog" aria-modal="true" aria-labelledby=/);
assert.match(source, /tabindex="-1"/);
assert.match(source, /event\.key === 'Escape'/);
assert.match(source, /font-size:12px/);
assert.match(source, /font-size:14px/);
assert.doesNotMatch(source, /routes\.forEach\(\(r, i\) => \{ r\.color =/);

console.log('UI accessibility tests: OK');
