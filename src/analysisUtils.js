import { interpolateRoute } from './timeUtils.js';

export function samplingIntervalHours(durationMs) {
  const hours = durationMs / 3600000;
  if (hours < 12) return 0.5;
  if (hours < 24) return 1;
  if (hours < 72) return 3;
  if (hours < 144) return 6;
  return 12;
}

export function buildSampleTimes(points, maxSamples = 36) {
  if (!points?.length) return [];
  const start = points[0].time.getTime();
  const end = points.at(-1).time.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  const step = samplingIntervalHours(end - start) * 3600000;
  const base = [];
  for (let ts = start; ts <= end; ts += step) base.push(ts);
  if (base.at(-1) !== end) base.push(end);
  if (base.length > maxSamples) {
    return Array.from({ length: maxSamples }, (_, i) => base[Math.round(i * (base.length - 1) / (maxSamples - 1))]);
  }

  const events = [];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1], b = points[i];
    const turn = angularDifference(Number(a.cog), Number(b.cog)) || 0;
    const maneuver = Number.isFinite(a.twa) && Number.isFinite(b.twa) && Math.abs(a.twa) >= 5 && Math.abs(b.twa) >= 5 && Math.sign(a.twa) !== Math.sign(b.twa);
    const windChange = Number.isFinite(a.tws) && Number.isFinite(b.tws) ? Math.abs(b.tws - a.tws) : 0;
    const score = turn + (maneuver ? 60 : 0) + windChange * 8;
    if (turn >= 25 || maneuver || windChange >= 4) events.push({ timestamp: b.time.getTime(), score });
  }
  const eventSlots = Math.max(0, maxSamples - base.length);
  const selectedEvents = events.sort((a, b) => b.score - a.score).slice(0, eventSlots).map(e => e.timestamp);
  return [...new Set([...base, ...selectedEvents])].sort((a, b) => a - b).slice(0, maxSamples);
}

export function angularDifference(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.abs(((a - b + 540) % 360) - 180);
}

export function summarizeWeatherSamples(samples, modelIds) {
  const usable = samples.filter(s => Number.isFinite(s.tws) && Number.isFinite(s.twd));
  const byModel = Object.fromEntries(modelIds.map(model => {
    const values = usable.filter(s => s.model === model);
    const avg = values.length ? values.reduce((sum, s) => sum + s.tws, 0) / values.length : null;
    return [model, { coverage: values.length, avgTws: avg, maxTws: values.length ? Math.max(...values.map(s => s.tws)) : null }];
  }));

  const byTime = new Map();
  for (const sample of usable) {
    if (!byTime.has(sample.timestamp)) byTime.set(sample.timestamp, []);
    byTime.get(sample.timestamp).push(sample);
  }
  let critical = null;
  for (const [timestamp, values] of byTime) {
    if (values.length < 2) continue;
    const speeds = values.map(v => v.tws);
    let directionSpread = 0;
    for (let i = 0; i < values.length; i += 1) for (let j = i + 1; j < values.length; j += 1) {
      directionSpread = Math.max(directionSpread, angularDifference(values[i].twd, values[j].twd) || 0);
    }
    const item = { timestamp, speedSpread: Math.max(...speeds) - Math.min(...speeds), directionSpread };
    if (!critical || item.speedSpread > critical.speedSpread || (item.speedSpread === critical.speedSpread && item.directionSpread > critical.directionSpread)) critical = item;
  }
  return { byModel, critical, usable: usable.length, total: samples.length };
}

export function buildRiskEvents(samples) {
  const byTime = new Map();
  for (const sample of samples) {
    if (!byTime.has(sample.timestamp)) byTime.set(sample.timestamp, []);
    if (!Number.isFinite(sample.tws) || !Number.isFinite(sample.twd)) continue;
    byTime.get(sample.timestamp).push(sample);
  }
  return [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([timestamp, values]) => {
    if (values.length < 2) return { timestamp, level: 'unknown', speedSpread: null, directionSpread: null };
    const speeds = values.map(v => v.tws);
    let directionSpread = 0;
    for (let i = 0; i < values.length; i += 1) for (let j = i + 1; j < values.length; j += 1) directionSpread = Math.max(directionSpread, angularDifference(values[i].twd, values[j].twd) || 0);
    const speedSpread = Math.max(...speeds) - Math.min(...speeds);
    const level = speedSpread >= 8 || directionSpread >= 45 ? 'red' : speedSpread >= 5 || directionSpread >= 25 ? 'orange' : 'green';
    return { timestamp, level, speedSpread, directionSpread };
  });
}

