import { test } from 'node:test';
import assert from 'node:assert/strict';
import { festivals, festivalFor } from '../data.js';
import { screeningUrl } from '../story.js';
import { sharedScreeningUrl } from '../screening-links.js';
import { googleCalendarUrl } from '../sharing.js';
import { drawTimeline } from '../timeline.js';
import { durationOf, endOf, roomLocation } from '../core.js';

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

test('google calendar uses the published start, runtime, room and screening link', () => {
  for (const festival of festivals) {
    for (const event of festival.events) {
      const href = googleCalendarUrl(festival, event, 'https://vivaelcine.cl/?utm=1#schedule');
      const url = new URL(href);
      const film = festival.films[event.filmId];
      const room = festival.rooms.find(item => item.id === event.roomId);
      const finish = endOf(event, festival.films);
      assert.equal(`${url.origin}${url.pathname}`, 'https://calendar.google.com/calendar/render');
      assert.equal(url.searchParams.get('action'), 'TEMPLATE');
      assert.equal(url.searchParams.get('ctz'), festival.timeZone);
      assert.equal(url.searchParams.get('text'), `${event.title || film.title} · ${festival.name}`);
      assert.equal(url.searchParams.get('location'), roomLocation(room));
      assert.match(href, /&dates=\d{8}T\d{6}\/\d{8}T\d{6}$/);
      const [start, end] = url.searchParams.get('dates').split('/');
      if (finish == null) {
        assert.equal(start, end);
        assert.match(url.searchParams.get('details'), /Duración por confirmar\./);
      } else assert.notEqual(start, end);
      const screening = new URL(url.searchParams.get('details').split('\n').at(-1));
      assert.equal(screening.href, sharedScreeningUrl(festival, event, 'https://vivaelcine.cl/'));
      assert.equal(screening.hash, '');
    }
  }

  const sanfic = festivals[0];
  const castigo = sanfic.events.find(event => event.filmId === 'el-castigo' && event.date === '2026-11-02');
  const castigoUrl = new URL(googleCalendarUrl(sanfic, castigo, 'https://vivaelcine.cl/'));
  assert.equal(castigoUrl.searchParams.get('dates'), '20261102T170000/20261102T182600');
  assert.equal(castigoUrl.searchParams.get('location'), 'Cinépolis La Reina · Sala 11');
  assert.match(castigoUrl.searchParams.get('details'), /^SANFIC22\nMatías Bize\nhttps:\/\/vivaelcine\.cl\//);

  const fidocs = festivals.find(festival => festival.id === 'fidocs-2026');
  const part = fidocs.events.find(event => event.id === 'fidocs-2026-biografia-de-jorge-luis-borges-14-0660');
  const partUrl = new URL(googleCalendarUrl(fidocs, part, 'https://vivaelcine.cl/'));
  assert.equal(partUrl.searchParams.get('text'), 'Biografía de Jorge Luis Borges — parte 1 · FIDOCS 30');
  assert.equal(partUrl.searchParams.get('dates'), '20261114T110000/20261114T131000');

  const unknownPart = { ...part, duration: null };
  const unknownUrl = new URL(googleCalendarUrl(fidocs, unknownPart, 'https://vivaelcine.cl/'));
  assert.equal(unknownUrl.searchParams.get('dates'), '20261114T110000/20261114T110000');
  assert.match(unknownUrl.searchParams.get('details'), /Duración por confirmar\./);

  const overnight = googleCalendarUrl({
    ...sanfic,
    films: { late: { title: 'Noche', director: 'Ada', duration: 90 } },
  }, {
    id: 'late-night', filmId: 'late', date: '2026-11-08', start: 1410, roomId: 'la-reina-11',
  }, 'https://vivaelcine.cl/');
  assert.match(overnight, /dates=20261108T233000\/20261109T010000$/);
});
