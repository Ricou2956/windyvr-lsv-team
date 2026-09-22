import assert from 'node:assert/strict';
import { angularDifference, buildRiskEvents, buildSampleTimes, samplingIntervalHours, selectCriticalEvents, summarizeArrivalComparability, summarizeCoverageWindow, summarizeRiskProfile, summarizeRouteDistanceWindow, summarizeWeatherSamples } from '../src/analysisUtils.js';

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


const mostlyCalm = Array.from({ length: 9 }, (_, index) => ({ timestamp: index, level: 'green', speedSpread: 2, directionSpread: 10 }))
  .concat([{ timestamp: 9, level: 'red', speedSpread: 20, directionSpread: 180 }]);
const calmProfile = summarizeRiskProfile(mostlyCalm, { temporalCoveragePercent: 100, distanceCoveragePercent: 100 });
assert.equal(calmProfile.level, 'green');
assert.equal(calmProfile.p90SpeedSpread, 2);
assert.equal(calmProfile.p90DirectionSpread, 10);

const persistentRed = Array.from({ length: 10 }, (_, index) => ({ timestamp: index, level: index < 6 ? 'red' : 'orange', speedSpread: index < 6 ? 9 : 6, directionSpread: index < 6 ? 50 : 30 }));
const redProfile = summarizeRiskProfile(persistentRed, { temporalCoveragePercent: 100, distanceCoveragePercent: 100 });
assert.equal(redProfile.level, 'red');
assert.ok(redProfile.score >= 70);

const insufficient = summarizeRiskProfile(persistentRed, { temporalCoveragePercent: 64, distanceCoveragePercent: 64 });
assert.equal(insufficient.level, 'unknown');
assert.equal(insufficient.score, 0);

const routesForCritical = [
  { routeId: 'a', label: 'A', summary: { critical: { timestamp: 100 } }, riskEvents: [
    { timestamp: 10, level: 'orange', speedSpread: 5, directionSpread: 25 },
    { timestamp: 100, level: 'red', speedSpread: 10, directionSpread: 60 },
    { timestamp: 110, level: 'red', speedSpread: 12, directionSpread: 55 },
  ] },
  { routeId: 'b', label: 'B', summary: { critical: { timestamp: 200 } }, riskEvents: [
    { timestamp: 20, level: 'orange', speedSpread: 6, directionSpread: 28 },
    { timestamp: 200, level: 'red', speedSpread: 9, directionSpread: 50 },
  ] },
];
const criticalSelection = selectCriticalEvents(routesForCritical, 3);
assert.equal(criticalSelection.length, 3);
assert.ok(criticalSelection.some(event => event.routeId === 'a' && event.timestamp === 100));
assert.ok(criticalSelection.some(event => event.routeId === 'b' && event.timestamp === 200));
assert.deepEqual(criticalSelection.map(event => event.timestamp), [...criticalSelection.map(event => event.timestamp)].sort((a, b) => a - b));


const arrivalA = { id: 'a', points: [{ time: new Date('2026-09-25T00:00:00Z'), lat: 50, lon: -5 }] };
const arrivalB = { id: 'b', points: [{ time: new Date('2026-09-25T01:00:00Z'), lat: 50, lon: -4.95 }] };
const arrivalC = { id: 'c', points: [{ time: new Date('2026-09-25T02:00:00Z'), lat: 50, lon: -4.7 }] };
const comparableArrivals = summarizeArrivalComparability([arrivalA, arrivalB], 5);
assert.equal(comparableArrivals.comparable, true);
assert.ok(comparableArrivals.maxSeparationNm < 5);
const differentArrivals = summarizeArrivalComparability([arrivalA, arrivalC], 5);
assert.equal(differentArrivals.comparable, false);
assert.equal(differentArrivals.reason, 'different-arrivals');
assert.ok(differentArrivals.maxSeparationNm > 5);

console.log('weather analysis tests: OK');
