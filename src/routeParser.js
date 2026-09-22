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

const normalize360 = value => {
  const n = num(value);
  return n == null ? null : ((n % 360) + 360) % 360;
};

export function normalizeWindFields(point) {
  const normalized = { ...point };
  const cog = normalize360(normalized.cog);
  const twd = normalize360(normalized.twd);
  const twa = angle180(normalized.twa);
  if (cog != null) normalized.cog = cog;

  if (cog != null && twd != null) {
    normalized.twd = twd;
    normalized.twa = signedAngle(twd, cog);
  } else if (cog != null && twa != null) {
    normalized.twa = twa;
    normalized.twd = normalize360(cog + twa);
  } else {
    if (twd != null) normalized.twd = twd;
    if (twa != null) normalized.twa = twa;
  }
  return normalized;
}

function parseAvalonDateParts(value) {
  const s = clean(value);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const [, dd, mm, hh, mi, ss = '0'] = m;
  return { day: Number(dd), month: Number(mm), hour: Number(hh), minute: Number(mi), second: Number(ss) };
}

function localDateFromParts(parts, year) {
  if (!parts || !Number.isInteger(year)) return null;
  const date = new Date(year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  if (date.getFullYear() !== year || date.getMonth() !== parts.month - 1 || date.getDate() !== parts.day
    || date.getHours() !== parts.hour || date.getMinutes() !== parts.minute || date.getSeconds() !== parts.second) return null;
  return date;
}

export function inferClosestAvalonYear(value, now = new Date()) {
  const parts = parseAvalonDateParts(value);
  if (!parts || !(now instanceof Date) || Number.isNaN(now.getTime())) return null;
  const baseYear = now.getFullYear();
  const candidates = [baseYear - 1, baseYear, baseYear + 1]
    .map(year => ({ year, date: localDateFromParts(parts, year) }))
    .filter(item => item.date);
  if (!candidates.length) return null;
  candidates.sort((a, b) => Math.abs(a.date - now) - Math.abs(b.date - now));
  return candidates[0].year;
}

function parseAvalonDate(value, yearHint = null, now = new Date()) {
  const s = clean(value);
  const direct = Date.parse(s);
  if (!Number.isNaN(direct) && /\d{4}/.test(s)) return new Date(direct);
  const parts = parseAvalonDateParts(s);
  if (!parts) return null;
  const year = Number.isInteger(yearHint) ? yearHint : inferClosestAvalonYear(s, now);
  return localDateFromParts(parts, year);
}

function isProbableYearRollover(previous, candidate) {
  if (!(previous instanceof Date) || !(candidate instanceof Date)) return false;
  return previous.getMonth() >= 10 && candidate.getMonth() <= 1;
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
  cog: ['heading', 'cog', 'hdg', 'cap', 'course'],
  sog: ['speed', 'sog', 'boatspeed', 'vitesse', 'Speed(kt)'],
  tws: ['tws', 'windspeed', 'vent', 'TWS(kt)'],
  twd: ['twd', 'winddir', 'winddirection'],
  twa: ['twa', 'windangle'],
  sail: ['sailset', 'sail', 'voile'],
  currentSpeed: ['currentspeed', 'current speed', 'vitesse courant'],
  currentDir: ['currentdir', 'current dir', 'current dir.', 'direction courant'],
  pressure: ['pressure', 'pression'],
};

export const ROUTE_SOURCES = ['Dorado', 'Avalon', 'VRZen', 'eSail4VR', 'ZEZO', 'CSV routeur', 'GPX routeur'];

export function detectCsvSource({ headers = [], sampleText = '' } = {}) {
  const headerSet = new Set(headers.map(norm));
  const text = String(sampleText || '');
  const has = name => headerSet.has(norm(name));

  if (has('SailSet') || (has('Heading') && has('Latitude'))) return 'Avalon';
  if (has('DateHeure(UTC)') && has('Voile') && has('Speed(kt)')) return 'ZEZO';
  // Les exports VRZen attestés exposent une distance restante (DTF) et des champs vent/navigation.
  if (has('DTF') && (has('TWA') || has('TWS')) && (has('COG') || has('Heading') || has('HDG'))) return 'VRZen';
  if (/\b(?:vrzen|reverse\s*odyssey)\b/i.test(text)) return 'VRZen';
  if (/\b(?:zezo|routemarins)\b/i.test(text)) return 'ZEZO';
  if (/\bavalon\b/i.test(text)) return 'Avalon';
  if (/\be-?sail(?:4vr)?\b/i.test(text)) return 'eSail4VR';
  if (/\bdorado\b/i.test(text)) return 'Dorado';
  return 'CSV routeur';
}

function sourceFromFileName(name = '') {
  if (/vrzen|vr_?zen|reverseody/i.test(name)) return 'VRZen';
  if (/zezo|routemarins/i.test(name)) return 'ZEZO';
  if (/avalon/i.test(name)) return 'Avalon';
  if (/esail|e-sail/i.test(name)) return 'eSail4VR';
  if (/dorado/i.test(name)) return 'Dorado';
  return null;
}

function getCol(headers, names) {
  const normalized = headers.map(norm);
  for (const name of names) {
    const i = normalized.indexOf(norm(name));
    if (i >= 0) return i;
  }
  return -1;
}

export function analyzeTemporalOrder(points) {
  const timestamps = points
    .map(point => point?.time instanceof Date ? point.time.getTime() : NaN)
    .filter(Number.isFinite);
  let reversedTimestamps = 0;
  for (let i = 1; i < timestamps.length; i += 1) {
    if (timestamps[i] < timestamps[i - 1]) reversedTimestamps += 1;
  }
  const counts = new Map();
  for (const timestamp of timestamps) counts.set(timestamp, (counts.get(timestamp) || 0) + 1);
  const duplicateTimestamps = [...counts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  return { duplicateTimestamps, reversedTimestamps };
}

function pointCompleteness(point) {
  return ['lat', 'lon', 'cog', 'sog', 'tws', 'twd', 'twa', 'sail', 'currentSpeed', 'currentDir', 'pressure']
    .reduce((count, key) => count + (point?.[key] != null && point[key] !== '' ? 1 : 0), 0);
}

function mergeDuplicatePoints(a, b) {
  const primary = pointCompleteness(b) > pointCompleteness(a) ? b : a;
  const secondary = primary === a ? b : a;
  const merged = { ...primary };
  for (const key of ['lat', 'lon', 'cog', 'sog', 'tws', 'twd', 'twa', 'sail', 'currentSpeed', 'currentDir', 'pressure']) {
    if ((merged[key] == null || merged[key] === '') && secondary[key] != null && secondary[key] !== '') merged[key] = secondary[key];
  }
  return merged;
}

function isValidPosition(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lon) && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180;
}

function finalize(points) {
  const timedInInputOrder = points
    .filter(p => p.time instanceof Date && !Number.isNaN(p.time.getTime()));
  const discardedInvalidPositions = timedInInputOrder.filter(point => !isValidPosition(point)).length;
  const validInInputOrder = timedInInputOrder.filter(isValidPosition);
  const qualityMeta = analyzeTemporalOrder(validInInputOrder);
  const sorted = [...validInInputOrder].sort((a, b) => a.time - b.time);
  const deduplicated = [];
  for (const point of sorted) {
    const previous = deduplicated.at(-1);
    if (previous && previous.time.getTime() === point.time.getTime()) deduplicated[deduplicated.length - 1] = mergeDuplicatePoints(previous, point);
    else deduplicated.push({ ...point });
  }
  if (deduplicated.length < 2) {
    if (discardedInvalidPositions) throw new Error(`La route ne contient pas assez de positions valides après rejet de ${discardedInvalidPositions} position(s) invalide(s).`);
    throw new Error('La route doit contenir au moins deux points horodatés.');
  }
  for (let i = 0; i < deduplicated.length - 1; i += 1) {
    if (!Number.isFinite(deduplicated[i].cog)) deduplicated[i].cog = bearing(deduplicated[i].lat, deduplicated[i].lon, deduplicated[i + 1].lat, deduplicated[i + 1].lon);
  }
  if (!Number.isFinite(deduplicated.at(-1).cog)) deduplicated.at(-1).cog = deduplicated.at(-2).cog;
  const normalized = deduplicated.map(normalizeWindFields);
  return {
    points: normalized,
    qualityMeta: {
      ...qualityMeta,
      deduplicatedTimestamps: qualityMeta.duplicateTimestamps,
      originalPointCount: timedInInputOrder.length,
      discardedInvalidPositions,
    },
  };
}

export function parseCsv(text, { now = new Date() } = {}) {
  const lines = text.replace(/^\uFEFF+/, '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (lines.length < 3) throw new Error('CSV vide ou incomplet.');
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(clean);
  const idx = Object.fromEntries(Object.entries(aliases).map(([k, v]) => [k, getCol(headers, v)]));
  if (idx.lat < 0 || idx.lon < 0 || idx.time < 0) throw new Error('Colonnes date/latitude/longitude introuvables.');

  const detectedSource = detectCsvSource({ headers, sampleText: lines.slice(0, Math.min(lines.length, 8)).join(' ') });
  const isAvalon = detectedSource === 'Avalon';
  const isZezo = detectedSource === 'ZEZO';

  let year = null;
  let inferredYear = null;
  let previous = null;
  let usedLocalAvalonTime = false;
  const points = [];

  for (const line of lines.slice(1)) {
    const row = splitCsvLine(line, delimiter);
    let time;
    if (isAvalon) {
      const rawAvalonTime = clean(row[idx.time]);
      const hasExplicitYear = /\d{4}/.test(rawAvalonTime);
      if (year == null && !hasExplicitYear) {
        year = inferClosestAvalonYear(rawAvalonTime, now);
        inferredYear = year;
      }
      time = parseAvalonDate(rawAvalonTime, year, now);
      if (!hasExplicitYear) usedLocalAvalonTime = true;
      if (time && previous && time < previous && isProbableYearRollover(previous, time)) {
        year = (year ?? time.getFullYear()) + 1;
        time = parseAvalonDate(rawAvalonTime, year, now);
      }
      if (time && year == null) year = time.getFullYear();
    } else {
      const rawTime = clean(row[idx.time]);
      const explicitUtc = isZezo && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(rawTime)
        ? `${rawTime.replace(' ', 'T')}Z`
        : rawTime;
      const ms = Date.parse(explicitUtc);
      time = Number.isNaN(ms) ? parseAvalonDate(row[idx.time], year, now) : new Date(ms);
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
  const finalized = finalize(points);
  return {
    source: detectedSource,
    ...finalized,
    qualityMeta: {
      ...finalized.qualityMeta,
      ...(usedLocalAvalonTime ? { dateInterpretation: 'heure locale navigateur', inferredYear } : {}),
    },
  };
}

function directText(el, selector) {
  return el.querySelector(selector)?.textContent?.trim() || null;
}

function extractLabeledNumber(text, labels) {
  const labelPattern = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = String(text || '').match(new RegExp(`\\b(?:${labelPattern})\\s*[:=]\\s*([-+]?\\d+(?:[.,]\\d+)?)`, 'i'));
  return match ? num(match[1]) : null;
}

export function parseRouteDescription(desc) {
  const s = String(desc || '').trim();
  if (!s) return {};

  const cog = extractLabeledNumber(s, ['COG', 'HDG']);
  const sog = extractLabeledNumber(s, ['SOG']);
  const tws = extractLabeledNumber(s, ['TWS']);
  const twd = extractLabeledNumber(s, ['TWD']);
  const twa = extractLabeledNumber(s, ['TWA']);

  let sail = null;
  const explicitSail = s.match(/\bSAIL\s*[:=]\s*(.+?)(?=\s+(?:COG|HDG|SOG|TWS|TWD|TWA)\s*[:=]|$)/i);
  if (explicitSail) sail = clean(explicitSail[1]);
  if (!sail) {
    const betweenTwaAndSog = s.match(/\bTWA\s*[:=]\s*[-+]?\d+(?:[.,]\d+)?\s*°?\s+(.+?)\s+SOG\s*[:=]/i);
    if (betweenTwaAndSog) sail = clean(betweenTwaAndSog[1]);
  }

  const parsed = {};
  if (cog != null) parsed.cog = cog;
  if (sog != null) parsed.sog = sog;
  if (tws != null) parsed.tws = tws;
  if (twd != null) parsed.twd = twd;
  if (twa != null) parsed.twa = twa;
  if (sail) parsed.sail = sail;
  return parsed;
}

export function metersPerSecondToKnots(value) {
  const speed = num(value);
  return speed == null ? null : speed * 1.94384;
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
    const desc = parseRouteDescription(directText(el, 'desc'));
    const timeText = directText(el, 'time');
    const ms = timeText ? Date.parse(timeText) : NaN;
    return {
      time: Number.isNaN(ms) ? null : new Date(ms),
      lat: num(el.getAttribute('lat')), lon: num(el.getAttribute('lon')),
      cog: desc.cog ?? findExtensionNumber(el, ['cog', 'cog_deg', 'course', 'heading', 'hdg']),
      sog: desc.sog ?? findExtensionNumber(el, ['sog', 'sog_kn']) ?? metersPerSecondToKnots(findExtensionNumber(el, ['speed'])),
      tws: desc.tws ?? findExtensionNumber(el, ['tws', 'tws_kn', 'windspeed']),
      twd: desc.twd ?? findExtensionNumber(el, ['twd', 'twd_deg', 'winddir', 'winddirection']),
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
  return { source, ...finalize(points) };
}

export function detectGpxSource({ creator = '', metaText = '', descSample = '', hasESailStructure = false } = {}) {
  const identity = `${creator} ${metaText} ${descSample}`;
  if (/routemarins/i.test(identity)) return 'ZEZO';
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
    if (parsed.source === 'CSV routeur') parsed.source = sourceFromFileName(file.name || '') || parsed.source;
    return { ...parsed, ...inferRouteMetadata(file.name, parsed.source) };
  }
  if (ext === 'gpx') {
    const parsed = parseGpx(text);
    if (parsed.source === 'GPX routeur') parsed.source = sourceFromFileName(file.name || '') || parsed.source;
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
