import assert from 'node:assert/strict';
import fs from 'node:fs';

const plugin = fs.readFileSync(new URL('../src/plugin.svelte', import.meta.url), 'utf8');
assert.ok(plugin.includes('route-source-select'), 'La source détectée doit être modifiable dans l’interface');
assert.ok(plugin.includes('routeGeometryBetween(route.points'), 'Le calque de risque doit suivre la géométrie réelle');
assert.ok(plugin.includes('Compléter l’analyse'), 'Une analyse partielle doit pouvoir être complétée');
assert.ok(plugin.includes('pendingAnalysisRouteIds(routes, routeAnalysis, forceAll)'), 'Le recalcul doit cibler les routes manquantes');
assert.ok(!plugin.includes('invalidateFullAnalysis()'), 'Import/suppression ne doit plus invalider toute l’analyse');
console.log('remaining audit tests: OK');
