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
