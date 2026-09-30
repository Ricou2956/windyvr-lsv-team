import {parseCsv,parseGpx,normalizeImportedLongitude} from '../src/routeParser.js';
import {interpolateRoute} from '../src/timeUtils.js';
import {unwrapMapGeometry,mapPositionOnRoute} from '../src/mapGeometry.js';
import {routeGeometryBetween} from '../src/analysisUtils.js';
import {assessRouteQuality} from '../src/qualityUtils.js';
import {buildDiagnosticsReport} from '../src/diagnostics.js';
export const check=(v,m)=>{if(!v)throw Error(m)};
export const close=(a,b,m)=>check(Math.abs(a-b)<1e-8,m+': '+a+' / '+b);
export function csv(lons,{source='ZEZO',lat='25'}={}) {
 const head=source==='ZEZO'?'DateHeure(UTC);Latitude;Longitude;Voile;Speed(kt);HDG;TWS(kt);TWD':'DateHeure(UTC);Latitude;Longitude;SailSet;Speed;Heading;TWS;TWD';
 return head+'\n'+lons.map((lon,i)=>new Date(Date.UTC(2026,8,30,i)).toISOString()+';'+lat+';'+(lon??'')+';Jib;12;260;20;310').join('\n');
}
export const gpx=(lons,{creator='RouteMarins',lat='25'}={})=>'<gpx creator="'+creator+'">'+lons.map((lon,i)=>'<wpt lat="'+lat+'"'+(lon==null?'':' lon="'+lon+'"')+'><time>'+new Date(Date.UTC(2026,8,30,i)).toISOString()+'</time><desc>SOG=12 HDG=260 TWS=20 TWD=310 SAIL=Jib</desc></wpt>').join('')+'</gpx>';
export function checkRoute(route,raw) {
 check(route.points.length===raw.length,'all points kept');
 const count=raw.filter(p=>Math.abs(p.lon)>180).length;
 check(route.qualityMeta.normalizedLongitudes===count,'normalization count');
 check(route.qualityMeta.discardedInvalidPositions===0,'no discarded position');
 let total=0,max=0;const rad=x=>x*Math.PI/180;
 const distance=(a,b)=>{const v=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lon-a.lon)/2)**2;return 6880.13*Math.atan2(Math.sqrt(v),Math.sqrt(1-v))};
 const geometry=unwrapMapGeometry(route.points.map(p=>[p.lat,p.lon]));
 for(let i=0;i<raw.length;i++){
  const a=route.points[i],b=raw[i];check(+a.time===+b.time,'unchanged timestamp/order '+i);close(a.lat,b.lat,'latitude');
  const expected=b.lon>180?b.lon-360:b.lon< -180?b.lon+360:b.lon;close(a.lon,expected,'longitude');
  check(Math.abs(a.lon)<=180,'canonical');check(a.sourceLongitude===(Math.abs(b.lon)>180?b.lon:undefined),'raw longitude trace');
  if(i){const prev=route.points[i-1],d=distance(prev,a);close(d,distance(raw[i-1],b),'source segment distance');total+=d;max=Math.max(max,d);
   check(+a.time>+prev.time,'ordered unique');check(Math.abs(geometry[i][1]-geometry[i-1][1])<180,'no world-spanning line');
   const t=(+prev.time + +a.time)/2,pos=interpolateRoute(route.points,t),marker=mapPositionOnRoute(route.points,geometry,pos);
   close(marker[1],(geometry[i][1]+geometry[i-1][1])/2,'midpoint marker');
   const risk=unwrapMapGeometry(routeGeometryBetween(route.points,+prev.time,+a.time),geometry[i-1][1]);
   close(risk[0][1],geometry[i-1][1],'risk start');close(risk.at(-1)[1],geometry[i][1],'risk end');
  }
 }
 const report=buildDiagnosticsReport({routes:[route]}).routes[0];check(report.normalizedLongitudes===count && report.invalidPositions===0,'diagnostic counters');
 check(!JSON.stringify(report).includes('sourceLongitude'),'no coordinates in diagnostics');
 if(count)check(assessRouteQuality(route).issues.some(x=>x.includes('longitude(s) source')),'quality trace');
 return {points:raw.length,normalized:count,distanceNm:total,maxSegmentNm:max,start:route.points[0].time.toISOString(),end:route.points.at(-1).time.toISOString()};
}
export function syntheticChecks(native=false){
 for(const value of [null,undefined,NaN,Infinity,-Infinity,'',false,'200',{},360.000001,-360.000001,540,-540,1e9])check(normalizeImportedLongitude(value,true)===null,'reject '+String(value));
 for(const value of [-180,-179.999,0,179.999,180])check(normalizeImportedLongitude(value)===value,'unchanged canonical');
 for(const [value,expected] of [[-360,0],[360,0],[-180.00001,179.99999],[180.00001,-179.99999],[-219,141],[219,-141]]){close(normalizeImportedLongitude(value,true),expected,'bounded wrap');check(normalizeImportedLongitude(value)===null,'strict default')}
 const parseList=[s=>parseCsv(csv(s))];if(native)parseList.push(s=>parseGpx(gpx(s)),s=>parseGpx(gpx(s,{creator:'eSail4VR'})));
 for(const parse of parseList){
  const edges=parse([-360,-180,180,360]);check(edges.points.length===4 && edges.points.map(p=>p.lon).join(',')==='0,-180,180,0','format endpoints accepted');
  for(const lons of [[-179,-180,-181,-219,140],[179,180,181,219,-140],[-5,0,5]]){const r=parse(lons);checkRoute(r,lons.map((lon,i)=>({lat:25,lon,time:new Date(Date.UTC(2026,8,30,i))})));check(r.points.every(p=>p.sog===12 && p.cog===260 && p.tws===20 && p.sail==='Jib'),'native fields preserved')}
  for(const bad of [null,'','NaN','Infinity','1e999','1e-', 'abc',-360.000001,360.000001,-9999,9999]){const r=parse([-179,bad,-181]);check(r.points.length===2 && r.qualityMeta.discardedInvalidPositions===1 && r.qualityMeta.normalizedLongitudes===1,'invalid not zero '+bad);const d=buildDiagnosticsReport({routes:[r]}).routes[0];check(d.invalidPositions===1 && d.normalizedLongitudes===1,'distinct counters')}
 }
 for(const lat of ['','NaN','Infinity','90.0001','-90.0001']){
  let threw=false;try{parseCsv(csv([-179,-181],{lat}))}catch{threw=true}check(threw,'invalid latitude CSV '+lat);
  if(native){threw=false;try{parseGpx(gpx([-179,-181],{lat}))}catch{threw=true}check(threw,'invalid latitude GPX '+lat)}
 }
 for(const lat of ['-90','90'])check(parseCsv(csv([-179,-181],{lat})).points.length===2,'valid latitude boundary');
 check(parseCsv(csv([-179,-200,-178],{source:'Avalon'})).qualityMeta.discardedInvalidPositions===1,'Avalon stays strict');
 check(parseCsv('time;lat;lon\n2026-09-30T00:00Z;25;-179\n2026-09-30T01:00Z;25;-200\n2026-09-30T02:00Z;25;-178').points.length===2,'generic CSV strict');
 if(native)for(const creator of ['Avalon','SERMAR','VRZen','Dorado','unknown'])check(parseGpx(gpx([-179,-200,-178],{creator})).points.length===2,'strict GPX '+creator);
 if(native){const missing=parseGpx(gpx([-179,-181,-178]).replace('lat="25"',''));check(missing.points.length===2 && missing.qualityMeta.discardedInvalidPositions===1,'missing GPX latitude not zero')}
 const times=parseCsv('DateHeure;DateHeure(UTC);lat;lon\n2026-09-30 11:50;2026-09-30 13:50;25;-170\n2026-09-30 12:00;2026-09-30 14:00;25;-171');
 check(times.points[0].time.toISOString()==='2026-09-30T13:50:00.000Z','UTC column selected independent of order/source');
}
