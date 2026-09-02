import assert from 'node:assert/strict';
import { assessRouteQuality } from '../src/qualityUtils.js';
const good = { points: [{ time: new Date(0), lat: 1, lon: 1, sog: 10, tws: 12 }, { time: new Date(3600000), lat: 2, lon: 2, sog: 11, tws: 13 }] };
assert.equal(assessRouteQuality(good).level, 'green');
const bad = { points: [{ time: new Date(3600000), lat: 1, lon: 1, sog: 60 }, { time: new Date(0), lat: 2, lon: 2, sog: 60 }] };
assert.equal(assessRouteQuality(bad).level, 'red');
console.log('route quality tests: OK');
