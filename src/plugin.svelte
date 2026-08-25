<div class="plugin__mobile-header">{title}</div>
<section class="plugin__content">
  <div class="plugin__title plugin__title--chevron-back" on:click={() => bcast.emit('rqstOpen', 'menu')}>{title}</div>

  <div class="topline">
    <div><strong>{formatUtc(currentTimestamp)}</strong><small>Temps du slider Windy</small></div>
    <label class="import button button--variant-orange" class:disabled={routes.length >= MAX_ROUTES}>
      + Route
      <input type="file" accept=".csv,.gpx" multiple on:change={handleFiles} disabled={routes.length >= MAX_ROUTES} />
    </label>
  </div>

  {#if message}<div class="message">{message}</div>{/if}

  {#if routes.length === 0}
    <p class="empty">Ajoutez jusqu’à quatre routes Avalon / VRZen / eSail4VR. La comparaison suivra automatiquement le slider temporel Windy.</p>
  {:else}
    <div class="routes">
      {#each routes as route (route.id)}
        <div class="route-row">
          <span class="dot" style={`background:${route.color}`}></span>
          <div class="route-name"><strong title={route.name}>{route.name}</strong><small>{route.source} · {route.points.length} pts</small></div>
          <button title={route.visible ? 'Masquer' : 'Afficher'} on:click={() => toggleRoute(route.id)}>{route.visible ? '👁' : '○'}</button>
          <button title="Supprimer" on:click={() => removeRoute(route.id)}>×</button>
        </div>
      {/each}
    </div>

    <div class="compare-grid">
      {#each routes as route (route.id)}
        <article class="compare-card" style={`--route-color:${route.color}`}>
          <div class="compare-head">
            <span class="dot"></span>
            <strong>{route.source}</strong><small class="card-file" title={route.name}>{shortName(route.name)}</small>
          </div>
          <div class="router-strip">
            <span class="section-label">Routeur</span>
            <div class="router-values">{compactRouteSummary(route.position)}</div>
          </div>
          <div class="models-grid">
            {#each MODELS as model}
              <div class="model-box">
                <strong>{model.label}</strong>
                <span>{modelSummary(route.weather?.[model.id])}</span>
              </div>
            {/each}
          </div>
        </article>
      {/each}
    </div>
    <p class="hint">TWS en nœuds · TWD/TWA en degrés. La météo est recalculée après stabilisation du slider, pas à chaque pixel de déplacement.</p>
  {/if}
</section>

<script>
  import bcast from '@windy/broadcast';
  import { map } from '@windy/map';
  import store from '@windy/store';
  import metrics from '@windy/metrics';
  import { getPointForecastData } from '@windy/fetch';
  import { onDestroy, onMount } from 'svelte';
  import config from './pluginConfig.ts';
  import { parseRouteFile, signedAngle } from './routeParser';
  import { interpolateRoute, interpolateForecast } from './timeUtils';

  const { title } = config;
  const MAX_ROUTES = 4;
  const MODELS = [{ id: 'ecmwf', label: 'ECMWF' }, { id: 'gfs', label: 'GFS' }, { id: 'icon', label: 'ICON' }];
  const COLORS = ['#ff8a00', '#19b5e5', '#59d34f', '#e53935'];
  const weatherCache = new Map();
  let routes = [];
  let currentTimestamp = store.get('timestamp');
  let message = '';
  let weatherTimer = null;
  let generation = 0;

  function boatIcon(color, cog = 0) {
    const heading = Math.round(cog || 0);
    return L.divIcon({
      className: 'w4vr-boat-wrap', iconSize: [18, 22], iconAnchor: [9, 11],
      html: `<div class="w4vr-boat" style="transform:rotate(${heading}deg)">
        <svg viewBox="0 0 18 22" width="18" height="22" aria-hidden="true">
          <path d="M9 1 L15.2 15.5 Q13.5 20 9 21 Q4.5 20 2.8 15.5 Z" fill="${color}" stroke="#111" stroke-width="1.2"/>
          <path d="M9 4 L9 17" stroke="white" stroke-width="1.2" opacity=".9"/>
        </svg>
      </div>`,
    });
  }

  function routeSummary(p) {
    if (!p) return '–';
    if (p.outOfRange) return 'hors plage';
    const fdeg = v => Number.isFinite(v) ? `${Math.round(v)}°` : '-';
    const fkt = v => Number.isFinite(v) ? `${v.toFixed(1)} kt` : '-';
    return [
      `COG ${fdeg(p.cog)}`,
      `SOG ${fkt(p.sog)}`,
      `TWS ${fkt(p.tws)}`,
      `TWD ${fdeg(p.twd)}`,
      `TWA ${fdeg(p.twa)}`,
      `Voile ${p.sail || '-'}`,
    ].join('\n');
  }

  function compactRouteSummary(p) {
    if (!p || p.outOfRange) return "hors plage";

    const fmt = (v, suffix = "") => {
      if (v === null || v === undefined || v === "") return "-";
      const n = Number(v);
      return Number.isFinite(n) ? `${Math.round(n * 10) / 10}${suffix}` : "-";
    };

    const cog = fmt(p.cog, "°");
    const sog = fmt(p.sog, " kt");
    const sail = p.sail ? String(p.sail) : "-";
    const twa = fmt(p.twa, "°");
    const tws = fmt(p.tws, " kt");
    const twd = fmt(p.twd, "°");

    return `COG ${cog}  ·  SOG ${sog}  ·  Voile ${sail}\nTWA ${twa}  ·  TWS ${tws}  ·  TWD ${twd}`;
  }

  function modelSummary(w) {
    if (!w) return '…';
    if (w.error) return 'n/a';
    return `TWS ${w.tws.toFixed(1)}\nTWD ${Math.round(w.twd)}°\nTWA ${Math.round(w.twa)}°`;
  }

  function formatUtc(ts) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ts)) + ' UTC';
  }
  function shortName(name) { return name.length > 13 ? name.slice(0, 12) + '…' : name; }

  function createMapObjects(route) {
    const latLngs = route.points.map(p => [p.lat, p.lon]);
    route.polyline = new L.Polyline(latLngs, { color: route.color, weight: 3, opacity: 0.82 }).addTo(map);
    const p = route.position || route.points[0];
    route.marker = new L.Marker([p.lat, p.lon], { icon: boatIcon(route.color, p.cog), zIndexOffset: 500 }).addTo(map);
  }

  function destroyMapObjects(route) {
    route.polyline?.remove(); route.marker?.remove();
    route.polyline = null; route.marker = null;
  }

  function updateRoutePositions(ts) {
    for (const route of routes) {
      route.position = interpolateRoute(route.points, ts);
      if (route.marker && route.position) {
        route.marker.setLatLng([route.position.lat, route.position.lon]);
        route.marker.setIcon(boatIcon(route.color, route.position.cog));
      }
    }
    routes = [...routes];
  }

  function cacheKey(model, p, ts) {
    const hour = Math.round(ts / 3600000);
    return `${model}:${p.lat.toFixed(3)}:${p.lon.toFixed(3)}:${hour}`;
  }

  function angleDiff(windDirection, course) {
    if (!Number.isFinite(Number(windDirection)) || !Number.isFinite(Number(course))) return null;
    let d = ((Number(windDirection) - Number(course) + 540) % 360) - 180;
    return Math.round(d);
  }

  async function loadOneWeather(model, position, timestamp) {
    const cacheKey = `${model}:${position.lat.toFixed(3)}:${position.lon.toFixed(3)}:${Math.round(timestamp / 1800000)}`;
    if (weatherCache.has(cacheKey)) return weatherCache.get(cacheKey);

    try {
      const raw = await getPointForecastData(model, { lat: position.lat, lon: position.lon });

      // Windy plugin API responses have existed in more than one wrapper shape.
      // Normalize the known variants instead of assuming result.data.data.
      const payload =
        raw?.data?.data ??
        raw?.data ??
        raw?.result?.data?.data ??
        raw?.result?.data ??
        raw?.result ??
        raw;

      if (!payload) throw new Error("Réponse météo vide");

      const ts = payload.ts ?? payload.timestamps;
      const wind = payload.wind ?? payload.windSpeed ?? payload.wind_speed;
      const windDir = payload.windDir ?? payload.windDirection ?? payload.wind_dir;

      if (!Array.isArray(ts) || !Array.isArray(wind) || !Array.isArray(windDir)) {
        console.warn(`[WindyVR LSV team] ${model} structure météo inattendue`, raw);
        throw new Error("Structure météo non reconnue");
      }

      const samples = ts.map((t, i) => ({
        timestamp: Number(t),
        speed: Number(wind[i]),
        direction: Number(windDir[i]),
      })).filter((p) => Number.isFinite(p.timestamp) && Number.isFinite(p.speed) && Number.isFinite(p.direction));

      if (!samples.length) throw new Error("Aucun échantillon météo exploitable");

      // Linear interpolation is sufficient for the point forecast display and
      // avoids doing work for every route waypoint.
      let sample;
      if (timestamp <= samples[0].timestamp) {
        sample = samples[0];
      } else if (timestamp >= samples[samples.length - 1].timestamp) {
        sample = samples[samples.length - 1];
      } else {
        let lo = 0, hi = samples.length - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (samples[mid].timestamp <= timestamp) lo = mid;
          else hi = mid;
        }
        const a = samples[lo], b = samples[hi];
        const f = (timestamp - a.timestamp) / (b.timestamp - a.timestamp);
        // Interpolate direction through the shortest angular path.
        let delta = ((b.direction - a.direction + 540) % 360) - 180;
        sample = {
          timestamp,
          speed: a.speed + (b.speed - a.speed) * f,
          direction: (a.direction + delta * f + 360) % 360,
        };
      }

      let tws = sample.speed;
      try {
        const converted = metrics?.wind?.convertValue?.(sample.speed, " ");
        if (converted != null) {
          const parsed = parseFloat(String(converted).replace(",", "."));
          if (Number.isFinite(parsed)) tws = parsed;
        }
      } catch (_) {}

      const result = {
        model,
        tws,
        twd: Math.round(sample.direction),
        twa: angleDiff(sample.direction, position.cog),
      };

      weatherCache.set(cacheKey, result);
      if (weatherCache.size > 250) weatherCache.delete(weatherCache.keys().next().value);
      return result;
    } catch (error) {
      console.error(`[WindyVR LSV team] ${model}`, error);
      return { model, tws: null, twd: null, twa: null };
    }
  }

  async function refreshWeather() {
    const myGeneration = ++generation;
    const ts = currentTimestamp;
    const jobs = [];
    for (const route of routes) {
      const p = route.position;
      if (!p || p.outOfRange) { route.weather = {}; continue; }
      route.weather = route.weather || {};
      for (const model of MODELS) {
        jobs.push(loadOneWeather(model.id, p, ts).then(value => ({ routeId: route.id, model: model.id, value })));
      }
    }
    const results = await Promise.all(jobs);
    if (myGeneration !== generation || ts !== currentTimestamp) return;
    for (const item of results) {
      const route = routes.find(r => r.id === item.routeId);
      if (route) route.weather[item.model] = item.value;
    }
    routes = [...routes];
  }

  function scheduleWeather() {
    if (weatherTimer) clearTimeout(weatherTimer);
    weatherTimer = setTimeout(refreshWeather, 450);
  }

  function onTimestamp(ts) {
    currentTimestamp = ts;
    updateRoutePositions(ts);
    scheduleWeather();
  }

  async function handleFiles(event) {
    const input = event.currentTarget;
    const files = [...input.files].slice(0, Math.max(0, MAX_ROUTES - routes.length));
    message = '';
    for (const file of files) {
      try {
        const parsed = await parseRouteFile(file);
        const route = {
          id: `${Date.now()}-${Math.random()}`,
          name: file.name, source: parsed.source, points: parsed.points,
          color: COLORS[routes.length % COLORS.length], visible: true,
          position: interpolateRoute(parsed.points, currentTimestamp), weather: {},
          polyline: null, marker: null,
        };
        createMapObjects(route);
        routes = [...routes, route];
      } catch (error) {
        message = `${file.name}: ${error.message}`;
      }
    }
    input.value = '';
    if (routes.length) {
      try { map.fitBounds(routes.flatMap(r => r.points.map(p => [p.lat, p.lon])), { padding: [30, 30] }); } catch (_) {}
      scheduleWeather();
    }
  }

  function toggleRoute(id) {
    const route = routes.find(r => r.id === id); if (!route) return;
    route.visible = !route.visible;
    if (route.visible) createMapObjects(route); else destroyMapObjects(route);
    routes = [...routes];
  }

  function removeRoute(id) {
    const route = routes.find(r => r.id === id); if (!route) return;
    destroyMapObjects(route);
    routes = routes.filter(r => r.id !== id);
    routes.forEach((r, i) => { r.color = COLORS[i]; if (r.visible) { destroyMapObjects(r); createMapObjects(r); } });
    scheduleWeather();
  }

  onMount(() => {
    store.on('timestamp', onTimestamp);
  });

  onDestroy(() => {
    generation += 1;
    if (weatherTimer) clearTimeout(weatherTimer);
    store.off('timestamp', onTimestamp);
    routes.forEach(destroyMapObjects);
    routes = [];
    weatherCache.clear();
  });
</script>

<style>
  .plugin__content { padding-bottom: 24px; }
  .topline { display:flex; justify-content:space-between; align-items:center; gap:10px; margin:14px 0; }
  .topline small, .route-name small { display:block; opacity:.7; font-size:11px; }
  .import { position:relative; overflow:hidden; white-space:nowrap; }
  .import input { position:absolute; inset:0; opacity:0; cursor:pointer; }
  .import.disabled { opacity:.45; pointer-events:none; }
  .message { padding:8px 10px; margin:8px 0; border-left:3px solid #e96b36; background:rgba(255,255,255,.08); }
  .empty { opacity:.8; line-height:1.5; }
  .routes { margin:8px 0 14px; }
  .route-row { display:grid; grid-template-columns:18px minmax(0,1fr) 38px 38px; align-items:center; gap:6px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,.12); }
  .route-name { min-width:0; }
  .route-name strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .route-row button { min-width:34px; min-height:34px; border:0; border-radius:6px; background:rgba(255,255,255,.08); color:inherit; cursor:pointer; }
  .dot { width:12px; height:12px; border-radius:50%; display:inline-block; }
  .dot.small { width:9px; height:9px; margin-right:5px; }
  .table-scroll { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; font-size:11px; min-width:500px; }
  th, td { border:1px solid rgba(255,255,255,.15); padding:7px 6px; vertical-align:top; text-align:left; }
  th { background:rgba(255,255,255,.08); font-size:10px; }
  td { white-space:pre-line; line-height:1.45; }
  .route-data { min-width:110px; }
  .hint { opacity:.65; font-size:10px; line-height:1.4; margin-top:8px; }
  :global(.w4vr-boat-wrap) { background:none !important; border:none !important; }
  :global(.w4vr-boat) { width:18px; height:22px; line-height:0; transform-origin:50% 50%; filter:drop-shadow(0 1px 1px rgba(0,0,0,.75)); }

  .compare-grid{display:grid;gap:10px;margin-top:12px}
  .compare-card{border:1px solid rgba(255,255,255,.14);border-left:4px solid var(--route-color);border-radius:8px;padding:7px 8px;background:rgba(255,255,255,.035)}
  .compare-head{display:flex;align-items:center;gap:7px;min-width:0;margin-bottom:5px}
  .compare-head .dot{width:10px;height:10px;border-radius:50%;background:var(--route-color);flex:0 0 auto}
  .compare-head strong{white-space:nowrap}.card-file{opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
  .router-strip{display:grid;grid-template-columns:54px 1fr;gap:6px;align-items:start;margin-bottom:6px}
  .section-label{font-size:11px;text-transform:uppercase;opacity:.65;font-weight:700}
  .router-values{font-size:11.5px;line-height:1.45;white-space:pre-line;font-variant-numeric:tabular-nums}
  .models-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
  .model-box{min-width:0;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:5px}
  .model-box strong{display:block;font-size:11px;margin-bottom:3px}
  .model-box span{display:block;font-size:11px;line-height:1.35;white-space:pre-line}
  @media (max-width:420px){
    .models-grid{grid-template-columns:1fr}
    .router-strip{grid-template-columns:1fr}
  }
</style>
