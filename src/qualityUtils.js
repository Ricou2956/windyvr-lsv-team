export function assessRouteQuality(route) {
  const points = route?.points || [];
  const issues = [];
  if (points.length < 2) return { level: 'red', issues: ['Route vide ou incomplète'] };

  const meta = route?.qualityMeta || {};
  let reversed = Number.isFinite(meta.reversedTimestamps) ? meta.reversedTimestamps : 0;
  let duplicates = Number.isFinite(meta.duplicateTimestamps) ? meta.duplicateTimestamps : 0;
  const gaps = [];

  if (!route?.qualityMeta) {
    for (let i = 1; i < points.length; i += 1) {
      const gap = points[i].time - points[i - 1].time;
      if (gap < 0) reversed += 1;
      else if (gap === 0) duplicates += 1;
      else gaps.push(gap);
    }
  } else {
    for (let i = 1; i < points.length; i += 1) {
      const gap = points[i].time - points[i - 1].time;
      if (gap > 0) gaps.push(gap);
    }
  }

  if (duplicates) issues.push(`${duplicates} doublon(s) d’horodatage fusionné(s)`);
  if (reversed) issues.push(`${reversed} date(s) inversée(s) dans le fichier source`);

  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const largeGaps = gaps.filter(g => g > Math.max(6 * 3600000, median * 3)).length;
  if (largeGaps) issues.push(`${largeGaps} intervalle(s) temporel(s) important(s)`);

  const remainingInvalidPositions = points.filter(p => !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180).length;
  const discardedInvalidPositions = Number.isFinite(meta.discardedInvalidPositions) ? meta.discardedInvalidPositions : 0;
  const invalidPosition = remainingInvalidPositions + discardedInvalidPositions;
  if (discardedInvalidPositions) issues.push(`${discardedInvalidPositions} position(s) invalide(s) écartée(s) à l’import`);
  if (remainingInvalidPositions) issues.push(`${remainingInvalidPositions} position(s) invalide(s) restante(s)`);

  const suspiciousSpeed = points.filter(p => Number.isFinite(p.sog) && (p.sog < 0 || p.sog > 45)).length;
  if (suspiciousSpeed) issues.push(`SOG suspecte sur ${suspiciousSpeed} point(s)`);

  const missingSog = points.filter(p => !Number.isFinite(p.sog)).length / points.length;
  const missingWind = points.filter(p => !Number.isFinite(p.tws)).length / points.length;
  if (missingSog > 0.5) issues.push('SOG absente sur plus de 50 % de la route');
  if (missingWind > 0.5) issues.push('Vent natif absent sur plus de 50 % de la route');

  const hasRedIssue = reversed > 0 || invalidPosition > 0 || suspiciousSpeed > 0;
  const hasOrangeIssue = largeGaps > 0 || missingSog > 0.5 || missingWind > 0.5;
  return { level: hasRedIssue ? 'red' : hasOrangeIssue ? 'orange' : 'green', issues };
}
