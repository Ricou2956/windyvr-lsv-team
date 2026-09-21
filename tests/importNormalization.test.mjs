import assert from 'node:assert/strict';
import {
  analyzeTemporalOrder,
  detectGpxSource,
  inferClosestAvalonYear,
  metersPerSecondToKnots,
  normalizeWindFields,
  parseCsv,
  parseRouteDescription,
} from '../src/routeParser.js';

const routeMarins = parseRouteDescription('HDG: 160° TWA: 50°  Stay SOG: 9.05 kts TWS:19.0 kt');
assert.equal(routeMarins.cog, 160);
assert.equal(routeMarins.twa, 50);
assert.equal(routeMarins.sail, 'Stay');
assert.equal(routeMarins.sog, 9.05);
assert.equal(routeMarins.tws, 19);

const vrzen = parseRouteDescription('HDG:260 TWA:-50 Trinquette SOG:9,0 kt TWS:19,0 kt');
assert.equal(vrzen.cog, 260);
assert.equal(vrzen.twa, -50);
assert.equal(vrzen.sail, 'Trinquette');
assert.equal(vrzen.sog, 9);
assert.equal(vrzen.tws, 19);

const legacy = parseRouteDescription('COG=220 SOG=12.5 TWS=14.2 TWA=-45 SAIL=Jib');
assert.equal(legacy.cog, 220);
assert.equal(legacy.sog, 12.5);
assert.equal(legacy.tws, 14.2);
assert.equal(legacy.twa, -45);
assert.equal(legacy.sail, 'Jib');

assert.ok(Math.abs(metersPerSecondToKnots(3.16) - 6.1425344) < 1e-7);
assert.equal(metersPerSecondToKnots(null), null);

const avalonAngles = normalizeWindFields({ cog: 11, twd: 245.19, twa: 125.81 });
assert.ok(Math.abs(avalonAngles.twa - (-125.81)) < 1e-9);
assert.ok(Math.abs(avalonAngles.twd - 245.19) < 1e-9);

const reconstructed = normalizeWindFields({ cog: 160, twd: null, twa: 50 });
assert.equal(reconstructed.twa, 50);
assert.equal(reconstructed.twd, 210);

const wrapped = normalizeWindFields({ cog: 350, twd: null, twa: 30 });
assert.equal(wrapped.twd, 20);

const temporal = analyzeTemporalOrder([
  { time: new Date('2026-09-21T01:00:00Z') },
  { time: new Date('2026-09-21T03:00:00Z') },
  { time: new Date('2026-09-21T02:00:00Z') },
  { time: new Date('2026-09-21T02:00:00Z') },
]);
assert.equal(temporal.reversedTimestamps, 1);
assert.equal(temporal.duplicateTimestamps, 1);

const csv = [
  'timestamp;lat;lon;cog;sog;tws;twd;twa;sail',
  '2026-09-21T00:00:00Z;48;-5;10;8;15;245;125;Jib',
  '2026-09-21T01:00:00Z;48.1;-5.1;20;;16;;40;',
  '2026-09-21T01:00:00Z;48.1;-5.1;20;9;;;;Spi',
  '2026-09-21T00:30:00Z;48.05;-5.05;15;8.5;15;;;Jib',
].join('\n');
const parsedCsv = parseCsv(csv);
assert.equal(parsedCsv.qualityMeta.duplicateTimestamps, 1);
assert.equal(parsedCsv.qualityMeta.reversedTimestamps, 1);
assert.equal(parsedCsv.qualityMeta.originalPointCount, 4);
assert.equal(parsedCsv.points.length, 3);
const merged = parsedCsv.points.find(point => point.time.toISOString() === '2026-09-21T01:00:00.000Z');
assert.equal(merged.sog, 9);
assert.equal(merged.tws, 16);
assert.equal(merged.sail, 'Spi');
assert.equal(merged.twd, 60);
assert.equal(merged.twa, 40);

const avalonOutOfOrder = [
  'Date;Heading;Latitude;Longitude;Speed;TWS;TWD;TWA;SailSet',
  '21/09 12:00;180;48;-5;8;15;220;40;Jib',
  '21/09 14:00;180;48.1;-5.1;8;15;220;40;Jib',
  '21/09 13:00;180;48.05;-5.05;8;15;220;40;Jib',
].join('\n');
const parsedAvalonOutOfOrder = parseCsv(avalonOutOfOrder);
assert.equal(parsedAvalonOutOfOrder.qualityMeta.reversedTimestamps, 1);

