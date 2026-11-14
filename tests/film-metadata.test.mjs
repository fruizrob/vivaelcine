import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyFilmMetadata } from '../film-metadata.js';
import { festivals } from '../data.js';
import { yearOf, durationOf, matches } from '../core.js';

test('accepted TMDB years override catalogue years on cards and separate parts, preserving screening lengths', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../data/tmdb-festival-history.json', import.meta.url)));
  const festival = structuredClone(festivals.find(f => f.id === 'fidocs-2026'));
  const event = festival.events.find(e => e.id === 'fidocs-2026-la-batalla-de-chile-parte-i-ii-y-iii-18-1005');
  const before = structuredClone(event);
  applyFilmMetadata(festival, snapshot.metadata);
  assert.equal(before.year, 1977);
  assert.equal(yearOf(event, festival.films[event.filmId]), 1976);
  assert.equal(durationOf(event, festival.films), before.duration);
  assert.equal(event.yearSource, 'https://www.themoviedb.org/movie/1752899');
  assert.equal(event.start, before.start);
  assert.equal(event.date, before.date);
  assert.equal(festivals.find(f => f.id === festival.id).events.find(e => e.id === event.id).year, 1977);
});

test('programme members use individual identities; missing years and unknown runtimes keep catalogue facts', () => {
  const festival = { id: 'f', films: {
    feature: { title: 'Feature', year: 2026, duration: 94 },
    programme: { year: '2024–2026', components: [{ title: 'Short', year: 2026, duration: 10 }, { title: 'Other', year: 2025 }] },
  }, events: [{ id: 'part', filmId: 'feature', title: 'Separate part', year: 1980, duration: null }] };
  applyFilmMetadata(festival, {
    'f/feature': { tmdbId: 1, year: null },
    'f/programme': { tmdbId: 2, year: 2000 },
    'f/programme/Short': { tmdbId: 3, year: 2024 },
    'f/part': { tmdbId: 4, year: 1979, runtime: 120 },
  });
  assert.equal(festival.films.feature.year, 2026);
  assert.equal(festival.films.programme.year, '2024–2026');
  assert.deepEqual(festival.films.programme.components.map(c => c.year), [2024, 2025]);
  assert.equal(festival.events[0].year, 1979);
  assert.equal(durationOf(festival.events[0], festival.films), null);
});

test('uncertain versions publish no TMDB facts; Wilma uses its accepted ID despite missing provider runtime', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../data/tmdb-festival-history.json', import.meta.url)));
  for (const key of ['fidocs-2026/pensaba-que-te-habias-olvidado-de-escribirme', 'fidocs-2026/por-dentro-somos-color-version-cine-expandido']) {
    assert.equal(snapshot.metadata[key], undefined);
    assert.equal(snapshot.posters[key], undefined);
  }
  assert.equal(snapshot.metadata['sanfic-2026/wilma-quiere-mas'].tmdbId, 1465390);
  assert.equal(snapshot.metadata['sanfic-2026/wilma-quiere-mas'].year, 2025);
});

test('verified film facts preserve local billing, raw inputs and explicit session windows', () => {
  const raw = { id: 'f', films: {
    single: { title: 'Título local', year: 2026, director: 'Alias', duration: 90, countries: 'Chile', synopsis: 'Festival' },
    programme: { title: 'Programa', duration: 120, components: [{ filmId: 'short', title: 'Corto', duration: 12 }] },
  }, events: [{ id: 'single', filmId: 'single', start: 1200 },
    { id: 'discussion', filmId: 'single', start: 1200, duration: 150 },
    { id: 'part', filmId: 'single', title: 'Parte', start: 1200, duration: null }] };
  const festival = applyFilmMetadata(structuredClone(raw), {
    'f/single': { tmdbId: 1, year: 2025, title: 'Provider', originalTitle: 'Original',
      directors: ['Credited Name'], runtime: 95, countries: ['Brazil'], synopsis: 'Provider synopsis' },
    'f/short': { tmdbId: 2, year: null, runtime: 14, directors: [], countries: [], synopsis: '' },
    'f/part': { tmdbId: 3, runtime: 100, directors: ['Part Director'] },
  });
  assert.equal(festival.films.single.title, 'Título local');
  assert.equal(festival.films.single.director, 'Credited Name');
  assert.equal(festival.films.single.originalTitle, 'Original');
  assert.equal(festival.films.single.synopsis, 'Provider synopsis');
  assert.equal(festival.films.single.countries, 'Brazil');
  assert.equal(durationOf(festival.events[0], festival.films), 95);
  assert.equal(durationOf(festival.events[1], festival.films), 150);
  assert.equal(durationOf(festival.events[2], festival.films), null);
  assert.equal(festival.events[2].filmRuntime, 100);
  assert.equal(festival.films.programme.duration, 120);
  assert.equal(festival.films.programme.components[0].duration, 14);
  assert.equal(raw.films.single.duration, 90);
  for (const search of ['Alias', 'Chile']) {
    assert.ok(matches(festival.events[0], festival.films.single, { search, venue: '', section: '' }));
  }
});

test('derived published-part sums use canonical runtimes while explicit windows stay intact', () => {
  const festival = { id: 'f', films: {
    programme: { duration: 105, durationKind: 'sum-published-parts', components: [
      { filmId: 'first', title: 'First', duration: 7 },
      { filmId: 'second', title: 'Second', duration: 98 },
    ] },
  }, events: [{ filmId: 'programme' }, { filmId: 'programme', duration: 120 }] };
  const metadata = { 'f/second': { tmdbId: 1, runtime: 97 } };
  applyFilmMetadata(festival, metadata);
  assert.equal(durationOf(festival.events[0], festival.films), 104);
  assert.equal(durationOf(festival.events[1], festival.films), 120);
  const firstPass = structuredClone(festival);
  applyFilmMetadata(festival, metadata);
  assert.deepEqual(festival, firstPass);
});
