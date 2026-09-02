import assert from 'node:assert/strict';
import { formatLocalDateTime } from '../src/dateTime.js';

const summer = formatLocalDateTime('2026-09-02T20:20:00Z', 'Europe/Paris');
const winter = formatLocalDateTime('2026-01-02T20:20:00Z', 'Europe/Paris');

assert.match(summer, /22:20/);
assert.match(summer, /(?:UTC|GMT)\+2/);
assert.match(winter, /21:20/);
assert.match(winter, /(?:UTC|GMT)\+1/);
console.log('local date/time tests: OK');
