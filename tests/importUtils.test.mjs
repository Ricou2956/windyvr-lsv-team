import assert from 'node:assert/strict';
import { buildImportMessage, selectFilesForImport } from '../src/importUtils.js';

const files = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
assert.deepEqual(selectFilesForImport(files, 4, 6), { accepted: files.slice(0, 2), ignoredCount: 1 });
assert.deepEqual(selectFilesForImport(files, 6, 6), { accepted: [], ignoredCount: 3 });

assert.equal(
  buildImportMessage({
    warnings: ['a.csv: 2 position(s) invalide(s) écartée(s) à l’import.'],
    errors: ['b.gpx: GPX XML invalide.'],
    ignoredCount: 1,
    maxRoutes: 6,
  }),
  'a.csv: 2 position(s) invalide(s) écartée(s) à l’import.\nb.gpx: GPX XML invalide.\n1 fichier(s) ignoré(s) : limite de 6 routes atteinte.'
);
assert.equal(buildImportMessage({}), '');
console.log('import utilities tests: OK');
