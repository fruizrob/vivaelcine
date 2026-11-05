import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyFilmMetadata } from '../film-metadata.js';
import { festivals } from '../data.js';
import { yearOf, durationOf } from '../core.js';

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
