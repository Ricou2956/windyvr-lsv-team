export const KNOTS_PER_MPS = 1.9438444924406;

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (ArrayBuffer.isView(value)) return Array.from(value);
  return null;
}

function normalizeTimestamp(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  // Windy responses observed by the plugin use epoch milliseconds. Keep
  // compatibility with second-based epochs if the transport ever changes.
  return Math.abs(n) < 1e11 ? n * 1000 : n;
}

export function metersPerSecondToKnots(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n * KNOTS_PER_MPS : null;
}

export function signedAngularDifference(direction, course) {
  const d = Number(direction);
  const c = Number(course);
  if (!Number.isFinite(d) || !Number.isFinite(c)) return null;
  return ((d - c + 540) % 360) - 180;
}

export function unwrapForecastPayload(raw) {
  return (
    raw?.data?.data ??
    raw?.data ??
    raw?.result?.data?.data ??
    raw?.result?.data ??
    raw?.result ??
    raw ??
    null
  );
}

export function normalizeForecastSeries(raw) {
  const payload = unwrapForecastPayload(raw);
  if (!payload) throw new Error('Réponse météo vide');

  const ts = asArray(payload.ts ?? payload.timestamps);
  const wind = asArray(payload.wind ?? payload.windSpeed ?? payload.wind_speed);
  const windDir = asArray(payload.windDir ?? payload.windDirection ?? payload.wind_dir);

  if (!ts || !wind || !windDir) throw new Error('Structure météo non reconnue');

  const count = Math.min(ts.length, wind.length, windDir.length);
  const samples = [];
  for (let i = 0; i < count; i += 1) {
    const timestamp = normalizeTimestamp(ts[i]);
    const speedMps = Number(wind[i]);
    const direction = Number(windDir[i]);
    if (Number.isFinite(timestamp) && Number.isFinite(speedMps) && Number.isFinite(direction)) {
      samples.push({ timestamp, speedMps, direction: ((direction % 360) + 360) % 360 });
    }
  }
  samples.sort((a, b) => a.timestamp - b.timestamp);
  if (!samples.length) throw new Error('Aucun échantillon météo exploitable');
  return samples;
}


export function forecastWindowStatus(samples, timestamp) {
  if (!Array.isArray(samples) || !samples.length) return 'no-data';
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return 'no-data';
  if (ts < samples[0].timestamp) return 'before-forecast-window';
  if (ts > samples.at(-1).timestamp) return 'after-forecast-horizon';
  return 'inside';
}

export function interpolateForecastSeries(samples, timestamp) {
  if (!Array.isArray(samples) || !samples.length) return null;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return null;
  if (ts < samples[0].timestamp || ts > samples.at(-1).timestamp) return null;
  if (ts === samples[0].timestamp) return { ...samples[0] };
  if (ts === samples.at(-1).timestamp) return { ...samples.at(-1) };

  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].timestamp <= ts) lo = mid;
    else hi = mid;
  }

  const a = samples[lo];
  const b = samples[hi];
  const fraction = (ts - a.timestamp) / (b.timestamp - a.timestamp || 1);
  const delta = ((b.direction - a.direction + 540) % 360) - 180;
  return {
    timestamp: ts,
    speedMps: a.speedMps + (b.speedMps - a.speedMps) * fraction,
    direction: (a.direction + delta * fraction + 360) % 360,
  };
}

export function forecastValueAt(samples, timestamp, course) {
  const sample = interpolateForecastSeries(samples, timestamp);
  if (!sample) return null;
  return {
    tws: metersPerSecondToKnots(sample.speedMps),
    twd: sample.direction,
    twa: signedAngularDifference(sample.direction, course),
  };
}
