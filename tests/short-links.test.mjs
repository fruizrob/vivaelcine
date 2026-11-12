import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { festivals, festivalFor } from '../data.js';
import links from '../data/short-links.js';
import { sharedScreeningUrl, agendaScreeningUrl } from '../screening-links.js';
import { updateLinks, buildShortPages, notFoundPage } from '../scripts/short-pages.mjs';
import { escapeHtml as esc, origin } from '../scripts/discovery-pages.mjs';
import { clock, roomLocation } from '../core.js';

const asOf = '2026-11-12';
const pages = buildShortPages(festivals, links, asOf);
const base = `${origin}/?festival=old&dia=wrong&funcion=old#schedule`;

test('all published screenings share a distinct shorter URL and an exact legacy handoff', () => {
  const urls = new Set();
  for (const festival of festivals) {
    for (const event of festival.events) {
      const url = new URL(sharedScreeningUrl(festival, event, base));
      const long = agendaScreeningUrl(festival, event, base);
      assert.match(url.pathname, /^\/s\/[a-f0-9]{8}\/$/);
      assert.equal(url.origin, origin);
      assert.equal(url.search + url.hash, '');
      assert.ok(url.href.length < long.length / 2);
      const entry = links[url.pathname.split('/')[2]];
      assert.equal(entry.festivalId, festival.id);
      assert.equal(entry.eventId, event.id);
      const html = pages.get(url.pathname);
      assert.ok(html.includes(`href="${esc(long.slice(origin.length))}"`));
      const params = new URL(long).searchParams;
      assert.equal(festivalFor(params.toString()).id, festival.id);
      assert.equal(params.get('funcion'), event.id);
      assert.equal(params.get('dia'), event.date);
      urls.add(url.href);
    }
  }
  assert.equal(urls.size, festivals.reduce((total, festival) => total + festival.events.length, 0));
});

