import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { matchProblems, sourceFingerprint } from './film-identity.mjs';

const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Public, cached observations only. Review choices never modify the identity registry.
export async function reviewData(entries, report, identities, cacheDir) {
  const movies = new Map();
  const responses = await Promise.all((await readdir(cacheDir)).filter(name => name.endsWith('.json'))
    .map(async name => JSON.parse(await readFile(join(cacheDir, name), 'utf8'))));
  for (const response of responses) {
    if (!/^\/3\/movie\/\d+$/.test(new URL(response.url).pathname) || !response.data.credits) continue;
    const previous = movies.get(response.data.id);
    if (!previous || response.retrievedAt > previous.retrievedAt) movies.set(response.data.id, response);
  }
  const rows = report.filter(row => row.status !== 'unannounced' && (row.status !== 'matched'
    || identities.films.some(film => film.keys.includes(row.key) && film.decisions.some(d => d.method === 'manual')))).map(row => {
    const film = entries.get(row.key);
    const record = identities.films.find(item => item.keys.includes(row.key));
    const decisions = record?.decisions || [];
    const ids = new Set([...decisions.map(d => d.tmdbId), ...row.candidates.map(c => c.id)]);
    const candidates = [...ids].map(id => {
      const checked = row.candidates.find(c => c.id === id);
      const decision = decisions.find(d => d.tmdbId === id);
      const cached = movies.get(id);
      const movie = cached?.data;
      const candidate = {
        id, title: movie?.title || checked?.title || `TMDB ${id}`,
        originalTitle: movie?.original_title || '', year: Number(movie?.release_date?.slice(0, 4) || checked?.year) || null,
        duration: movie?.runtime || checked?.runtime || null,
        directors: movie?.credits?.crew.filter(c => c.job === 'Director').map(c => c.name) || checked?.directors || [],
        directorIds: movie?.credits?.crew.filter(c => c.job === 'Director').map(c => c.id) || [],
        imdbId: movie?.imdb_id || null, overview: movie?.overview || '',
        countries: (movie?.production_countries || []).map(c => c.name).join(', '),
        poster: /^\/[a-zA-Z0-9]+\.(jpg|png|webp)$/.test(movie?.poster_path || '') ? movie.poster_path : null,
        problems: checked?.problems || (movie ? matchProblems(film, movie) : ['unavailable']), registryStatus: decision?.status || null,
        evidence: decision?.evidence || [], retrievedAt: cached?.retrievedAt || null,
      };
      return { ...candidate, fingerprint: fingerprint([id, candidate.title, candidate.originalTitle,
        candidate.year, candidate.duration, candidate.directorIds, candidate.imdbId]) };
    }).sort((a, b) => {
      const rank = c => c.registryStatus === 'needs_review' || c.registryStatus === 'accepted' ? -10
        : c.registryStatus === 'rejected' ? 10 : c.problems.length;
      return rank(a) - rank(b) || a.title.localeCompare(b.title);
    });
    return {
      key: row.key, title: film.title, festival: row.key.startsWith('sanfic-') ? 'SANFIC22' : 'FIDOCS 30',
      originalTitle: film.originalTitle || '', director: film.director || '', duration: film.duration || null,
      year: film.year || null, countries: film.countries || '', source: film.source || '',
      yearSource: film.yearSource || '', letterboxd: film.letterboxd || '',
      sourceFingerprint: sourceFingerprint(film), status: row.status, reason: row.reason,
      candidates,
    };
  });
  rows.sort((a, b) => Number(!a.candidates.some(c => c.registryStatus === 'needs_review'))
    - Number(!b.candidates.some(c => c.registryStatus === 'needs_review')) || a.title.localeCompare(b.title));
  return { version: 1, generatedAt: new Date().toISOString(), rows };
}
