import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { festivals } from '../data.js';
import { resolveFilmIdentity, validateRegistry } from './film-identity.mjs';
import { reviewData } from './tmdb-review-data.mjs';
export { matchProblems } from './film-identity.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

export function filmCatalogue(registry = festivals) {
  const entries = new Map();
  const add = (key, film) => entries.set(key, {
    ...film,
    title: film.title.replace(/^Foco [^:]+:\s*/, ''),
    originalTitle: film.originalTitle?.replace(/^Foco [^:]+:\s*/, ''),
  });
  for (const festival of registry) {
    for (const id of festival.unscheduledFilmIds || []) {
      add(`${festival.id}/${id}`, festival.films[id]);
    }
    for (const event of festival.events) {
      const film = festival.films[event.filmId];
      if (film.kind === 'activity') continue;
      if (film.components) {
        for (const component of film.components) {
          const id = component.filmId || `${event.filmId}/${component.title}`;
          add(`${festival.id}/${id}`, { ...festival.films[component.filmId], ...component });
        }
      } else if (event.title) {
        add(`${festival.id}/${event.id}`, {
          ...film, ...event, originalTitle: event.originalTitle || event.title,
          alias: event.alias, aliases: event.aliases, duration: event.duration,
        });
      } else {
        add(`${festival.id}/${event.filmId}`, film);
      }
    }
  }
  return new Map([...entries].sort(([a], [b]) => a.localeCompare(b)));
}

// A premiere release type alone does not identify a festival or its premiere scope.
const festivalNames = [
  ['Cannes', /\bcannes\b/i], ['Venecia', /\b(venice|venezia|venecia)\b/i],
  ['Berlinale', /\b(berlinale|berlin international film festival)\b/i],
  ['Sundance', /\bsundance\b/i], ['Locarno', /\blocarno\b/i],
  ['San Sebastián', /\b(san sebasti[aá]n|donostia)\b/i],
  ['Rotterdam', /\b(rotterdam|iffr)\b/i], ['Toronto', /\btoronto international film festival\b/i],
  ['Valdivia', /\b(valdivia|ficvaldivia)\b/i], ['SANFIC', /\bsanfic\b/i],
  ['FIDOCS', /\bfidocs\b/i], ['IDFA', /\b(idfa|international documentary film festival amsterdam)\b/i],
  ['CPH:DOX', /\bcph\s*:?\s*dox\b/i], ['Ji.hlava', /\b(ji[. ]?hlava|jihlava)\b/i],
  ['Guadalajara', /\b(guadalajara|ficg)\b/i], ['EDOC', /\bedoc\b/i],
  ['Punto de Vista', /\bpunto de vista\b/i], ['Mar del Plata', /\bmar del plata\b/i],
  ['BFI London', /\b(bfi london|london film festival)\b/i], ['New York', /\b(new york film festival|nyff)\b/i],
  ['Karlovy Vary', /\b(karlovy vary|kviff)\b/i], ['Busan', /\bbusan\b/i],
];

export function festivalReleases(movie) {
  const appearances = [];
  const unclassified = [];
  for (const country of movie.release_dates?.results || []) {
    for (const release of country.release_dates || []) {
      if (release.type !== 1) continue;
      const note = (release.note || '').trim();
      const names = festivalNames.filter(([, pattern]) => pattern.test(note));
      const date = release.release_date?.slice(0, 10);
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
      if (names.length !== 1 || !validDate) {
        unclassified.push({ country: country.iso_3166_1, ...release });
        continue;
      }
      const festival = names[0][0];
      if (!appearances.some(item => item.festival === festival && item.date === date)) {
        appearances.push({ festival, date, source: `https://www.themoviedb.org/movie/${movie.id}/releases` });
      }
    }
  }
  return { appearances: appearances.sort((a, b) => a.date.localeCompare(b.date)), unclassified };
}

async function saveJson(path, value) {
  await mkdir(resolve(path, '..'), { recursive: true });
  const text = value.version === 1 && Array.isArray(value.films)
    ? `{\n  "version": 1,\n  "films": [\n${value.films.map(film => `    ${JSON.stringify(film)}`).join(',\n')}\n  ]\n}`
    : JSON.stringify(value, null, 2);
  await writeFile(`${path}.tmp`, `${text}\n`);
  await rename(`${path}.tmp`, path);
}

