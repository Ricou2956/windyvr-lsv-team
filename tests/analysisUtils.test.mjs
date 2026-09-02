import assert from 'node:assert/strict';
import { angularDifference, buildRiskEvents, buildSampleTimes, samplingIntervalHours, summarizeWeatherSamples } from '../src/analysisUtils.js';

const points = [{ time: new Date('2026-09-02T10:00:00Z') }, { time: new Date('2026-09-03T10:00:00Z') }];
assert.deepEqual(buildSampleTimes(points), [Date.parse('2026-09-02T10:00:00Z'), Date.parse('2026-09-02T13:00:00Z'), Date.parse('2026-09-02T16:00:00Z'), Date.parse('2026-09-02T19:00:00Z'), Date.parse('2026-09-02T22:00:00Z'), Date.parse('2026-09-03T01:00:00Z'), Date.parse('2026-09-03T04:00:00Z'), Date.parse('2026-09-03T07:00:00Z'), Date.parse('2026-09-03T10:00:00Z')]);
assert.equal(samplingIntervalHours(6 * 3600000), 0.5);
assert.equal(samplingIntervalHours(18 * 3600000), 1);
assert.equal(samplingIntervalHours(48 * 3600000), 3);
assert.equal(samplingIntervalHours(100 * 3600000), 6);
assert.equal(samplingIntervalHours(200 * 3600000), 12);
assert.equal(angularDifference(350, 10), 20);
const summary = summarizeWeatherSamples([
  { timestamp: 1, model: 'ecmwf', tws: 10, twd: 350 }, { timestamp: 1, model: 'gfs', tws: 15, twd: 10 },
  { timestamp: 2, model: 'ecmwf', tws: 12, twd: 90 }, { timestamp: 2, model: 'gfs', tws: 13, twd: 150 },
], ['ecmwf', 'gfs']);
assert.equal(summary.byModel.ecmwf.avgTws, 11);
assert.equal(summary.critical.timestamp, 1);
assert.equal(summary.critical.speedSpread, 5);
assert.equal(buildRiskEvents([{ timestamp: 1, tws: 10, twd: 350 }, { timestamp: 1, tws: 18, twd: 40 }])[0].level, 'red');
console.log('weather analysis tests: OK');
