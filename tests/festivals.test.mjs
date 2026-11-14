import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { festivals, festivalFor } from '../data.js';
import { durationOf, endOf, initialDay, matches } from '../core.js';
import { drawTimeline, timelineRange } from '../timeline.js';

const filters = { search: '', venue: '', section: '' };
const sanfic = festivals.find(festival => festival.id === 'sanfic-2026');
const fidocs = festivals.find(festival => festival.id === 'fidocs-2026');

function schedule(id, dates, publishedDates = dates, timeZone = 'America/Santiago') {
  return {
    ...sanfic, id, timeZone,
    days: dates.map(date => ({ date })),
    events: publishedDates.map((date, index) => ({ ...sanfic.events[0], id: `${id}-${index}`, date })),
  };
}

test('initial day uses the festival timezone rather than the UTC date', () => {
  assert.equal(initialDay(sanfic, null, new Date('2026-11-05T01:00:00Z')), '2026-11-04');
  assert.equal(initialDay(sanfic, null, new Date('2026-11-05T04:00:00Z')), '2026-11-05');
});

test('valid day links override today; invalid links fall back to today', () => {
  const now = new Date('2026-11-04T15:00:00Z');
  assert.equal(initialDay(sanfic, '2026-11-02', now), '2026-11-02');
  assert.equal(initialDay(sanfic, '2026-11-99', now), '2026-11-04');
});

test('festivals outside their dates still open on their first day', () => {
  assert.equal(initialDay(fidocs, null, new Date('2026-11-04T15:00:00Z')), '2026-11-13');
  assert.equal(initialDay(fidocs, null, new Date('2026-12-01T15:00:00Z')), '2026-11-13');
});

test('November 11 homepage selects the next populated festival and matching timeline', () => {
  const now = new Date('2026-11-11T15:00:00Z');
  const selected = festivalFor('', now);
  const date = initialDay(selected, null, now);
  assert.equal(selected, fidocs);
  assert.equal(date, '2026-11-13');
  const { shown } = drawTimeline(selected, { ...filters, date });
  assert.ok(shown.length > 0);
  assert.ok(shown.every(event => event.date === date));
  assert.equal(festivalFor('?festival=sanfic-2026', now), sanfic);
  assert.equal(initialDay(sanfic, null, now), '2026-11-02');
});

test('today and nonconsecutive populated dates skip empty metadata across year boundaries', () => {
  const sample = schedule('gaps', ['2026-12-29', '2026-12-30', '2027-01-03', '2027-01-08'],
    ['2027-01-08', '2026-12-29', '2027-01-03']);
  assert.equal(initialDay(sample, null, new Date('2026-12-29T15:00:00Z')), '2026-12-29');
  assert.equal(initialDay(sample, null, new Date('2026-12-30T15:00:00Z')), '2027-01-03');
  assert.equal(initialDay(sample, '2026-12-30', new Date('2026-12-30T15:00:00Z')), '2026-12-30');
  assert.equal(initialDay(sample, null, new Date('2027-02-01T15:00:00Z')), '2026-12-29');
});

test('global selection uses populated dates, independent of catalogue and event order', () => {
  const later = schedule('later', ['2026-11-12', '2026-11-17'], ['2026-11-17']);
  const earlier = schedule('earlier', ['2026-11-13', '2026-11-16'], ['2026-11-16', '2026-11-13']);
  const empty = schedule('empty', ['2026-11-11', '2026-11-12'], []);
  const now = new Date('2026-11-11T15:00:00Z');
  assert.equal(festivalFor('', now, [empty, later, earlier]), earlier);
  assert.equal(festivalFor('?festival=later', now, [later, earlier]), later);
  assert.equal(initialDay(later, null, now), '2026-11-17');
  assert.equal(festivalFor('', new Date('2026-11-13T15:00:00Z'), [later, earlier]), earlier);
});

test('each festival uses its local today, with today ahead of future civil dates elsewhere', () => {
  const east = schedule('east', ['2027-01-02'], undefined, 'Pacific/Kiritimati');
  const west = schedule('west', ['2027-01-01'], undefined, 'Pacific/Honolulu');
  const now = new Date('2027-01-01T10:30:00Z'); // Jan 2 in Kiritimati; Jan 1 in Honolulu.
  assert.equal(initialDay(east, null, now), '2027-01-02');
  assert.equal(initialDay(west, null, now), '2027-01-01');
  assert.equal(festivalFor('', now, [east, west]), west); // Both today: earliest civil date.
  const westernTomorrow = schedule('tomorrow', ['2027-01-02'], undefined, 'Pacific/Honolulu');
  assert.equal(festivalFor('', now, [westernTomorrow, east]), east);
  const westernFuture = schedule('future', ['2027-01-01'], undefined, 'Etc/GMT+12');
  assert.equal(festivalFor('', now, [westernFuture, east]), east); // Local today wins over an earlier future date.
});

