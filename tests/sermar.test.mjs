import assert from 'node:assert/strict';
import { parseCsv, parseRouteFile, detectCsvSource, detectGpxSource, inferRouteMetadata, ROUTE_SOURCES, signedAngle } from '../src/routeParser.js';
import { interpolateRoute } from '../src/timeUtils.js';
import { assessRouteQuality } from '../src/qualityUtils.js';
import { buildDiagnosticsReport } from '../src/diagnostics.js';
const headers = 'date;lat;lon;cap_deg;twa_deg;twd_deg;tws_kn;vitesse_kn;voile';
const row = date => date + ';21;-158;260;-115.043;15.127;4.987;9.349;Spi';
const csv = (dates, extra = '') => headers + extra + '\n' + dates.map(row).join('\n');
const options = { now: new Date('2026-09-28T10:00:00Z'), sermar: { year: 2026, utcOffsetMinutes: 120 } };
assert.ok(ROUTE_SOURCES.includes('SERMAR'));
assert.equal(detectCsvSource({ headers: headers.split(';') }), 'SERMAR');
assert.equal(detectCsvSource({ headers: ['date','lat','lon'], fileName: 'SERMAR.csv' }), 'CSV routeur');
assert.equal(detectGpxSource({ creator: 'Route SERMAR' }), 'SERMAR');
assert.equal(detectGpxSource({ fileName: 'SERMAR_GFS-V.gpx' }), 'SERMAR');
assert.equal(detectGpxSource({ routeName: 'SERMAR Honolulu-Yokohama' }), 'SERMAR');
for (const model of ['GFS-V', 'ECMWF']) {
  assert.deepEqual(inferRouteMetadata('SERMAR_' + model + '_2709_2102.csv', 'SERMAR'), { nativeModel: model === 'GFS-V' ? 'gfs' : 'ecmwf', cycle: null });
}
assert.equal(inferRouteMetadata('SERMAR_2026092700.gpx', 'SERMAR').cycle, null);
assert.equal(inferRouteMetadata('SERMAR_2709_2102.csv', 'SERMAR').nativeModel, null);
const route = parseCsv(csv(['29/09 12:00','30/09 12:00','01/10 12:00','06/10 20:08']), options);
assert.deepEqual(route.points.map(p => p.time.toISOString()), ['2026-09-29T10:00:00.000Z','2026-09-30T10:00:00.000Z','2026-10-01T10:00:00.000Z','2026-10-06T18:08:00.000Z']);
for (const p of route.points) {
  assert.equal(p.cog,260); assert.equal(p.twa,-115.043); assert.equal(p.twd,15.127);
  assert.equal(p.tws,4.987); assert.equal(p.sog,9.349); assert.equal(p.sail,'Spi');
  assert.equal(p.weatherTwa,signedAngle(15.127,260)); assert.equal(p.steeringMode,null);
}
const exact = interpolateRoute(route.points, route.points[1].time.getTime());
assert.equal(exact.exact,true); assert.equal(exact.twa,-115.043);
const midway = interpolateRoute(route.points, +route.points[1].time + 3600000);
assert.equal(midway.windConvention,'sermar'); assert.equal(midway.twa,-115.043);
assert.ok(Math.abs(midway.weatherTwa-route.points[0].weatherTwa)<1e-9);
const winter = parseCsv(csv(['31/12 23:50','01/01 00:10']), options);
assert.equal(winter.points[1].time.toISOString(),'2026-12-31T22:10:00.000Z');
assert.equal(winter.points[1].time-winter.points[0].time,1200000);
const local = parseCsv(csv(['29/09 12:00','01/10 12:00']), { now: options.now });
assert.equal(local.points[0].time.getFullYear(),2026); assert.equal(local.points[0].time.getHours(),12);
assert.match(local.qualityMeta.dateInterpretation,/locale navigateur/);
const nearest = parseCsv(csv(['31/12 23:50','01/01 00:10']), { now: new Date(2026,0,2) });
assert.equal(nearest.points[0].time.getFullYear(),2025); assert.equal(nearest.points[1].time.getFullYear(),2026);
for (const invalid of ['31/09 12:00','02/30 12:00','01/10 25:00','2026-09-29']) assert.throws(() => parseCsv(csv([invalid,'06/10 20:08']),options),/Date SERMAR/);
const elapsedCsv = headers + ';temps_ecoule;mode_pilotage\n' + row('29/09 12:00') + ';+5:00;CAP\n' + row('29/09 12:10') + ';+5:10;TWA';
const elapsed = parseCsv(elapsedCsv,options);
assert.equal(elapsed.qualityMeta.elapsedChecked,1); assert.equal(elapsed.qualityMeta.elapsedMismatches,0);
assert.equal(elapsed.points[0].elapsedMinutes,300); assert.equal(elapsed.points[0].steeringMode,'CAP');
const bad = parseCsv(elapsedCsv.replace('+5:10','+5:11'),options);
assert.equal(bad.qualityMeta.elapsedMismatches,1); assert.equal(assessRouteQuality(bad).level,'orange');
assert.ok(assessRouteQuality(route).issues.some(x => x.includes('TWA source')));
const report = buildDiagnosticsReport({ routes: [elapsed] });
assert.equal(report.routes[0].elapsedChecked,1); assert.match(report.routes[0].windConvention,/SERMAR/);
assert.equal((await parseRouteFile({ name:'SERMAR_GFS-V.csv',text:async()=>csv(['29/09 12:00','01/10 12:00']) },options)).nativeModel,'gfs');
const noDirection = parseCsv(csv(['29/09 12:00','29/09 12:10']).replaceAll(';15.127;', ';;'), options);
assert.equal(noDirection.points[0].twd,null); assert.equal(noDirection.points[0].weatherTwa,null);
const reversed = parseCsv(csv(['29/09 12:10','29/09 12:00']),options);
assert.equal(reversed.qualityMeta.reversedTimestamps,1);
const antimeridian = route.points.slice(0,2).map((p,i)=>({...p,lon:i ? -179 : 179}));
assert.equal(Math.abs(interpolateRoute(antimeridian,(+antimeridian[0].time + +antimeridian[1].time)/2).lon),180);
console.log('SERMAR detection, dates, units, source angles, interpolation and diagnostics: OK');

const epoch = parseCsv(csv(['31/12 23:50','01/01 00:10']), { ...options, sermar: { year: 2026, utcOffsetMinutes: 0 } });
assert.equal(epoch.points[1].time.toISOString(),'2027-01-01T00:10:00.000Z');
const duplicates = parseCsv(csv(['29/09 12:00','29/09 12:00','29/09 12:10']),options);
assert.equal(duplicates.qualityMeta.duplicateTimestamps,1); assert.equal(duplicates.points[0].twa,-115.043);
const unknown = await parseRouteFile({name:'SERMAR.csv',text:async()=>'date;lat;lon\n2026-09-29T10:00:00Z;21;-158\n2026-09-29T10:10:00Z;22;-159'});
assert.equal(unknown.source,'CSV routeur');
// Browser-local rules must follow seasonal offsets rather than a fixed UTC+02.
const seasonal = parseCsv(csv(['15/01 12:00','15/07 12:00']), { now: options.now, sermar: { year: 2026 } });
assert.equal(seasonal.points[0].time.getHours(),12); assert.equal(seasonal.points[1].time.getHours(),12);
if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Paris') {
 assert.equal(seasonal.points[0].time.getUTCHours(),11); assert.equal(seasonal.points[1].time.getUTCHours(),10);
}
