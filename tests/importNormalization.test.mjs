import assert from 'node:assert/strict';
import { metersPerSecondToKnots, parseRouteDescription } from '../src/routeParser.js';

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

console.log('import normalization tests: OK');
