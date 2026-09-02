export function assessRouteQuality(route) {
  const points = route?.points || [];
  const issues = [];
  if (points.length < 2) return { level: 'red', issues: ['Route vide ou incomplète'] };
  let reversed = 0;
  const gaps = [];
  for (let i = 1; i < points.length; i += 1) {
    const gap = points[i].time - points[i - 1].time;
    if (gap <= 0) reversed += 1;
    else gaps.push(gap);
  }
  if (reversed) issues.push(`${reversed} date(s) non chronologique(s)`);
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const largeGaps = gaps.filter(g => g > Math.max(6 * 3600000, median * 3)).length;
  if (largeGaps) issues.push(`${largeGaps} intervalle(s) temporel(s) important(s)`);
  const invalidPosition = points.filter(p => !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180).length;
  if (invalidPosition) issues.push(`${invalidPosition} position(s) invalide(s)`);
  const suspiciousSpeed = points.filter(p => Number.isFinite(p.sog) && (p.sog < 0 || p.sog > 45)).length;
  if (suspiciousSpeed) issues.push(`SOG suspecte sur ${suspiciousSpeed} point(s)`);
  const missingSog = points.filter(p => !Number.isFinite(p.sog)).length / points.length;
  const missingWind = points.filter(p => !Number.isFinite(p.tws)).length / points.length;
  if (missingSog > 0.5) issues.push('SOG absente sur plus de 50 % de la route');
  if (missingWind > 0.5) issues.push('Vent natif absent sur plus de 50 % de la route');
  return { level: issues.some(x => /invalide|non chronologique|suspecte/.test(x)) ? 'red' : issues.length ? 'orange' : 'green', issues };
}