export function tmdbClient({ cacheDir, token, offline = false, refresh = false, fetcher = fetch,
  attempts = 3, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  if (!Number.isInteger(attempts) || attempts < 1) throw new Error('Invalid TMDB retry budget');
  return async (path, params = {}) => {
    const url = new URL(`https://api.themoviedb.org/3/${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const file = join(cacheDir, `${createHash('sha256').update(url.href).digest('hex').slice(0, 20)}.json`);
    if (!refresh) {
      try {
        const cached = JSON.parse(await readFile(file, 'utf8'));
        if (cached.url !== url.href) throw new Error('Cache URL mismatch');
        return cached.data;
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (offline) throw new Error(`Missing cached response: ${path}`);
    if (!token) throw new Error('TMDB token missing. Save the API Read Access Token in ~/.config/vivaelcine/tmdb-read-token or set TMDB_READ_ACCESS_TOKEN.');
    let response;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        response = await fetcher(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      } catch (error) {
        if (attempt === attempts - 1) throw error;
        await wait(250 * 2 ** attempt);
        continue;
      }
      if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === attempts - 1) break;
      const retry = response.headers.get('Retry-After');
      const delay = retry && /^\d+$/.test(retry) ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now());
      // Leave long provider cooldowns for a later run instead of retrying early.
      if (delay > 5000) break;
      await wait(Math.max(Number.isFinite(delay) ? delay : 0, 250 * 2 ** attempt));
    }
    if (!response.ok) throw Object.assign(new Error(`TMDB HTTP ${response.status} (${path}). Previous site snapshot preserved.`), { status: response.status });
    const data = await response.json();
    if (data.success === false) throw new Error(`TMDB rejected ${path}. Previous site snapshot preserved.`);
    await saveJson(file, { url: url.href, retrievedAt: new Date().toISOString(), data });
    return data;
  };
}

export async function collectFilms(entries, rawRequest, progress = () => {}, {
  registry = { version: 1, films: [] }, previous = {},
} = {}) {
  validateRegistry(registry);
  const identities = structuredClone(registry);
  const responses = new Map();
  const request = (path, params) => {
    const key = JSON.stringify([path, params]);
    if (!responses.has(key)) responses.set(key, rawRequest(path, params));
    return responses.get(key);
  };
  const films = {};
  const posters = {};
  const metadata = {};
  const report = [];
  for (const [key, film] of entries) {
    if (film.section === 'ganadoras' && !film.director) {
      report.push({ key, title: film.title, status: 'unannounced', tmdbId: null, appearances: 0, unclassifiedPremieres: [], candidates: [] });
      progress(report.length, entries.size);
      continue;
    }
    const identity = await resolveFilmIdentity(film, { key, registry: identities, request });
    const match = identity.movie || null;
    const binding = identities.films.find(item => item.id === identity.filmId)?.decisions.find(d => d.status === 'accepted');
    if (binding && ['provider_unavailable', 'provider_identity_changed'].includes(identity.reason)) binding.reviewRequired = identity.reason;
    if (identity.decision) {
      let record = identities.films.find(item => item.id === identity.filmId);
      if (!record) { record = { id: identity.filmId, keys: [key], decisions: [] }; identities.films.push(record); }
      record.decisions.push(identity.decision);
    }
    const releases = match ? festivalReleases(match) : { appearances: [], unclassified: [] };
    if (releases.appearances.length) films[key] = releases.appearances;
    if (/^\/[a-zA-Z0-9]+\.(jpg|png|webp)$/.test(match?.poster_path || '')) {
      posters[key] = { path: match.poster_path, source: `https://www.themoviedb.org/movie/${match.id}` };
    }
    if (match) metadata[key] = {
      tmdbId: match.id,
      title: match.title,
      originalTitle: match.original_title,
      directors: match.credits.crew.filter(person => person.job === 'Director').map(person => person.name),
      runtime: match.runtime,
      countries: (match.production_countries || []).map(country => country.name),
      synopsis: match.overview,
      year: /^\d{4}-\d{2}-\d{2}$/.test(match.release_date || '') ? Number(match.release_date.slice(0, 4)) : null,
      source: `https://www.themoviedb.org/movie/${match.id}`,
      releases: (match.release_dates.results || []).flatMap(country => country.release_dates.map(release => ({
        country: country.iso_3166_1, type: release.type, date: release.release_date,
        note: release.note || '', certification: release.certification || '',
      }))),
    };
    const retained = ['provider_unavailable', 'provider_identity_changed'].includes(identity.reason)
      && !!(previous.films?.[key] || previous.posters?.[key] || previous.metadata?.[key]);
    if (retained) {
      if (previous.films?.[key]) films[key] = previous.films[key];
      if (previous.posters?.[key]) posters[key] = previous.posters[key];
      if (previous.metadata?.[key]) metadata[key] = previous.metadata[key];
    }
    const tmdbYear = Number(match?.release_date?.slice(0, 4)) || null;
    report.push({
      key, title: film.title, status: identity.status, filmId: identity.filmId,
      method: identity.method || null, reason: identity.reason || null, retained,
      discrepancies: identity.discrepancies || [], search: identity.search,
      tmdbId: match?.id || null, appearances: releases.appearances.length,
      boundTmdbId: binding?.tmdbId || identity.decision?.tmdbId || null,
      catalogueYear: Number.isInteger(film.year) ? film.year : null, tmdbYear,
      yearStatus: !tmdbYear ? 'catalogue_fallback' : film.year === tmdbYear ? 'consistent' : 'tmdb_authoritative',
      unclassifiedPremieres: releases.unclassified,
      candidates: identity.checked.map(({ movie, problems, decision }) => ({ id: movie.id, title: movie.title, year: movie.release_date?.slice(0, 4), runtime: movie.runtime, directors: movie.credits.crew.filter(item => item.job === 'Director').map(item => item.name), problems, ...(decision ? { decision } : {}) })),
    });
    progress(report.length, entries.size);
  }
  const coverage = {
    total: entries.size,
    queried: report.filter(item => item.status !== 'unannounced').length,
    unannounced: report.filter(item => item.status === 'unannounced').length,
    matched: report.filter(item => item.status === 'matched').length,
    unmatched: report.filter(item => item.status === 'unmatched').length,
    ambiguous: report.filter(item => item.status === 'ambiguous').length,
    needsReview: report.filter(item => item.status === 'needs_review').length,
    retained: report.filter(item => item.retained).length,
    withFestivalHistory: Object.keys(films).length,
    appearances: Object.values(films).flat().length,
  };
  validateRegistry(identities);
  return { generatedAt: new Date().toISOString(), coverage, films, posters, metadata, report, identities };
}

function reviewMarkdown({ report, identities }) {
  const cell = value => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
  const rows = report.filter(row => !['matched', 'unannounced'].includes(row.status)).map(row => {
    const pending = identities.films.find(f => f.id === row.filmId)?.decisions.filter(d => d.status === 'needs_review') || [];
    const ids = row.boundTmdbId ? [row.boundTmdbId] : pending.length ? pending.map(d => d.tmdbId) : row.candidates.filter(c => !c.problems.length).map(c => c.id);
    return `| ${cell(row.title)} | \`${cell(row.key)}\` | ${cell(row.reason)} | ${ids.map(id => `[${id}](https://www.themoviedb.org/movie/${id})`).join(', ') || 'See coverage JSON'} |`;
  });
  const years = report.flatMap(row => {
    const candidates = row.yearStatus === 'tmdb_authoritative'
      ? [{ id: row.tmdbId, year: row.tmdbYear, status: row.yearStatus }] : [];
    const pending = identities.films.find(f => f.id === row.filmId)?.decisions.filter(d => d.status === 'needs_review') || [];
    candidates.push(...row.candidates.filter(c => pending.some(d => d.tmdbId === c.id) && /^\d{4}$/.test(c.year || '')
      && Number(c.year) !== row.catalogueYear).map(c => ({ ...c, status: 'identity_needs_review' })));
    return candidates.map(c => `| ${cell(row.title)} | ${row.catalogueYear || 'Unknown'} | ${c.year} | ${c.status} | [TMDB](https://www.themoviedb.org/movie/${c.id}/releases) |`);
  });
  return `# TMDB review queue\n\nGenerated by \`npm run import:tmdb\`. Unresolved candidate IDs require review. Accepted identities publish TMDB years under the project source-of-truth policy; year differences are recorded below. Edit sourced decisions in \`data/film-identities.json\`; raw observations and search bounds remain in \`assets/tmdb/coverage.json\`.\n\n## Unresolved identities\n\n| Film | Catalogue key | Reason | Candidate IDs |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n\n## TMDB year differences and unresolved proposals\n\nAccepted identities use the main TMDB release year; missing dates retain the sourced catalogue year. Screening durations remain festival facts.\n\n| Film | Catalogue year | Main TMDB release year | Status | Evidence to review |\n| --- | --- | --- | --- | --- |\n${years.join('\n')}\n`;
}

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some(flag => !['--offline', '--refresh'].includes(flag)) || (flags.includes('--offline') && flags.includes('--refresh'))) throw new Error('Usage: npm run import:tmdb -- [--offline | --refresh]');
  let token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token && !flags.includes('--offline')) {
    try { token = (await readFile(join(homedir(), '.config/vivaelcine/tmdb-read-token'), 'utf8')).trim(); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const registry = JSON.parse(await readFile(join(root, 'data/film-identities.json'), 'utf8'));
  const previous = JSON.parse(await readFile(join(root, 'data/tmdb-festival-history.json'), 'utf8'));
  const result = await collectFilms(filmCatalogue(), tmdbClient({ cacheDir: join(root, 'assets/tmdb/responses'), token, offline: flags.includes('--offline'), refresh: flags.includes('--refresh') }), (done, total) => {
    if (done % 20 === 0 || done === total) console.log(`Checked ${done}/${total} film entries`);
  }, { registry, previous });
  const { report, identities, ...snapshot } = result;
  const review = await reviewData(filmCatalogue(), report, identities, join(root, 'assets/tmdb/responses'), festivals);
  await saveJson(join(root, 'data/film-identities.json'), identities);
  await saveJson(join(root, 'assets/tmdb/coverage.json'), { generatedAt: result.generatedAt, coverage: result.coverage, films: report });
  await writeFile(join(root, 'assets/tmdb/review.md'), reviewMarkdown(result));
  await saveJson(join(root, 'assets/tmdb/review-data.json'), review);
  await saveJson(join(root, 'data/tmdb-festival-history.json'), snapshot);
  console.log(JSON.stringify(result.coverage, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
