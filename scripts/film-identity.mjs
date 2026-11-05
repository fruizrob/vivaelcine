import { createHash } from 'node:crypto';

export const normalize = value => (value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export const titlesOf = film => [film.title, film.originalTitle, film.alias, ...(film.aliases || [])].filter(Boolean);
const directorIds = movie => movie.credits.crew.filter(c => c.job === 'Director' && Number.isInteger(c.id)).map(c => c.id).sort((a, b) => a - b);
const detailsParams = { append_to_response: 'credits,release_dates,alternative_titles', language: 'es-ES' };

export function sourceFingerprint(film) {
  // Identity input changes require review; unrelated schedule/ticket changes do not.
  const identity = [normalize(film.title), normalize(film.originalTitle),
    (film.director || '').split(/,\s*/).map(normalize).sort(), film.year ?? null, film.duration ?? null];
  return createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}

export function matchProblems(film, candidate) {
  const titles = [candidate.title, candidate.original_title, ...(candidate.alternative_titles?.titles || []).map(item => item.title)].map(normalize);
  const directors = (candidate.credits?.crew || []).filter(item => item.job === 'Director').map(item => normalize(item.name));
  return [
    ...(!titlesOf(film).some(title => titles.includes(normalize(title))) ? ['title'] : []),
    ...(!film.director || !film.director.split(/,\s*/).every(name => directors.includes(normalize(name))) ? ['director'] : []),
    ...(Number.isInteger(film.year) && Number(candidate.release_date?.slice(0, 4)) !== film.year ? ['year'] : []),
    ...(!film.duration || !candidate.runtime || Math.abs(film.duration - candidate.runtime) > 3 ? ['runtime'] : []),
  ];
}

export function validateRegistry(registry) {
  if (registry.version !== 1 || !Array.isArray(registry.films)) throw new Error('Invalid film identity registry');
  const keys = new Set(), ids = new Set(), owners = new Map();
  for (const film of registry.films) {
    if (!film.id || ids.has(film.id) || !film.keys?.length || !Array.isArray(film.decisions)) throw new Error('Invalid or duplicate film identity');
    ids.add(film.id);
    for (const key of film.keys) {
      if (keys.has(key)) throw new Error(`Duplicate catalogue identity: ${key}`);
      keys.add(key);
    }
    const candidates = new Set();
    let accepted = 0;
    for (const decision of film.decisions) {
      if (!Number.isInteger(decision.tmdbId) || decision.tmdbId <= 0 || candidates.has(decision.tmdbId)
        || !['accepted', 'rejected', 'needs_review'].includes(decision.status)) throw new Error(`Invalid identity decision: ${film.id}`);
      candidates.add(decision.tmdbId);
      if (decision.status !== 'accepted') continue;
      if (++accepted > 1) throw new Error(`Multiple accepted identities: ${film.id}`);
      if (owners.has(decision.tmdbId)) throw new Error(`TMDB ${decision.tmdbId} already owned by ${owners.get(decision.tmdbId)}`);
      owners.set(decision.tmdbId, film.id);
      if (!['manual', 'strict_rule_v1', 'external_id'].includes(decision.method) || !decision.decidedAt
        || !decision.evidence?.length || !Array.isArray(decision.provider?.directorIds)
        || film.keys.some(key => !decision.sourceFingerprints?.[key])) throw new Error(`Missing identity evidence: ${film.id}`);
    }
  }
}

export function identityDecision(key, film, movie, method, evidence, decidedAt = new Date().toISOString()) {
  return {
    tmdbId: movie.id, status: 'accepted', method, decidedAt, evidence,
    sourceFingerprints: { [key]: sourceFingerprint(film) },
    provider: { imdbId: movie.imdb_id || null, directorIds: directorIds(movie) },
  };
}

export async function resolveFilmIdentity(film, {
  key, registry = { version: 1, films: [] }, request, maxPages = 2, maxCandidates = 40,
}) {
  validateRegistry(registry);
  if (![maxPages, maxCandidates].every(value => Number.isInteger(value) && value > 0)) throw new Error('Invalid identity search budget');
  const record = registry.films.find(item => item.keys.includes(key));
  const decisions = record?.decisions || [];
  const accepted = decisions.find(d => d.status === 'accepted');
  const checked = new Map();
  const search = { queries: [], truncated: false, maxPages, maxCandidates };
  const result = (status, extra = {}) => ({ status, filmId: record?.id || key, checked: [...checked.values()], search, ...extra });
  const details = async id => {
    try {
      const movie = await request(`movie/${id}`, detailsParams);
      if (movie.id !== id) return null;
      if (!Array.isArray(movie.credits?.crew) || !Array.isArray(movie.release_dates?.results)) throw new Error(`Invalid TMDB details: ${id}`);
      return movie;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  };
  const ownDecision = id => decisions.find(d => d.tmdbId === id);
  const ownedElsewhere = id => registry.films.some(f => f.id !== record?.id && f.decisions.some(d => d.status === 'accepted' && d.tmdbId === id));
  const accept = (movie, method, evidence) => {
    if (record?.review || decisions.some(d => d.status === 'needs_review')) return result('needs_review', { reason: 'review_pending' });
    if (ownedElsewhere(movie.id)) return result('needs_review', { reason: 'provider_id_in_use' });
    return result('matched', { movie, method, discrepancies: matchProblems(film, movie),
      decision: identityDecision(key, film, movie, method, evidence) });
  };

  if (accepted) {
    if (accepted.sourceFingerprints[key] !== sourceFingerprint(film)) return result('needs_review', { reason: 'source_identity_changed' });
    if (accepted.reviewRequired) return result('needs_review', { reason: accepted.reviewRequired });
    const movie = await details(accepted.tmdbId);
    if (!movie) return result('needs_review', { reason: 'provider_unavailable' });
    checked.set(movie.id, { movie, problems: matchProblems(film, movie) });
    const currentIds = directorIds(movie), previous = accepted.provider;
    if ((previous?.imdbId && movie.imdb_id && previous.imdbId !== movie.imdb_id)
      || (currentIds.length && previous?.directorIds?.some(id => !currentIds.includes(id)))) {
      return result('needs_review', { reason: 'provider_identity_changed' });
    }
    return result('matched', { movie, method: accepted.method, discrepancies: matchProblems(film, movie) });
  }

  const imdb = film.externalIds?.imdb;
  if (/^tt\d+$/.test(imdb?.id || '') && /^https?:\/\//.test(imdb.source || '')) {
    const found = await request(`find/${imdb.id}`, { external_source: 'imdb_id', language: 'es-ES' });
    if (!Array.isArray(found.movie_results)) throw new Error('Invalid TMDB external-ID response');
    if (found.movie_results.length > 1) return result('needs_review', { reason: 'ambiguous_external_id' });
    if (found.movie_results.length === 1) {
      const movie = await details(found.movie_results[0].id);
      if (!movie) return result('needs_review', { reason: 'provider_unavailable' });
      const problems = matchProblems(film, movie);
      checked.set(movie.id, { movie, problems });
      if (ownDecision(movie.id) || movie.imdb_id !== imdb.id || problems.some(p => p !== 'year')) {
        return result('needs_review', { reason: 'external_id_conflict' });
      }
      return accept(movie, 'external_id', [{ source: imdb.source, note: `Verified IMDb identity ${imdb.id}` }]);
    }
  }

  const queries = [...new Map(titlesOf(film).map(title => [normalize(title), title.trim()])).values()];
  const years = Number.isInteger(film.year) ? [String(film.year), undefined] : [undefined];
  for (const year of years) {
    const phase = new Set();
    for (const query of queries) {
      for (let page = 1; page <= maxPages; page++) {
        const params = { query, include_adult: 'false', language: 'es-ES', ...(year ? { year } : {}), ...(page > 1 ? { page } : {}) };
        const found = await request('search/movie', params);
        if (!Array.isArray(found.results)) throw new Error('Invalid TMDB search response');
        search.queries.push({ query, year: year || null, page });
        for (const hit of found.results) {
          if (!Number.isInteger(hit.id) || hit.id <= 0) throw new Error('Invalid TMDB candidate ID');
          if (phase.size >= maxCandidates && !phase.has(hit.id)) { search.truncated = true; continue; }
          phase.add(hit.id);
          if (checked.has(hit.id)) continue;
          const movie = await details(hit.id);
          if (!movie) { search.truncated = true; continue; }
          const problems = matchProblems(film, movie);
          if (imdb?.id && movie.imdb_id && imdb.id !== movie.imdb_id) problems.push('external_id');
          checked.set(hit.id, { movie, problems, ...(ownDecision(hit.id) ? { decision: ownDecision(hit.id).status } : {}) });
        }
        const totalPages = found.total_pages || 1;
        if (page >= totalPages) break;
        if (page >= maxPages || phase.size >= maxCandidates) { search.truncated = true; break; }
      }
    }
    const matches = [...checked.values()].filter(c => !c.problems.length && !ownDecision(c.movie.id));
    if (matches.length > 1) return result('ambiguous', { reason: 'multiple_passing_candidates' });
    if (matches.length === 1 && !search.truncated) return accept(matches[0].movie, 'strict_rule_v1', [
      { source: `https://www.themoviedb.org/movie/${matches[0].movie.id}`, note: 'Exact normalized title/directors/year; runtime within three minutes. Not human-verified.' },
    ]);
  }
  return result(search.truncated || record?.review?.status === 'unsure' || decisions.some(d => d.status === 'needs_review') ? 'needs_review' : 'unmatched', {
    reason: search.truncated ? 'search_truncated' : record?.review?.status === 'unsure' || decisions.some(d => d.status === 'needs_review') ? 'review_pending' : 'no_accepted_candidate',
  });
}
