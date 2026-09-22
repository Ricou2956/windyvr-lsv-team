import assert from 'node:assert/strict';
import { createPluginLifecycle, markerOpacityForPosition } from '../src/lifecycleUtils.js';

let activated = 0;
let deactivated = 0;
const lifecycle = createPluginLifecycle({
  onActivate: () => { activated += 1; },
  onDeactivate: () => { deactivated += 1; },
});

assert.equal(lifecycle.isActive(), false);
assert.equal(lifecycle.activate(), true);
assert.equal(lifecycle.isActive(), true);
assert.equal(lifecycle.activate(), false, 'Une seconde activation doit être idempotente');
assert.equal(activated, 1);
assert.equal(lifecycle.deactivate(), true);
assert.equal(lifecycle.isActive(), false);
assert.equal(lifecycle.deactivate(), false, 'Une seconde désactivation doit être idempotente');
assert.equal(deactivated, 1);
assert.equal(lifecycle.activate(), true, 'Le contrôleur doit pouvoir être réactivé');
assert.equal(activated, 2);

assert.equal(markerOpacityForPosition(null), 1);
assert.equal(markerOpacityForPosition({ outOfRange: false }), 1);
assert.equal(markerOpacityForPosition({ outOfRange: true }), 0.28);

console.log('plugin lifecycle tests: OK');
