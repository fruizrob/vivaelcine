import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { festivals, festivalFor } from '../data.js';
import { durationOf, endOf, matches } from '../core.js';
import { drawTimeline, timelineRange } from '../timeline.js';

const festival = festivalFor('?festival=ficvina-2026');
const source = JSON.parse(readFileSync(new URL('../assets/ficvina-2026-sources.json', import.meta.url)));
const filters = { search: '', venue: '', section: '' };

test('FICVIÑA preserves every PDF screening, including previews and the double bill', () => {
  assert.equal(festival.id, 'ficvina-2026');
  assert.ok(festivals.includes(festival));
  assert.equal(festival.events.length, 42);
  assert.deepEqual(festival.days.map(day => festival.events.filter(event => event.date === day.date).length), [1, 1, 1, 8, 9, 8, 9, 5]);
  for (const [roomId, count] of Object.entries({ 'cinemark': 12, 'cine-arte': 14, 'teatro-municipal': 13, 'playa-los-marineros': 1, 'muelle-vergara': 1, 'von-schroeders': 1 })) {
    assert.equal(festival.events.filter(event => event.roomId === roomId).length, count);
  }
  assert.deepEqual(festival.events, source.events);
  const individualFilms = Object.values(festival.films).flatMap(film => film.components || [film]);
  assert.equal(individualFilms.length, 85);
  assert.ok(individualFilms.every(film => film.title && film.director && film.source.startsWith('https://')));
  assert.equal(source.activities.length, 13);
  assert.ok(source.activities.every(activity => activity.duration === null));
});

test('all FICVIÑA dates render at their published times without invented ceremony ends', () => {
  for (const day of festival.days) {
    const result = drawTimeline(festival, { ...filters, date: day.date });
    const range = timelineRange(festival, day.date);
    assert.equal(result.shown.length, festival.events.filter(event => event.date === day.date).length);
    assert.equal((result.html.match(/data-event=/g) || []).length, result.shown.length);
    assert.doesNotMatch(result.html, /undefined|NaN|Infinity/);
    for (const event of result.shown) {
      assert.ok(event.start >= range.start);
      const finish = endOf(event, festival.films);
      if (finish !== null) assert.ok(finish <= range.end);
    }
  }
  for (const id of ['la-frontera', 'la-bola-negra']) {
    const event = festival.events.find(event => event.filmId === id);
    assert.equal(endOf(event, festival.films), null);
    assert.ok(festival.films[id].duration > 0);
  }
});

test('shared programs keep all members searchable and preserve published aggregate runtimes', () => {
  const totals = { 'pulso-1': 119, 'pulso-2': 103, 'universos-1': 96, 'universos-2': 86, 'habitar-cortos': 86, 'ruca-1': 44, 'ruca-2': 57, 'cine-chileno': 105 };
  for (const [id, duration] of Object.entries(totals)) {
    const event = festival.events.find(event => event.filmId === id);
    const film = festival.films[id];
    assert.equal(durationOf(event, festival.films), duration);
    for (const part of film.components) assert.equal(matches(event, film, { ...filters, search: part.title }), true);
  }
  assert.deepEqual(festival.films['cine-chileno'].components.map(film => film.duration), [7, 98]);
  assert.equal(festival.events.find(event => event.filmId === 'karmele').start, 870);
  assert.match(festival.films.karmele.note, /15:00.*14:30/);
});

test('the offline importer reproduces the schedule from the preserved, hashed official PDF', () => {
  const pdf = readFileSync(new URL('../assets/programacion-ficvina-2026.pdf', import.meta.url));
  assert.equal(createHash('sha256').update(pdf).digest('hex'), source.sha256);
  const file = new URL('../data/ficvina-2026.js', import.meta.url);
  const before = readFileSync(file, 'utf8');
  execFileSync(process.execPath, [new URL('../scripts/import-ficvina-2026.mjs', import.meta.url).pathname]);
  assert.equal(readFileSync(file, 'utf8'), before);
});
