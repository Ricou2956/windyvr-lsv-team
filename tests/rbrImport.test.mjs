import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseRouteNumber, parseCsv, detectCsvSource, parseRouteDescription } from '../src/routeParser.js';
for(const [raw,expected] of [['-7.279012352228165E-4',-0.0007279012352228165],['1e+2',100],['1E2',100],['-2E-2',-.02],['+2e-2',.02],['.5e1',5],['1,25e1',12.5],['12,5 kt',12.5],['153,00°',153],['7,190nds',7.19],['3.16 m/s',3.16],['0',0],['-0',-0]])assert.equal(parseRouteNumber(raw),expected,raw);
for(const raw of ['',null,undefined,'NaN','Infinity','1e999','1e','1e+','1E-','1e2x','abc12','--1','1.2.3','1,2,3','0x10','12abc','12 34',{},true])assert.equal(parseRouteNumber(raw),null,String(raw));
const read=name=>fs.readFileSync(new URL('./routes/2026-09-28/'+name,import.meta.url),'utf8');
const a=read('AVALON route-28_09_10_50.csv');
const route=parseCsv(a,{now:new Date(2026,8,28)});
assert.equal(route.points.length,1324);assert.equal(route.points[368].lon,-0.0007279012352228165);assert.equal(route.points[368].lat,55.35919952392578);
assert.equal(route.points[368].time.getHours(),23);assert.equal(route.points[368].time.getMinutes(),45);
const rows=a.trim().split(/\r?\n/).slice(1).map(r=>r.split(';'));
rows.forEach((r,i)=>{assert.equal(route.points[i].lat,Number(r[1]));assert.equal(route.points[i].lon,Number(r[2]));});
assert.equal(route.qualityMeta.discardedInvalidPositions,0);assert.equal(route.qualityMeta.duplicateTimestamps,0);assert.equal(route.qualityMeta.reversedTimestamps,0);
const v=read('VRZEN_RBREC26_20260928T085439Z.csv'),z=read('GPX EXTRAVTOR zezo_data.csv');
const vrzen=parseCsv(v),zezo=parseCsv(z);
assert.equal(vrzen.source,'VRZen');assert.equal(vrzen.points.length,204);assert.equal(vrzen.points[0].time.toISOString(),'2026-09-28T08:54:00.000Z');
assert.equal(zezo.source,'ZEZO');assert.equal(zezo.points[0].time.toISOString(),'2026-09-28T08:50:00.000Z');
assert.equal(detectCsvSource({headers:v.split(/\r?\n/)[0].split(';')}),'VRZen');
const generic=parseCsv('DateHeure(UTC);date;lat;lon\n2026-09-28 08:54;2026-09-28 10:54;50;-5\n2026-09-28 09:04;2026-09-28 11:04;51;-4');
assert.equal(generic.source,'CSV routeur');assert.equal(generic.points[0].time.toISOString(),'2026-09-28T08:54:00.000Z');
for(const value of ['1e','1e+','1E-','1e2x']) {
 const bad=parseCsv('time;lat;lon\n2026-09-28T00:00:00Z;50;-5\n2026-09-28T00:10:00Z;50;'+value+'\n2026-09-28T00:20:00Z;50;-4');
 assert.equal(bad.points.length,2);assert.equal(bad.qualityMeta.discardedInvalidPositions,1);
}
console.log('RBR: 1324 source coordinates preserved; VRZen 204 points UTC; real ZEZO unchanged; strict scientific numbers: OK');

const avalonUtc=parseCsv('DateHeure(UTC);Date;Latitude;Longitude;Heading;SailSet\n2026-09-28 08:54;28/09 10:54;50;-5;20;Jib\n2026-09-28 09:04;28/09 11:04;51;-4;21;Jib');
assert.equal(avalonUtc.source,'Avalon');assert.equal(avalonUtc.points[0].time.toISOString(),'2026-09-28T08:54:00.000Z');

assert.equal(parseRouteDescription('SOG=1.25E+1 kt TWS=7,19nds').sog,12.5);
assert.equal(parseRouteDescription('SOG=1e- kt').sog,undefined);