function haversineNm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lon) || !Number.isFinite(b.lat) || !Number.isFinite(b.lon)) return 0;
  const rad = value => value * Math.PI / 180;
  const r = 3440.065;
  const p1 = rad(a.lat);
  const p2 = rad(b.lat);
  const dp = p2 - p1;
  const dl = rad(b.lon - a.lon);
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

function distanceAtTimestamp(points, timestamp) {
  if (!Array.isArray(points) || points.length < 2 || !Number.isFinite(timestamp)) return 0;
  const first = points[0].time?.getTime?.();
  const last = points.at(-1).time?.getTime?.();
  if (!Number.isFinite(first) || !Number.isFinite(last)) return 0;
  if (timestamp <= first) return 0;

  let distance = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const aTs = a.time?.getTime?.();
    const bTs = b.time?.getTime?.();
    const segment = haversineNm(a, b);
    if (!Number.isFinite(aTs) || !Number.isFinite(bTs) || bTs <= aTs) {
      if (timestamp >= bTs) distance += segment;
      continue;
    }
    if (timestamp >= bTs) {
      distance += segment;
      continue;
    }
    if (timestamp <= aTs) break;
    const fraction = Math.max(0, Math.min(1, (timestamp - aTs) / (bTs - aTs)));
    distance += segment * fraction;
    break;
  }
  return distance;
}

export function summarizeRouteDistanceWindow(points, firstTimestamp, lastTimestamp) {
  if (!Array.isArray(points) || points.length < 2) {
    return { coveredDistanceNm: 0, totalDistanceNm: 0, distanceCoveragePercent: 0 };
  }
  let totalDistanceNm = 0;
  for (let i = 1; i < points.length; i += 1) totalDistanceNm += haversineNm(points[i - 1], points[i]);
  if (!Number.isFinite(firstTimestamp) || !Number.isFinite(lastTimestamp) || lastTimestamp < firstTimestamp) {
    return {
      coveredDistanceNm: 0,
      totalDistanceNm,
      distanceCoveragePercent: 0,
    };
  }
  const startDistance = distanceAtTimestamp(points, firstTimestamp);
  const endDistance = distanceAtTimestamp(points, lastTimestamp);
  const coveredDistanceNm = Math.max(0, endDistance - startDistance);
  return {
    coveredDistanceNm,
    totalDistanceNm,
    distanceCoveragePercent: totalDistanceNm > 0 ? coveredDistanceNm / totalDistanceNm * 100 : 0,
  };
}

