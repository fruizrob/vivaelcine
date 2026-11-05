import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveFilmIdentity, sourceFingerprint, validateRegistry } from '../scripts/film-identity.mjs';
import { collectFilms, filmCatalogue, tmdbClient } from '../scripts/import-tmdb.mjs';
import { festivals } from '../data.js';
import { renderFilmPoster } from '../film-poster.js';
import { renderFestivalHistory } from '../festival-history.js';
import { yearOf, durationOf } from '../core.js';

const key = 'festival/film';
const film = { title: 'A film', director: 'A Director', year: 2025, duration: 100 };
const movie = (id = 1, extra = {}) => ({
  id, title: 'A film', original_title: 'A film', release_date: '2025-05-01', runtime: 100,
  imdb_id: 'tt1234567', credits: { crew: [{ id: 10, job: 'Director', name: 'A Director' }] },
  release_dates: { results: [] }, ...extra,
});
const binding = (status = 'accepted', extra = {}) => ({
  tmdbId: 1, status, method: 'manual', decidedAt: '2026-11-05',
  evidence: [{ source: 'https://example.org/film', note: 'Verified work and director' }],
  sourceFingerprints: { [key]: sourceFingerprint(film) },
  provider: { imdbId: 'tt1234567', directorIds: [10] }, ...extra,
});
const registry = (...decisions) => ({ version: 1, films: [{ id: key, keys: [key], decisions }] });
const resolve = (request, extra = {}) => resolveFilmIdentity(film, { key, request, ...extra });

test('accepted identity refreshes by ID despite metadata discrepancies', async () => {
  const result = await resolve(async path => {
    assert.equal(path, 'movie/1');
    return movie(1, { title: 'Localized', original_title: 'Another display title',
      release_date: '2026-01-01', runtime: 110,
      credits: { crew: [{ id: 10, job: 'Director', name: 'Director A' }] } });
  }, { registry: registry(binding()) });
  assert.equal(result.status, 'matched');
  assert.equal(result.movie.id, 1);
  assert.deepEqual(result.discrepancies, ['title', 'director', 'year', 'runtime']);
});

test('changed source identity, contradictory provider and deleted IDs require review without rediscovery', async () => {
  const saved = registry(binding());
  let calls = 0;
  const changed = await resolveFilmIdentity({ ...film, director: 'Someone Else' }, {
    key, registry: saved, request: () => { calls++; throw new Error('Must not search'); },
  });
  assert.equal(changed.reason, 'source_identity_changed');
  assert.equal(calls, 0);
  for (const data of [movie(2), movie(1, { imdb_id: 'tt9999999' }), movie(1, {
    credits: { crew: [{ id: 99, job: 'Director', name: 'Someone Else' }] },
  })]) {
    const result = await resolve(async path => { assert.equal(path, 'movie/1'); return data; }, { registry: saved });
    assert.equal(result.status, 'needs_review');
  }
  const deleted = await resolve(async path => {
    assert.equal(path, 'movie/1');
    throw Object.assign(new Error('Not found'), { status: 404 });
  }, { registry: saved });
  assert.equal(deleted.reason, 'provider_unavailable');
  const missing = await resolve(async () => movie(1, { runtime: 0, imdb_id: null, credits: { crew: [] } }), { registry: saved });
  assert.equal(missing.status, 'matched');
});

test('fallback searches without year even when the first pass returned unrelated hits', async () => {
  const queries = [];
  const result = await resolve(async (path, params) => {
    if (path === 'search/movie') {
      queries.push(params);
      return { results: [{ id: params.year ? 2 : 1 }], total_pages: 1 };
    }
    return movie(Number(path.split('/')[1]), path === 'movie/2'
      ? { credits: { crew: [{ id: 99, job: 'Director', name: 'Wrong Director' }] } } : {});
  });
  assert.equal(result.status, 'matched');
  assert.equal(result.method, 'strict_rule_v1');
  assert.deepEqual(queries.map(q => q.year), ['2025', undefined]);
});

test('whole pages and bounded pagination find candidates beyond the previous top five', async () => {
  const visited = [];
  const result = await resolve(async (path, params) => {
    if (path === 'search/movie') return { results: params.page === 2 ? [{ id: 1 }]
      : [2, 3, 4, 5, 6, 7].map(id => ({ id })), total_pages: 2 };
    const id = Number(path.split('/')[1]); visited.push(id);
    return movie(id, id === 1 ? {} : { title: 'Wrong', original_title: 'Wrong' });
  });
  assert.equal(result.status, 'matched');
  assert.ok(visited.includes(7));
  assert.ok(visited.includes(1));
  const truncated = await resolve(async path => path === 'search/movie'
    ? { results: [{ id: 1 }, { id: 2 }], total_pages: 3 } : movie(Number(path.split('/')[1])), { maxCandidates: 1 });
  assert.equal(truncated.status, 'needs_review');
  assert.equal(truncated.search.truncated, true);
});

test('persisted rejected and review decisions cannot be automatically reaccepted', async () => {
  for (const status of ['rejected', 'needs_review']) {
    const result = await resolve(async path => path === 'search/movie' ? { results: [{ id: 1 }] } : movie(), {
      registry: registry(binding(status)),
    });
    assert.notEqual(result.status, 'matched');
  }
});

