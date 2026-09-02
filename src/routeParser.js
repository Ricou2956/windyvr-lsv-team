const num = value => {
  if (value == null || value === '') return null;
  const match = String(value).trim().replace(',', '.').match(/[-+]?\d+(?:\.\d+)?/);
  const n = match ? Number(match[0]) : NaN;
  return Number.isFinite(n) ? n : null;
};

const clean = value => String(value ?? '').replace(/\uFEFF/g, '').trim().replace(/^"|"$/g, '');
const norm = value => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ _.-]+/g, '');
const angle180 = value => {
  const n = num(value); if (n == null) return null;
  return ((n + 180) % 360 + 360) % 360 - 180;
};
const normalizeSail = value => {
  const raw = clean(value); if (!raw) return null;
  const n = norm(raw.replace(/-?foils?/ig, ''));
  if (['jib'].includes(n)) return 'Jib';
  if (['spi'].includes(n)) return 'Spi';
  if (['lj','lightjib','genoisleger'].includes(n)) return 'LJ';
  if (['lg','lightgennaker','spileger','lightgnk'].includes(n)) return 'LG';
  if (['stay','staysail','trinquette'].includes(n)) return 'Stay';
  if (['hg','heavygennaker','spilourd','heavygnk'].includes(n)) return 'HG';
  if (['c0','co','code0','codezero'].includes(n)) return 'C0';
  return raw;
};

export function bearing(aLat, aLon, bLat, bLon) {
  const rad = d => d * Math.PI / 180;
  const p1 = rad(aLat), p2 = rad(bLat), dl = rad(bLon - aLon);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function signedAngle(windDir, course) {
  if (!Number.isFinite(windDir) || !Number.isFinite(course)) return null;
  let d = windDir - course;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function parseAvalonDate(value, yearHint = new Date().getUTCFullYear()) {
  const s = clean(value);
  const direct = Date.parse(s);
  if (!Number.isNaN(direct) && /\d{4}/.test(s)) return new Date(direct);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const [, dd, mm, hh, mi, ss = '0'] = m;
  return new Date(Date.UTC(yearHint, Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss)));
}

function detectDelimiter(line) {
  const semis = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;
  if (tabs > semis && tabs > commas) return '\t';
  return semis >= commas ? ';' : ',';
}

function splitCsvLine(line, delimiter) {
  const out = [];
  let cur = '', quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i += 1; }
      else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      out.push(cur.trim()); cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

const aliases = {
  time: ['date', 'time', 'datetime', 'timestamp', 'utc', 'heure', 'DateHeure(UTC)'],
  lat: ['latitude', 'lat'],
  lon: ['longitude', 'lon', 'lng', 'long'],
  cog: ['heading', 'cog', 'hdg', 'cap', 'course', 'currentdir'],
  sog: ['speed', 'sog', 'boatspeed', 'vitesse', 'Speed(kt)'],
  tws: ['tws', 'windspeed', 'vent', 'TWS(kt)'],
  twd: ['twd', 'winddir', 'winddirection'],
  twa: ['twa', 'windangle'],
  sail: ['sailset', 'sail', 'voile'],
  currentSpeed: ['currentspeed', 'current speed', 'vitesse courant'],
  currentDir: ['currentdir', 'current dir', 'current dir.', 'direction courant'],
  pressure: ['pressure', 'pression'],
};

function getCol(headers, names) {
  const normalized = headers.map(norm);
  for (const name of names) {
    const i = normalized.indexOf(norm(name));
    if (i >= 0) return i;
  }
  return -1;
}

function finalize(points) {
  const valid = points
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.time instanceof Date && !Number.isNaN(p.time.getTime()))
    .sort((a, b) => a.time - b.time);
  if (valid.length < 2) throw new Error('La route doit contenir au moins deux points horodatés.');
  for (let i = 0; i < valid.length - 1; i += 1) {
    if (!Number.isFinite(valid[i].cog)) valid[i].cog = bearing(valid[i].lat, valid[i].lon, valid[i + 1].lat, valid[i + 1].lon);
  }
  if (!Number.isFinite(valid.at(-1).cog)) valid.at(-1).cog = valid.at(-2).cog;
  return valid;
}

