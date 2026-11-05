import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { filmCatalogue, matchProblems, festivalReleases, tmdbClient, collectFilms } from '../scripts/import-tmdb.mjs';
import { festivals } from '../data.js';
import { renderFestivalHistory } from '../festival-history.js';

const movie = (id = 1, overrides = {}) => ({
  id, title: 'El Club', original_title: 'El Club', release_date: '2015-02-09', runtime: 98,
  credits: { crew: [{ job: 'Director', name: 'Pablo Larrain' }] },
  release_dates: { results: [] }, ...overrides,
});
const releases = rows => ({ id: 1, release_dates: { results: rows } });
const premiere = (note, date = '2015-02-09', type = 1) => ({ note, release_date: `${date}T00:00:00.000Z`, type });

test('catalogue covers every screening, programme member and separate part without repeated screenings', () => {
  const catalogue = filmCatalogue();
  const expected = new Set();
  for (const festival of festivals) for (const event of festival.events) {
    const film = festival.films[event.filmId];
    if (film.components) {
      for (const component of film.components) expected.add(`${festival.id}/${component.filmId || `${event.filmId}/${component.title}`}`);
      assert.ok(!catalogue.has(`${festival.id}/${event.filmId}`));
    } else expected.add(`${festival.id}/${event.title ? event.id : event.filmId}`);
  }
  assert.deepEqual(new Set(catalogue.keys()), expected);
  for (const [key, film] of catalogue) {
    assert.ok(film.title, key);
    if (!film.director) assert.equal(film.section, 'ganadoras', key);
  }
  assert.equal(catalogue.get('fidocs-2026/48').title, '48');
  assert.equal(catalogue.get('fidocs-2026/intimate-stranger').title, 'Intimate Stranger');
  assert.equal(catalogue.get('fidocs-2026/foco-federico-luis/La siesta').duration, 15);
  const parts = festivals[1].events.filter(event => event.title);
  for (const part of parts) {
    const film = catalogue.get(`fidocs-2026/${part.id}`);
    assert.equal(film.title, part.title);
    assert.equal(film.originalTitle, part.title);
    assert.equal(film.duration, part.duration);
    assert.equal(film.year, part.year || festivals[1].films[part.filmId].year);
  }
  assert.equal(catalogue.get('sanfic-2026/histeria').alias, 'Hysteria');
});

test('identity requires title, all directors, known year and compatible runtime', () => {
  const film = filmCatalogue().get('sanfic-2026/el-club');
  assert.deepEqual(matchProblems(film, movie()), []);
  assert.deepEqual(matchProblems(film, movie(1, { title: 'Other', original_title: 'Other' })), ['title']);
  assert.deepEqual(matchProblems(film, movie(1, { credits: { crew: [{ job: 'Actor', name: 'Pablo Larraín' }] } })), ['director']);
  assert.deepEqual(matchProblems(film, movie(1, { release_date: '2016-01-01' })), ['year']);
  assert.deepEqual(matchProblems(film, movie(1, { runtime: 92 })), ['runtime']);
  assert.deepEqual(matchProblems(film, movie(1, { runtime: 0 })), ['runtime']);
  assert.deepEqual(matchProblems({ ...film, director: 'Pablo Larraín, Another Director' }, movie()), ['director']);
  assert.deepEqual(matchProblems({ ...film, year: undefined }, movie(1, { release_date: '2014-01-01' })), []);
  assert.deepEqual(matchProblems(film, movie(1, { title: 'The Club', original_title: 'The Club', alternative_titles: { titles: [{ title: 'El Club' }] } })), []);
});

test('premiere types need an identifiable festival; countries and other release types stay out', () => {
  const result = festivalReleases(releases([
    { iso_3166_1: 'DE', release_dates: [premiere('Berlinale'), premiere('Theatrical', '2015-05-01', 3), premiere(''), premiere('Unknown Film Festival')] },
    { iso_3166_1: 'CL', release_dates: [premiere('Berlin International Film Festival'), premiere('Cannes and Venice'), premiere('Cannes', '2015-02-30'), premiere('TIFF')] },
  ]));
  assert.deepEqual(result.appearances, [{ festival: 'Berlinale', date: '2015-02-09', source: 'https://www.themoviedb.org/movie/1/releases' }]);
  assert.equal(result.unclassified.length, 5);
  assert.equal(result.appearances[0].premiere, undefined);
});

test('ambiguous identities do not publish histories; matched films report empty release data', async () => {
  for (const ids of [[1, 2], [1]]) {
    const entries = new Map([['sanfic-2026/el-club', filmCatalogue().get('sanfic-2026/el-club')]]);
    const result = await collectFilms(entries, async path => path === 'search/movie'
      ? { results: ids.map(id => ({ id })) } : movie(Number(path.split('/')[1])));
    assert.deepEqual(result.films, {});
    assert.equal(result.report[0].status, ids.length === 2 ? 'ambiguous' : 'matched');
    assert.equal(result.coverage.withFestivalHistory, 0);
    assert.equal(result.coverage.total, 1);
  }
  await assert.rejects(collectFilms(new Map([['sanfic-2026/el-club', filmCatalogue().get('sanfic-2026/el-club')]]), async () => ({})), /Invalid TMDB search/);
});

test('unannounced winners are reported without searching for an invented film identity', async () => {
  const key = 'fidocs-2026/mejor-opera-prima-fidocs-30';
  const result = await collectFilms(new Map([[key, filmCatalogue().get(key)]]), () => { throw new Error('Unannounced film must not query TMDB'); });
  assert.equal(result.report[0].status, 'unannounced');
  assert.equal(result.coverage.total, 1);
  assert.equal(result.coverage.queried, 0);
  assert.equal(result.coverage.unannounced, 1);
  assert.deepEqual(result.films, {});
  assert.deepEqual(result.posters, {});
});

