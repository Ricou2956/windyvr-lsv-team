const num = value => {
  if (value == null || value === '') return null;
  const n = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const clean = value => String(value ?? '').trim().replace(/^"|"$/g, '');
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
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
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
      const ms = Date.parse(clean(row[idx.time]));
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
      cog: desc.cog ?? findExtensionNumber(el, ['cog', 'course', 'heading', 'hdg']),
      sog: desc.sog ?? findExtensionNumber(el, ['sog', 'speed']),
      tws: desc.tws ?? findExtensionNumber(el, ['tws', 'windspeed']),
      twd: findExtensionNumber(el, ['twd', 'winddir', 'winddirection']),
      twa: angle180(desc.twa ?? findExtensionNumber(el, ['twa', 'windangle'])),
      sail: normalizeSail(desc.sail ?? directText(el, 'type') ?? null),
    };
  });

  const descSample = pointsEls.map(e => directText(e, 'desc') || '').join(' ');
  let source = 'GPX routeur';
  const metaText = xml.querySelector('metadata')?.textContent || '';
  if (/zezo/i.test(creator + ' ' + metaText + ' ' + descSample)) source = 'ZEZO';
  else if (/avalon/i.test(creator + ' ' + descSample)) source = 'Avalon';
  else if (/vrzen|vr zen/i.test(creator + ' ' + descSample)) source = 'VRZen';
  else if (/esail|e-sail/i.test(creator + ' ' + descSample)) source = 'eSail4VR';
  return { source, points: finalize(points) };
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
    return parsed;
  }
  if (ext === 'gpx') {
    const parsed = parseGpx(text);
    const name = file.name || '';
    if (parsed.source === 'GPX routeur') {
      if (/vrzen|vr_?zen|reverseody/i.test(name)) parsed.source = 'VRZen';
      else if (/zezo/i.test(name)) parsed.source = 'ZEZO';
      else if (/avalon/i.test(name)) parsed.source = 'Avalon';
      else if (/esail|e-sail/i.test(name)) parsed.source = 'eSail4VR';
    }
    return parsed;
  }
  throw new Error('Format non pris en charge : utilisez .csv ou .gpx.');
}
