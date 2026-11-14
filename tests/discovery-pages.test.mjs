import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { durationOf, roomLocation, yearOf } from '../core.js';
import { localDate, calendarState, zonedStart } from '../discovery-time.js';
import { loadInputs, generate } from '../scripts/generate-pages.mjs';
import { buildPages, editionPath, dayPath, screeningPath, origin, escapeHtml as esc, sitemap } from '../scripts/discovery-pages.mjs';

const { festivals, sources } = await loadInputs();
const asOf = '2026-11-12';
const pages = buildPages(festivals, sources, asOf);
const fidocs = festivals.find(festival => festival.id === 'fidocs-2026');
const htmlFor = id => pages.get(screeningPath(fidocs.events.find(event => event.filmId === id)));

test('FICVIÑA pages identify Viña del Mar and link to their own PDF and source page', () => {
  const festival = festivals.find(festival => festival.id === 'ficvina-2026');
  assert.match(pages.get(editionPath(festival)), /en Viña del Mar/);
  for (const event of festival.events) {
    const html = pages.get(screeningPath(event));
    assert.ok(html.includes(`${origin}/assets/programacion-ficvina-2026.pdf#page=${event.sourcePage}`));
    assert.ok(!html.includes('programacion-sanfic22.pdf'));
  }
});

test('every screening has distinct initial HTML facts, metadata and exact legacy agenda URL', () => {
  const canonicals = new Set();
  const titles = new Set();
  const descriptions = new Set();
  for (const festival of festivals) {
    for (const event of festival.events) {
      const html = pages.get(screeningPath(event));
      const film = festival.films[event.filmId];
      const title = event.title || film.title;
      const room = festival.rooms.find(room => room.id === event.roomId);
      const canonical = `${origin}${screeningPath(event)}`;
      assert.ok(html.includes(`<h1>${esc(title)}</h1>`), event.id);
      assert.ok(html.includes(esc(roomLocation(room))), event.id);
      assert.ok(html.includes(zonedStart(event.date, event.start, festival.timeZone)), event.id);
      assert.ok(html.includes(`href="/?festival=${festival.id}&amp;dia=${event.date}&amp;funcion=${event.id}"`), event.id);
      assert.ok(html.includes(`rel="canonical" href="${canonical}"`), event.id);
      assert.ok(html.includes(`property="og:url" content="${canonical}"`), event.id);
      assert.ok(html.includes('name="twitter:title"'), event.id);
      assert.ok(html.includes(`href="${esc(event.ticketUrl || film.ticketUrl || event.source || film.source)}"`), event.id);
      assert.ok(html.includes(esc(event.source || film.source)), event.id);
      assert.ok(html.includes('sin fecha registrada'), event.id);
      assert.ok(!html.includes('<script'), 'core facts require no scripts or unsupported event markup');
      const duration = durationOf(event, festival.films);
      assert.ok(html.includes(duration === null ? '<dd>Desconocido</dd>' : `${duration} min`), event.id);
      canonicals.add(canonical);
      titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
      descriptions.add(html.match(/name="description" content="(.*?)"/)[1]);
    }
  }
  const screenings = festivals.reduce((count, festival) => count + festival.events.length, 0);
  assert.equal(canonicals.size, screenings);
  assert.equal(titles.size, screenings);
  assert.equal(descriptions.size, screenings);
});

test('home → edition → dated day → every screening is reachable without JavaScript', async () => {
  const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(pages.size, festivals.reduce((count, festival) => count + 1 + festival.days.length + festival.events.length, 0));
  for (const festival of festivals) {
    assert.ok(home.includes(`href="${editionPath(festival)}"`));
    const edition = pages.get(editionPath(festival));
    for (const day of festival.days) {
      assert.ok(edition.includes(`href="${dayPath(festival, day.date)}"`));
      const html = pages.get(dayPath(festival, day.date));
      const eventPaths = [...html.matchAll(/href="(\/funciones\/[^\"]+)"/g)].map(match => match[1]);
      assert.deepEqual(new Set(eventPaths), new Set(festival.events.filter(event => event.date === day.date).map(screeningPath)));
    }
  }
  // Every generated internal URL either has a generated target or an existing static asset.
  for (const html of pages.values()) {
    for (const [, raw] of html.matchAll(/(?:href|src)="([^\"]+)"/g)) {
      const url = new URL(raw.replaceAll('&amp;', '&'), origin);
      if (url.origin !== origin || pages.has(url.pathname) || url.pathname === '/') continue;
      await access(new URL(`..${url.pathname}`, import.meta.url));
    }
  }
});

test('FIDOCS source observations agree with generated dates, starts, sources and programme members', async () => {
  const manifest = JSON.parse(await readFile(new URL('../assets/fidocs-2026-sources.json', import.meta.url)));
  for (const listing of manifest.listings) {
    for (const id of listing.eventIds) {
      const event = fidocs.events.find(event => event.id === id);
      const html = pages.get(screeningPath(event));
      assert.equal(event.date, listing.publishedDate);
      assert.ok(listing.publishedStarts.includes(event.start));
      assert.ok(html.includes(esc(listing.url)), listing.url);
      if (listing.ticketUrl) assert.ok(html.includes(esc(listing.ticketUrl)), listing.url);
      assert.ok(html.includes(zonedStart(listing.publishedDate, event.start, fidocs.timeZone)));
    }
  }
  const sanfic = festivals.find(festival => festival.id === 'sanfic-2026');
  for (const event of sanfic.events) {
    const html = pages.get(screeningPath(event));
    assert.ok(html.includes(`/assets/programacion-sanfic22.pdf#page=${event.sourcePage}`));
    assert.ok(html.includes('datetime="2026-10-28"'));
  }
});

