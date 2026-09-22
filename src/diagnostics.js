export const DIAGNOSTICS_SCHEMA_VERSION = 4;

function emptyModelStats() {
  return {
    calls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    networkRequests: 0,
    responses: 0,
    unavailable: 0,
    errors: 0,
    seriesSamplesMin: null,
    seriesSamplesMax: null,
    seriesStartMin: null,
    seriesStartMax: null,
    seriesEndMin: null,
    seriesEndMax: null,
    seriesKeys: new Set(),
  };
}

function emptyWeatherStats() {
  return {
    calls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    networkRequests: 0,
    responses: 0,
    unavailable: 0,
    errors: 0,
    byModel: {},
  };
}

function modelStats(stats, model) {
  if (!stats.byModel[model]) stats.byModel[model] = emptyModelStats();
  return stats.byModel[model];
}

function updateCounter(stats, model, key, amount = 1) {
  stats[key] += amount;
  modelStats(stats, model)[key] += amount;
}

function updateSeriesWindow(stats, model, sampleCount, startTimestamp, endTimestamp) {
  const target = modelStats(stats, model);
  const updateMin = (key, value) => {
    if (!Number.isFinite(value)) return;
    target[key] = target[key] == null ? value : Math.min(target[key], value);
  };
  const updateMax = (key, value) => {
    if (!Number.isFinite(value)) return;
    target[key] = target[key] == null ? value : Math.max(target[key], value);
  };
  updateMin('seriesSamplesMin', sampleCount);
  updateMax('seriesSamplesMax', sampleCount);
  updateMin('seriesStartMin', startTimestamp);
  updateMax('seriesStartMax', startTimestamp);
  updateMin('seriesEndMin', endTimestamp);
  updateMax('seriesEndMax', endTimestamp);
}

const state = {
  sessionStartedAt: Date.now(),
  weather: emptyWeatherStats(),
  currentAnalysis: null,
  lastAnalysis: null,
};

function forWeatherTargets(callback) {
  callback(state.weather);
  if (state.currentAnalysis) callback(state.currentAnalysis.weather);
}

export function resetDiagnostics() {
  state.sessionStartedAt = Date.now();
  state.weather = emptyWeatherStats();
  state.currentAnalysis = null;
  state.lastAnalysis = null;
}

export function recordWeatherCall(model) {
  forWeatherTargets(stats => updateCounter(stats, model, 'calls'));
}

export function recordWeatherCacheHit(model, { sampleCount, startTimestamp, endTimestamp } = {}) {
  forWeatherTargets(stats => {
    updateCounter(stats, model, 'cacheHits');
    updateSeriesWindow(stats, model, Number(sampleCount), Number(startTimestamp), Number(endTimestamp));
  });
}

export function recordWeatherSeriesUse(model, key) {
  if (!key) return;
  forWeatherTargets(stats => modelStats(stats, model).seriesKeys.add(String(key)));
}

export function recordWeatherCacheMiss(model) {
  forWeatherTargets(stats => updateCounter(stats, model, 'cacheMisses'));
}

export function recordWeatherRequest(model) {
  forWeatherTargets(stats => updateCounter(stats, model, 'networkRequests'));
}

export function recordWeatherResponse(model, { sampleCount, startTimestamp, endTimestamp } = {}) {
  forWeatherTargets(stats => {
    updateCounter(stats, model, 'responses');
    updateSeriesWindow(stats, model, Number(sampleCount), Number(startTimestamp), Number(endTimestamp));
  });
}

export function recordWeatherUnavailable(model) {
  forWeatherTargets(stats => updateCounter(stats, model, 'unavailable'));
}

export function recordWeatherError(model) {
  forWeatherTargets(stats => updateCounter(stats, model, 'errors'));
}

export function startAnalysisDiagnostics({ routeCount = 0, jobCount = 0, sampleCounts = [] } = {}) {
  state.currentAnalysis = {
    startedAt: Date.now(),
    finishedAt: null,
    durationMs: null,
    status: 'running',
    routeCount,
    jobCount,
    sampleCounts: sampleCounts.map(item => ({
      routeIndex: item.routeIndex,
      source: item.source,
      count: item.count,
    })),
    weather: emptyWeatherStats(),
  };
}

export function finishAnalysisDiagnostics(status = 'done') {
  if (!state.currentAnalysis) return;
  state.currentAnalysis.finishedAt = Date.now();
  state.currentAnalysis.durationMs = state.currentAnalysis.finishedAt - state.currentAnalysis.startedAt;
  state.currentAnalysis.status = status;
  state.lastAnalysis = state.currentAnalysis;
  state.currentAnalysis = null;
}

