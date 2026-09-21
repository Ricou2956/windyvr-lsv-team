import assert from 'node:assert/strict';
import {
  KNOTS_PER_MPS,
  forecastValueAt,
  interpolateForecastSeries,
  metersPerSecondToKnots,
  normalizeForecastSeries,
  signedAngularDifference,
  unwrapForecastPayload,
} from '../src/weatherAdapter.js';

const t0 = Date.parse('2026-09-21T09:00:00Z');
const t1 = Date.parse('2026-09-21T12:00:00Z');

assert.equal(unwrapForecastPayload({ data: { data: { ts: [t0] } } }).ts[0], t0);
assert.equal(unwrapForecastPayload({ result: { data: { ts: [t0] } } }).ts[0], t0);
assert.equal(Number(metersPerSecondToKnots(10).toFixed(3)), Number((10 * KNOTS_PER_MPS).toFixed(3)));
assert.equal(Number(metersPerSecondToKnots(10).toFixed(1)), 19.4);
assert.equal(Math.round(signedAngularDifference(10, 350)), 20);
assert.equal(Math.round(signedAngularDifference(350, 10)), -20);

const series = normalizeForecastSeries({
  data: {
    ts: [t0, t1],
    wind: new Float32Array([5, 10]),
    windDir: new Float32Array([350, 10]),
  },
});
assert.equal(series.length, 2);
assert.equal(series[0].speedMps, 5);
assert.equal(series[1].direction, 10);

const middle = interpolateForecastSeries(series, (t0 + t1) / 2);
assert.equal(Number(middle.speedMps.toFixed(1)), 7.5);
assert.ok(middle.direction < 1 || middle.direction > 359);
assert.equal(interpolateForecastSeries(series, t0 - 1), null);
assert.equal(interpolateForecastSeries(series, t1 + 1), null);

const value = forecastValueAt(series, (t0 + t1) / 2, 270);
assert.equal(Number(value.tws.toFixed(1)), 14.6);
assert.ok(value.twd < 1 || value.twd > 359);
assert.equal(Math.round(value.twa), 90);

// Seconds-based epoch remains accepted defensively.
const seconds = normalizeForecastSeries({ ts: [t0 / 1000], wind: [5], windDir: [180] });
assert.equal(seconds[0].timestamp, t0);

assert.throws(() => normalizeForecastSeries({ foo: [] }), /Structure météo non reconnue/);
console.log('weather adapter tests: OK');