test('archive fallback and same-date ties preserve registry order, including empty schedules', () => {
  const empty = schedule('empty', ['2026-11-01'], []);
  const first = schedule('first', ['2026-11-13']);
  const second = schedule('second', ['2026-11-13']);
  const catalogue = [empty, first, second];
  assert.equal(festivalFor('', new Date('2026-11-11T15:00:00Z'), catalogue), first);
  assert.equal(festivalFor('', new Date('2026-12-01T15:00:00Z'), catalogue), empty);
  assert.equal(initialDay(empty, null, new Date('2026-11-11T15:00:00Z')), '2026-11-01');
});

test('explicit festival, day and screening destinations survive automatic selection', () => {
  const now = new Date('2026-11-11T15:00:00Z');
  const event = sanfic.events[0];
  assert.equal(festivalFor('?dia=2026-11-04', now), sanfic);
  assert.equal(festivalFor('?dia=2026-11-14', now), fidocs);
  assert.equal(festivalFor(`?funcion=${event.id}&dia=2026-11-14`, now), sanfic);
  assert.equal(festivalFor(`?festival=fidocs-2026&funcion=${event.id}`, now), fidocs);
  assert.equal(festivalFor('?festival=unknown&dia=invalid&funcion=unknown', now), fidocs);
  assert.equal(initialDay(sanfic, '2026-11-04', now), '2026-11-04');
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
  assert.equal(covered.size, fidocs.events.filter(event => fidocs.films[event.filmId].kind !== 'activity').length);
  assert.equal(covered.size, 48);
  assert.equal(fidocs.events.length, 52);
});

test('festival links select independent schedules and preserve existing SANFIC links', () => {
  assert.equal(festivalFor('?festival=fidocs-2026'), fidocs);
  assert.equal(festivalFor('?dia=2026-11-04').id, 'sanfic-2026');
  assert.equal(festivalFor('?festival=unknown', new Date('2026-11-04T15:00:00Z')), sanfic);
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

test('parallel activities use published intervals, venues and registration without film identities', () => {
  const activities = fidocs.events.filter(event => fidocs.films[event.filmId].kind === 'activity');
  assert.deepEqual(activities.map(event => [event.date, event.start, endOf(event, fidocs.films), event.roomId]), [
    ['2026-11-13', 720, 810, 'sala-k'],
    ['2026-11-15', 600, 690, 'ceina-cine'],
    ['2026-11-16', 1020, 1080, 'sala-k'],
    ['2026-11-17', 690, 810, 'udp-biblioteca'],
  ]);
  assert.equal(activities.filter(event => fidocs.films[event.filmId].registrationUrl).length, 3);
  const sources = JSON.parse(readFileSync(new URL('../assets/fidocs-2026-sources.json', import.meta.url)));
  assert.deepEqual(new Set(sources.activityListings.map(event => event.id)), new Set(activities.map(event => event.id)));
  for (const event of activities) {
    const record = fidocs.films[event.filmId];
    assert.equal(record.year, undefined);
    assert.equal(record.director, undefined);
    assert.equal(record.letterboxd, undefined);
    assert.equal(record.ticketUrl, undefined);
    const result = drawTimeline(fidocs, { date: event.date, search: record.title,
      section: 'actividades-paralelas', venue: event.venueId });
    assert.deepEqual(result.shown.map(item => item.id), [event.id]);
    assert.match(result.html, new RegExp(`data-event="${event.id}"`));
  }
});

test('Borges uses individual PDF runtimes and only unannounced winners keep unknown ends', () => {
  const parts = fidocs.events.filter(event => event.filmId === 'biografia-de-jorge-luis-borges');
  assert.deepEqual(parts.map(event => durationOf(event, fidocs.films)), [130, 89, 104]);
  assert.deepEqual(parts.map(event => endOf(event, fidocs.films)), [790, 944, 1064]);
  for (const event of parts) assert.match(event.durationSource, /Programacion-FIDOCS-30\.pdf$/);
  const unknown = fidocs.events.filter(event => endOf(event, fidocs.films) === null);
  assert.equal(unknown.length, 3);
  assert.ok(unknown.every(event => fidocs.films[event.filmId].section === 'ganadoras'));
  assert.equal(fidocs.films['cortos-emergentes-1'].duration, 79);
  assert.equal(fidocs.films['la-batalla-de-chile-parte-i-ii-y-iii'].duration, 263);
  assert.equal(fidocs.films['sergio-bravo'].free, true);
  assert.equal(fidocs.films['sergio-bravo'].qa, true);
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