function haversineNm(a, b) {
  const rad = value => value * Math.PI / 180;
  const r = 3440.065;
  const p1 = rad(a.lat);
  const p2 = rad(b.lat);
  const dp = p2 - p1;
  const dl = rad(b.lon - a.lon);
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

function routeDiagnostics(route, routeIndex) {
  const points = route?.points || [];
  if (!points.length) {
    return { routeIndex, source: route?.source || 'inconnue', pointCount: 0 };
  }

  let distanceNm = 0;
  let duplicateTimestamps = Number.isFinite(route?.qualityMeta?.duplicateTimestamps) ? route.qualityMeta.duplicateTimestamps : 0;
  let reversedTimestamps = Number.isFinite(route?.qualityMeta?.reversedTimestamps) ? route.qualityMeta.reversedTimestamps : 0;
  let invalidPositions = 0;
  const temporalMetaAvailable = route?.qualityMeta && (Number.isFinite(route.qualityMeta.duplicateTimestamps) || Number.isFinite(route.qualityMeta.reversedTimestamps));
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon) || Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) invalidPositions += 1;
    if (i > 0) {
      if (Number.isFinite(points[i - 1].lat) && Number.isFinite(points[i - 1].lon) && Number.isFinite(point.lat) && Number.isFinite(point.lon)) {
        distanceNm += haversineNm(points[i - 1], point);
      }
      if (!temporalMetaAvailable) {
        const gap = point.time?.getTime?.() - points[i - 1].time?.getTime?.();
        if (gap === 0) duplicateTimestamps += 1;
        else if (Number.isFinite(gap) && gap < 0) reversedTimestamps += 1;
      }
    }
  }

  const firstMs = points[0].time?.getTime?.();
  const lastMs = points.at(-1).time?.getTime?.();
  const durationHours = Number.isFinite(firstMs) && Number.isFinite(lastMs) && lastMs >= firstMs ? (lastMs - firstMs) / 3600000 : null;
  const sogs = points.map(point => point.sog).filter(Number.isFinite);
  const averageSogKt = sogs.length ? sogs.reduce((sum, value) => sum + value, 0) / sogs.length : null;
  const geometricAverageKt = durationHours > 0 ? distanceNm / durationHours : null;

  const fieldCoverage = {};
  for (const key of ['sog', 'tws', 'twd', 'twa', 'cog']) {
    const present = points.filter(point => Number.isFinite(point[key])).length;
    fieldCoverage[key] = Number((present / points.length * 100).toFixed(1));
  }
  fieldCoverage.sail = Number((points.filter(point => point.sail != null && String(point.sail).trim() !== '').length / points.length * 100).toFixed(1));

  return {
    routeIndex,
    source: route?.source || 'inconnue',
    nativeModel: route?.nativeModel || null,
    cycle: route?.cycle || null,
    pointCount: points.length,
    startUtc: Number.isFinite(firstMs) ? new Date(firstMs).toISOString() : null,
    endUtc: Number.isFinite(lastMs) ? new Date(lastMs).toISOString() : null,
    durationHours: durationHours == null ? null : Number(durationHours.toFixed(2)),
    distanceNm: Number(distanceNm.toFixed(2)),
    averageSogKt: averageSogKt == null ? null : Number(averageSogKt.toFixed(3)),
    geometricAverageKt: geometricAverageKt == null ? null : Number(geometricAverageKt.toFixed(3)),
    sogToGeometricRatio: averageSogKt != null && geometricAverageKt > 0 ? Number((averageSogKt / geometricAverageKt).toFixed(4)) : null,
    duplicateTimestamps,
    reversedTimestamps,
    deduplicatedTimestamps: Number.isFinite(route?.qualityMeta?.deduplicatedTimestamps) ? route.qualityMeta.deduplicatedTimestamps : 0,
    originalPointCount: Number.isFinite(route?.qualityMeta?.originalPointCount) ? route.qualityMeta.originalPointCount : points.length,
    invalidPositions: invalidPositions + (Number.isFinite(route?.qualityMeta?.discardedInvalidPositions) ? route.qualityMeta.discardedInvalidPositions : 0),
    discardedInvalidPositions: Number.isFinite(route?.qualityMeta?.discardedInvalidPositions) ? route.qualityMeta.discardedInvalidPositions : 0,
    dateInterpretation: route?.qualityMeta?.dateInterpretation || null,
    inferredYear: Number.isFinite(route?.qualityMeta?.inferredYear) ? route.qualityMeta.inferredYear : null,
    fieldCoveragePercent: fieldCoverage,
  };
}

