import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { festivals } from '../data.js';
import { applyFilmMetadata } from '../film-metadata.js';
import { localDate } from '../discovery-time.js';
import { buildPages, sitemap } from './discovery-pages.mjs';
import shortLinks from '../data/short-links.js';
import { updateLinks, serializeLinks, buildShortPages, notFoundPage } from './short-pages.mjs';
import { buildCalendarFiles } from './calendar-files.mjs';

const root = new URL('../', import.meta.url);
const json = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));

export async function loadInputs() {
  const sanfic = await json('assets/fuentes.json');
  const fidocs = await json('assets/fidocs-2026-sources.json');
  const ficvina = await json('assets/ficvina-2026-sources.json');
  const snapshot = await json('data/tmdb-festival-history.json');
  return {
    festivals: festivals.map(festival => applyFilmMetadata(structuredClone(festival), snapshot.metadata)),
    sources: {
      'sanfic-2026': { retrievedOn: sanfic.consultado, scheduleUrl: sanfic.horarios.url, recordUrl: '/assets/fuentes.json' },
      'fidocs-2026': { retrievedOn: fidocs.retrieved, scheduleUrl: fidocs.sourceUrl, recordUrl: '/assets/fidocs-2026-sources.json' },
      'ficvina-2026': { retrievedOn: ficvina.collected, scheduleUrl: ficvina.programUrl, recordUrl: '/assets/ficvina-2026-sources.json' },
    },
  };
}

async function existingPages(directory) {
  try {
    const entries = await readdir(new URL(directory, root), { withFileTypes: true });
    return (await Promise.all(entries.map(entry => entry.isDirectory()
      ? existingPages(`${directory}${entry.name}/`)
      : [`${directory}${entry.name}`]))).flat();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function generate({ check = false, asOf } = {}) {
  let previous;
  try { previous = await json('generated-pages.json'); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (check) throw new Error('Missing generated-pages.json. Run npm run generate:pages.');
  }
  const date = asOf || (check ? previous.asOf : localDate(new Date(), 'America/Santiago'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error('Use a valid --as-of YYYY-MM-DD.');
  }
  const inputs = await loadInputs();
  const pages = buildPages(inputs.festivals, inputs.sources, date);
  const links = updateLinks(inputs.festivals, shortLinks);
  const shortPages = buildShortPages(inputs.festivals, links, date);
  const outputs = new Map([...pages, ...shortPages].map(([path, html]) => [path.slice(1) + 'index.html', html]));
  const calendars = buildCalendarFiles(inputs.festivals);
  for (const [path, content] of calendars) outputs.set(path, content);
  outputs.set('data/short-links.js', serializeLinks(links));
  outputs.set('404.html', notFoundPage(date));
  outputs.set('sitemap.xml', sitemap(pages));
  outputs.set('generated-pages.json', JSON.stringify({ asOf: date, files: [...outputs.keys()].sort() }, null, 2) + '\n');
  const existing = [...await existingPages('festivales/'), ...await existingPages('funciones/'), ...await existingPages('s/'), ...await existingPages('calendarios/')];
  const obsolete = existing.filter(path => !outputs.has(path));
  if (obsolete.length) throw new Error(`Obsolete generated files require explicit review/removal: ${obsolete.join(', ')}`);
  const stale = [];
  for (const [path, content] of outputs) {
    if (check) {
      try {
        if (await readFile(new URL(path, root), 'utf8') !== content) stale.push(path);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        stale.push(path);
      }
    } else {
      const target = new URL(path, root);
      await mkdir(new URL('./', target), { recursive: true });
      await writeFile(target, content);
    }
  }
  if (stale.length) throw new Error(`Stale generated output (${stale.length} files). Run npm run generate:pages. First: ${stale.slice(0, 4).join(', ')}`);
  return { pages: pages.size, shortLinks: shortPages.size, calendars: calendars.size, asOf: date };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    let asOf;
    for (let index = 0; index < args.length; index++) {
      if (args[index] === '--check') continue;
      if (args[index] === '--as-of' && args[index + 1]) asOf = args[++index];
      else throw new Error('Usage: node scripts/generate-pages.mjs [--check] [--as-of YYYY-MM-DD]');
    }
    const result = await generate({ check: args.includes('--check'), asOf });
    console.log(`${args.includes('--check') ? 'Checked' : 'Generated'} ${result.pages} programme pages, ${result.shortLinks} short links and ${result.calendars} calendar files; calendar cut-off ${result.asOf}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