test('posters publish only for a unique verified identity, independently of festival history', async () => {
  const key = 'sanfic-2026/el-club';
  const entries = new Map([[key, filmCatalogue().get(key)]]);
  for (const [ids, overrides, expected] of [
    [[1], { poster_path: '/club123.jpg' }, { [key]: { path: '/club123.jpg', source: 'https://www.themoviedb.org/movie/1' } }],
    [[1, 2], { poster_path: '/club123.jpg' }, {}],
    [[1], { poster_path: '/wrong123.jpg', runtime: 150 }, {}],
    [[1], { poster_path: null }, {}],
    [[1], { poster_path: 'https://example.org/untrusted.jpg' }, {}],
  ]) {
    const result = await collectFilms(entries, async path => path === 'search/movie'
      ? { results: ids.map(id => ({ id })) } : movie(Number(path.split('/')[1]), overrides));
    assert.deepEqual(result.posters, expected);
    assert.deepEqual(result.films, {});
  }
});

test('cached responses replay without credentials; failed refresh preserves cache and excludes secrets', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'vivaelcine-tmdb-test-'));
  const token = 'test-credential-never-persist';
  const params = { query: 'El Club' };
  let requests = 0;
  const request = tmdbClient({ cacheDir, token, fetcher: async (url, options) => {
    requests++;
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    assert.ok(!url.href.includes(token));
    return new Response(JSON.stringify({ results: [{ id: 1 }] }));
  } });
  assert.deepEqual(await request('search/movie', params), { results: [{ id: 1 }] });
  await request('search/movie', params);
  assert.equal(requests, 1);
  const replay = tmdbClient({ cacheDir, offline: true, fetcher: () => { throw new Error('Unexpected network request'); } });
  assert.deepEqual(await replay('search/movie', params), { results: [{ id: 1 }] });
  await assert.rejects(replay('movie/1'), /Missing cached response/);
  const file = join(cacheDir, (await readdir(cacheDir))[0]);
  const before = await readFile(file, 'utf8');
  assert.ok(!before.includes(token));
  assert.match(before, /retrievedAt/);
  for (const status of [401, 403, 429, 500]) {
    const failing = tmdbClient({ cacheDir, token, refresh: true, wait: async () => {}, fetcher: async () => new Response('{}', { status }) });
    await assert.rejects(failing('search/movie', params), new RegExp(`HTTP ${status}`));
    assert.equal(await readFile(file, 'utf8'), before);
  }
});

test('imported histories share the existing list; curated edition and premiere scope take precedence', () => {
  const sanfic = festivals[0];
  const data = { ...sanfic, festivalHistory: {
    'sanfic-2026/a-useful-ghost': [
      { festival: 'Cannes', date: '2025-05-18', source: 'https://www.themoviedb.org/movie/1/releases' },
      { festival: 'Toronto', date: '2025-09-01', source: 'https://www.themoviedb.org/movie/1/releases' },
    ],
    'sanfic-2026/el-club': [{ festival: 'Berlinale', date: '2015-02-09', source: 'https://www.themoviedb.org/movie/2/releases' }],
  } };
  const ghost = renderFestivalHistory(data, data.events.find(item => item.filmId === 'a-useful-ghost'));
  assert.equal((ghost.match(/>Cannes/g) || []).length, 1);
  assert.match(ghost, /Estreno mundial/);
  assert.match(ghost, /Toronto/);
  const club = renderFestivalHistory(data, data.events.find(item => item.filmId === 'el-club'));
  assert.match(club, /Berlinale/);
  assert.doesNotMatch(club, /Estreno/);
});

test('published snapshot reproduces from saved API responses without a token or network', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../data/tmdb-festival-history.json', import.meta.url), 'utf8'));
  const registry = JSON.parse(await readFile(new URL('../data/film-identities.json', import.meta.url), 'utf8'));
  const cacheDir = new URL('../assets/tmdb/responses/', import.meta.url).pathname;
  const result = await collectFilms(filmCatalogue(), tmdbClient({ cacheDir, offline: true, fetcher: () => { throw new Error('Unexpected network request'); } }), () => {}, { registry, previous: snapshot });
  assert.deepEqual(result.coverage, snapshot.coverage);
  assert.deepEqual(result.films, snapshot.films);
  assert.deepEqual(result.posters, snapshot.posters);
  assert.deepEqual(result.metadata, snapshot.metadata);
});

test('transient requests retry with provider cooldown; authentication errors and long cooldowns stop', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'vivaelcine-retry-test-'));
  const waits = [];
  let calls = 0;
  const request = tmdbClient({ cacheDir, token: 'test-only', refresh: true,
    wait: async ms => waits.push(ms), fetcher: async () => ++calls === 1
      ? new Response('{}', { status: 429, headers: { 'Retry-After': '2' } })
      : new Response('{"results":[]}'),
  });
  assert.deepEqual(await request('search/movie'), { results: [] });
  assert.equal(calls, 2);
  assert.deepEqual(waits, [2000]);
  for (const status of [401, 403, 429]) {
    let attempts = 0;
    const fail = tmdbClient({ cacheDir, token: 'test-only', refresh: true,
      wait: () => { throw new Error('Must not retry'); }, fetcher: async () => {
        attempts++; return new Response('{}', { status, headers: { 'Retry-After': '120' } });
      },
    });
    await assert.rejects(fail('search/movie'), new RegExp(`HTTP ${status}`));
    assert.equal(attempts, 1);
  }
});