function routeAnalysisDiagnostics(item, routeIndex) {
  const modelStats = {};
  for (const [model, value] of Object.entries(item?.summary?.byModel || {})) {
    modelStats[model] = {
      coveredSamples: value?.coverage || 0,
      coveragePercent: item.sampleCount ? Number(((value?.coverage || 0) / item.sampleCount * 100).toFixed(1)) : 0,
      averageTws: Number.isFinite(value?.avgTws) ? Number(value.avgTws.toFixed(3)) : null,
      maxTws: Number.isFinite(value?.maxTws) ? Number(value.maxTws.toFixed(3)) : null,
    };
  }

  const counts = { green: 0, orange: 0, red: 0, unknown: 0 };
  for (const event of item?.riskEvents || []) {
    if (event.level in counts) counts[event.level] += 1;
  }
  const coveredEvents = (item?.riskEvents || []).filter(event => event.level !== 'unknown');

  return {
    routeIndex,
    source: item?.source || item?.label || 'inconnue',
    sampleCount: item?.sampleCount || 0,
    qualityLevel: item?.quality?.level || null,
    qualityIssues: [...(item?.quality?.issues || [])],
    models: modelStats,
    critical: item?.summary?.critical ? {
      timestampUtc: new Date(item.summary.critical.timestamp).toISOString(),
      speedSpreadKt: Number(item.summary.critical.speedSpread.toFixed(3)),
      directionSpreadDeg: Number(item.summary.critical.directionSpread.toFixed(3)),
    } : null,
    riskEventCounts: counts,
    firstCoveredUtc: coveredEvents.length ? new Date(coveredEvents[0].timestamp).toISOString() : null,
    lastCoveredUtc: coveredEvents.length ? new Date(coveredEvents.at(-1).timestamp).toISOString() : null,
    analysisWindow: item?.coverageWindow ? {
      firstCoveredUtc: Number.isFinite(item.coverageWindow.firstCovered) ? new Date(item.coverageWindow.firstCovered).toISOString() : null,
      lastCoveredUtc: Number.isFinite(item.coverageWindow.lastCovered) ? new Date(item.coverageWindow.lastCovered).toISOString() : null,
      temporalCoveragePercent: Number.isFinite(item.coverageWindow.temporalCoveragePercent) ? Number(item.coverageWindow.temporalCoveragePercent.toFixed(1)) : 0,
      sampleCoveragePercent: Number.isFinite(item.coverageWindow.sampleCoveragePercent) ? Number(item.coverageWindow.sampleCoveragePercent.toFixed(1)) : 0,
      distanceCoveragePercent: Number.isFinite(item.coverageWindow.distanceCoveragePercent) ? Number(item.coverageWindow.distanceCoveragePercent.toFixed(1)) : 0,
      coveredDistanceNm: Number.isFinite(item.coverageWindow.coveredDistanceNm) ? Number(item.coverageWindow.coveredDistanceNm.toFixed(1)) : 0,
      totalDistanceNm: Number.isFinite(item.coverageWindow.totalDistanceNm) ? Number(item.coverageWindow.totalDistanceNm.toFixed(1)) : 0,
      complete: Boolean(item.coverageWindow.complete),
      limitingReason: item.coverageWindow.limitingReason || null,
      requestedSamples: item.coverageWindow.requestedSamples || 0,
      coveredSamples: item.coverageWindow.coveredSamples || 0,
    } : null,
    etaComparison: {
      comparable: item?.etaComparable !== false,
      thresholdNm: Number.isFinite(item?.arrivalThresholdNm) ? Number(item.arrivalThresholdNm.toFixed(1)) : null,
      maxSeparationNm: Number.isFinite(item?.arrivalMaxSeparationNm) ? Number(item.arrivalMaxSeparationNm.toFixed(1)) : null,
      status: item?.etaComparable === false ? 'different-arrivals' : 'comparable',
    },
    routeWindow: item?.routeWindow ? {
      startUtc: Number.isFinite(item.routeWindow.start) ? new Date(item.routeWindow.start).toISOString() : null,
      endUtc: Number.isFinite(item.routeWindow.end) ? new Date(item.routeWindow.end).toISOString() : null,
      distanceNm: Number.isFinite(item.routeWindow.distanceNm) ? Number(item.routeWindow.distanceNm.toFixed(1)) : null,
    } : null,
    riskProfile: item?.riskProfile ? {
      score: Number.isFinite(item.riskProfile.score) ? item.riskProfile.score : 0,
      level: item.riskProfile.level || null,
      coveragePercent: Number.isFinite(item.riskProfile.coveragePercent) ? Number(item.riskProfile.coveragePercent.toFixed(1)) : 0,
      evaluableEventCount: item.riskProfile.evaluableEventCount || 0,
      p90SpeedSpreadKt: Number.isFinite(item.riskProfile.p90SpeedSpread) ? Number(item.riskProfile.p90SpeedSpread.toFixed(3)) : null,
      p90DirectionSpreadDeg: Number.isFinite(item.riskProfile.p90DirectionSpread) ? Number(item.riskProfile.p90DirectionSpread.toFixed(3)) : null,
      redEventPercent: Number.isFinite(item.riskProfile.redEventPercent) ? Number(item.riskProfile.redEventPercent.toFixed(1)) : 0,
      sensitiveEventPercent: Number.isFinite(item.riskProfile.sensitiveEventPercent) ? Number(item.riskProfile.sensitiveEventPercent.toFixed(1)) : 0,
    } : null,
  };
}