export function summarizeCoverageWindow(samples, routeStartTimestamp, routeEndTimestamp, modelIds = []) {
  const routeStart = Number(routeStartTimestamp);
  const routeEnd = Number(routeEndTimestamp);
  const byTime = new Map();
  const blankModel = () => ({
    coveredSamples: 0,
    beforeForecastWindow: 0,
    afterForecastHorizon: 0,
    forecastGaps: 0,
    errors: 0,
    firstCovered: null,
    lastCovered: null,
    horizonStart: null,
    horizonEnd: null,
  });
  const byModel = Object.fromEntries(modelIds.map(model => [model, blankModel()]));

  function classifyUnavailable(sample, timestamp) {
    if (sample?.reason === 'before-forecast-window') return 'before-forecast-window';
    if (sample?.reason === 'after-forecast-horizon') return 'after-forecast-horizon';
    if (sample?.reason === 'forecast-gap') return 'forecast-gap';
    // Backward compatibility with diagnostics generated before schema v5.
    if (sample?.reason === 'outside-horizon' || sample?.unavailable) {
      if (Number.isFinite(sample?.horizonStart) && timestamp < sample.horizonStart) return 'before-forecast-window';
      if (Number.isFinite(sample?.horizonEnd) && timestamp > sample.horizonEnd) return 'after-forecast-horizon';
      return 'forecast-gap';
    }
    return null;
  }

  for (const sample of samples || []) {
    const timestamp = Number(sample?.timestamp);
    if (!Number.isFinite(timestamp)) continue;
    if (!byTime.has(timestamp)) byTime.set(timestamp, {
      coveredModels: 0,
      beforeForecastWindow: 0,
      afterForecastHorizon: 0,
      forecastGaps: 0,
      errors: 0,
    });
    const timeEntry = byTime.get(timestamp);
    const modelEntry = byModel[sample.model] || (byModel[sample.model] = blankModel());

    if (Number.isFinite(sample.tws) && Number.isFinite(sample.twd)) {
      timeEntry.coveredModels += 1;
      modelEntry.coveredSamples += 1;
      modelEntry.firstCovered = modelEntry.firstCovered == null ? timestamp : Math.min(modelEntry.firstCovered, timestamp);
      modelEntry.lastCovered = modelEntry.lastCovered == null ? timestamp : Math.max(modelEntry.lastCovered, timestamp);
    } else if (sample.error || sample.reason === 'request-or-format-error') {
      timeEntry.errors += 1;
      modelEntry.errors += 1;
    } else {
      const reason = classifyUnavailable(sample, timestamp);
      if (reason === 'before-forecast-window') {
        timeEntry.beforeForecastWindow += 1;
        modelEntry.beforeForecastWindow += 1;
      } else if (reason === 'after-forecast-horizon') {
        timeEntry.afterForecastHorizon += 1;
        modelEntry.afterForecastHorizon += 1;
      } else if (reason === 'forecast-gap') {
        timeEntry.forecastGaps += 1;
        modelEntry.forecastGaps += 1;
      }
    }

    if (Number.isFinite(sample.horizonStart)) {
      modelEntry.horizonStart = modelEntry.horizonStart == null ? sample.horizonStart : Math.min(modelEntry.horizonStart, sample.horizonStart);
    }
    if (Number.isFinite(sample.horizonEnd)) {
      modelEntry.horizonEnd = modelEntry.horizonEnd == null ? sample.horizonEnd : Math.max(modelEntry.horizonEnd, sample.horizonEnd);
    }
  }

  const requiredModels = Math.min(2, Math.max(1, modelIds.length || 1));
  const requestedTimes = [...byTime.keys()].sort((a, b) => a - b);
  const coveredTimes = requestedTimes.filter(timestamp => byTime.get(timestamp).coveredModels >= requiredModels);
  const firstCovered = coveredTimes.length ? coveredTimes[0] : null;
  const lastCovered = coveredTimes.length ? coveredTimes.at(-1) : null;
  const routeDuration = Number.isFinite(routeStart) && Number.isFinite(routeEnd) && routeEnd > routeStart ? routeEnd - routeStart : 0;
  const coveredSpan = Number.isFinite(firstCovered) && Number.isFinite(lastCovered) ? Math.max(0, lastCovered - firstCovered) : 0;
  const temporalCoveragePercent = routeDuration > 0 ? Math.max(0, Math.min(100, coveredSpan / routeDuration * 100)) : (coveredTimes.length ? 100 : 0);
  const sampleCoveragePercent = requestedTimes.length ? coveredTimes.length / requestedTimes.length * 100 : 0;
  const startsAtRouteStart = Number.isFinite(firstCovered) && Number.isFinite(routeStart) && firstCovered <= routeStart;
  const reachesRouteEnd = Number.isFinite(lastCovered) && Number.isFinite(routeEnd) && lastCovered >= routeEnd;

  const reasonForEntries = (entries, side) => {
    if (!entries.length) return null;
    const total = key => entries.reduce((sum, entry) => sum + (entry?.[key] || 0), 0);
    if (side === 'leading' && total('beforeForecastWindow') > 0) return 'before-forecast-window';
    if (side === 'trailing' && total('afterForecastHorizon') > 0) return 'after-forecast-horizon';
    if (total('errors') > 0) return 'weather-error';
    if (total('forecastGaps') > 0) return 'forecast-gap';
    if (total('beforeForecastWindow') > 0) return 'before-forecast-window';
    if (total('afterForecastHorizon') > 0) return 'after-forecast-horizon';
    return null;
  };

  const leadingEntries = requestedTimes
    .filter(timestamp => firstCovered == null || timestamp < firstCovered)
    .map(timestamp => byTime.get(timestamp));
  const trailingEntries = requestedTimes
    .filter(timestamp => lastCovered == null || timestamp > lastCovered)
    .map(timestamp => byTime.get(timestamp));
  const leadingReason = startsAtRouteStart ? null : reasonForEntries(leadingEntries, 'leading');
  const trailingReason = reachesRouteEnd ? null : reasonForEntries(trailingEntries, 'trailing');

  let limitingReason = null;
  if (!(startsAtRouteStart && reachesRouteEnd)) {
    if (leadingReason && trailingReason && leadingReason !== trailingReason) limitingReason = 'multiple-limits';
    else limitingReason = leadingReason || trailingReason || (coveredTimes.length ? 'partial' : 'no-data');
  }

  return {
    requestedSamples: requestedTimes.length,
    coveredSamples: coveredTimes.length,
    firstCovered,
    lastCovered,
    temporalCoveragePercent,
    sampleCoveragePercent,
    complete: Boolean(startsAtRouteStart && reachesRouteEnd),
    limitingReason,
    leadingReason,
    trailingReason,
    startsBeforeForecast: leadingReason === 'before-forecast-window',
    endsAfterForecast: trailingReason === 'after-forecast-horizon',
    byModel,
  };
}


