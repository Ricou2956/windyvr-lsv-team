import assert from 'node:assert/strict';
import { assessRouteQuality } from '../src/qualityUtils.js';

const good = { points: [{ time: new Date(0), lat: 1, lon: 1, sog: 10, tws: 12 }, { time: new Date(3600000), lat: 2, lon: 2, sog: 11, tws: 13 }] };
assert.equal(assessRouteQuality(good).level, 'green');

const bad = { points: [{ time: new Date(3600000), lat: 1, lon: 1, sog: 60 }, { time: new Date(0), lat: 2, lon: 2, sog: 60 }] };
assert.equal(assessRouteQuality(bad).level, 'red');
assert.match(assessRouteQuality(bad).issues.join(' '), /inversée/);

const duplicateOnly = {
  qualityMeta: { duplicateTimestamps: 1, reversedTimestamps: 0, deduplicatedTimestamps: 1 },
  points: [{ time: new Date(0), lat: 1, lon: 1, sog: 10, tws: 12 }, { time: new Date(3600000), lat: 2, lon: 2, sog: 11, tws: 13 }],
};
const duplicateQuality = assessRouteQuality(duplicateOnly);
assert.equal(duplicateQuality.level, 'green');
assert.deepEqual(duplicateQuality.issues, ['1 doublon(s) d’horodatage fusionné(s)']);

const reversedSource = {
  qualityMeta: { duplicateTimestamps: 0, reversedTimestamps: 1 },
  points: [{ time: new Date(0), lat: 1, lon: 1, sog: 10, tws: 12 }, { time: new Date(3600000), lat: 2, lon: 2, sog: 11, tws: 13 }],
};
const reversedQuality = assessRouteQuality(reversedSource);
assert.equal(reversedQuality.level, 'red');
assert.deepEqual(reversedQuality.issues, ['1 date(s) inversée(s) dans le fichier source']);

console.log('route quality tests: OK');
