import assert from 'node:assert/strict';
import fs from 'node:fs';

const plugin = fs.readFileSync(new URL('../src/plugin.svelte', import.meta.url), 'utf8');
const rollup = fs.readFileSync(new URL('../rollup.config.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

assert.ok(!rollup.includes('onwarn: () => {}'), 'Rollup ne doit plus supprimer tous les avertissements');
assert.ok(!plugin.includes('function routeSummary('), 'Le helper routeSummary mort doit être supprimé');
assert.ok(plugin.includes('<th>Fichier</th>'));
assert.ok(plugin.includes('<th>Fenêtre analysée</th>'));
assert.ok(plugin.includes('route.summary = summarizeRoute(route)'));

for (const dep of [
  'rollup', 'rollup-plugin-svelte', 'rollup-plugin-serve',
  '@rollup/plugin-node-resolve', '@rollup/plugin-commonjs', '@rollup/plugin-terser', 'svelte',
]) {
  assert.ok(pkg.devDependencies?.[dep], `devDependency manquante: ${dep}`);
}
console.log('maintenance tests: OK');
