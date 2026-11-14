import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCoverage } from './check-coverage.mjs';
import { identityDecision } from '../../../../scripts/film-identity.mjs';

function fixture() {
  const film = { title: 'A film', director: 'A director', year: 2026, duration: 90 };
  const movie = { id: 42, imdb_id: 'tt1234567', credits: { crew: [{ job: 'Director', id: 7 }] } };
  const key = 'edition/a-film';
  const counts = { total: 1, queried: 1, unannounced: 0, matched: 1, unmatched: 0,
    ambiguous: 0, needsReview: 0, retained: 0, withFestivalHistory: 0, appearances: 0 };
  return {
    catalogue: new Map([[key, film]]),
    coverage: { coverage: { ...counts }, films: [{ key, status: 'matched', tmdbId: 42, tmdbYear: 2025 }] },
    snapshot: { coverage: { ...counts }, films: {}, posters: {}, metadata: { [key]: { tmdbId: 42, year: 2025 } } },
    registry: { version: 1, films: [{ id: key, keys: [key], decisions: [identityDecision(key, film, movie,
      'manual', [{ source: 'https://example.org/film', note: 'Agent-verified primary evidence.' }])] }] },
  };
}

test('accepts a verified TMDB year correction without rewriting source facts', () => {
  assert.equal(auditCoverage(fixture()).ok, true);
});

test('detects omitted catalogue films even when published totals agree with the subset', () => {
  const input = fixture();
  input.catalogue.set('edition/shorts/another-film', { title: 'Another film' });
  const result = auditCoverage(input);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('Missing coverage: edition/shorts/another-film'));
});

test('rejects guessed enrichment for an unresolved film', () => {
  const input = fixture();
  Object.assign(input.coverage.films[0], { status: 'unmatched', tmdbId: null, reason: 'no_accepted_candidate' });
  input.snapshot.posters['edition/a-film'] = { source: 'https://www.themoviedb.org/movie/42' };
  assert.ok(auditCoverage(input).errors.includes('Unverified posters: edition/a-film'));
});

test('detects changed source identities, while schedule-only changes preserve the match', () => {
  const input = fixture();
  const film = input.catalogue.get('edition/a-film');
  film.start = 900;
  assert.equal(auditCoverage(input).ok, true);
  film.year = 2027;
  assert.ok(auditCoverage(input).errors.includes('Stale matched observation: edition/a-film'));
});

test('accepts cross-festival aliases without requiring separate TMDB ownership', () => {
  const input = fixture();
  const key = 'another-edition/same-film';
  const record = input.registry.films[0];
  record.keys.push(key);
  record.decisions[0].sourceFingerprints[key] = record.decisions[0].sourceFingerprints['edition/a-film'];
  input.catalogue.set(key, input.catalogue.get('edition/a-film'));
  input.coverage.films.push({ ...input.coverage.films[0], key });
  input.snapshot.metadata[key] = { tmdbId: 42, year: 2025 };
  for (const counts of [input.coverage.coverage, input.snapshot.coverage]) {
    Object.assign(counts, { total: 2, queried: 2, matched: 2 });
  }
  assert.equal(auditCoverage(input).ok, true);
});

test('permits explicitly retained last-good metadata during provider failure', () => {
  const input = fixture();
  Object.assign(input.coverage.films[0], { status: 'needs_review', tmdbId: null,
    retained: true, reason: 'provider_unavailable' });
  for (const counts of [input.coverage.coverage, input.snapshot.coverage]) {
    Object.assign(counts, { matched: 0, needsReview: 1, retained: 1 });
  }
  assert.equal(auditCoverage(input).ok, true);
});

test('rejects mismatched published years and orphaned snapshot keys', () => {
  const input = fixture();
  input.snapshot.metadata['edition/a-film'].year = 2026;
  input.snapshot.metadata['removed-edition/old-film'] = { tmdbId: 42, year: 2025 };
  const result = auditCoverage(input);
  assert.ok(result.errors.includes('TMDB year not applied: edition/a-film'));
  assert.ok(result.errors.includes('Unverified metadata: removed-edition/old-film'));
});