test('initial HTML supplies previews without JavaScript and directs visitors to the exact dashboard screening', async () => {
  for (const festival of festivals) {
    for (const event of festival.events) {
      const url = sharedScreeningUrl(festival, event, base);
      const html = pages.get(new URL(url).pathname);
      const title = event.title || festival.films[event.filmId].title;
      assert.ok(html.includes(`<h1>${esc(title)}</h1>`));
      assert.ok(html.includes(`rel="canonical" href="${url}"`));
      assert.ok(html.includes(`property="og:url" content="${url}"`));
      assert.ok(html.includes(esc(festival.name)));
      assert.ok(html.includes(clock(event.start)));
      assert.ok(html.includes(esc(roomLocation(festival.rooms.find(room => room.id === event.roomId)))));
      assert.ok(html.includes(`property="og:image" content="${origin}/assets/share-preview.png"`));
      assert.match(html, /og:image:alt/);
      assert.match(html, /twitter:card" content="summary_large_image/);
      const agenda = agendaScreeningUrl(festival, event, base).slice(origin.length);
      assert.ok(html.includes(`data-screening-url="${esc(agenda)}"`));
      assert.match(html, /src="\/open-screening.js\?v=20261112-direct"/);
      assert.ok(html.indexOf('property="og:image"') < html.indexOf('<script'));
      assert.doesNotMatch(html, /http-equiv="refresh"/);
    }
  }
  const png = await readFile(new URL('../assets/share-preview.png', import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test('codes survive changed dates, rooms, titles, ordering and repeated screenings', () => {
  const changed = structuredClone(festivals).reverse();
  for (const festival of changed) {
    festival.events.reverse();
    for (const event of festival.events) {
      event.date = '2027-01-01';
      event.start = 1200;
      event.roomId = festival.rooms[0].id;
      event.title = 'Título corregido';
      const url = sharedScreeningUrl(festival, event, base);
      assert.equal(links[new URL(url).pathname.split('/')[2]].eventId, event.id);
    }
  }
  const updated = updateLinks(changed, links);
  assert.deepEqual(Object.keys(updated), Object.keys(links));
  for (const code of Object.keys(links)) {
    assert.equal(updated[code].eventId, links[code].eventId);
    assert.equal(updated[code].festivalId, links[code].festivalId);
    assert.equal(updated[code].title, 'Título corregido');
  }
  const html = buildShortPages(changed, updated, asOf).values().next().value;
  assert.match(html, /2027-01-01/);
  assert.match(html, /20:00/);
  assert.match(html, /Título corregido/);
});

test('withdrawn screenings retain their identity and show unavailable rather than another event', () => {
  const changed = structuredClone(festivals);
  const removed = changed[0].events.shift();
  const updated = updateLinks(changed, links);
  const path = new URL(sharedScreeningUrl(festivals[0], removed, base)).pathname;
  const html = buildShortPages(changed, updated, asOf).get(path);
  assert.deepEqual(updated[path.split('/')[2]], links[path.split('/')[2]]);
  assert.match(html, /ya no aparece en la programación publicada/);
  assert.doesNotMatch(html, /funcion=|Ver en la agenda|open-screening\.js/);
  assert.ok(html.includes(removed.title || festivals[0].films[removed.filmId].title));
  const archivedFestival = buildShortPages([], updated, asOf).get(path);
  assert.match(archivedFestival, /href="\/">Abrir agenda/);
});

test('explicitly rebinding a renamed source event preserves its published code', () => {
  const changed = structuredClone(festivals);
  const event = changed[0].events[0];
  const code = new URL(sharedScreeningUrl(changed[0], event, base)).pathname.split('/')[2];
  event.id = 'reviewed-replacement-source-id';
  const rebound = structuredClone(links);
  rebound[code].eventId = event.id;
  const updated = updateLinks(changed, rebound);
  assert.equal(Object.keys(updated).length, Object.keys(links).length);
  assert.equal(updated[code].eventId, event.id);
  const html = buildShortPages(changed, updated, asOf).get(`/s/${code}/`);
  assert.match(html, /funcion=reviewed-replacement-source-id/);
  assert.doesNotMatch(html, /ya no aparece/);
});

test('programmes retain every component; unknown duration and archive states remain explicit', () => {
  const fidocs = festivals[1];
  const event = fidocs.events.find(event => fidocs.films[event.filmId].components);
  const html = pages.get(new URL(sharedScreeningUrl(fidocs, event, base)).pathname);
  assert.match(html, /Películas del programa/);
  for (const film of fidocs.films[event.filmId].components) assert.ok(html.includes(esc(film.title)));
  const sanfic = festivals[0];
  assert.match(pages.get(new URL(sharedScreeningUrl(sanfic, sanfic.events[0], base)).pathname), /Archivo de fechas pasadas/);
  const unknown = notFoundPage(asOf);
  assert.match(unknown, /No encontramos esta página/);
  assert.match(unknown, /name="robots" content="noindex"/);
  assert.doesNotMatch(unknown, /funcion=/);
  const winner = fidocs.events.find(event => event.filmId === 'mejor-opera-prima-fidocs-30');
  const pending = pages.get(new URL(sharedScreeningUrl(fidocs, winner, base)).pathname);
  assert.match(pending, /Duración no publicada/);
  assert.match(pending, /Película ganadora y duración por anunciar/);
});

test('unpublished identities fall back to exact legacy links; collisions and invalid registries fail', () => {
  const festival = festivals[0];
  const event = { ...festival.events[0], id: 'new-unpublished-performance' };
  assert.equal(sharedScreeningUrl(festival, event, base), agendaScreeningUrl(festival, event, base));
  assert.throws(() => updateLinks([], { invalid: { festivalId: 'x', eventId: 'y', title: 'z' } }), /Invalid/);
  const firstCode = Object.keys(links)[0];
  assert.throws(() => updateLinks([], { '00000000': links[firstCode], '11111111': links[firstCode] }), /Duplicate/);
  const [code, identity] = Object.entries(updateLinks([festival], {}))[0];
  assert.throws(() => updateLinks([festival], { [code]: { ...identity, eventId: 'different-event' } }), /collision/);
});
