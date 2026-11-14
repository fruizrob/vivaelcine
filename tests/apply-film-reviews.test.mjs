import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyFilmReviews } from '../scripts/apply-film-reviews.mjs';
import { filmCatalogue, tmdbClient } from '../scripts/import-tmdb.mjs';

const load = async path => JSON.parse(await readFile(new URL(path, import.meta.url)));

test('reviewed batch replays idempotently offline, retaining evidence, explicit rejections and uncertain versions', async () => {
  const registry = await load('../data/film-identities.json');
  const reviews = await load('../data/film-review-decisions.json');
  const observations = await load('../assets/tmdb/review-data.json');
  const request = tmdbClient({ cacheDir: new URL('../assets/tmdb/responses/', import.meta.url).pathname, offline: true });
  // Replay the historical batch against its saved catalogue observations. New
  // source facts (such as the Borges part runtimes) correctly invalidate it today.
  const reviewedCatalogue = new Map(observations.rows.map(row => [row.key, row]));
  const result = await applyFilmReviews(registry, reviews, observations, reviewedCatalogue, request);
  // Order is immaterial; decisions are replaced, never appended twice.
  const sorted = registry => registry.films.map(r => ({ ...r, decisions: [...r.decisions].sort((a, b) => a.tmdbId - b.tmdbId) }));
  assert.deepEqual(sorted(result), sorted(registry));
  assert.equal(reviews.reviews.filter(r => r.decision === 'accepted').length, 51);
  assert.equal(result.films.flatMap(r => r.decisions).filter(d => d.status === 'accepted').length, 108);
  for (const item of reviews.pending) {
    const record = result.films.find(r => r.keys.includes(item.key));
    assert.equal(record.review.status, 'unsure');
    assert.ok(!record.decisions.some(d => d.status === 'accepted'));
  }
});

test('stale catalogue/candidate observations and duplicate decisions reject the whole batch without mutations', async () => {
  const registry = await load('../data/film-identities.json');
  const before = structuredClone(registry);
  const reviews = await load('../data/film-review-decisions.json');
  const observations = await load('../assets/tmdb/review-data.json');
  const choice = reviews.reviews.find(r => r.decision === 'accepted');
  const request = tmdbClient({ cacheDir: new URL('../assets/tmdb/responses/', import.meta.url).pathname, offline: true });
  await assert.rejects(applyFilmReviews(registry, { version: 1, reviews: [{ ...choice, sourceFingerprint: 'stale' }] }, observations, filmCatalogue(), request), /Stale catalogue/);
  await assert.rejects(applyFilmReviews(registry, { version: 1, reviews: [{ ...choice, candidateFingerprint: 'stale' }] }, observations, filmCatalogue(), request), /Invalid candidate/);
  await assert.rejects(applyFilmReviews(registry, { version: 1, reviews: [choice, choice] }, observations, filmCatalogue(), request), /Duplicate review/);
  await assert.rejects(applyFilmReviews(registry, { version: 1, reviews: [choice] }, observations, filmCatalogue(), async (...args) => ({ ...await request(...args), runtime: 999 })), /Changed provider observation/);
  assert.deepEqual(registry, before);
});

test('newly published Borges runtimes invalidate the historical review batch', async () => {
  const registry = await load('../data/film-identities.json');
  const reviews = await load('../data/film-review-decisions.json');
  const observations = await load('../assets/tmdb/review-data.json');
  const choice = reviews.reviews.find(row => row.key === 'fidocs-2026/fidocs-2026-biografia-de-jorge-luis-borges-14-0660');
  const catalogue = filmCatalogue();
  assert.equal(catalogue.get(choice.key).duration, 130);
  await assert.rejects(applyFilmReviews(registry, { version: 1, reviews: [choice] }, observations, catalogue,
    async () => assert.fail('Stale source facts must fail before a provider request')), /Stale catalogue review/);
});

test('deferring a previously accepted film suspends its identity until a new explicit acceptance', async () => {
  const registry = await load('../data/film-identities.json');
  const observations = await load('../assets/tmdb/review-data.json');
  const reviews = await load('../data/film-review-decisions.json');
  const choice = reviews.reviews.find(r => r.decision === 'accepted');
  const request = tmdbClient({ cacheDir: new URL('../assets/tmdb/responses/', import.meta.url).pathname, offline: true });
  const pending = { ...choice, tmdbId: null, candidateFingerprint: null, decision: 'unsure' };
  const deferred = await applyFilmReviews(registry, { version: 1, reviews: [pending] }, observations, filmCatalogue(), request);
  const record = deferred.films.find(r => r.keys.includes(choice.key));
  assert.equal(record.review.status, 'unsure');
  assert.ok(!record.decisions.some(d => d.status === 'accepted'));
  const restored = await applyFilmReviews(deferred, { version: 1, reviews: [choice] }, observations, filmCatalogue(), request);
  assert.equal(restored.films.find(r => r.id === record.id).decisions.find(d => d.status === 'accepted').tmdbId, choice.tmdbId);
});
