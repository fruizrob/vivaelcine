import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { festivals } from '../data.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const normalize = value => (value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const titlesOf = film => [film.title, film.originalTitle, film.alias, ...(film.aliases || [])].filter(Boolean);

export function filmCatalogue(registry = festivals) {
  const entries = new Map();
  const add = (key, film) => entries.set(key, {
    ...film,
    title: film.title.replace(/^Foco [^:]+:\s*/, ''),
    originalTitle: film.originalTitle?.replace(/^Foco [^:]+:\s*/, ''),
  });
  for (const festival of registry) {
    for (const event of festival.events) {
      const film = festival.films[event.filmId];
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
  await writeFile(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await rename(`${path}.tmp`, path);
}

export function tmdbClient({ cacheDir, token, offline = false, refresh = false, fetcher = fetch }) {
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
    const response = await fetcher(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`TMDB HTTP ${response.status} (${path}). Previous site snapshot preserved. Retry later for 429; check credentials for 401/403.`);
    const data = await response.json();
    if (data.success === false) throw new Error(`TMDB rejected ${path}. Previous site snapshot preserved.`);
    await saveJson(file, { url: url.href, retrievedAt: new Date().toISOString(), data });
    return data;
  };
}

export async function collectFilms(entries, request, progress = () => {}) {
  const films = {};
  const report = [];
  for (const [key, film] of entries) {
    if (film.section === 'ganadoras' && !film.director) {
      report.push({ key, title: film.title, status: 'unannounced', tmdbId: null, appearances: 0, unclassifiedPremieres: [], candidates: [] });
      progress(report.length, entries.size);
      continue;
    }
    const candidates = new Map();
    const queries = new Map(titlesOf(film).map(title => [normalize(title), title.trim()]));
    for (const query of queries.values()) {
      const result = await request('search/movie', { query, include_adult: 'false', language: 'es-ES', ...(Number.isInteger(film.year) ? { year: String(film.year) } : {}) });
      if (!Array.isArray(result.results)) throw new Error('Invalid TMDB search response');
      for (const candidate of result.results.slice(0, 5)) candidates.set(candidate.id, candidate);
    }
    const checked = [];
    for (const id of candidates.keys()) {
      const movie = await request(`movie/${id}`, { append_to_response: 'credits,release_dates,alternative_titles', language: 'es-ES' });
      if (movie.id !== id || !Array.isArray(movie.credits?.crew) || !Array.isArray(movie.release_dates?.results)) throw new Error(`Invalid TMDB details: ${id}`);
      checked.push({ movie, problems: matchProblems(film, movie) });
    }
    const matches = checked.filter(item => !item.problems.length);
    const match = matches.length === 1 ? matches[0].movie : null;
    const releases = match ? festivalReleases(match) : { appearances: [], unclassified: [] };
    if (releases.appearances.length) films[key] = releases.appearances;
    report.push({
      key, title: film.title, status: matches.length > 1 ? 'ambiguous' : match ? 'matched' : 'unmatched',
      tmdbId: match?.id || null, appearances: releases.appearances.length,
      unclassifiedPremieres: releases.unclassified,
      candidates: checked.map(({ movie, problems }) => ({ id: movie.id, title: movie.title, year: movie.release_date?.slice(0, 4), runtime: movie.runtime, directors: movie.credits.crew.filter(item => item.job === 'Director').map(item => item.name), problems })),
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
    withFestivalHistory: Object.keys(films).length,
    appearances: Object.values(films).flat().length,
  };
  return { generatedAt: new Date().toISOString(), coverage, films, report };
}

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some(flag => !['--offline', '--refresh'].includes(flag)) || (flags.includes('--offline') && flags.includes('--refresh'))) throw new Error('Usage: npm run import:tmdb -- [--offline | --refresh]');
  let token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token && !flags.includes('--offline')) {
    try { token = (await readFile(join(homedir(), '.config/vivaelcine/tmdb-read-token'), 'utf8')).trim(); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const result = await collectFilms(filmCatalogue(), tmdbClient({ cacheDir: join(root, 'assets/tmdb/responses'), token, offline: flags.includes('--offline'), refresh: flags.includes('--refresh') }), (done, total) => {
    if (done % 20 === 0 || done === total) console.log(`Checked ${done}/${total} film entries`);
  });
  const { report, ...snapshot } = result;
  await saveJson(join(root, 'assets/tmdb/coverage.json'), { generatedAt: result.generatedAt, coverage: result.coverage, films: report });
  await saveJson(join(root, 'data/tmdb-festival-history.json'), snapshot);
  console.log(JSON.stringify(result.coverage, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
