import assert from 'node:assert/strict';
import { detectGpxSource, inferRouteMetadata, parseCsv } from '../src/routeParser.js';

const zezo = `\uFEFF\uFEFFDateHeure(UTC);DateHeure;Latitude;Longitude;HDG;TWA;Speed(kt);TWD;TWS(kt);Voile
2026-09-02 20:20;2026-09-02 20:20;39.031389;-69.781389;44°;55°;12.19;100°;13.4;Genois leger
2026-09-02 20:30;2026-09-02 20:30;39.062500;-69.750000;43°;55°;12.23;99°;13.5;Genois leger`;
const z = parseCsv(zezo);
assert.equal(z.source, 'ZEZO');
assert.equal(z.points[0].time.toISOString(), '2026-09-02T20:20:00.000Z');
assert.equal(z.points[0].cog, 44);
assert.equal(z.points[0].twd, 100);
assert.equal(z.points[0].sail, 'LJ');

const ecmwf = inferRouteMetadata('Dorado_OCEAN_RACE_18h_ECMWF_2026090200.gpx', 'Dorado');
assert.equal(ecmwf.nativeModel, 'ecmwf');
assert.equal(ecmwf.cycle, '2026-09-02 00Z');
const ncep = inferRouteMetadata('Dorado_OCEAN_RACE_18h_NCEP_2026090200.gpx', 'Dorado');
assert.equal(ncep.nativeModel, 'gfs');
assert.equal(detectGpxSource({ hasESailStructure: true }), 'eSail4VR');
assert.equal(detectGpxSource({ metaText: 'GPX data extracted from zezo.org', hasESailStructure: false }), 'ZEZO');
console.log('format metadata tests: OK');
