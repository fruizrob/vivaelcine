import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filmCatalogue } from '../../../../scripts/import-tmdb.mjs';
import { sourceFingerprint, validateRegistry } from '../../../../scripts/film-identity.mjs';

// Read-only guard against silently replaying only the previously covered subset.
export function auditCoverage({ catalogue, coverage, snapshot, registry }) {
  validateRegistry(registry);
  const errors = [];
  const rows = new Map();
  const statuses = new Set(['matched', 'unmatched', 'ambiguous', 'needs_review', 'unannounced']);
  const owners = new Map(registry.films.flatMap(record => record.keys.map(key => [key, record])));
  for (const row of coverage.films) {
    if (rows.has(row.key)) errors.push(`Duplicate coverage: ${row.key}`);
    rows.set(row.key, row);
    if (!catalogue.has(row.key)) errors.push(`Unknown catalogue key: ${row.key}`);
    if (!statuses.has(row.status)) errors.push(`Unknown status: ${row.key}`);
    if (!['matched', 'unannounced'].includes(row.status) && !row.reason) {
      errors.push(`Unresolved reason missing: ${row.key}`);
    }
  }
  for (const [key, film] of catalogue) {
    const row = rows.get(key);
    if (!row) { errors.push(`Missing coverage: ${key}`); continue; }
    const accepted = owners.get(key)?.decisions.find(decision => decision.status === 'accepted');
    if (row.status === 'matched') {
      if (!accepted || accepted.tmdbId !== row.tmdbId) errors.push(`Unbound match: ${key}`);
      if (accepted?.sourceFingerprints[key] !== sourceFingerprint(film)) {
        errors.push(`Stale matched observation: ${key}`);
      }
      if (row.retained) errors.push(`Matched row marked retained: ${key}`);
      if (!snapshot.metadata?.[key]) errors.push(`Missing matched metadata: ${key}`);
    }
    if (row.retained && (!accepted || !['provider_unavailable', 'provider_identity_changed'].includes(row.reason))) {
      errors.push(`Invalid retention: ${key}`);
    }
    const metadata = snapshot.metadata?.[key];
    if (metadata && metadata.tmdbId !== (row.status === 'matched' ? row.tmdbId : accepted?.tmdbId)) {
      errors.push(`Metadata identity mismatch: ${key}`);
    }
    if (row.status === 'matched' && Number.isInteger(row.tmdbYear) && metadata?.year !== row.tmdbYear) {
      errors.push(`TMDB year not applied: ${key}`);
    }
    const poster = snapshot.posters?.[key];
    if (poster && poster.source !== `https://www.themoviedb.org/movie/${accepted?.tmdbId}`) {
      errors.push(`Poster identity mismatch: ${key}`);
    }
  }
  for (const field of ['films', 'posters', 'metadata']) {
    for (const key of Object.keys(snapshot[field] || {})) {
      const row = rows.get(key);
      if (!catalogue.has(key) || !row || (row.status !== 'matched' && !row.retained)) {
        errors.push(`Unverified ${field}: ${key}`);
      }
    }
  }
  const allRows = coverage.films;
  const counts = {
    total: catalogue.size,
    queried: allRows.filter(row => row.status !== 'unannounced').length,
    unannounced: allRows.filter(row => row.status === 'unannounced').length,
    matched: allRows.filter(row => row.status === 'matched').length,
    unmatched: allRows.filter(row => row.status === 'unmatched').length,
    ambiguous: allRows.filter(row => row.status === 'ambiguous').length,
    needsReview: allRows.filter(row => row.status === 'needs_review').length,
    retained: allRows.filter(row => row.retained).length,
    withFestivalHistory: Object.keys(snapshot.films || {}).length,
    appearances: Object.values(snapshot.films || {}).flat().length,
  };
  for (const [field, count] of Object.entries(counts)) {
    if (coverage.coverage[field] !== count || snapshot.coverage[field] !== count) {
      errors.push(`Coverage count mismatch: ${field}`);
    }
  }
  return { ok: errors.length === 0, counts, errors };
}

async function main() {
  if (process.argv.length > 2) throw new Error('Usage: node .agents/skills/import-festival/scripts/check-coverage.mjs');
  const root = new URL('../../../../', import.meta.url);
  const json = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
  const [coverage, snapshot, registry] = await Promise.all([
    json('assets/tmdb/coverage.json'), json('data/tmdb-festival-history.json'), json('data/film-identities.json'),
  ]);
  const result = auditCoverage({ catalogue: filmCatalogue(), coverage, snapshot, registry });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
