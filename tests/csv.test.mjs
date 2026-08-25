import assert from 'node:assert/strict';
import { parseCsv } from '../src/routeParser.js';
const csv = `Date;Latitude;Longitude;Heading;Speed;SailSet;TWA;TWD;TWS\n25/08 10:00;48.0;-5.0;220;12.5;Jib;-45;175;14.2\n25/08 11:00;47.8;-5.4;225;13.0;Jib;-50;175;15.0`;
const r = parseCsv(csv);
assert.equal(r.source, 'Avalon');
assert.equal(r.points.length, 2);
assert.equal(r.points[0].sail, 'Jib');
assert.equal(r.points[1].sog, 13);
console.log('CSV parser tests: OK');
