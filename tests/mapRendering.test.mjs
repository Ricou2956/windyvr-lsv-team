import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'svelte/compiler';
import { longitudeNear, mapPositionOnRoute, unwrapMapGeometry } from '../src/mapGeometry.js';
import { interpolateRoute } from '../src/timeUtils.js';
import { routeGeometryBetween } from '../src/analysisUtils.js';

// Execute the actual component functions against a recording Leaflet boundary.
// Assertions inspect the exact arguments passed to Polylines, Markers and the map.
const source=fs.readFileSync(new URL('../src/plugin.svelte',import.meta.url),'utf8');
const names=['refreshMapWorld','routeMapGeometry','routeMapPosition','fitRouteBounds','createMapObjects','destroyRiskLayers','createRiskLayers','updateRoutePositions','jumpToEvent','destroyMapObjects'];
const functions=parse(source).instance.content.body.filter(n=>n.type==='FunctionDeclaration' && names.includes(n.id.name)).map(n=>source.slice(n.start,n.end)).join('\n');
assert.equal(parse(source).instance.content.body.filter(n=>n.type==='FunctionDeclaration' && names.includes(n.id.name)).length,names.length);
assert.ok(source.includes('Routes importées · valeurs natives et météo Windy à l’instant T'));
assert.ok(!/Ocean Race Atlantique/i.test(source));
assert.ok(source.includes('try { fitRouteBounds(); }'));
function harness(routes) {
 const calls={lines:[],markers:[],bounds:[],pans:[],center:routes[0]?.points[0].lon ?? 0,analysis:[]};
 class Polyline { constructor(coords,options){this.coords=structuredClone(coords);this.options=options;calls.lines.push(this);} addTo(){return this;} setLatLngs(coords){this.coords=structuredClone(coords);} remove(){this.removed=true;} }
 class Marker { constructor(coords){this.coords=[...coords];calls.markers.push(this);} addTo(){return this;} setLatLng(coords){this.coords=[...coords];} setIcon(){} setOpacity(){} remove(){this.removed=true;} }
 const scope={routes,routeAnalysis:calls.analysis,mapLongitudeReference:null,map:{getCenter:()=>({lng:calls.center}),fitBounds:(c)=>calls.bounds.push(structuredClone(c)),panTo:c=>calls.pans.push([...c])},L:{Polyline,Marker},longitudeNear,unwrapMapGeometry,mapPositionOnRoute,interpolateRoute,routeGeometryBetween,routeStyleForIndex:()=>({}),boatIcon:()=>({}),markerOpacityForPosition:()=>1,store:{set(){}},closeVisual(){}};
 return {...new Function(...Object.keys(scope),functions+'; return {'+names.join(',')+'};')(...Object.values(scope)),calls};
}
const start=Date.parse('2026-09-29T10:00:00Z');
const route=(lons,id='test')=>({id,visible:true,color:'blue',points:lons.map((lon,i)=>({lat:20+i,lon,time:new Date(start+i*3600000),cog:260,twa:-115.043,twd:19.626,sog:9.349})),riskLayers:[]});
function continuous(coords) { for(let i=1;i<coords.length;i++)assert.ok(Math.abs(coords[i][1]-coords[i-1][1])<=180,JSON.stringify(coords)); }
for(const [lons,expected] of [
 [[-179,179,178],[-179,-181,-182]],
 [[179,-179,-178],[179,181,182]],
 [[-5,-4,-3],[-5,-4,-3]],
 [[-179,-180,180,179],[-179,-180,-180,-181]],
 [[179,180,-180,-179],[179,180,180,181]],
 [[179,-179,179],[179,181,179]],
]) {
 const r=route(lons),snapshot=structuredClone(r.points),h=harness([r]);
 h.createMapObjects(r);
 assert.deepEqual(h.calls.lines[0].coords.map(c=>c[1]),expected);
 continuous(h.calls.lines[0].coords);
 assert.deepEqual(h.calls.markers[0].coords,[20,expected[0]]);
 for(const fraction of [0,0.5,1,1.5,2]) {
  const time=start+fraction*3600000;
  h.updateRoutePositions(time);
  const coords=h.calls.markers[0].coords;
  const index=Math.floor(fraction),f=fraction-index;
  assert.ok(Math.abs(coords[1]-(expected[index]+(f ? (expected[index+1]-expected[index])*f : 0)))<1e-9);
  assert.ok(Math.abs(r.position.lon)<=180,'source position stays canonical');
  h.jumpToEvent({routeId:r.id,timestamp:time});
  assert.deepEqual(h.calls.pans.at(-1),coords);
 }
 const events=[0.5,1.5,2].map(t=>({timestamp:start+t*3600000,level:'red'}));
 h.createRiskLayers(r,events);
 for(const line of r.riskLayers)continuous(line.coords);
 assert.equal(r.riskLayers[0].coords[0][1],(expected[0]+expected[1])/2);
 assert.equal(r.riskLayers[0].coords.at(-1)[1],(expected[1]+expected[2])/2);
 assert.deepEqual(r.riskLayers[0].coords.at(-1),r.riskLayers[1].coords[0]);
 const oldLayers=[...r.riskLayers];h.createRiskLayers(r,events);assert.ok(oldLayers.every(l=>l.removed));
 h.fitRouteBounds();assert.deepEqual(h.calls.bounds[0],h.calls.lines[0].coords);
 h.destroyMapObjects(r);h.createMapObjects(r);assert.deepEqual(r.polyline.coords,h.calls.lines[0].coords);
 assert.deepEqual(r.points,snapshot,'rendering must not change navigation, weather or source coordinates');
}
// Four routes on both sides use the same world copy, before and after analysis.
const routes=[route([-179,179,178],'a'),route([179,-179,-178],'b'),route([-178,180,179],'c'),route([180,179,178],'d')];
const h=harness(routes);
for(const r of routes){h.createMapObjects(r);h.createRiskLayers(r,[0,1,2].map(t=>({timestamp:start+t*3600000,level:'orange'})));}
h.fitRouteBounds();
const longitudes=h.calls.bounds[0].map(c=>c[1]);assert.ok(Math.max(...longitudes)-Math.min(...longitudes)<=4);
for(const l of h.calls.lines)continuous(l.coords);
console.log('Map rendering: actual polyline/marker/bounds/pan arguments, both crossing directions, four routes and unchanged sources: OK');

