import { readFile, writeFile } from 'node:fs/promises';
import amor from '../data/amor-2026.js';
import { applyFilmMetadata } from '../film-metadata.js';
import { filmCatalogue } from './import-tmdb.mjs';

const root = new URL('../', import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const snapshot = await read('data/tmdb-festival-history.json');
const coverage = await read('assets/tmdb/coverage.json');
const sources = await read('assets/amor-2026-sources.json');
const raw = filmCatalogue([amor]);
const normalized = filmCatalogue([applyFilmMetadata(structuredClone(amor), snapshot.metadata)]);
const reasons = {
  'amor-2026/corazon-danzante-cuando-el-amor-es-baile': 'Bounded title/year, year-free and English-title searches found no work corroborated by Arturo Nicolás Dávila Zelada. Corazón Danzante (1214883, Amaranta R. Saavedra, 2023) is a different work.',
  'amor-2026/travesti-travesti-travesti': 'Bounded title/year, year-free, punctuation and English-title searches found no corroborated Yoksan Xu work. Distributor identity evidence is preserved; no TMDB binding inferred.',
};
const fields = ['year', 'originalTitle', 'director', 'duration', 'countries', 'synopsis'];
const films = coverage.films.filter(row => raw.has(row.key)).map(row => ({
  key: row.key, title: raw.get(row.key).title, source: raw.get(row.key).source,
  status: row.status, tmdbId: row.tmdbId ?? null, method: row.method,
  retained: row.retained, reason: reasons[row.key] || row.reason,
  search: row.search,
  ...(snapshot.metadata[row.key] ? { metadataSource: snapshot.metadata[row.key].source } : {}),
  corrections: fields.flatMap(field => {
    const before = raw.get(row.key)[field] ?? null;
    const after = normalized.get(row.key)[field] ?? null;
    return before === after ? [] : [{ field, observed: before, normalized: after }];
  }),
}));
const result = {
  edition: amor.id, sourceObservationDate: amor.updated,
  declaredDates: amor.festivalDates, regionalDates: amor.regionalDates,
  programmeStatus: amor.programmeStatus,
  counts: { screenings: amor.events.length, catalogueFilms: raw.size,
    scheduledFilms: raw.size - amor.unscheduledFilmIds.length,
    awaitingTimetable: amor.unscheduledFilmIds.length,
    matched: films.filter(f => f.status === 'matched').length,
    unresolved: films.filter(f => f.status !== 'matched').length,
    retained: films.filter(f => f.retained).length },
  limitations: [...sources.limitations,
    'TMDB work runtimes do not establish the exact screening cut. Calculated ends are estimates; explicit session windows take precedence.',
    'New AMOR candidates were fetched live; existing accepted films reused the cache. This was not a full live refresh of the other festivals.'],
  programmeChanges: 'assets/amor-2026-programme-changes.json',
  additionalSearchEvidence: 'assets/amor-2026-unresolved-searches.json',
  identityEvidence: 'assets/amor-2026-identity-evidence.json',
  films,
};
await writeFile(new URL('assets/amor-2026-audit.json', root), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.counts));
