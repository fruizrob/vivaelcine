import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderFilmPoster } from '../film-poster.js';

const poster = { path: '/art123.jpg', source: 'https://www.themoviedb.org/movie/1' };
const event = { id: 'screening-1', filmId: 'film' };
const festival = {
  id: 'festival', films: { film: { title: 'A film' } },
  filmPosters: { 'festival/film': poster },
};

test('repeat screenings share a poster with an accessible title and a sized image', () => {
  const html = renderFilmPoster(festival, event);
  assert.match(html, /src="https:\/\/image.tmdb.org\/t\/p\/w342\/art123.jpg"/);
  assert.match(html, /alt="Afiche de A film"/);
  assert.match(html, /width="200" height="300"/);
  assert.equal(renderFilmPoster(festival, { ...event, id: 'screening-2' }), html);
});

test('separately titled parts never inherit the parent movie artwork', () => {
  const part = { ...event, title: 'Part "two" & more' };
  assert.equal(renderFilmPoster(festival, part), '');
  const html = renderFilmPoster({ ...festival, filmPosters: { 'festival/screening-1': poster } }, part);
  assert.match(html, /alt="Afiche de Part &quot;two&quot; &amp; more"/);
});

test('programme artwork belongs to individual members, never the programme itself', () => {
  const members = [{ filmId: 'short', title: 'One short' }, { title: 'Another short' }];
  const data = {
    ...festival, films: { film: { title: 'Programme', components: members } },
    filmPosters: { 'festival/film': poster, 'festival/short': poster, 'festival/film/Another short': poster },
  };
  assert.equal(renderFilmPoster(data, event), '');
  for (const short of members) {
    const html = renderFilmPoster(data, event, short);
    assert.ok(html.includes(`alt="Afiche de ${short.title}"`));
    assert.match(html, /loading="lazy"/);
  }
});

test('missing or malformed poster metadata leaves the text-only detail available', () => {
  assert.equal(renderFilmPoster({ ...festival, filmPosters: undefined }, event), '');
  for (const path of [null, '', '/bad" onerror="alert(1).jpg', '//example.org/image.jpg', 'https://example.org/image.jpg']) {
    assert.equal(renderFilmPoster({ ...festival, filmPosters: { 'festival/film': { path } } }, event), '');
  }
});
