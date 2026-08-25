import assert from 'node:assert/strict';
import { interpolateRoute } from '../src/timeUtils.js';
const points = [
  { time:new Date('2026-08-25T10:00:00Z'), lat:0, lon:179, cog:350, sog:10, tws:12, twd:20, twa:30, sail:'Jib' },
  { time:new Date('2026-08-25T12:00:00Z'), lat:2, lon:-179, cog:10, sog:14, tws:16, twd:40, twa:50, sail:'Spi' },
];
const p = interpolateRoute(points, Date.parse('2026-08-25T11:00:00Z'));
assert.equal(p.lat, 1);
assert.equal(p.lon, 180);
assert.equal(Math.round(p.cog), 0);
assert.equal(p.sog, 12);
console.log('timeUtils tests: OK');