// Windy normalizes the view centre to +159 while a westbound route uses -200.
// Exercise the actual moveend callback both before and after analysis.
const pacific=route([-158,-179,179,142],'pacific'), copy=structuredClone(pacific.points);
const world=harness([pacific]);world.createMapObjects(pacific);world.updateRoutePositions(start+1.5*3600000);
for (const analysed of [false,true]) {
 if(analysed) world.calls.analysis.push({routeId:pacific.id,riskEvents:[0,1,2,3].map(t=>({timestamp:start+t*3600000,level:'red'}))});
 for (const centre of [159,-201,519,159]) {
  world.calls.center=centre;world.refreshMapWorld();
  const coords=pacific.polyline.coords,lons=coords.map(p=>p[1]);
  continuous(coords);assert.ok(Math.abs((Math.min(...lons)+Math.max(...lons))/2-centre)<180);
  assert.equal(pacific.marker.coords[1],(lons[1]+lons[2])/2);
  world.jumpToEvent({routeId:pacific.id,timestamp:start+1.5*3600000});assert.deepEqual(world.calls.pans.at(-1),pacific.marker.coords);
  world.fitRouteBounds();assert.deepEqual(world.calls.bounds.at(-1),coords);
  if(analysed) for(let i=0;i<3;i++)assert.deepEqual(pacific.riskLayers[i].coords,[coords[i],coords[i+1]]);
 }
}
assert.deepEqual(pacific.points,copy);
assert.ok(source.includes("map.on('moveend', refreshMapWorld)"));
assert.ok(source.includes("map.off('moveend', refreshMapWorld)"));
console.log('World-copy regression: view +159/-201/+519, routes before/after analysis, markers, risk, bounds and event centring: OK');

// Imported extended longitude must reach the actual Leaflet boundary continuously.
const {parseCsv}=await import('../src/routeParser.js');
const {csv}=await import('./longitudeChecks.js');
for(const lons of [[-179,-181,-219,140],[179,181,219,-140]]){
 const parsed=parseCsv(csv(lons));const r={...route([], 'imported'),...parsed};const h=harness([r]);h.createMapObjects(r);h.fitRouteBounds();continuous(r.polyline.coords);
 const saved=structuredClone(r.points);
 for(let i=1;i<r.points.length;i++){const timestamp=(+r.points[i-1].time + +r.points[i].time)/2;h.updateRoutePositions(timestamp);assert.ok(Math.abs(r.marker.coords[1]-(r.polyline.coords[i-1][1]+r.polyline.coords[i][1])/2)<1e-8);h.jumpToEvent({routeId:r.id,timestamp});assert.deepEqual(h.calls.pans.at(-1),r.marker.coords);}
 h.createRiskLayers(r,r.points.map(p=>({timestamp:+p.time,level:'red'})));for(const layer of r.riskLayers)continuous(layer.coords);assert.deepEqual(r.points,saved);
}
console.log('Imported extended longitudes: actual Leaflet routes, markers, risk, bounds and pan: OK');