export function summarizeArrivalComparability(routes, thresholdNm = 5) {
  const items = Array.isArray(routes) ? routes : [];
  const endpoints = items.map(route => {
    const point = route?.points?.at?.(-1) ?? route?.points?.[route?.points?.length - 1];
    return {
      id: route?.id ?? null,
      point,
      etaMs: point?.time?.getTime?.(),
    };
  });
  if (!endpoints.length) {
    return { comparable: false, thresholdNm, maxSeparationNm: null, reason: 'no-route' };
  }
  if (endpoints.some(item => !item.point || !Number.isFinite(item.point.lat) || !Number.isFinite(item.point.lon) || !Number.isFinite(item.etaMs))) {
    return { comparable: false, thresholdNm, maxSeparationNm: null, reason: 'missing-endpoint' };
  }
  if (endpoints.length === 1) {
    return { comparable: true, thresholdNm, maxSeparationNm: 0, reason: null };
  }

  let maxSeparationNm = 0;
  for (let i = 0; i < endpoints.length; i += 1) {
    for (let j = i + 1; j < endpoints.length; j += 1) {
      maxSeparationNm = Math.max(maxSeparationNm, haversineNm(endpoints[i].point, endpoints[j].point));
    }
  }
  return {
    comparable: maxSeparationNm <= thresholdNm,
    thresholdNm,
    maxSeparationNm,
    reason: maxSeparationNm <= thresholdNm ? null : 'different-arrivals',
  };
}


function nearestRank(values, q) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const rank = Math.max(1, Math.ceil(q * sorted.length));
  return sorted[Math.min(sorted.length - 1, rank - 1)];
}

export function riskEventSeverity(event) {
  if (!event || event.level === 'unknown') return 0;
  const speed = Number.isFinite(event.speedSpread) ? event.speedSpread / 8 : 0;
  const direction = Number.isFinite(event.directionSpread) ? event.directionSpread / 45 : 0;
  const levelBoost = event.level === 'red' ? 0.15 : event.level === 'orange' ? 0.05 : 0;
  return Math.max(speed, direction) + levelBoost;
}

export function summarizeRiskProfile(events, coverageWindow, { minCoveragePercent = 70 } = {}) {
  const allEvents = Array.isArray(events) ? events : [];
  const evaluable = allEvents.filter(event => event.level !== 'unknown' && (Number.isFinite(event.speedSpread) || Number.isFinite(event.directionSpread)));
  const temporalCoverage = Number.isFinite(coverageWindow?.temporalCoveragePercent) ? coverageWindow.temporalCoveragePercent : 100;
  const distanceCoverage = Number.isFinite(coverageWindow?.distanceCoveragePercent) ? coverageWindow.distanceCoveragePercent : temporalCoverage;
  const coveragePercent = Math.min(temporalCoverage, distanceCoverage);

  if (!evaluable.length || coveragePercent < minCoveragePercent) {
    const detail = !evaluable.length
      ? 'Aucun échantillon météo comparable'
      : `Couverture ${Math.round(coveragePercent)} % · concordance non évaluable`;
    return {
      score: 0, level: 'unknown', label: 'Couverture insuffisante', detail,
      coveragePercent, evaluableEventCount: evaluable.length, p90SpeedSpread: null, p90DirectionSpread: null,
      redEventPercent: 0, sensitiveEventPercent: 0,
    };
  }

  const p90SpeedSpread = nearestRank(evaluable.map(event => event.speedSpread), 0.9) ?? 0;
  const p90DirectionSpread = nearestRank(evaluable.map(event => event.directionSpread), 0.9) ?? 0;
  const redCount = evaluable.filter(event => event.level === 'red').length;
  const orangeCount = evaluable.filter(event => event.level === 'orange').length;
  const redEventPercent = redCount / evaluable.length * 100;
  const sensitiveEventPercent = (redCount + orangeCount) / evaluable.length * 100;

  const speedComponent = 50 * Math.min(1, Math.max(0, p90SpeedSpread / 8));
  const directionComponent = 30 * Math.min(1, Math.max(0, p90DirectionSpread / 45));
  const persistenceComponent = 20 * Math.min(1, Math.max(0, redEventPercent / 100));
  const score = Math.round(Math.min(100, speedComponent + directionComponent + persistenceComponent));
  const level = score >= 70 ? 'red' : score >= 40 ? 'orange' : 'green';
  const label = level === 'red' ? 'Désaccord fort' : level === 'orange' ? 'Désaccord à surveiller' : 'Bonne concordance';
  const detail = `P90 ${p90SpeedSpread.toFixed(1)} kt · ${Math.round(p90DirectionSpread)}° · rouge ${Math.round(redEventPercent)} % · couverture ${Math.round(coveragePercent)} %`;

  return {
    score, level, label, detail, coveragePercent, evaluableEventCount: evaluable.length,
    p90SpeedSpread, p90DirectionSpread, redEventPercent, sensitiveEventPercent,
  };
}

