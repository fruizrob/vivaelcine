import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { festivals, festivalFor } from '../data.js';
import { durationOf, endOf, initialDay, matches } from '../core.js';
import { drawTimeline, timelineRange } from '../timeline.js';

const filters = { search: '', venue: '', section: '' };
const fidocs = festivals.find(festival => festival.id === 'fidocs-2026');

test('initial day uses the festival timezone rather than the UTC date', () => {
  const sanfic = festivalFor('');
  assert.equal(initialDay(sanfic, null, new Date('2026-11-05T01:00:00Z')), '2026-11-04');
  assert.equal(initialDay(sanfic, null, new Date('2026-11-05T04:00:00Z')), '2026-11-05');
});

test('valid day links override today; invalid links fall back to today', () => {
  const sanfic = festivalFor('');
  const now = new Date('2026-11-04T15:00:00Z');
  assert.equal(initialDay(sanfic, '2026-11-02', now), '2026-11-02');
  assert.equal(initialDay(sanfic, '2026-11-99', now), '2026-11-04');
});

test('festivals outside their dates still open on their first day', () => {
  assert.equal(initialDay(fidocs, null, new Date('2026-11-04T15:00:00Z')), '2026-11-13');
  assert.equal(initialDay(fidocs, null, new Date('2026-12-01T15:00:00Z')), '2026-11-13');
});

test('every official FIDOCS listing and published start maps to a screening', () => {
  const sources = JSON.parse(readFileSync(new URL('../assets/fidocs-2026-sources.json', import.meta.url)));
  assert.equal(sources.listingPages.length, 4);
  assert.equal(sources.listings.length, 51);
  assert.equal(new Set(sources.listings.map(listing => listing.url)).size, 51);
  const covered = new Set();
  for (const listing of sources.listings) {
    const events = listing.eventIds.map(id => fidocs.events.find(event => event.id === id));
    assert.ok(events.every(Boolean), listing.url);
    assert.deepEqual(events.map(event => event.start).sort((a, b) => a - b), listing.publishedStarts, listing.url);
    for (const event of events) {
      assert.equal(event.date, listing.publishedDate, listing.url);
      if (listing.componentOf) {
        assert.equal(event.filmId, listing.componentOf);
        assert.ok(fidocs.films[event.filmId].components.some(component => component.filmId === listing.filmId));
      } else assert.equal(event.filmId, listing.filmId);
      covered.add(event.id);
    }
  }
  assert.equal(covered.size, fidocs.events.length);
  assert.equal(fidocs.events.length, 48);
});

test('festival links select independent schedules and preserve existing SANFIC links', () => {
  assert.equal(festivalFor('?festival=fidocs-2026'), fidocs);
  assert.equal(festivalFor('?dia=2026-11-04').id, 'sanfic-2026');
  assert.equal(festivalFor('?festival=unknown').id, 'sanfic-2026');
  assert.equal(new Set(festivals.flatMap(festival => festival.events.map(event => event.id))).size,
    festivals.reduce((count, festival) => count + festival.events.length, 0));
  for (const festival of festivals) {
    for (const event of festival.events) {
      assert.ok(festival.days.some(day => day.date === event.date), event.id);
      assert.ok(festival.rooms.some(room => room.id === event.roomId && room.venueId === event.venueId), event.id);
      assert.ok(festival.sections[festival.films[event.filmId]?.section], event.id);
    }
  }
});

test('FIDOCS morning screenings and all published dates fit the timeline', () => {
  const range = timelineRange(fidocs);
  assert.ok(fidocs.events.some(event => event.start === 660));
  assert.ok(range.start <= 660);
  for (const day of fidocs.days) {
    const result = drawTimeline(fidocs, { ...filters, date: day.date });
    const dailyRange = timelineRange(fidocs, day.date);
    assert.equal(result.shown.length, fidocs.events.filter(event => event.date === day.date).length);
    assert.equal((result.html.match(/data-event=/g) || []).length, result.shown.length);
    assert.doesNotMatch(result.html, /undefined|NaN|Infinity/);
    for (const event of result.shown) {
      assert.ok(event.start >= dailyRange.start);
      const finish = endOf(event, fidocs.films);
      if (finish !== null) assert.ok(finish <= dailyRange.end);
    }
  }
});

test('an unknown part duration cannot inherit the full work runtime', () => {
  const films = { trilogy: { title: 'Trilogy', duration: 263 } };
  const event = { filmId: 'trilogy', start: 900, duration: null };
  assert.equal(durationOf(event, films), null);
  assert.equal(endOf(event, films), null);
  assert.equal(endOf({ ...event, duration: 96 }, films), 996);
});

test('unknown durations show start markers instead of fabricated intervals', () => {
  const unknown = fidocs.events.filter(event => durationOf(event, fidocs.films) === null);
  assert.ok(unknown.length >= 3);
  for (const event of unknown) {
    const result = drawTimeline(fidocs, { ...filters, date: event.date });
    const article = result.html.match(new RegExp(`<article[^>]*data-event="${event.id}"[^>]*>`))?.[0];
    assert.ok(article?.includes('unknown'), event.id);
    assert.ok(article?.includes('width:0%;'), event.id);
    assert.equal(endOf(event, fidocs.films), null);
  }
});

test('short program members remain searchable within their shared screening', () => {
  const event = fidocs.events.find(event => fidocs.films[event.filmId].components?.length > 1);
  assert.ok(event);
  const film = fidocs.films[event.filmId];
  assert.equal(matches(event, film, { ...filters, search: film.components[0].title }), true);
  if (film.durationKind === 'sum') {
    assert.equal(film.duration, film.components.reduce((sum, component) => sum + component.duration, 0));
  }
});

test('overlapping screenings in a room stay visible on separate lanes', () => {
  const sample = {
    ...fidocs,
    events: [
      { ...fidocs.events[0], id: 'overlap-a', start: 660, duration: 100 },
      { ...fidocs.events[0], id: 'overlap-b', start: 700, duration: 100 },
    ],
  };
  const result = drawTimeline(sample, { ...filters, date: sample.events[0].date });
  assert.ok(result.html.includes('--lanes:2'));
  assert.ok(result.html.includes('--lane:1;'));
  assert.ok(result.html.includes('data-event="overlap-a"'));
  assert.ok(result.html.includes('data-event="overlap-b"'));
});
