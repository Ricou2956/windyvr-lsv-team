function circularLerp(a, b, t) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.isFinite(a) ? a : b;
  let d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

function linear(a, b, t) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.isFinite(a) ? a : b;
  return a + (b - a) * t;
}

function lonLerp(a, b, t) {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  let lon = a + d * t;
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}

export function interpolateRoute(points, timestamp) {
  if (!points.length) return null;
  const ts = Number(timestamp);
  if (ts < points[0].time.getTime()) return { ...points[0], exact: false, outOfRange: true };
  if (ts > points.at(-1).time.getTime()) return { ...points.at(-1), exact: false, outOfRange: true };
  if (ts === points[0].time.getTime()) return { ...points[0], exact: true, outOfRange: false };
  if (ts === points.at(-1).time.getTime()) return { ...points.at(-1), exact: true, outOfRange: false };
  let lo = 0, hi = points.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].time.getTime() <= ts) lo = mid; else hi = mid;
  }
  const a = points[lo], b = points[hi];
  const dt = b.time.getTime() - a.time.getTime();
  const f = dt ? (ts - a.time.getTime()) / dt : 0;
  return {
    time: new Date(ts),
    lat: linear(a.lat, b.lat, f), lon: lonLerp(a.lon, b.lon, f),
    cog: circularLerp(a.cog, b.cog, f), sog: linear(a.sog, b.sog, f),
    tws: linear(a.tws, b.tws, f), twd: circularLerp(a.twd, b.twd, f),
    twa: linear(a.twa, b.twa, f), sail: f < 0.5 ? a.sail : b.sail,
    exact: false, outOfRange: false,
  };
}

export function interpolateForecast(payload, timestamp) {
  const data = payload?.data?.data;
  if (!data?.day || !data?.hour || !data?.wind || !data?.windDir) return null;
  const samples = data.day.map((day, i) => ({
    ts: Date.parse(`${day}T${String(data.hour[i]).padStart(2, '0')}:00:00Z`),
    wind: Number(data.wind[i]), dir: Number(data.windDir[i]),
  })).filter(x => Number.isFinite(x.ts) && Number.isFinite(x.wind) && Number.isFinite(x.dir));
  if (!samples.length) return null;
  const ts = Number(timestamp);
  if (ts <= samples[0].ts) return samples[0];
  if (ts >= samples.at(-1).ts) return samples.at(-1);
  let lo = 0, hi = samples.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].ts <= ts) lo = mid; else hi = mid;
  }
  const a = samples[lo], b = samples[hi];
  const f = (ts - a.ts) / (b.ts - a.ts || 1);
  return { ts, wind: linear(a.wind, b.wind, f), dir: circularLerp(a.dir, b.dir, f) };
}
