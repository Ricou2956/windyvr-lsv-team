// SERMAR dates contain neither year nor zone. Defaults are explicit import assumptions.
export function createSermarClock({ now = new Date(), year = null, utcOffsetMinutes = null } = {}) {
  if (year != null && (!Number.isInteger(year) || year < 100 || year > 9999)) throw new Error('Année SERMAR invalide.');
  if (utcOffsetMinutes != null && (!Number.isInteger(utcOffsetMinutes) || Math.abs(utcOffsetMinutes) > 840)) throw new Error('Décalage UTC SERMAR invalide.');
  let activeYear = year, previousParts = null, anchor = null;
  const meta = {
    dateInterpretation: utcOffsetMinutes == null ? 'heure locale navigateur (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')' : 'décalage UTC explicite : ' + utcOffsetMinutes + ' minutes',
    yearAssumption: year == null ? 'année la plus proche de la date d’import' : 'année explicitement fournie',
    inferredYear: null, elapsedChecked: 0, elapsedMismatches: 0,
  };
  function make(p, y) {
    const d = utcOffsetMinutes == null ? new Date(y, p.month - 1, p.day, p.hour, p.minute) : new Date(Date.UTC(y, p.month - 1, p.day, p.hour, p.minute));
    const get = part => d[(utcOffsetMinutes == null ? 'get' : 'getUTC') + part]();
    if (get('FullYear') !== y || get('Month') !== p.month - 1 || get('Date') !== p.day || get('Hours') !== p.hour || get('Minutes') !== p.minute) return null;
    return utcOffsetMinutes == null ? d : new Date(d.getTime() - utcOffsetMinutes * 60000);
  }
  return { meta, parse(raw, elapsedRaw) {
    const m = String(raw || '').trim().match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
    if (!m) throw new Error('Date SERMAR invalide : format attendu JJ/MM HH:mm.');
    const p = { day: +m[1], month: +m[2], hour: +m[3], minute: +m[4] };
    if (activeYear == null) {
      const base = now.getFullYear();
      const choices = [base - 1, base, base + 1].map(y => ({ y, d: make(p, y) })).filter(x => x.d);
      choices.sort((a, b) => Math.abs(a.d - now) - Math.abs(b.d - now));
      activeYear = choices[0]?.y;
      if (activeYear == null) throw new Error('Date SERMAR impossible.');
    }
    if (meta.inferredYear == null) meta.inferredYear = activeYear;
    if (previousParts?.month === 12 && p.month === 1) activeYear += 1;
    const time = make(p, activeYear);
    if (!time) throw new Error('Date SERMAR impossible.');
    previousParts = p;
    let elapsedMinutes = null;
    if (elapsedRaw != null && String(elapsedRaw).trim() !== '') {
      const e = String(elapsedRaw).trim().match(/^\+?(\d+):([0-5]\d)$/);
      if (!e) meta.elapsedMismatches += 1;
      else {
        elapsedMinutes = +e[1] * 60 + +e[2];
        if (anchor) {
          meta.elapsedChecked += 1;
          if (time - anchor.time !== (elapsedMinutes - anchor.elapsedMinutes) * 60000) meta.elapsedMismatches += 1;
        } else anchor = { time, elapsedMinutes };
      }
    }
    return { time, elapsedMinutes };
  } };
}
