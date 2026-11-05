import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { festivals } from '../data.js';
import { applyYears } from '../scripts/import-film-years.mjs';

const evidence = JSON.parse(readFileSync(new URL('../assets/tmdb-film-years.json', import.meta.url)));
const film = { title: 'Una película', director: 'Ana Pérez', duration: 90 };
const record = {
  key: 'festival/film', id: 123, title: 'Una película', originalTitle: 'Una película',
  releaseDate: '2024-10-12', runtime: 90, directors: ['Ana Pérez'],
};
const data = [{ id: 'festival', films: { film } }];

test('curated TMDB identities reproduce every published year without changing the datasets', () => {
  assert.deepEqual(applyYears(festivals, evidence.records), festivals);
  assert.equal(new Set(evidence.records.map(record => record.key)).size, evidence.records.length);
  for (const entry of evidence.records) {
    const [festivalId, filmId, component] = entry.key.split('/');
    const parent = festivals.find(f => f.id === festivalId).films[filmId];
    const film = component ? parent.components.find(f => f.title === component) : parent;
    assert.equal(film.year, Number(entry.releaseDate.slice(0, 4)), entry.key);
    assert.equal(film.yearSource, `https://www.themoviedb.org/movie/${entry.id}`, entry.key);
  }
});

test('an approved film gains a sourced year without changing the input, schedule or runtime', () => {
  const original = structuredClone(data);
  const updated = applyYears(data, [record]);
  assert.deepEqual(data, original);
  assert.deepEqual(updated[0].films.film, { ...film, year: 2024, yearSource: 'https://www.themoviedb.org/movie/123' });
});

test('same-title films, different versions and missing dates cannot supply a year', () => {
  for (const change of [
    { directors: ['Otra persona'] }, { title: 'Otra película', originalTitle: '' },
    { runtime: 45 }, { runtime: 0 }, { releaseDate: '' }, { releaseDate: '2024' },
    { releaseDate: '2025-02-29' }, { releaseDate: '2024-13-01' },
  ]) assert.throws(() => applyYears(data, [{ ...record, ...change }]), /Unverified film year/);
});

test('director aliases require an explicit reviewed identity; normalization alone only handles accents and punctuation', () => {
  const variant = [{ id: 'festival', films: { film: { ...film, director: 'Ana María Pérez' } } }];
  assert.throws(() => applyYears(variant, [record]), /Unverified film year/);
  assert.equal(applyYears(variant, [{ ...record, directorAliases: { 'Ana María Pérez': 'Ana Pérez' } }])[0].films.film.year, 2024);
  assert.equal(applyYears(data, [{ ...record, title: 'UNA PELICULA!', directors: ['Ana Perez'] }])[0].films.film.year, 2024);
});

test('a failing record prevents the whole import, preserving curated years and all original data', () => {
  const original = structuredClone(data);
  assert.throws(() => applyYears(data, [record, { ...record, key: 'festival/missing' }]), /Unknown film/);
  assert.deepEqual(data, original);
  const curated = [{ id: 'festival', films: { film: { ...film, year: 2023, yearSource: 'https://festival.example/film' } } }];
  assert.throws(() => applyYears(curated, [record]), /conflicts with a curated source/);
  const unchanged = [{ id: 'festival', films: { film: { ...film, year: 2024, yearSource: 'https://festival.example/film' } } }];
  assert.deepEqual(applyYears(unchanged, [record]), unchanged);
  assert.throws(() => applyYears(data, [record, record]), /Duplicate film/);
});

test('programmes retain individual years, including shorts also listed as standalone films', () => {
  const programme = { title: 'Programa', components: [{ filmId: 'film', ...film }] };
  const input = [{ id: 'festival', films: { film, programme } }];
  const updated = applyYears(input, [record]);
  assert.equal(updated[0].films.programme.year, undefined);
  assert.equal(updated[0].films.programme.components[0].year, 2024);
  assert.throws(() => applyYears(input, [{ ...record, key: 'festival/programme' }]), /Unverified film year/);
  const component = applyYears(input, [{ ...record, key: 'festival/programme/Una película' }]);
  assert.equal(component[0].films.programme.components[0].year, 2024);
  assert.equal(component[0].films.programme.year, undefined);
});

test('unresolved TMDB records stay blank instead of inheriting another film or festival year', () => {
  for (const record of evidence.unresolved) {
    const [festivalId, filmId, component] = record.key.split('/');
    const parent = festivals.find(f => f.id === festivalId).films[filmId];
    const film = component ? parent.components.find(f => f.title === component) : parent;
    assert.equal(film.year, undefined, record.key);
  }
});

test('authentication failure preserves published data and never prints the credential', () => {
  const paths = ['data/sanfic-2026.js', 'data/fidocs-2026.js', 'assets/tmdb-film-years.json']
    .map(path => new URL(`../${path}`, import.meta.url));
  const before = paths.map(path => readFileSync(path, 'utf8'));
  const token = 'test-token-never-send';
  const stub = 'globalThis.fetch = async () => ({ ok: false, status: 401 });';
  const result = spawnSync(process.execPath, [
    '--import', `data:text/javascript,${encodeURIComponent(stub)}`,
    new URL('../scripts/import-film-years.mjs', import.meta.url).pathname,
  ], { encoding: 'utf8', env: { ...process.env, TMDB_READ_ACCESS_TOKEN: token } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /TMDB HTTP 401/);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(token));
  assert.deepEqual(paths.map(path => readFileSync(path, 'utf8')), before);
});
