import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { filmCatalogue, tmdbClient } from './import-tmdb.mjs';
import { identityDecision, sourceFingerprint, validateRegistry } from './film-identity.mjs';

// Validate the entire batch before returning any mutations. Refresh observations first.
export async function applyFilmReviews(registry, reviews, observations, entries, request) {
  if (reviews.version !== 1 || !Array.isArray(reviews.reviews)) throw new Error('Invalid review export');
  const next = structuredClone(registry);
  const seen = new Set();
  for (const choice of reviews.reviews) {
    const row = observations.rows.find(row => row.key === choice.key);
    const film = entries.get(choice.key);
    const candidate = row?.candidates.find(candidate => candidate.id === choice.tmdbId);
    const key = `${choice.key}::${choice.tmdbId ?? 'film'}`;
    if (seen.has(key)) throw new Error(`Duplicate review: ${key}`);
    seen.add(key);
    if (!film || !row || choice.sourceFingerprint !== sourceFingerprint(film)
      || choice.sourceFingerprint !== row.sourceFingerprint) throw new Error(`Stale catalogue review: ${choice.key}`);
    if (!['accepted', 'rejected', 'unsure', 'no_match'].includes(choice.decision)
      || !choice.reviewedAt || (choice.tmdbId != null && (!candidate
        || choice.candidateFingerprint !== candidate.fingerprint))) throw new Error(`Invalid candidate review: ${key}`);
    let record = next.films.find(record => record.keys.includes(choice.key));
    if (!record) { record = { id: choice.key, keys: [choice.key], decisions: [] }; next.films.push(record); }
    if (['unsure', 'no_match'].includes(choice.decision)) {
      if (choice.tmdbId != null) throw new Error(`Film disposition has a candidate: ${key}`);
      for (const decision of record.decisions) {
        if (decision.status === 'accepted') decision.status = 'needs_review';
      }
      record.review = { status: choice.decision, note: choice.note || '', reviewedAt: choice.reviewedAt };
      continue;
    }
    if (!candidate) throw new Error(`Missing candidate: ${key}`);
    const evidence = choice.supportingEvidence?.length ? choice.supportingEvidence
      : [{ source: choice.evidence || `https://www.themoviedb.org/movie/${choice.tmdbId}`, note: choice.note || 'User reviewed film identity in the comparison queue.' }];
    let decision;
    if (choice.decision === 'accepted') {
      const movie = await request(`movie/${choice.tmdbId}`, { append_to_response: 'credits,release_dates,alternative_titles', language: 'es-ES' });
      const directorIds = movie.credits?.crew.filter(c => c.job === 'Director').map(c => c.id) || [];
      const fingerprint = createHash('sha256').update(JSON.stringify([movie.id, movie.title, movie.original_title || '',
        Number(movie.release_date?.slice(0, 4)) || null, movie.runtime || null, directorIds, movie.imdb_id || null])).digest('hex');
      if (fingerprint !== candidate.fingerprint) throw new Error(`Changed provider observation: ${key}`);
      if (record.decisions.some(d => d.status === 'accepted' && d.tmdbId !== choice.tmdbId)) throw new Error(`Conflicting accepted identity: ${choice.key}`);
      decision = identityDecision(choice.key, film, movie, 'manual', evidence, choice.reviewedAt);
      const previous = record.decisions.find(d => d.tmdbId === choice.tmdbId);
      // Re-reviewing one festival must preserve the other aliases and their evidence.
      decision.sourceFingerprints = { ...previous?.sourceFingerprints, ...decision.sourceFingerprints };
      decision.evidence = [...new Map([...(previous?.evidence || []), ...decision.evidence]
        .map(item => [JSON.stringify(item), item])).values()];
      delete record.review;
    } else decision = { tmdbId: choice.tmdbId, status: 'rejected', decidedAt: choice.reviewedAt, evidence };
    record.decisions = record.decisions.filter(d => d.tmdbId !== choice.tmdbId);
    record.decisions.push(decision);
  }
  validateRegistry(next);
  return next;
}

async function main() {
  const root = new URL('../', import.meta.url);
  if (process.argv.length !== 3) throw new Error('Usage: npm run review:apply -- path/to/decisions.json');
  const load = async path => JSON.parse(await readFile(path, 'utf8'));
  const path = new URL('data/film-identities.json', root);
  const registry = await applyFilmReviews(await load(path), await load(resolve(process.argv[2])),
    await load(new URL('assets/tmdb/review-data.json', root)), filmCatalogue(),
    tmdbClient({ cacheDir: fileURLToPath(new URL('assets/tmdb/responses/', root)), offline: true }));
  await writeFile(`${fileURLToPath(path)}.tmp`, `${JSON.stringify(registry, null, 2)}\n`);
  await rename(`${fileURLToPath(path)}.tmp`, path);
  console.log('Validated reviews applied. Run npm run import:tmdb -- --offline to publish the snapshot.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
