import { test } from 'node:test';
import assert from 'node:assert/strict';
import { festivals, festivalFor } from '../data.js';
import { screeningUrl } from '../story.js';
import { drawTimeline } from '../timeline.js';
import { durationOf } from '../core.js';

test('every screening link selects its festival, date, and exact event', () => {
  for (const festival of festivals) {
    for (const event of festival.events) {
      const url = new URL(screeningUrl(festival, event,
        'https://vivaelcine.cl/?festival=old&dia=wrong&funcion=old&utm_source=test#schedule'));
      const selected = festivalFor(url.search);
      assert.equal(selected.id, festival.id);
      assert.equal(selected.events.find(item => item.id === url.searchParams.get('funcion')), event);
      assert.equal(url.searchParams.get('dia'), event.date);
      assert.equal(url.searchParams.size, 3);
      assert.equal(url.hash, '');
    }
  }
});

test('different screenings of the same film have distinct links and preserve hosting paths', () => {
  const festival = festivals[0];
  const first = festival.events.find(event => festival.events.some(other =>
    other.id !== event.id && other.filmId === event.filmId));
  const second = festival.events.find(event => event.id !== first.id && event.filmId === first.filmId);
  const base = 'http://localhost:4174/vivaelcine/';
  const firstUrl = screeningUrl(festival, first, base);
  assert.notEqual(firstUrl, screeningUrl(festival, second, base));
  assert.equal(new URL(firstUrl).pathname, '/vivaelcine/');
});

test('agenda sharing targets each timed screening outside its detail button', () => {
  for (const festival of festivals) {
    for (const day of festival.days) {
      const { html, shown } = drawTimeline(festival, { date: day.date, search: '', venue: '', section: '' });
      const shareIds = [...html.matchAll(/data-share="([^"]+)"/g)].map(match => match[1]);
      assert.deepEqual(shareIds.sort(), shown.filter(event => durationOf(event, festival.films) !== null)
        .map(event => event.id).sort());
      const detailButtons = [...html.matchAll(/<button class="event-main"[\s\S]*?<\/button>/g)];
      for (const [button] of detailButtons) assert.doesNotMatch(button, /data-share=/);
    }
  }
});