function normalizeWeatherStats(weather) {
  const result = {
    calls: weather.calls,
    cacheHits: weather.cacheHits,
    cacheMisses: weather.cacheMisses,
    networkRequests: weather.networkRequests,
    responses: weather.responses,
    unavailable: weather.unavailable,
    errors: weather.errors,
    cacheHitPercent: weather.calls ? Number((weather.cacheHits / weather.calls * 100).toFixed(1)) : 0,
    byModel: {},
  };

  for (const [model, value] of Object.entries(weather.byModel || {})) {
    result.byModel[model] = {
      ...value,
      uniqueSeriesPositions: value.seriesKeys instanceof Set ? value.seriesKeys.size : 0,
      seriesStartMinUtc: Number.isFinite(value.seriesStartMin) ? new Date(value.seriesStartMin).toISOString() : null,
      seriesStartMaxUtc: Number.isFinite(value.seriesStartMax) ? new Date(value.seriesStartMax).toISOString() : null,
      seriesEndMinUtc: Number.isFinite(value.seriesEndMin) ? new Date(value.seriesEndMin).toISOString() : null,
      seriesEndMaxUtc: Number.isFinite(value.seriesEndMax) ? new Date(value.seriesEndMax).toISOString() : null,
    };
    delete result.byModel[model].seriesStartMin;
    delete result.byModel[model].seriesStartMax;
    delete result.byModel[model].seriesEndMin;
    delete result.byModel[model].seriesEndMax;
    delete result.byModel[model].seriesKeys;
  }
  result.uniqueSeriesPositionModelPairs = Object.values(result.byModel).reduce((sum, value) => sum + (value.uniqueSeriesPositions || 0), 0);
  return result;
}

export function buildDiagnosticsReport({ pluginVersion, routes = [], routeAnalysis = [] } = {}) {
  const routeIndexById = new Map(routes.map((route, index) => [route.id, index + 1]));
  const activeAnalysis = state.currentAnalysis || state.lastAnalysis;
  return {
    schemaVersion: DIAGNOSTICS_SCHEMA_VERSION,
    pluginVersion: pluginVersion || null,
    generatedAtUtc: new Date().toISOString(),
    privacy: {
      localOnly: true,
      transmittedAutomatically: false,
      containsFileNames: false,
      containsCoordinates: false,
    },
    session: {
      startedAtUtc: new Date(state.sessionStartedAt).toISOString(),
      weather: normalizeWeatherStats(state.weather),
    },
    analysisRun: activeAnalysis ? {
      startedAtUtc: new Date(activeAnalysis.startedAt).toISOString(),
      finishedAtUtc: activeAnalysis.finishedAt ? new Date(activeAnalysis.finishedAt).toISOString() : null,
      durationMs: activeAnalysis.durationMs,
      status: activeAnalysis.status,
      routeCount: activeAnalysis.routeCount,
      jobCount: activeAnalysis.jobCount,
      sampleCounts: activeAnalysis.sampleCounts,
      weather: normalizeWeatherStats(activeAnalysis.weather),
    } : null,
    routes: routes.map((route, index) => routeDiagnostics(route, index + 1)),
    routeAnalysis: routeAnalysis.map((item, index) => routeAnalysisDiagnostics(item, routeIndexById.get(item.routeId) || index + 1)),
  };
}
