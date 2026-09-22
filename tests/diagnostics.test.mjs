import assert from 'node:assert/strict';
import {
  buildDiagnosticsReport,
  finishAnalysisDiagnostics,
  recordWeatherCacheHit,
  recordWeatherCacheMiss,
  recordWeatherCall,
  recordWeatherRequest,
  recordWeatherResponse,
  recordWeatherSeriesUse,
  recordWeatherUnavailable,
  resetDiagnostics,
  startAnalysisDiagnostics,
} from '../src/diagnostics.js';

resetDiagnostics();
startAnalysisDiagnostics({
  routeCount: 1,
  jobCount: 3,
  sampleCounts: [{ routeIndex: 1, source: 'Avalon', count: 1 }],
});
recordWeatherCall('ecmwf');
recordWeatherSeriesUse('ecmwf', 'ecmwf:48.123:-5.123');
recordWeatherCacheMiss('ecmwf');
recordWeatherRequest('ecmwf');
recordWeatherResponse('ecmwf', {
  sampleCount: 4,
  startTimestamp: Date.parse('2026-09-18T00:00:00Z'),
  endTimestamp: Date.parse('2026-09-22T00:00:00Z'),
});
recordWeatherUnavailable('ecmwf');
recordWeatherCall('gfs');
recordWeatherSeriesUse('gfs', 'gfs:48.123:-5.123');
recordWeatherCacheHit('gfs', {
  sampleCount: 4,
  startTimestamp: Date.parse('2026-09-18T00:00:00Z'),
  endTimestamp: Date.parse('2026-09-22T00:00:00Z'),
});
finishAnalysisDiagnostics('done');

const route = {
  id: 'private-id',
  name: 'SECRET_ROUTE_NAME.csv',
  source: 'Avalon',
  qualityMeta: { duplicateTimestamps: 1, reversedTimestamps: 2, deduplicatedTimestamps: 1, originalPointCount: 4, discardedInvalidPositions: 1, dateInterpretation: 'heure locale navigateur', inferredYear: 2026 },
  points: [
    { time: new Date('2026-09-18T00:00:00Z'), lat: 48.123456, lon: -5.123456, sog: 10, tws: 12, twd: 240, twa: -90, cog: 330, sail: 'Jib' },
    { time: new Date('2026-09-18T01:00:00Z'), lat: 48.223456, lon: -5.223456, sog: 10, tws: 13, twd: 245, twa: -85, cog: 335, sail: 'Jib' },
  ],
};
const routeAnalysis = [{
  routeId: 'private-id', source: 'Avalon', label: 'Avalon', sampleCount: 1,
  etaComparable: false, arrivalThresholdNm: 5, arrivalMaxSeparationNm: 42.37,
  routeWindow: { start: Date.parse('2026-09-18T00:00:00Z'), end: Date.parse('2026-09-18T01:00:00Z'), distanceNm: 8.4 },
  quality: { level: 'green', issues: [] }, summary: { byModel: {}, critical: null }, riskEvents: [], coverageWindow: { firstCovered: Date.parse('2026-09-18T00:30:00Z'), lastCovered: Date.parse('2026-09-18T01:00:00Z'), temporalCoveragePercent: 50, sampleCoveragePercent: 50, distanceCoveragePercent: 50, coveredDistanceNm: 4.2, totalDistanceNm: 8.4, complete: false, limitingReason: 'before-forecast-window', leadingReason: 'before-forecast-window', trailingReason: null, startsBeforeForecast: true, endsAfterForecast: false, requestedSamples: 2, coveredSamples: 1 }, riskProfile: null,
}];
const report = buildDiagnosticsReport({ pluginVersion: '1.1.0', routes: [route], routeAnalysis });
assert.equal(report.schemaVersion, 5);
assert.equal(report.analysisRun.status, 'done');
assert.equal(report.analysisRun.weather.networkRequests, 1);
assert.equal(report.analysisRun.weather.cacheHits, 1);
assert.equal(report.analysisRun.weather.uniqueSeriesPositionModelPairs, 2);
assert.equal(report.analysisRun.weather.byModel.ecmwf.uniqueSeriesPositions, 1);
assert.equal(report.analysisRun.weather.byModel.gfs.seriesEndMinUtc, '2026-09-22T00:00:00.000Z');
assert.equal(report.session.weather.byModel.ecmwf.seriesEndMinUtc, '2026-09-22T00:00:00.000Z');
assert.equal(report.routes[0].pointCount, 2);
assert.equal(report.routes[0].duplicateTimestamps, 1);
assert.equal(report.routes[0].reversedTimestamps, 2);
assert.equal(report.routes[0].deduplicatedTimestamps, 1);
assert.equal(report.routes[0].originalPointCount, 4);
assert.equal(report.routes[0].invalidPositions, 1);
assert.equal(report.routes[0].discardedInvalidPositions, 1);
assert.equal(report.routes[0].dateInterpretation, 'heure locale navigateur');
assert.equal(report.routes[0].inferredYear, 2026);
assert.equal(report.routes[0].fieldCoveragePercent.sog, 100);
assert.equal(report.routeAnalysis[0].etaComparison.comparable, false);
assert.equal(report.routeAnalysis[0].etaComparison.status, 'different-arrivals');
assert.equal(report.routeAnalysis[0].etaComparison.maxSeparationNm, 42.4);
assert.equal(report.routeAnalysis[0].routeWindow.distanceNm, 8.4);
assert.equal(report.routeAnalysis[0].routeWindow.startUtc, '2026-09-18T00:00:00.000Z');
assert.equal(report.routeAnalysis[0].analysisWindow.limitingReason, 'before-forecast-window');
assert.equal(report.routeAnalysis[0].analysisWindow.leadingReason, 'before-forecast-window');
assert.equal(report.routeAnalysis[0].analysisWindow.trailingReason, null);
assert.equal(report.routeAnalysis[0].analysisWindow.startsBeforeForecast, true);
assert.equal(report.routeAnalysis[0].analysisWindow.endsAfterForecast, false);

assert.equal(report.privacy.containsFileNames, false);
assert.equal(report.privacy.containsCoordinates, false);
const serialized = JSON.stringify(report);
assert.equal(serialized.includes('SECRET_ROUTE_NAME.csv'), false);
assert.equal(serialized.includes('48.123456'), false);
assert.equal(serialized.includes('-5.123456'), false);
console.log('diagnostics tests: OK');
