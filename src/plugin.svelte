<div class="plugin__mobile-header">{title}</div>
<section class="plugin__content">
  <div class="plugin__title plugin__title--chevron-back" on:click={() => bcast.emit('rqstOpen', 'menu')}>{title}</div>

  <div class="topline">
    <div><strong>{formatLocalDateTime(currentTimestamp)}</strong><small>Temps Windy · heure locale</small></div>
    <label class="import button button--variant-orange" class:disabled={routes.length >= MAX_ROUTES}>
      + Route
      <input type="file" accept=".csv,.gpx" multiple on:change={handleFiles} disabled={routes.length >= MAX_ROUTES} />
    </label>
  </div>

  {#if message}<div class="message">{message}</div>{/if}

  {#if routes.length === 0}
    <p class="empty">Ajoutez jusqu’à six routes Dorado / Avalon / VRZen / eSail4VR / ZEZO. Quatre routes peuvent être visibles simultanément.</p>
  {:else}
    <div class="routes">
      {#each routes as route (route.id)}
        <div class="route-row">
          <span class="dot" style={`background:${route.color}`}></span>
          <div class="route-name"><strong title={route.name}>{route.name}</strong><small>{route.source} · {route.points.length} pts · {routeMeta(route)}</small></div>
          <button title={route.visible ? 'Masquer' : 'Afficher'} on:click={() => toggleRoute(route.id)}>{route.visible ? '👁' : '○'}</button>
          <button title="Supprimer" on:click={() => removeRoute(route.id)}>×</button>
        </div>
      {/each}
    </div>

    <div class="main-actions">
      <button class="analysis-button button button--variant-orange" on:click={() => analysisOpen = true}>Analyse complète</button>
      <button class="analysis-button button" on:click={() => visualOpen = true}>Synthèse visuelle</button>
    </div>
    {#if routeAnalysis.length}<div class="map-risk-legend"><span class="risk-green"><i></i>accord</span><span class="risk-orange"><i></i>vigilance</span><span class="risk-red"><i></i>divergence</span><span class="risk-unknown"><i></i>sans couverture</span></div>{/if}

    <div class="compare-grid">
      {#each routes as route (route.id)}
        {#if route.visible}
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
        {/if}
      {/each}
    </div>
    <p class="hint">TWS en nœuds · TWD/TWA en degrés. La météo est recalculée après stabilisation du slider, pas à chaque pixel de déplacement.</p>
  {/if}
</section>

{#if analysisOpen}
  <div class="analysis-overlay" role="dialog" aria-modal="true" aria-label="Analyse météo complète">
    <div class="analysis-window">
      <header class="analysis-head">
        <div><strong>Analyse météo complète</strong><small>Ocean Race Atlantique · routes importées · valeurs natives et météo Windy à l’instant T</small></div>
        <button aria-label="Fermer l’analyse" on:click={() => analysisOpen = false}>×</button>
      </header>

      <div class="analysis-summary">
        <div><span>Routes</span><strong>{routes.length}</strong></div>
        <div><span>Période commune · locale</span><strong>{commonWindow(routes)}</strong></div>
        <div><span>Temps Windy · local</span><strong>{formatLocalDateTime(currentTimestamp)}</strong></div>
      </div>

      <section class="analysis-section">
        <h3>Comparaison des routes importées</h3>
        <div class="analysis-table-scroll">
          <table class="analysis-table">
            <thead><tr><th>Route</th><th>Modèle/run natif</th><th>Points</th><th>Fin fichier</th><th>Durée</th><th>Distance</th><th>SOG moy.</th><th>TWS moy./max</th><th>Vent &lt; 8 kt</th><th>Manœuvres</th></tr></thead>
            <tbody>
              {#each routes as route}
                <tr>
                  <td><span class="dot small" style={`background:${route.color}`}></span>{route.source}</td>
                  <td>{routeMeta(route)}</td><td>{route.points.length}</td><td>{summarizeRoute(route).end}</td><td>{summarizeRoute(route).duration}</td>
                  <td>{summarizeRoute(route).distance}</td><td>{summarizeRoute(route).avgSog}</td><td>{summarizeRoute(route).wind}</td><td>{summarizeRoute(route).lightWind}</td><td>{summarizeRoute(route).maneuvers}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <div class="analysis-columns">
        <section class="analysis-section">
          <h3>Vent natif moyen par route</h3>
          <div class="wind-bars">
            {#each routes as route}
              <div class="wind-row"><span>{route.source}</span><div><i style={`width:${summarizeRoute(route).windBar}%;background:${route.color}`}></i></div><strong>{summarizeRoute(route).avgTwsLabel}</strong></div>
            {/each}
          </div>
          <p class="analysis-hint">Le vent natif provient du routeur lorsque le fichier le contient. « n/a » signifie que la route ne fournit pas de TWS.</p>
        </section>

        <section class="analysis-section">
          <h3>Météo Windy à l’instant T</h3>
          <div class="analysis-table-scroll"><table class="analysis-table snapshot-table">
            <thead><tr><th>Route</th>{#each MODELS as model}<th>{model.label}</th>{/each}</tr></thead>
            <tbody>{#each routes as route}<tr><td>{route.source}</td>{#each MODELS as model}<td>{modelSummary(route.weather?.[model.id])}</td>{/each}</tr>{/each}</tbody>
          </table></div>
        </section>
      </div>

      <section class="analysis-section full-weather">
        <div class="full-weather-head">
          <div><h3>Analyse ECMWF / GFS / ICON le long des routes</h3><p>Pas adaptatif de 30 min à 12 h, complété aux changements importants de route.</p></div>
          <button class="button button--variant-orange" disabled={analysisStatus === 'running'} on:click={runFullWeatherAnalysis}>
            {analysisStatus === 'running' ? `Analyse ${analysisProgress}%` : analysisStatus === 'done' ? 'Actualiser' : 'Lancer l’analyse'}
          </button>
        </div>
        {#if analysisStatus === 'running'}<div class="progress"><i style={`width:${analysisProgress}%`}></i></div>{/if}
        {#if analysisStatus === 'error'}<p class="analysis-error">L’analyse n’a pas pu être terminée. Réessayez dans quelques instants.</p>{/if}
        {#if routeAnalysis.length}
          <div class="analysis-table-scroll"><table class="analysis-table full-weather-table">
            <thead><tr><th>Route</th>{#each MODELS as model}<th>{model.label}<br><small>moy./max · couverture</small></th>{/each}<th>Divergence maximale</th></tr></thead>
            <tbody>{#each routeAnalysis as item}<tr>
              <td><span class="dot small" style={`background:${item.color}`}></span>{item.label}<br><small>{item.sampleCount} positions</small></td>
              {#each MODELS as model}<td>{weatherAnalysisModel(item.summary.byModel[model.id], item.sampleCount)}</td>{/each}
              <td>{criticalSummary(item.summary.critical)}</td>
            </tr>{/each}</tbody>
          </table></div>
        {:else if analysisStatus === 'idle'}
          <p class="analysis-hint">Déclenchement manuel pour maîtriser les requêtes météo.</p>
        {/if}
      </section>

      <footer class="analysis-foot">Les heures de navigation sont locales. Les cycles météo restent exprimés en Z. Une couverture partielle signifie qu’un modèle ne fournit pas l’échéance demandée ou qu’une requête a échoué.</footer>
    </div>
  </div>
{/if}

{#if visualOpen}
  <div class="analysis-overlay" role="dialog" aria-modal="true" aria-label="Synthèse météo visuelle">
    <div class="analysis-window visual-window">
      <header class="analysis-head">
        <div><strong>Synthèse météo visuelle</strong><small>Concordance ECMWF / GFS / ICON · heures locales</small></div>
        <button aria-label="Fermer la synthèse" on:click={() => visualOpen = false}>×</button>
      </header>
      {#if !routeAnalysis.length}
        <div class="visual-empty"><strong>Analyse multi-modèle nécessaire</strong><p>Ouvrez « Analyse complète », puis cliquez sur « Lancer l’analyse ».</p></div>
      {:else}
        <div class="global-alert risk-{globalRisk().level}"><i></i><div><strong>{globalRisk().label}</strong><span>{globalRisk().detail}</span></div></div>
        <div class="visual-routes">
          {#each routeAnalysis as item}
            <article class="visual-route risk-{routeRisk(item).level}">
              <header><strong>{item.label}</strong><span>{routeRisk(item).label}</span></header>
              <div class="risk-meter"><i style={`width:${routeRisk(item).score}%`}></i></div>
              <p>{routeRisk(item).detail}</p><small>ETA {item.eta} · {item.etaGap} · qualité {qualityLabel(item.quality)}</small>
            </article>
          {/each}
        </div>
        <section class="visual-timeline"><h3>Passages sensibles — cliquez pour ouvrir dans Windy</h3>
          {#if criticalEvents().length}<div class="timeline-list">{#each criticalEvents() as event}
            <button class="risk-{event.level}" on:click={() => jumpToEvent(event)}><i></i><strong>{event.label}</strong><span>{formatLocalDateTime(event.timestamp)} · Δ {event.speedSpread.toFixed(1)} kt / {Math.round(event.directionSpread)}°</span></button>
          {/each}</div>{:else}<p class="analysis-hint">Aucune divergence significative détectée sur la période couverte.</p>{/if}
        </section>
        <section class="quality-list"><h3>Contrôle qualité</h3>{#each routeAnalysis as item}<div><strong>{item.label}</strong><span>{item.quality.issues.length ? item.quality.issues.join(' · ') : 'Fichier cohérent'}</span></div>{/each}</section>
        <div class="visual-actions"><button class="button button--variant-orange" on:click={exportReport}>Exporter / imprimer en PDF</button></div>
      {/if}
    </div>
  </div>
{/if}

<script>
  import bcast from '@windy/broadcast';
  import { map } from '@windy/map';
  import store from '@windy/store';
  import metrics from '@windy/metrics';
  import { getPointForecastData } from '@windy/fetch';
  import { onDestroy, onMount } from 'svelte';
  import config from './pluginConfig.ts';
  import { formatLocalDateTime } from './dateTime.js';
  import { buildRiskEvents, buildSampleTimes, summarizeWeatherSamples } from './analysisUtils.js';
  import { assessRouteQuality } from './qualityUtils.js';
  import { parseRouteFile, signedAngle } from './routeParser';
  import { interpolateRoute, interpolateForecast } from './timeUtils';

  const { title } = config;
  const MAX_ROUTES = 6;
  const MAX_VISIBLE_ROUTES = 4;
  const MODELS = [{ id: 'ecmwf', label: 'ECMWF' }, { id: 'gfs', label: 'GFS' }, { id: 'icon', label: 'ICON' }];
  const COLORS = ['#ff8a00', '#19b5e5', '#59d34f', '#e53935', '#a66ee0', '#f2c94c'];
  const weatherCache = new Map();
  let routes = [];
  let currentTimestamp = store.get('timestamp');
  let message = '';
  let analysisOpen = false;
  let visualOpen = false;
  let weatherTimer = null;
  let generation = 0;
  let analysisGeneration = 0;
  let analysisStatus = 'idle';
  let analysisProgress = 0;
  let routeAnalysis = [];

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
    if (w.error || !Number.isFinite(w.tws) || !Number.isFinite(w.twd) || !Number.isFinite(w.twa)) return 'n/a';
    return `TWS ${w.tws.toFixed(1)}\nTWD ${Math.round(w.twd)}°\nTWA ${Math.round(w.twa)}°`;
  }

  function shortName(name) { return name.length > 13 ? name.slice(0, 12) + '…' : name; }

  function routeMeta(route) {
    const model = route.nativeModel ? route.nativeModel.toUpperCase() : 'modèle ?';
    return route.cycle ? `${model} ${route.cycle}` : model;
  }

  function weatherAnalysisModel(value, expected) {
    if (!value?.coverage) return `n/a · 0/${expected}`;
    return `${value.avgTws.toFixed(1)} / ${value.maxTws.toFixed(1)} kt · ${value.coverage}/${expected}`;
  }

  function criticalSummary(value) {
    if (!value) return 'n/a';
    return `${formatLocalDateTime(value.timestamp)}\nΔ vent ${value.speedSpread.toFixed(1)} kt · Δ dir ${Math.round(value.directionSpread)}°`;
  }

  function invalidateFullAnalysis() {
    analysisGeneration += 1;
    analysisStatus = 'idle';
    analysisProgress = 0;
    routeAnalysis = [];
    routes.forEach(destroyRiskLayers);
  }

  function routeLabel(route) {
    return route.source === 'Dorado' && route.nativeModel ? `Dorado ${route.nativeModel.toUpperCase()}` : route.source;
  }

  function qualityLabel(quality) {
    return quality.level === 'green' ? 'bonne' : quality.level === 'orange' ? 'à vérifier' : 'alerte';
  }

  function routeRisk(item) {
    const c = item.summary.critical;
    const coverage = MODELS.reduce((sum, m) => sum + (item.summary.byModel[m.id]?.coverage || 0), 0) / Math.max(1, item.sampleCount * MODELS.length);
    const score = Math.min(100, Math.max(c ? c.speedSpread * 9 : 0, c ? c.directionSpread * 1.5 : 0, (1 - coverage) * 80));
    const level = score >= 70 ? 'red' : score >= 40 ? 'orange' : 'green';
    const label = level === 'red' ? 'Divergence forte' : level === 'orange' ? 'À surveiller' : 'Bonne concordance';
    const detail = c ? `Écart max. ${c.speedSpread.toFixed(1)} kt · ${Math.round(c.directionSpread)}° · couverture ${Math.round(coverage * 100)} %` : `Couverture ${Math.round(coverage * 100)} %`;
    return { score, level, label, detail };
  }

  function globalRisk() {
    const ranked = routeAnalysis.map(item => ({ item, risk: routeRisk(item) })).sort((a, b) => b.risk.score - a.risk.score);
    if (!ranked.length) return { level: 'green', label: 'Analyse indisponible', detail: '' };
    const top = ranked[0];
    return { level: top.risk.level, label: top.risk.level === 'red' ? 'Vigilance forte' : top.risk.level === 'orange' ? 'Vigilance modérée' : 'Bonne concordance générale', detail: `${top.item.label} · ${top.risk.detail}` };
  }

  function criticalEvents() {
    return routeAnalysis.flatMap(item => item.riskEvents.filter(e => e.level !== 'green' && e.level !== 'unknown').map(e => ({ ...e, routeId: item.routeId, label: item.label })))
      .sort((a, b) => a.timestamp - b.timestamp).slice(0, 12);
  }

  function jumpToEvent(event) {
    store.set('timestamp', event.timestamp);
    const route = routes.find(r => r.id === event.routeId);
    const position = route ? interpolateRoute(route.points, event.timestamp) : null;
    if (position) map.panTo([position.lat, position.lon]);
    visualOpen = false;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function exportReport() {
    const rows = routeAnalysis.map(item => { const risk = routeRisk(item); return `<tr><td>${escapeHtml(item.label)}</td><td class="${risk.level}">${escapeHtml(risk.label)}</td><td>${escapeHtml(risk.detail)}</td><td>${escapeHtml(item.eta)}<br>${escapeHtml(item.etaGap)}</td><td>${escapeHtml(item.quality.issues.join(' · ') || 'Fichier cohérent')}</td></tr>`; }).join('');
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Synthèse WindyVR LSV Team</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;margin:24px;color:#16303c}h1{margin-bottom:4px}p{color:#586970}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ccd7dc;padding:9px;text-align:left;font-size:12px}.green{color:#16833b}.orange{color:#b46200}.red{color:#bd2424}@media print{button{display:none}body{margin:0}}</style></head><body><h1>Synthèse météo WindyVR LSV Team</h1><p>Générée le ${escapeHtml(formatLocalDateTime(Date.now()))} · ECMWF / GFS / ICON</p><table><thead><tr><th>Route</th><th>Concordance</th><th>Écart maximal</th><th>ETA locale</th><th>Qualité</th></tr></thead><tbody>${rows}</tbody></table><p>Les couleurs mesurent la concordance des modèles, pas la performance de la route.</p><button onclick="window.print()">Imprimer / enregistrer en PDF</button></body></html>`;
    const popup = window.open('', '_blank');
    if (!popup) { message = 'Le navigateur a bloqué la fenêtre d’export.'; return; }
    popup.document.open(); popup.document.write(html); popup.document.close();
  }

  function haversineNm(a, b) {
    const rad = d => d * Math.PI / 180, r = 3440.065;
    const p1 = rad(a.lat), p2 = rad(b.lat), dp = p2 - p1, dl = rad(b.lon - a.lon);
    const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * r * Math.asin(Math.sqrt(x));
  }

  function fmtDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) return 'n/a';
    const h = Math.round(ms / 3600000), d = Math.floor(h / 24);
    return `${d} j ${h % 24} h`;
  }

  function fmtEtaDelta(ms) {
    const minutes = Math.max(0, Math.round(ms / 60000));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60), days = Math.floor(hours / 24);
    return days ? `${days} j ${hours % 24} h` : `${hours} h ${minutes % 60} min`;
  }

  function weightedHours(points, predicate) {
    let hours = 0;
    for (let i = 0; i < points.length - 1; i += 1) {
      if (predicate(points[i])) hours += Math.max(0, points[i + 1].time - points[i].time) / 3600000;
    }
    return hours;
  }

  function summarizeRoute(route) {
    const p = route.points, first = p[0], last = p[p.length - 1];
    let distance = 0;
    for (let i = 1; i < p.length; i += 1) distance += haversineNm(p[i - 1], p[i]);
    const sogs = p.map(x => x.sog).filter(Number.isFinite);
    const winds = p.map(x => x.tws).filter(Number.isFinite);
    const avg = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    let maneuvers = 0, previousSign = null;
    for (const point of p) {
      if (!Number.isFinite(point.twa) || Math.abs(point.twa) < 5) continue;
      const sign = Math.sign(point.twa);
      if (previousSign != null && sign !== previousSign) maneuvers += 1;
      previousSign = sign;
    }
    const avgTws = avg(winds), maxTws = winds.length ? Math.max(...winds) : null;
    return {
      end: formatLocalDateTime(last.time), duration: fmtDuration(last.time - first.time), distance: `${distance.toFixed(0)} nm`,
      avgSog: sogs.length ? `${avg(sogs).toFixed(1)} kt` : 'n/a',
      wind: winds.length ? `${avgTws.toFixed(1)} / ${maxTws.toFixed(1)} kt` : 'n/a',
      lightWind: winds.length ? `${weightedHours(p, x => Number.isFinite(x.tws) && x.tws < 8).toFixed(0)} h` : 'n/a',
      maneuvers: previousSign == null ? 'n/a' : String(maneuvers),
      windBar: avgTws == null ? 0 : Math.min(100, avgTws / 30 * 100), avgTwsLabel: avgTws == null ? 'n/a' : `${avgTws.toFixed(1)} kt`,
    };
  }

  function commonWindow(items) {
    if (!items.length) return 'n/a';
    const start = Math.max(...items.map(r => r.points[0].time.getTime()));
    const end = Math.min(...items.map(r => r.points.at(-1).time.getTime()));
    return end > start ? `${formatLocalDateTime(start)} → ${formatLocalDateTime(end)}` : 'aucune';
  }

  function createMapObjects(route) {
    const latLngs = route.points.map(p => [p.lat, p.lon]);
    route.polyline = new L.Polyline(latLngs, { color: route.color, weight: 3, opacity: 0.82 }).addTo(map);
    const p = route.position || route.points[0];
    route.marker = new L.Marker([p.lat, p.lon], { icon: boatIcon(route.color, p.cog), zIndexOffset: 500 }).addTo(map);
    const analysis = routeAnalysis.find(item => item.routeId === route.id);
    if (analysis) createRiskLayers(route, analysis.riskEvents);
  }

  function destroyRiskLayers(route) {
    (route.riskLayers || []).forEach(layer => layer.remove());
    route.riskLayers = [];
  }

  function createRiskLayers(route, events) {
    destroyRiskLayers(route);
    if (!route.visible || !events?.length) return;
    const colors = { green: '#31c96b', orange: '#ff9f1a', red: '#ef4444', unknown: '#8a9ba3' };
    route.riskLayers = [];
    for (let i = 0; i < events.length - 1; i += 1) {
      const a = interpolateRoute(route.points, events[i].timestamp), b = interpolateRoute(route.points, events[i + 1].timestamp);
      if (!a || !b) continue;
      route.riskLayers.push(new L.Polyline([[a.lat, a.lon], [b.lat, b.lon]], { color: colors[events[i].level], weight: 6, opacity: .9 }).addTo(map));
    }
  }

  function applyRiskLayers() {
    for (const route of routes) {
      const analysis = routeAnalysis.find(item => item.routeId === route.id);
      if (analysis) createRiskLayers(route, analysis.riskEvents);
    }
  }

  function destroyMapObjects(route) {
    destroyRiskLayers(route);
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
        console.warn(`[WindyVR LSV Team] ${model} structure météo inattendue`, raw);
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
      if (timestamp < samples[0].timestamp || timestamp > samples[samples.length - 1].timestamp) {
        const unavailable = { model, tws: null, twd: null, twa: null, unavailable: true };
        weatherCache.set(cacheKey, unavailable);
        return unavailable;
      }

      let sample;
      if (timestamp === samples[0].timestamp) {
        sample = samples[0];
      } else if (timestamp === samples[samples.length - 1].timestamp) {
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
      if (weatherCache.size > 500) weatherCache.delete(weatherCache.keys().next().value);
      return result;
    } catch (error) {
      console.error(`[WindyVR LSV Team] ${model}`, error);
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

  async function runFullWeatherAnalysis() {
    if (!routes.length || analysisStatus === 'running') return;
    const token = ++analysisGeneration;
    const selectedRoutes = [...routes];
    const jobs = [];
    const sampleCounts = new Map();
    analysisStatus = 'running'; analysisProgress = 0; routeAnalysis = [];
    routes.forEach(destroyRiskLayers);
    for (const route of selectedRoutes) {
      const times = buildSampleTimes(route.points);
      sampleCounts.set(route.id, times.length);
      for (const timestamp of times) {
        const position = interpolateRoute(route.points, timestamp);
        for (const model of MODELS) jobs.push({ routeId: route.id, timestamp, position, model: model.id });
      }
    }
    const samples = [];
    try {
      for (let i = 0; i < jobs.length; i += 4) {
        if (token !== analysisGeneration) return;
        const batch = jobs.slice(i, i + 4);
        const values = await Promise.all(batch.map(async job => {
          const value = await loadOneWeather(job.model, job.position, job.timestamp);
          return { routeId: job.routeId, timestamp: job.timestamp, model: job.model, tws: value.tws, twd: value.twd };
        }));
        samples.push(...values);
        analysisProgress = Math.round(Math.min(jobs.length, i + batch.length) / jobs.length * 100);
      }
      if (token !== analysisGeneration) return;
      const earliestEta = Math.min(...selectedRoutes.map(route => route.points.at(-1).time.getTime()));
      routeAnalysis = selectedRoutes.map(route => {
        const routeSamples = samples.filter(s => s.routeId === route.id);
        const etaMs = route.points.at(-1).time.getTime();
        return {
          routeId: route.id, source: route.source, label: routeLabel(route), color: route.color,
          sampleCount: sampleCounts.get(route.id), eta: formatLocalDateTime(etaMs), etaGap: etaMs === earliestEta ? 'ETA la plus tôt' : `+${fmtEtaDelta(etaMs - earliestEta)}`,
          quality: assessRouteQuality(route),
          summary: summarizeWeatherSamples(routeSamples, MODELS.map(m => m.id)), riskEvents: buildRiskEvents(routeSamples),
        };
      });
      applyRiskLayers();
      analysisStatus = 'done'; analysisProgress = 100;
    } catch (error) {
      console.error('[WindyVR LSV Team] analyse multi-modèle', error);
      if (token === analysisGeneration) analysisStatus = 'error';
    }
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
    invalidateFullAnalysis();
    for (const file of files) {
      try {
        const parsed = await parseRouteFile(file);
        const route = {
          id: `${Date.now()}-${Math.random()}`,
          name: file.name, source: parsed.source, points: parsed.points,
          color: COLORS[routes.length % COLORS.length], visible: routes.filter(r => r.visible).length < MAX_VISIBLE_ROUTES,
          nativeModel: parsed.nativeModel, cycle: parsed.cycle,
          position: interpolateRoute(parsed.points, currentTimestamp), weather: {},
          polyline: null, marker: null, riskLayers: [],
        };
        if (route.visible) createMapObjects(route);
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
    if (!route.visible && routes.filter(r => r.visible).length >= MAX_VISIBLE_ROUTES) {
      message = 'Quatre routes maximum peuvent être visibles simultanément. Masquez d’abord une autre route.';
      return;
    }
    message = '';
    route.visible = !route.visible;
    if (route.visible) createMapObjects(route); else destroyMapObjects(route);
    routes = [...routes];
  }

  function removeRoute(id) {
    const route = routes.find(r => r.id === id); if (!route) return;
    invalidateFullAnalysis();
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
    analysisGeneration += 1;
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
  .main-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:12px}.analysis-button { width:100%; margin:0; min-height:38px; cursor:pointer; }
  .map-risk-legend{display:flex;gap:10px;flex-wrap:wrap;margin:-4px 0 12px;font-size:10px;opacity:.8}.map-risk-legend i{display:inline-block;width:16px;height:5px;background:var(--risk);margin-right:4px;vertical-align:middle}
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
  .analysis-overlay{position:fixed;inset:54px 2vw 18px;z-index:10000;background:rgba(3,16,24,.72);display:flex;align-items:stretch;justify-content:center;padding:14px;backdrop-filter:blur(3px)}
  .analysis-window{width:min(1180px,100%);overflow:auto;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:#102632;color:#f2f8fa;box-shadow:0 18px 60px rgba(0,0,0,.55);padding:14px}
  .analysis-head{display:flex;align-items:flex-start;gap:12px;padding-bottom:11px;border-bottom:1px solid rgba(255,255,255,.14)}
  .analysis-head>div{min-width:0;flex:1}.analysis-head strong{display:block;font-size:18px}.analysis-head small{display:block;opacity:.68;margin-top:3px}
  .analysis-head button{width:38px;height:38px;border:0;border-radius:7px;background:rgba(255,255,255,.1);color:inherit;font-size:25px;cursor:pointer}
  .analysis-summary{display:grid;grid-template-columns:120px minmax(240px,1fr) minmax(180px,.6fr);gap:8px;margin:12px 0}
  .analysis-summary>div{padding:9px 11px;border:1px solid rgba(255,255,255,.13);border-radius:8px;background:rgba(255,255,255,.045)}
  .analysis-summary span{display:block;font-size:10px;text-transform:uppercase;opacity:.65;margin-bottom:4px}.analysis-summary strong{font-size:13px}
  .analysis-section{border:1px solid rgba(255,255,255,.13);border-radius:9px;background:rgba(255,255,255,.035);padding:10px;margin-bottom:10px}
  .analysis-section h3{font-size:13px;margin:0 0 9px}.analysis-table-scroll{overflow-x:auto}
  .analysis-table{min-width:900px;font-size:10.5px}.analysis-table th{white-space:nowrap}.analysis-table td{white-space:pre-line}
  .analysis-columns{display:grid;grid-template-columns:minmax(320px,.85fr) minmax(460px,1.15fr);gap:10px}.analysis-columns .analysis-section{margin-bottom:0}
  .wind-bars{display:grid;gap:8px}.wind-row{display:grid;grid-template-columns:95px 1fr 58px;gap:8px;align-items:center;font-size:11px}
  .wind-row>div{height:9px;border-radius:5px;background:rgba(255,255,255,.1);overflow:hidden}.wind-row i{display:block;height:100%;border-radius:5px}
  .wind-row strong{text-align:right;font-variant-numeric:tabular-nums}.analysis-hint,.analysis-foot{font-size:10px;opacity:.66;line-height:1.4}
  .snapshot-table{min-width:560px}.analysis-foot{padding:11px 3px 2px}
  .full-weather{margin-top:10px}.full-weather-head{display:flex;justify-content:space-between;gap:12px;align-items:center}
  .full-weather-head h3{margin:0 0 3px}.full-weather-head p{margin:0;font-size:10px;opacity:.66}.full-weather-head button{white-space:nowrap}
  .progress{height:7px;margin:10px 0;border-radius:5px;background:rgba(255,255,255,.1);overflow:hidden}.progress i{display:block;height:100%;background:#ff8a00;transition:width .2s}
  .full-weather-table{min-width:880px}.full-weather-table small{font-weight:400;opacity:.65}.analysis-error{color:#ff8d8d;font-size:11px}
  .visual-window{max-width:1050px}.visual-empty{padding:40px 10px;text-align:center}.visual-empty p{opacity:.7}
  .global-alert{display:flex;gap:12px;align-items:center;margin:14px 0;padding:12px;border-radius:9px;background:rgba(255,255,255,.055)}
  .global-alert>i,.timeline-list button>i{width:16px;height:16px;border-radius:50%;background:var(--risk);box-shadow:0 0 0 5px color-mix(in srgb,var(--risk) 18%,transparent);flex:0 0 auto}
  .global-alert strong,.global-alert span{display:block}.global-alert span{font-size:11px;opacity:.72;margin-top:2px}
  .risk-green{--risk:#31c96b}.risk-orange{--risk:#ff9f1a}.risk-red{--risk:#ef4444}.risk-unknown{--risk:#8a9ba3}
  .visual-routes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.visual-route{border-left:5px solid var(--risk);border-radius:8px;background:rgba(255,255,255,.05);padding:10px}
  .visual-route header{display:flex;justify-content:space-between;gap:7px;align-items:center}.visual-route header span{font-size:10px;border-radius:10px;padding:3px 7px;background:color-mix(in srgb,var(--risk) 18%,transparent)}
  .visual-route p{font-size:11px;margin:7px 0 3px}.visual-route small{opacity:.65}.risk-meter{height:7px;border-radius:5px;background:rgba(255,255,255,.1);overflow:hidden;margin:9px 0}.risk-meter i{display:block;height:100%;background:var(--risk)}
  .visual-timeline,.quality-list{margin-top:14px}.visual-timeline h3,.quality-list h3{font-size:13px;margin:0 0 8px}.timeline-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
  .timeline-list button{display:grid;grid-template-columns:18px 90px 1fr;align-items:center;gap:7px;text-align:left;border:0;border-radius:7px;padding:9px;background:rgba(255,255,255,.055);color:inherit;cursor:pointer}.timeline-list button span{font-size:10px;opacity:.7}
  .quality-list>div{display:grid;grid-template-columns:150px 1fr;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.1);font-size:11px}.quality-list span{opacity:.7}.visual-actions{text-align:right;margin-top:14px}
  @media (max-width:420px){
    .models-grid{grid-template-columns:1fr}
    .router-strip{grid-template-columns:1fr}
  }
  @media (max-width:780px){
    .plugin__content{padding:0 10px 28px}
    button,.button,.route-row button{min-height:44px;touch-action:manipulation}
    .route-row{grid-template-columns:18px minmax(0,1fr) 44px 44px;gap:8px;padding:9px 0}
    .analysis-overlay{inset:44px 0 0;padding:0}.analysis-window{border-radius:0;border-left:0;border-right:0;padding:12px;overscroll-behavior:contain}
    .analysis-head{position:sticky;top:-12px;z-index:4;background:#102632;padding-top:12px}
    .analysis-head button{width:44px;height:44px}
    .analysis-summary{grid-template-columns:1fr}.analysis-columns{grid-template-columns:1fr}
    .visual-routes{grid-template-columns:1fr 1fr}.timeline-list{grid-template-columns:1fr}
    .analysis-table-scroll{-webkit-overflow-scrolling:touch;scrollbar-width:thin}
    .analysis-table th:first-child,.analysis-table td:first-child{position:sticky;left:0;z-index:2;background:#17313d}
    .full-weather-head{align-items:stretch;flex-direction:column}.full-weather-head button{width:100%}
    .timeline-list button{min-height:52px;grid-template-columns:18px 100px 1fr}
  }
  @media (max-width:480px){
    .main-actions,.visual-routes{grid-template-columns:1fr}.quality-list>div{grid-template-columns:1fr}
    .topline{align-items:stretch;flex-direction:column}.topline .button,.import{width:100%;text-align:center}
    .models-grid{grid-template-columns:1fr}.model-box{padding:9px}.model-box strong,.model-box span{font-size:12px}
    .analysis-head strong{font-size:16px}.analysis-section{padding:8px}
    .wind-row{grid-template-columns:78px 1fr 48px;gap:6px}
    .timeline-list button{grid-template-columns:18px 1fr}.timeline-list button span{grid-column:2}
  }
</style>