export function selectCriticalEvents(routeItems, limit = 12) {
  const items = Array.isArray(routeItems) ? routeItems : [];
  const candidates = [];
  const mandatory = [];

  for (const item of items) {
    const enriched = (item.riskEvents || [])
      .filter(event => event.level !== 'green' && event.level !== 'unknown')
      .map(event => ({ ...event, routeId: item.routeId, label: item.label, severity: riskEventSeverity(event) }));
    candidates.push(...enriched);

    const criticalTs = item?.summary?.critical?.timestamp;
    let chosen = Number.isFinite(criticalTs) ? enriched.find(event => event.timestamp === criticalTs) : null;
    if (!chosen && enriched.length) chosen = [...enriched].sort((a, b) => b.severity - a.severity || a.timestamp - b.timestamp)[0];
    if (chosen) mandatory.push(chosen);
  }

  const key = event => `${event.routeId}:${event.timestamp}`;
  const selected = [];
  const seen = new Set();
  for (const event of mandatory.sort((a, b) => b.severity - a.severity)) {
    const k = key(event);
    if (seen.has(k)) continue;
    selected.push(event);
    seen.add(k);
    if (selected.length >= limit) break;
  }

  if (selected.length < limit) {
    const remaining = candidates
      .filter(event => !seen.has(key(event)))
      .sort((a, b) => b.severity - a.severity || a.timestamp - b.timestamp);
    for (const event of remaining) {
      selected.push(event);
      seen.add(key(event));
      if (selected.length >= limit) break;
    }
  }

  return selected.sort((a, b) => a.timestamp - b.timestamp);
}

export function routeGeometryBetween(points, startTimestamp, endTimestamp) {
  if (!Array.isArray(points) || points.length < 2) return [];
  const start = Number(startTimestamp);
  const end = Number(endTimestamp);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  const firstTs = points[0]?.time?.getTime?.();
  const lastTs = points.at(-1)?.time?.getTime?.();
  if (!Number.isFinite(firstTs) || !Number.isFinite(lastTs) || end < firstTs || start > lastTs) return [];
  const clippedStart = Math.max(start, firstTs);
  const clippedEnd = Math.min(end, lastTs);
  const startPoint = interpolateRoute(points, clippedStart);
  const endPoint = interpolateRoute(points, clippedEnd);
  if (!startPoint || !endPoint) return [];
  const geometry = [[startPoint.lat, startPoint.lon]];
  for (const point of points) {
    const ts = point?.time?.getTime?.();
    if (Number.isFinite(ts) && ts > clippedStart && ts < clippedEnd) geometry.push([point.lat, point.lon]);
  }
  const last = geometry.at(-1);
  if (!last || last[0] !== endPoint.lat || last[1] !== endPoint.lon) geometry.push([endPoint.lat, endPoint.lon]);
  return geometry;
}

export function pendingAnalysisRouteIds(routes, existingAnalysis, forceAll = false) {
  const ids = new Set((existingAnalysis || []).map(item => item.routeId));
  return (routes || []).filter(route => forceAll || !ids.has(route.id)).map(route => route.id);
}

export function retainAnalysisForRoutes(existingAnalysis, routes) {
  const ids = new Set((routes || []).map(route => route.id));
  return (existingAnalysis || []).filter(item => ids.has(item.routeId));
}

