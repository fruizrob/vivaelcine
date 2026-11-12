import { test } from 'node:test';
import assert from 'node:assert/strict';
import { archiveNavigation, festivalFinished, hasExplicitSelection, visibleDays } from '../archive-navigation.js';

function festival(id, dates, events = []) {
  return {
    id, timeZone: 'America/Santiago', films: { film: { duration: 90 } },
    days: dates.map(date => ({ date })),
    events: events.length ? events : dates.map(date => ({ id: `${id}-${date}`, date, start: 1200, filmId: 'film' })),
  };
}
const at = instant => new Date(instant);

test('only finished festivals disappear; selected archive stays visible without revealing other archives', () => {
  const past = festival('past', ['2026-11-01']);
  const otherPast = festival('other-past', ['2026-10-01']);
  const current = festival('current', ['2026-11-10', '2026-11-12']);
  const future = festival('future', ['2026-11-20']);
  const catalogue = [past, otherPast, current, future];
  const now = at('2026-11-12T15:00:00Z');
  assert.deepEqual(archiveNavigation(catalogue, current, { now }).festivals, [current, future]);
  assert.deepEqual(archiveNavigation(catalogue, past, { now, pinned: true }).festivals, [past, current, future]);
  assert.deepEqual(archiveNavigation(catalogue, past, { now, showPast: true }).festivals, catalogue);
  assert.equal(archiveNavigation(catalogue, current, { now }).hasPast, true);
});

test('current Monday–Sunday week remains whole; prior weeks hide and selected dates remain reachable', () => {
  const data = festival('weeks', ['2026-11-01', '2026-11-02', '2026-11-08', '2026-11-09', '2026-11-12', '2026-11-16']);
  const now = at('2026-11-12T15:00:00Z');
  const dates = options => visibleDays(data, { now, ...options }).map(day => day.date);
  assert.deepEqual(dates(), ['2026-11-09', '2026-11-12', '2026-11-16']);
  assert.deepEqual(dates({ selectedDate: '2026-11-02' }), ['2026-11-02', '2026-11-09', '2026-11-12', '2026-11-16']);
  assert.deepEqual(dates({ showPast: true }), data.days.map(day => day.date));
  assert.deepEqual(visibleDays(data, { now: at('2026-11-09T02:59:59Z') }), data.days.slice(1));
});

test('known overnight screenings retain their festival and previous week until the exact end', () => {
  const data = festival('night', ['2026-11-08'], [{ date: '2026-11-08', start: 1410, filmId: 'film', duration: 120 }]);
  const during = at('2026-11-09T04:00:00Z'); // Monday 01:00 in Santiago
  assert.equal(festivalFinished(data, during), false);
  assert.equal(visibleDays(data, { now: during }).length, 1);
  const finish = at('2026-11-09T04:30:00Z');
  assert.equal(festivalFinished(data, finish), true);
  assert.equal(visibleDays(data, { now: finish }).length, 0);
});

test('elapsed runtimes cross DST and ignore the execution host timezone', () => {
  const data = festival('dst', ['2026-03-08'], [{ date: '2026-03-08', start: 90, filmId: 'film', duration: 120 }]);
  data.timeZone = 'America/New_York';
  assert.equal(festivalFinished(data, at('2026-03-08T08:29:59Z')), false);
  assert.equal(festivalFinished(data, at('2026-03-08T08:30:00Z')), true);
});

test('unknown durations retain their local day without borrowing a film duration', () => {
  const data = festival('unknown', ['2026-11-08'], [{ date: '2026-11-08', start: 1200, filmId: 'film', duration: null }]);
  assert.equal(festivalFinished(data, at('2026-11-09T02:59:59Z')), false);
  assert.equal(festivalFinished(data, at('2026-11-09T03:00:00Z')), true);
  const empty = { ...data, events: [] };
  assert.equal(festivalFinished(empty, at('2026-11-09T02:59:59Z')), false);
  const lateStart = { ...data, events: [{ ...data.events[0], start: 1500 }] };
  assert.equal(festivalFinished(lateStart, at('2026-11-09T05:00:00Z')), false);
  assert.equal(festivalFinished(lateStart, at('2026-11-10T03:00:00Z')), true);
});

