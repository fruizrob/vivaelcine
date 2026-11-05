import { test } from 'node:test';
import assert from 'node:assert/strict';
import { festivals } from '../data.js';
import { clock, endOf, yearOf } from '../core.js';
import { drawTimeline, escapeHtml } from '../timeline.js';

const fidocs = festivals.find(festival => festival.id === 'fidocs-2026');
const base = fidocs.events.find(event => event.letterboxd);
const film = fidocs.films[base.filmId];
const render = (filmOverrides = {}, eventOverrides = {}, festivalHistory = {}) => {
  const event = { ...base, ...eventOverrides };
  return drawTimeline({
    ...fidocs,
    festivalHistory,
    films: { ...fidocs.films, [base.filmId]: { ...film, ...filmOverrides } },
    events: [event],
  }, { date: event.date, search: '', venue: '', section: '' }).html;
};

test('cards show only the start and verified year above the film metadata', () => {
  const html = render();
  const content = html.match(/<span class="event-content">([\s\S]*?)<\/button>/)[1];
  assert.doesNotMatch(content, /\d{2}:\d{2}|event-time/);
  assert.match(content, /event-title[\s\S]*event-director[\s\S]*event-duration/);
  assert.ok(content.includes(escapeHtml(film.director)));
  assert.ok(content.includes(`${base.duration} min`));
  assert.match(html, new RegExp(`class="event-start">${clock(base.start)}</span>`));
  assert.match(html, new RegExp(`class="event-year">${yearOf(base, film)}</span>`));
  assert.doesNotMatch(content, /event-year/);
  assert.doesNotMatch(html, /event-end/);
  assert.ok(html.includes(`${clock(base.start)}–${clock(endOf(base, fidocs.films), true)}`));
  assert.ok(html.includes(`data-detail="${base.id}"`));
  assert.ok(html.includes(`data-share="${base.id}"`));
  assert.ok(html.includes(`https://letterboxd.com/film/${base.letterboxd}/`));
});

test('the sourced festival logo and visible name precede independent footer controls', () => {
  const history = { [`${fidocs.id}/${base.id}`]: [{ festival: 'Cannes', date: '1975', source: 'https://example.org/film' }] };
  const html = render({}, {}, history);
  assert.match(html, /<\/button>\s*<div class="event-footer">[\s\S]*event-festival[\s\S]*event-rating[\s\S]*event-share/);
  assert.match(html, /data-festival-mark="cannes"/);
  assert.match(html, /<span class="event-festival-name">Cannes<\/span>/);
  assert.match(html, /<img src="\.\/assets\/festivals\/cannes.svg\?v=[^"]+" alt=""/);
  assert.match(html, /Cannes · 1975/);
  assert.doesNotMatch(render(), /event-festival/);
});

test('unpublished metadata and runtime do not fabricate card facts or separators', () => {
  const html = render({ director: '', year: undefined, letterboxd: undefined }, { duration: null, year: null, letterboxd: undefined });
  assert.match(html, /Duración por confirmar/);
  assert.match(html, /width:0%;/);
  assert.doesNotMatch(html, /event-director|event-year|event-rating|event-premiere|undefined|NaN/);
  const content = html.match(/<span class="event-content">([\s\S]*?)<\/button>/)[1];
  assert.doesNotMatch(content, /·/);
});

test('card metadata is escaped for both short labels and regular cards', () => {
  for (const duration of [20, 100]) {
    const html = render({ director: '<Director & co>' }, { duration, title: '<Movie>' });
    assert.ok(html.includes('&lt;Director &amp; co&gt;'));
    assert.ok(html.includes('&lt;Movie&gt;'));
    assert.doesNotMatch(html, /<Director|<script>|<Movie>/);
  }
});