test('collections, unknown winners and individual parts retain their own facts', () => {
  const programme = htmlFor('cortos-emergentes-1');
  const components = fidocs.films['cortos-emergentes-1'].components;
  assert.equal(components.length, 5);
  assert.ok(programme.includes('Películas del programa'));
  for (const component of components) assert.ok(programme.includes(`>${esc(component.title)}</a>`));
  const total = components.reduce((minutes, film) => minutes + film.duration, 0);
  assert.ok(programme.includes(`${total} min (suma de cortometrajes)`));
  const borges = htmlFor('biografia-de-jorge-luis-borges');
  assert.ok(borges.includes('parte 1</h1>'));
  assert.ok(borges.includes('130 min'));
  assert.ok(borges.includes('13:10 estimado por metraje'));
  assert.ok(!borges.includes('323 min estimado'));
  const part = fidocs.events.find(event => event.title === 'La Batalla de Chile — parte I');
  const partHtml = pages.get(screeningPath(part));
  assert.ok(partHtml.includes('96 min'));
  assert.ok(partHtml.includes(`>${yearOf(part, fidocs.films[part.filmId])}</a> · `));
  assert.ok(partHtml.includes('Otras partes o funciones de la obra'));
  const winner = htmlFor('mejor-opera-prima-fidocs-30');
  assert.ok(winner.includes('Película ganadora y duración por anunciar.'));
  assert.ok(winner.includes('<dd>Desconocido</dd>'));
  assert.ok(!winner.includes('application/ld+json'));
  const foco = htmlFor('foco-federico-luis');
  assert.ok(foco.includes('77 min'));
  assert.ok(foco.includes('suman 78 min'));
});

test('parallel activity pages preserve registration and published ends without invented film facts', () => {
  for (const event of fidocs.events.filter(event => fidocs.films[event.filmId].kind === 'activity')) {
    const record = fidocs.films[event.filmId];
    const html = pages.get(screeningPath(event));
    assert.ok(html.includes('según horario publicado'));
    assert.ok(!html.includes('estimado por metraje'));
    assert.ok(!html.includes('Películas del programa'));
    if (record.registrationUrl) {
      assert.ok(html.includes(`href="${esc(record.registrationUrl)}">`) || html.includes(`href="${esc(record.registrationUrl)}" class="button">`));
      assert.ok(html.includes('Inscribirse</a>'));
    } else assert.ok(html.includes('Gratuita según la fuente'));
  }
});

test('date-only retrieval observations never turn into per-screening checks or live claims', () => {
  for (const festival of festivals) {
    const html = pages.get(editionPath(festival));
    assert.ok(html.includes(`datetime="${sources[festival.id].retrievedOn}"`));
    assert.ok(html.includes('precisión de día'));
    assert.ok(html.includes('no una confirmación independiente de apertura y clausura'));
    assert.ok(html.includes('no vuelve a comprobar las fuentes'));
    assert.ok(html.includes('sin fecha registrada'));
  }
  assert.ok(pages.get(editionPath(festivals[0])).includes('Archivo de fechas pasadas'));
  assert.ok(pages.get(editionPath(fidocs)).includes('Programación futura · al 2026-11-12'));
  const later = buildPages(festivals, sources, '2026-12-01');
  assert.ok(later.get(editionPath(fidocs)).includes('Archivo de fechas pasadas'));
  assert.equal(calendarState('2026-11-13', '2026-11-19', '2026-11-14'), 'Dentro de las fechas programadas');
});

test('IANA offsets follow Chile winter/summer, midnight and DST gaps/ambiguities', () => {
  assert.equal(zonedStart('2026-07-10', 1200, 'America/Santiago'), '2026-07-10T20:00:00-04:00');
  assert.equal(zonedStart('2026-11-14', 660, 'America/Santiago'), '2026-11-14T11:00:00-03:00');
  assert.equal(zonedStart('2026-11-14', 1500, 'America/Santiago'), '2026-11-15T01:00:00-03:00');
  assert.equal(localDate(new Date('2026-11-14T01:30:00Z'), 'America/Santiago'), '2026-11-13');
  assert.throws(() => zonedStart('2026-09-06', 30, 'America/Santiago'), /nonexistent/);
  assert.throws(() => zonedStart('2026-04-04', 1410, 'America/Santiago'), /Ambiguous/);
});

test('sitemap contains only distinct canonical URLs; robots distinguishes search and training', async () => {
  const xml = sitemap(pages);
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  const expected = 1 + festivals.reduce((count, festival) => count + 1 + festival.days.length + festival.events.length, 0);
  assert.equal(urls.length, expected);
  assert.equal(new Set(urls).size, expected);
  assert.ok(!xml.includes('lastmod'), 'generation is not proof of source modification');
  for (const url of urls) assert.ok(url === `${origin}/` || pages.has(new URL(url).pathname));
  const robots = await readFile(new URL('../robots.txt', import.meta.url), 'utf8');
  assert.match(robots, /User-agent: \*\nAllow: \/\n/);
  assert.match(robots, /User-agent: OAI-SearchBot\nAllow: \/\n/);
  assert.match(robots, /User-agent: GPTBot\nDisallow: \/\n/);
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
});

test('stale check rejects a changed calendar cut-off and checks committed output reproducibly', async () => {
  await generate({ check: true });
  await assert.rejects(generate({ check: true, asOf: '2030-01-01' }), /Stale generated output/);
  await assert.rejects(generate({ check: true, asOf: '2026-02-30' }), /valid --as-of/);
  assert.throws(() => execFileSync(process.execPath, ['scripts/generate-pages.mjs', '--unsupported'], { stdio: 'pipe' }), /failed/);
});