const avalonYearRollover = [
  'Date;Heading;Latitude;Longitude;Speed;TWS;TWD;TWA;SailSet',
  '31/12 23:00;180;48;-5;8;15;220;40;Jib',
  '01/01 01:00;180;48.1;-5.1;8;15;220;40;Jib',
].join('\n');
const parsedAvalonYearRollover = parseCsv(avalonYearRollover);
assert.equal(parsedAvalonYearRollover.points[1].time.getUTCFullYear(), parsedAvalonYearRollover.points[0].time.getUTCFullYear() + 1);
assert.equal(parsedAvalonYearRollover.qualityMeta.reversedTimestamps, 0);


const fixedNow = new Date(2026, 8, 21, 12, 0, 0);
assert.equal(inferClosestAvalonYear('21/09 14:50', fixedNow), 2026);
assert.equal(inferClosestAvalonYear('31/12 23:00', new Date(2026, 0, 2, 12, 0, 0)), 2025);

const avalonLocalTime = [
  'Date;Heading;Latitude;Longitude;Speed;TWS;TWD;TWA;SailSet',
  '21/09 14:50;260;57.5;-8.7;9;19;210;50;Stay',
  '21/09 15:00;260;57.49;-8.75;9;19;210;50;Stay',
].join('\n');
const parsedAvalonLocal = parseCsv(avalonLocalTime, { now: fixedNow });
assert.equal(parsedAvalonLocal.points[0].time.getFullYear(), 2026);
assert.equal(parsedAvalonLocal.points[0].time.getMonth(), 8);
assert.equal(parsedAvalonLocal.points[0].time.getDate(), 21);
assert.equal(parsedAvalonLocal.points[0].time.getHours(), 14);
assert.equal(parsedAvalonLocal.points[0].time.getMinutes(), 50);
assert.equal(parsedAvalonLocal.qualityMeta.dateInterpretation, 'heure locale navigateur');
assert.equal(parsedAvalonLocal.qualityMeta.inferredYear, 2026);

const avalonDecember = [
  'Date;Heading;Latitude;Longitude;Speed;TWS;TWD;TWA;SailSet',
  '31/12 23:00;180;48;-5;8;15;220;40;Jib',
  '01/01 01:00;180;48.1;-5.1;8;15;220;40;Jib',
].join('\n');
const parsedAvalonDecember = parseCsv(avalonDecember, { now: new Date(2026, 0, 2, 12, 0, 0) });
assert.equal(parsedAvalonDecember.points[0].time.getFullYear(), 2025);
assert.equal(parsedAvalonDecember.points[1].time.getFullYear(), 2026);

const currentDirCsv = [
  'timestamp;lat;lon;Current Dir;sog',
  '2026-09-21T00:00:00Z;48;-5;270;8',
  '2026-09-21T01:00:00Z;48.1;-4.9;275;8',
].join('\n');
const parsedCurrentDir = parseCsv(currentDirCsv);
assert.equal(parsedCurrentDir.points[0].currentDir, 270);
assert.notEqual(Math.round(parsedCurrentDir.points[0].cog), 270);

const invalidCoordinatesCsv = [
  'timestamp;lat;lon;sog',
  '2026-09-21T00:00:00Z;48;-5;8',
  '2026-09-21T00:30:00Z;952;400;8',
  '2026-09-21T01:00:00Z;48.1;-4.9;8',
].join('\n');
const parsedInvalidCoordinates = parseCsv(invalidCoordinatesCsv);
assert.equal(parsedInvalidCoordinates.points.length, 2);
assert.equal(parsedInvalidCoordinates.qualityMeta.originalPointCount, 3);
assert.equal(parsedInvalidCoordinates.qualityMeta.discardedInvalidPositions, 1);
assert.equal(parsedInvalidCoordinates.points.some(point => Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180), false);

assert.equal(detectGpxSource({ creator: 'RouteMarins', metaText: 'RouteMarins' }), 'ZEZO');
assert.equal(detectGpxSource({ creator: 'MapSource', metaText: 'VRZEN', descSample: 'HDG:260 TWA:-50' }), 'VRZen');

console.log('import normalization tests: OK');