export function parseCsv(text) {
  const lines = text.replace(/^\uFEFF+/, '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (lines.length < 3) throw new Error('CSV vide ou incomplet.');
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(clean);
  const idx = Object.fromEntries(Object.entries(aliases).map(([k, v]) => [k, getCol(headers, v)]));
  if (idx.lat < 0 || idx.lon < 0 || idx.time < 0) throw new Error('Colonnes date/latitude/longitude introuvables.');

  const headerSet = new Set(headers.map(norm));
  const isAvalon = headerSet.has('sailset') || (headerSet.has('heading') && headerSet.has('latitude'));
  const isZezo = !isAvalon && headerSet.has(norm('DateHeure(UTC)')) && headerSet.has(norm('Voile')) && headerSet.has(norm('Speed(kt)'));

  let year = new Date().getUTCFullYear();
  let previous = null;
  const points = [];

  for (const line of lines.slice(1)) {
    const row = splitCsvLine(line, delimiter);
    let time;
    if (isAvalon) {
      time = parseAvalonDate(row[idx.time], year);
      if (time && previous && time < previous) { year += 1; time = parseAvalonDate(row[idx.time], year); }
    } else {
      const rawTime = clean(row[idx.time]);
      const explicitUtc = isZezo && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(rawTime)
        ? `${rawTime.replace(' ', 'T')}Z`
        : rawTime;
      const ms = Date.parse(explicitUtc);
      time = Number.isNaN(ms) ? parseAvalonDate(row[idx.time], year) : new Date(ms);
    }
    if (!time) continue;
    previous = time;
    points.push({
      time,
      lat: num(row[idx.lat]), lon: num(row[idx.lon]),
      cog: idx.cog >= 0 ? num(row[idx.cog]) : null,
      sog: idx.sog >= 0 ? num(row[idx.sog]) : null,
      tws: idx.tws >= 0 ? num(row[idx.tws]) : null,
      twd: idx.twd >= 0 ? num(row[idx.twd]) : null,
      twa: idx.twa >= 0 ? angle180(row[idx.twa]) : null,
      sail: idx.sail >= 0 ? normalizeSail(row[idx.sail]) : null,
      currentSpeed: idx.currentSpeed >= 0 ? num(row[idx.currentSpeed]) : null,
      currentDir: idx.currentDir >= 0 ? num(row[idx.currentDir]) : null,
      pressure: idx.pressure >= 0 ? num(row[idx.pressure]) : null,
    });
  }
  return { source: isZezo ? 'ZEZO' : (isAvalon ? 'Avalon' : 'CSV routeur'), points: finalize(points) };
}

function directText(el, selector) {
  return el.querySelector(selector)?.textContent?.trim() || null;
}

function parseDesc(desc) {
  const s = desc || '';
  let m = s.match(/COG\s*=\s*([-+\d.,]+).*?SOG\s*=\s*([-+\d.,]+).*?TWS\s*=\s*([-+\d.,]+).*?TWA\s*=\s*([-+\d.,]+).*?SAIL\s*=\s*([\w-]+)/i);
  if (m) return { cog: num(m[1]), sog: num(m[2]), tws: num(m[3]), twa: num(m[4]), sail: m[5] };
  m = s.match(/HDG:\s*([-+\d.,]+)\s+TWA:\s*([-+\d.,]+)\s+(.+?)\s+SOG:\s*([-+\d.,]+)\s*kt\s+TWS:\s*([-+\d.,]+)\s*kt/i);
  if (m) return { cog: num(m[1]), twa: num(m[2]), sail: clean(m[3]), sog: num(m[4]), tws: num(m[5]) };
  return {};
}

function findExtensionNumber(el, names) {
  const all = [...el.getElementsByTagName('*')];
  for (const n of names) {
    const found = all.find(x => norm(x.localName || x.nodeName.split(':').pop()) === norm(n));
    if (found) {
      const v = num(found.textContent);
      if (v != null) return v;
    }
  }
  return null;
}

export function parseGpx(text) {
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('GPX XML invalide.');
  const creator = xml.documentElement.getAttribute('creator') || '';
  const candidates = [...xml.querySelectorAll('wpt')];
  const pointsEls = candidates.length ? candidates : [...xml.querySelectorAll('rtept, trkpt')];
  if (!pointsEls.length) throw new Error('Aucun waypoint/routepoint/trackpoint dans ce GPX.');

  const points = pointsEls.map(el => {
    const desc = parseDesc(directText(el, 'desc'));
    const timeText = directText(el, 'time');
    const ms = timeText ? Date.parse(timeText) : NaN;
    return {
      time: Number.isNaN(ms) ? null : new Date(ms),
      lat: num(el.getAttribute('lat')), lon: num(el.getAttribute('lon')),
      cog: desc.cog ?? findExtensionNumber(el, ['cog', 'cog_deg', 'course', 'heading', 'hdg']),
      sog: desc.sog ?? findExtensionNumber(el, ['sog', 'sog_kn', 'speed']),
      tws: desc.tws ?? findExtensionNumber(el, ['tws', 'tws_kn', 'windspeed']),
      twd: findExtensionNumber(el, ['twd', 'twd_deg', 'winddir', 'winddirection']),
      twa: angle180(desc.twa ?? findExtensionNumber(el, ['twa', 'windangle'])),
      sail: normalizeSail(desc.sail ?? directText(el, 'type') ?? null),
      currentSpeed: findExtensionNumber(el, ['currentspeed', 'current_speed_kn', 'current speed']),
      currentDir: findExtensionNumber(el, ['currentdir', 'current_direction_deg', 'current dir']),
      pressure: findExtensionNumber(el, ['pressure', 'pressure_hpa', 'pression']),
    };
  });

  const descSample = pointsEls.map(e => directText(e, 'desc') || '').join(' ');
  const routePoints = [...xml.querySelectorAll('rtept')];
  const hasESailStructure = routePoints.length >= 2
    && routePoints.slice(0, Math.min(routePoints.length, 8)).every(el => directText(el, 'course') && directText(el, 'speed'));
  const metaText = xml.querySelector('metadata')?.textContent || '';
  const source = detectGpxSource({ creator, metaText, descSample, hasESailStructure });
  return { source, points: finalize(points) };
}

export function detectGpxSource({ creator = '', metaText = '', descSample = '', hasESailStructure = false } = {}) {
  const identity = `${creator} ${metaText} ${descSample}`;
  if (/dorado/i.test(identity)) return 'Dorado';
  if (/zezo/i.test(identity)) return 'ZEZO';
  if (/avalon/i.test(`${creator} ${descSample}`)) return 'Avalon';
  if (/vrzen|vr zen/i.test(identity)) return 'VRZen';
  if (/esail|e-sail/i.test(identity) || hasESailStructure) return 'eSail4VR';
  return 'GPX routeur';
}

export async function parseRouteFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const text = await file.text();
  if (ext === 'csv') {
    const parsed = parseCsv(text);
    const name = file.name || '';
    if (/vrzen|vr_?zen|reverseody/i.test(name)) parsed.source = 'VRZen';
    else if (/zezo/i.test(name)) parsed.source = 'ZEZO';
    else if (/avalon/i.test(name)) parsed.source = 'Avalon';
    else if (/esail|e-sail/i.test(name)) parsed.source = 'eSail4VR';
    else if (/dorado/i.test(name)) parsed.source = 'Dorado';
    return { ...parsed, ...inferRouteMetadata(file.name, parsed.source) };
  }
  if (ext === 'gpx') {
    const parsed = parseGpx(text);
    const name = file.name || '';
    if (parsed.source === 'GPX routeur') {
      if (/vrzen|vr_?zen|reverseody/i.test(name)) parsed.source = 'VRZen';
      else if (/zezo/i.test(name)) parsed.source = 'ZEZO';
      else if (/avalon/i.test(name)) parsed.source = 'Avalon';
      else if (/esail|e-sail/i.test(name)) parsed.source = 'eSail4VR';
      else if (/dorado/i.test(name)) parsed.source = 'Dorado';
    }
    return { ...parsed, ...inferRouteMetadata(file.name, parsed.source) };
  }
  throw new Error('Format non pris en charge : utilisez .csv ou .gpx.');
}

export function inferRouteMetadata(fileName = '', source = '') {
  const name = clean(fileName);
  const upper = name.toUpperCase();
  let nativeModel = null;
  if (/ECMWF|\bIFS\b/.test(upper)) nativeModel = 'ecmwf';
  else if (/NCEP|\bGFS\b/.test(upper)) nativeModel = 'gfs';
  else if (['Avalon', 'VRZen', 'eSail4VR', 'ZEZO'].includes(source)) nativeModel = 'gfs';

  let cycle = null;
  const compact = name.match(/(?:^|[_-])(20\d{8})(?:[_\-.]|$)/);
  if (compact) {
    const stamp = compact[1];
    cycle = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)} ${stamp.slice(8, 10)}Z`;
  }
  return { nativeModel, cycle };
}