test('all-past catalogue shows an empty default with an archive action, while deep links remain browsable', () => {
  const data = festival('past', ['2026-11-01']);
  const now = at('2026-12-01T15:00:00Z');
  const nav = archiveNavigation([data], data, { now });
  assert.deepEqual(nav.festivals, []);
  assert.equal(nav.showSchedule, false);
  assert.equal(nav.hasPast, true);
  assert.equal(archiveNavigation([data], data, { now, showPast: true }).showSchedule, true);
  for (const search of ['?festival=past', '?dia=2026-11-01', '?funcion=past-2026-11-01']) {
    const pinned = hasExplicitSelection(data, search);
    assert.equal(pinned, true, search);
    const linked = archiveNavigation([data], data, { now, pinned, selectedDate: data.days[0].date });
    assert.equal(linked.showSchedule, true);
    assert.deepEqual(linked.festivals, [data]);
    assert.deepEqual(linked.days, data.days);
  }
  assert.equal(hasExplicitSelection(data, '?festival=unknown&dia=invalid&funcion=missing'), false);
});

test('a skipped Santiago midnight cannot archive unknown durations or an empty final day early', () => {
  const data = festival('skipped-midnight', ['2026-09-05'], [{ date: '2026-09-05', start: 1200, filmId: 'film', duration: null }]);
  for (const sample of [data, { ...data, events: [] }]) {
    assert.equal(festivalFinished(sample, at('2026-09-06T03:30:00Z')), false);
    assert.equal(festivalFinished(sample, at('2026-09-06T03:59:59Z')), false);
    assert.equal(festivalFinished(sample, at('2026-09-06T04:00:00Z')), true);
  }
});

test('Santiago repeated final hour stays available until the local date actually changes', () => {
  const data = festival('repeated-hour', ['2026-04-04'], [{ date: '2026-04-04', start: 1200, filmId: 'film', duration: null }]);
  for (const sample of [data, { ...data, events: [] }]) {
    assert.equal(festivalFinished(sample, at('2026-04-05T02:30:00Z')), false);
    assert.equal(festivalFinished(sample, at('2026-04-05T03:30:00Z')), false);
    assert.equal(festivalFinished(sample, at('2026-04-05T04:00:00Z')), true);
  }
});

test('a repeated midnight ends the previous date at its first occurrence and retains the new date', () => {
  const before = festival('havana-before', ['2026-10-31'], [{ date: '2026-10-31', start: 1200, filmId: 'film', duration: null }]);
  before.timeZone = 'America/Havana';
  const during = festival('havana-during', ['2026-11-01'], [{ date: '2026-11-01', start: 1200, filmId: 'film', duration: null }]);
  during.timeZone = before.timeZone;
  for (const sample of [before, { ...before, events: [] }]) {
    assert.equal(festivalFinished(sample, at('2026-11-01T03:59:59Z')), false);
    assert.equal(festivalFinished(sample, at('2026-11-01T04:00:00Z')), true);
    assert.equal(festivalFinished(sample, at('2026-11-01T05:00:00Z')), true);
  }
  for (const sample of [during, { ...during, events: [] }]) {
    assert.equal(festivalFinished(sample, at('2026-11-01T04:30:00Z')), false);
    assert.equal(festivalFinished(sample, at('2026-11-01T05:30:00Z')), false);
    assert.equal(festivalFinished(sample, at('2026-11-02T04:59:59Z')), false);
    assert.equal(festivalFinished(sample, at('2026-11-02T05:00:00Z')), true);
  }
});

test('week boundaries work across years', () => {
  const data = festival('new-year', ['2026-12-27', '2026-12-28', '2027-01-01', '2027-01-04']);
  assert.deepEqual(visibleDays(data, { now: at('2027-01-01T15:00:00Z') }).map(day => day.date),
    ['2026-12-28', '2027-01-01', '2027-01-04']);
});
