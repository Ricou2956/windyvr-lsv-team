import assert from 'node:assert/strict';
import { angularDifference, buildRiskEvents, buildSampleTimes, samplingIntervalHours, summarizeCoverageWindow, summarizeRouteDistanceWindow, summarizeWeatherSamples } from '../src/analysisUtils.js';

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
const routeStart = Date.parse('2026-09-21T00:00:00Z');
const routeEnd = Date.parse('2026-09-25T00:00:00Z');
const coverageSamples = [
  { timestamp: routeStart, model: 'ecmwf', tws: 10, twd: 100 },
  { timestamp: routeStart, model: 'gfs', tws: 11, twd: 101 },
  { timestamp: Date.parse('2026-09-23T00:00:00Z'), model: 'ecmwf', tws: 12, twd: 110 },
  { timestamp: Date.parse('2026-09-23T00:00:00Z'), model: 'gfs', tws: 13, twd: 111 },
  { timestamp: routeEnd, model: 'ecmwf', tws: null, twd: null, unavailable: true, reason: 'outside-horizon', horizonEnd: Date.parse('2026-09-24T00:00:00Z') },
  { timestamp: routeEnd, model: 'gfs', tws: null, twd: null, unavailable: true, reason: 'outside-horizon', horizonEnd: Date.parse('2026-09-24T00:00:00Z') },
];
const coverageWindow = summarizeCoverageWindow(coverageSamples, routeStart, routeEnd, ['ecmwf', 'gfs']);
assert.equal(coverageWindow.complete, false);
assert.equal(coverageWindow.limitingReason, 'outside-horizon');
assert.equal(coverageWindow.coveredSamples, 2);
assert.equal(Math.round(coverageWindow.temporalCoveragePercent), 50);

const distanceWindow = summarizeRouteDistanceWindow([
  { time: new Date(routeStart), lat: 0, lon: 0 },
  { time: new Date(Date.parse('2026-09-23T00:00:00Z')), lat: 0, lon: 1 },
  { time: new Date(routeEnd), lat: 0, lon: 2 },
], routeStart, Date.parse('2026-09-23T00:00:00Z'));
assert.equal(Math.round(distanceWindow.distanceCoveragePercent), 50);

console.log('weather analysis tests: OK');