test('verified external IMDb lookup distinguishes movie results, conflicts and unknown years', async () => {
  const sourced = { ...film, externalIds: { imdb: { id: 'tt1234567', source: 'https://example.org/film' } } };
  const result = await resolveFilmIdentity(sourced, { key, request: async (path, params) => {
    if (path.startsWith('find/')) {
      assert.equal(params.external_source, 'imdb_id');
      return { movie_results: [{ id: 1 }], tv_results: [{ id: 2 }] };
    }
    assert.equal(path, 'movie/1');
    return movie(1, { release_date: '2026-01-01' });
  } });
  assert.equal(result.method, 'external_id');
  assert.equal(result.status, 'matched');
  const conflict = await resolveFilmIdentity(sourced, { key, request: async path => path.startsWith('find/')
    ? { movie_results: [{ id: 1 }] } : movie(1, { runtime: 300 }) });
  assert.equal(conflict.status, 'needs_review');
});

test('registry rejects conflicting ownership and supports explicit cross-festival aliases', async () => {
  const shared = registry(binding());
  shared.films[0].keys.push('other-festival/same-film');
  shared.films[0].decisions[0].sourceFingerprints['other-festival/same-film'] = sourceFingerprint(film);
  validateRegistry(shared);
  const result = await resolveFilmIdentity(film, { key: 'other-festival/same-film', registry: shared, request: async () => movie() });
  assert.equal(result.filmId, key);
  const duplicate = structuredClone(shared);
  duplicate.films.push({ id: 'another-part', keys: ['another-part'], decisions: [binding()] });
  assert.throws(() => validateRegistry(duplicate), /owned|duplicate/i);
});

test('imports persist automatic matches and reuse one request across repeated identities', async () => {
  const first = await collectFilms(new Map([[key, film]]), async path => path === 'search/movie'
    ? { results: [{ id: 1 }] } : movie());
  assert.equal(first.identities.films[0].decisions[0].method, 'strict_rule_v1');
  const calls = [];
  const second = await collectFilms(new Map([[key, film]]), async path => {
    calls.push(path); return movie();
  }, () => {}, { registry: first.identities });
  assert.deepEqual(calls, ['movie/1']);
  assert.deepEqual(second.identities, first.identities);
  const alias = 'another-festival/film';
  first.identities.films[0].keys.push(alias);
  first.identities.films[0].decisions[0].sourceFingerprints[alias] = sourceFingerprint(film);
  let fetched = 0;
  const shared = await collectFilms(new Map([[key, film], [alias, film]]), async () => {
    fetched++; return movie(1, { poster_path: '/shared.jpg' });
  }, () => {}, { registry: first.identities });
  assert.equal(fetched, 1);
  assert.deepEqual(shared.posters[key], shared.posters[alias]);
});

test('same-title wrong directors and identical passing duplicates stay rejected or ambiguous', async () => {
  const wrong = await resolve(async path => path === 'search/movie' ? { results: [{ id: 1 }] }
    : movie(1, { credits: { crew: [{ id: 99, job: 'Director', name: 'Wrong Director' }] } }));
  assert.equal(wrong.status, 'unmatched');
  const ambiguous = await resolve(async path => path === 'search/movie' ? { results: [{ id: 1 }, { id: 2 }] }
    : movie(Number(path.split('/')[1])));
  assert.equal(ambiguous.status, 'ambiguous');
});

test('unavailable accepted identities retain published metadata and abort transient failures', async () => {
  const previous = { films: { [key]: [{ festival: 'Cannes', date: '2025-05-01' }] },
    posters: { [key]: { path: '/saved.jpg', source: 'https://www.themoviedb.org/movie/1' } } };
  const result = await collectFilms(new Map([[key, film]]), async () => {
    throw Object.assign(new Error('Not found'), { status: 404 });
  }, () => {}, { registry: registry(binding()), previous });
  assert.equal(result.report[0].retained, true);
  assert.deepEqual(result.films, previous.films);
  assert.deepEqual(result.posters, previous.posters);
  const replay = await collectFilms(new Map([[key, film]]), () => { throw new Error('Suspended binding must wait for review'); },
    () => {}, { registry: result.identities, previous });
  assert.equal(replay.report[0].reason, 'provider_unavailable');
  assert.deepEqual(replay.posters, previous.posters);
  await assert.rejects(collectFilms(new Map([[key, film]]), async () => {
    throw Object.assign(new Error('Service unavailable'), { status: 503 });
  }, () => {}, { registry: registry(binding()), previous }), /Service unavailable/);
});

test('issue #10 verified bindings publish posters and histories without changing schedule years or durations', async () => {
  const identities = JSON.parse(await readFile(new URL('../data/film-identities.json', import.meta.url)));
  const catalogue = filmCatalogue();
  const keys = ['silent-friend', 'minotaur', 'the-fence'].map(id => `sanfic-2026/${id}`);
  const request = tmdbClient({ cacheDir: new URL('../assets/tmdb/responses/', import.meta.url).pathname, offline: true });
  const entries = new Map(keys.map(key => [key, catalogue.get(key)]));
  const result = await collectFilms(entries, request, () => {}, { registry: identities });
  assert.equal(result.coverage.matched, 3);
  assert.equal(result.coverage.appearances, 15);
  const sanfic = { ...festivals[0], filmPosters: result.posters, festivalHistory: result.films };
  for (const [i, key] of keys.entries()) {
    const event = sanfic.events.find(e => `${sanfic.id}/${e.filmId}` === key);
    assert.match(renderFilmPoster(sanfic, event), /image.tmdb.org/);
    assert.match(renderFestivalHistory(sanfic, event), /festival-history-list/);
    assert.equal(yearOf(event, sanfic.films[event.filmId]), [2025, 2026, 2025][i]);
    assert.equal(durationOf(event, sanfic.films), [145, 140, 109][i]);
    assert.equal(result.report[i].method, 'manual');
  }
});
