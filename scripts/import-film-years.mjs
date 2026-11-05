import { readFile, writeFile, rename } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { festivals } from '../data.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const normalize = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function verifiedYear(film, record) {
  const titles = [record.title, record.originalTitle, ...(record.alternativeTitles || [])].map(normalize);
  const names = (record.directors || []).map(normalize);
  const directors = (film.director || '').split(/,\s*/);
  const date = record.releaseDate;
  if (film.components || !Number.isInteger(record.id) || record.id <= 0
    || ![film.title, film.originalTitle, film.alias].filter(Boolean).some(title => titles.includes(normalize(title)))
    || !film.director || !directors.every(name => names.includes(normalize(record.directorAliases?.[name] || name)))
    || !(film.duration > 0) || !(record.runtime > 0) || Math.abs(film.duration - record.runtime) > 3
    || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(Date.parse(date))
    || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new Error(`Unverified film year: ${record.key}`);
  }
  const year = Number(date.slice(0, 4));
  if (year < 1000) throw new Error(`Invalid film year: ${record.key}`);
  return year;
}

// Validate the complete import before changing any data. Programmes stay intact.
export function applyYears(data, records) {
  const updated = structuredClone(data);
  const keys = new Set();
  for (const record of records) {
    if (keys.has(record.key)) throw new Error(`Duplicate film: ${record.key}`);
    keys.add(record.key);
    const [festivalId, filmId, componentTitle] = record.key.split('/');
    const festival = updated.find(item => item.id === festivalId);
    const programme = festival?.films[filmId];
    const film = componentTitle ? programme?.components?.find(item => item.title === componentTitle) : programme;
    if (!film) throw new Error(`Unknown film: ${record.key}`);
    const year = verifiedYear(film, record);
    const source = `https://www.themoviedb.org/movie/${record.id}`;
    if (film.year && film.yearSource !== source) {
      if (film.year !== year) throw new Error(`Year conflicts with a curated source: ${record.key}`);
      continue;
    }
    Object.assign(film, { year, yearSource: source });
    // Some FIDOCS shorts also have a standalone record.
    for (const parent of Object.values(festival.films)) {
      for (const component of parent.components || []) {
        if (!componentTitle && component.filmId === filmId) Object.assign(component, { year: film.year, yearSource: film.yearSource });
      }
    }
  }
  return updated;
}

async function refresh(records) {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim()
    || (await readFile(join(homedir(), '.config/vivaelcine/tmdb-read-token'), 'utf8')).trim();
  if (!token) throw new Error('Missing TMDB API Read Access Token. See docs/film-years.md.');
  const refreshed = [];
  for (const record of records) {
    const url = new URL(`https://api.themoviedb.org/3/movie/${record.id}`);
    url.searchParams.set('append_to_response', 'credits,alternative_titles');
    url.searchParams.set('language', 'es-ES');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`TMDB HTTP ${response.status}; existing files preserved.`);
    const movie = await response.json();
    if (movie.id !== record.id || !Array.isArray(movie.credits?.crew)) throw new Error(`Invalid TMDB response: ${record.id}`);
    refreshed.push({
      ...record, title: movie.title, originalTitle: movie.original_title,
      alternativeTitles: (movie.alternative_titles?.titles || []).map(item => item.title),
      releaseDate: movie.release_date, runtime: movie.runtime,
      directors: movie.credits.crew.filter(item => item.job === 'Director').map(item => item.name),
      retrievedAt: new Date().toISOString(),
    });
  }
  return refreshed;
}

async function save(path, contents) {
  await writeFile(`${path}.tmp`, contents);
  await rename(`${path}.tmp`, path);
}

function formatEvidence(evidence) {
  return `{
  "records": [
${evidence.records.map(record => `    ${JSON.stringify(record)}`).join(',\n')}
  ],
  "unresolved": [
${evidence.unresolved.map(record => `    ${JSON.stringify(record)}`).join(',\n')}
  ]
}\n`;
}

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some(flag => flag !== '--offline')) throw new Error('Usage: npm run import:years -- [--offline]');
  const path = join(root, 'assets/tmdb-film-years.json');
  const evidence = JSON.parse(await readFile(path, 'utf8'));
  const records = flags.includes('--offline') ? evidence.records : await refresh(evidence.records);
  const updated = applyYears(festivals, records);
  const pending = [];
  for (const festival of updated) {
    const path = join(root, `data/${festival.id}.js`);
    const previous = await readFile(path, 'utf8');
    const contents = previous.split('\n').map(line => {
      if (!/^"[^"]+":\{"title":/.test(line)) return line;
      const [id, film] = Object.entries(JSON.parse(`{${line.replace(/,$/, '')}}`))[0];
      const next = festival.films[id];
      return JSON.stringify(film) === JSON.stringify(next) ? line : `${JSON.stringify(id)}:${JSON.stringify(next)},`;
    }).join('\n');
    if (previous !== contents) pending.push({ path, contents });
  }
  for (const file of pending) await save(file.path, file.contents);
  await save(path, formatEvidence({ ...evidence, records }));
  console.log(`${records.length} verified film years; ${pending.length} datasets updated.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
