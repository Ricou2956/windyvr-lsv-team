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
  const byModel = Object.fromEntries(modelIds.map(model => [model, {
    coveredSamples: 0,
    outsideHorizon: 0,
    errors: 0,
    firstCovered: null,
    lastCovered: null,
    horizonStart: null,
    horizonEnd: null,
  }]));

  for (const sample of samples || []) {
    const timestamp = Number(sample?.timestamp);
    if (!Number.isFinite(timestamp)) continue;
    if (!byTime.has(timestamp)) byTime.set(timestamp, { coveredModels: 0, outsideHorizon: 0, errors: 0 });
    const timeEntry = byTime.get(timestamp);
    const modelEntry = byModel[sample.model] || (byModel[sample.model] = {
      coveredSamples: 0, outsideHorizon: 0, errors: 0, firstCovered: null, lastCovered: null, horizonStart: null, horizonEnd: null,
    });

    if (Number.isFinite(sample.tws) && Number.isFinite(sample.twd)) {
      timeEntry.coveredModels += 1;
      modelEntry.coveredSamples += 1;
      modelEntry.firstCovered = modelEntry.firstCovered == null ? timestamp : Math.min(modelEntry.firstCovered, timestamp);
      modelEntry.lastCovered = modelEntry.lastCovered == null ? timestamp : Math.max(modelEntry.lastCovered, timestamp);
    } else if (sample.reason === 'outside-horizon' || sample.unavailable) {
      timeEntry.outsideHorizon += 1;
      modelEntry.outsideHorizon += 1;
    } else if (sample.error || sample.reason === 'request-or-format-error') {
      timeEntry.errors += 1;
      modelEntry.errors += 1;
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
  const hasOutsideHorizon = [...byTime.values()].some(value => value.outsideHorizon > 0);
  const hasErrors = [...byTime.values()].some(value => value.errors > 0);
  const startsAtRouteStart = Number.isFinite(firstCovered) && Number.isFinite(routeStart) && firstCovered <= routeStart;
  const reachesRouteEnd = Number.isFinite(lastCovered) && Number.isFinite(routeEnd) && lastCovered >= routeEnd;

  return {
    requestedSamples: requestedTimes.length,
    coveredSamples: coveredTimes.length,
    firstCovered,
    lastCovered,
    temporalCoveragePercent,
    sampleCoveragePercent,
    complete: Boolean(startsAtRouteStart && reachesRouteEnd),
    limitingReason: reachesRouteEnd ? null : hasOutsideHorizon ? 'outside-horizon' : hasErrors ? 'weather-error' : coveredTimes.length ? 'partial' : 'no-data',
    byModel,
  };
}
