import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawStory } from '../story.js';

const event = { id: 'show-1', filmId: 'movie', date: '2026-11-14', start: 1500, roomId: 'room' };
const festival = {
  id: 'test-2026', name: 'Festival actual',
  rooms: [{ id: 'room', venue: 'Cine', name: 'Sala 1' }],
  films: { movie: { title: 'Una película', director: 'Una directora', year: 2025, duration: 120 } },
  filmPosters: { 'test-2026/movie': { path: '/poster123.jpg' } },
  festivalHistory: { 'test-2026/movie': [
    { festival: 'Cannes', date: '2025-05', premiere: 'Estreno mundial' },
    { festival: 'Berlinale', date: '2026-02' },
  ] },
};

function canvas() {
  const text = [];
  const images = [];
  const context = {
    fillRect() {},
    fillText(value, x, y) { text.push({ value, x, y, font: this.font }); },
    measureText(value) { return { width: value.length * parseFloat(this.font) * 0.55 }; },
    drawImage(image, ...bounds) { images.push({ src: image.src, bounds }); },
  };
  return { text, images, getContext: () => context };
}

test('Story artwork preserves identity, premiere semantics and image failure fallbacks', async t => {
  let requests;
  let fail;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: class {
    set src(value) {
      this.url = value;
      this.naturalWidth = value.includes('tmdb') ? 600 : 200;
      this.naturalHeight = value.includes('tmdb') ? 900 : 100;
      requests.push({ src: value, crossOrigin: this.crossOrigin });
      queueMicrotask(() => fail(value) ? this.onerror?.() : this.onload?.());
    }
    get src() { return this.url; }
  } });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'Image', descriptor);
    else delete globalThis.Image;
  });
  t.beforeEach(() => { requests = []; fail = () => false; });

  await t.test('includes an uncropped poster, premiere logo, year, runtime and exact screening time', async () => {
    const result = canvas();
    await drawStory(result, festival, event);
    assert.equal(result.width, 1080);
    assert.equal(result.height, 1920);
    assert.equal(result.images.length, 2);
    const poster = result.images[0];
    assert.equal(poster.src, 'https://image.tmdb.org/t/p/w780/poster123.jpg');
    assert.ok(Math.abs(poster.bounds[2] / poster.bounds[3] - 600 / 900) < 1e-10);
    assert.ok(requests.every(request => request.crossOrigin === 'anonymous'));
    const values = result.text.map(item => item.value);
    for (const value of ['Cannes', 'Estreno mundial · 2025', '2025 · 120 min', '01:00 (+1 día)', 'Cine · Sala 1']) {
      assert.ok(values.includes(value), value);
    }
    assert.ok(!values.includes('Berlinale'));
  });

  await t.test('failed poster keeps the logo and readable title; failed logo keeps the poster and festival name', async () => {
    for (const failed of ['tmdb', 'festivals']) {
      fail = value => value.includes(failed);
      const result = canvas();
      await drawStory(result, festival, event);
      assert.equal(result.images.length, 1);
      assert.ok(!result.images[0].src.includes(failed));
      assert.ok(result.text.some(item => item.value === 'Una película'));
      assert.ok(result.text.some(item => item.value === 'Cannes'));
    }
  });

  await t.test('earliest known appearance is labelled without asserting a world premiere, even without a logo', async () => {
    const result = canvas();
    await drawStory(result, { ...festival, festivalHistory: { 'test-2026/movie': [
      { festival: 'Festival desconocido', date: '2024' },
      ...festival.festivalHistory['test-2026/movie'].map(({ premiere, ...appearance }) => appearance),
    ] } }, event);
    assert.ok(result.text.some(item => item.value === 'Festival desconocido'));
    assert.ok(result.text.some(item => item.value === 'Primera aparición registrada · 2024'));
    assert.equal(result.images.length, 1);
  });

  await t.test('programmes attribute a member festival and do not borrow the member or parent poster', async () => {
    const result = canvas();
    await drawStory(result, {
      ...festival,
      films: { movie: { title: 'Programa de cortos', duration: 120, components: [{ filmId: 'short', title: 'Un corto' }] } },
      filmPosters: { ...festival.filmPosters, 'test-2026/short': { path: '/short123.jpg' } },
      festivalHistory: { 'test-2026/short': festival.festivalHistory['test-2026/movie'] },
    }, event);
    assert.ok(requests.every(request => !request.src.includes('tmdb')));
    assert.ok(result.text.some(item => item.value === 'Incluye Un corto'));
  });

  await t.test('separate parts cannot inherit the parent artwork or history; no-artwork mode makes no requests', async () => {
    for (const [screening, options] of [[{ ...event, title: 'Parte II' }, {}], [event, { artwork: false }]]) {
      requests = [];
      const result = canvas();
      await drawStory(result, festival, screening, options);
      assert.equal(requests.length, 0);
      assert.equal(result.images.length, 0);
      assert.ok(result.text.some(item => item.value === (screening.title || 'Una película')));
    }
  });
});
