import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { festivals } from '../data.js';
import ratings, { checkedAt } from '../data/letterboxd-ratings.js';
import { drawTimeline } from '../timeline.js';

const sanfic = festivals.find(festival => festival.id === 'sanfic-2026');
const fidocs = festivals.find(festival => festival.id === 'fidocs-2026');

test('snapshot scores reference mapped films and stay within Letterboxd\'s scale', () => {
  const slugs = new Set(festivals.flatMap(festival => [
    ...Object.values(festival.films).flatMap(film => [film.letterboxd, ...(film.components || []).map(short => short.letterboxd)]),
    ...festival.events.map(event => event.letterboxd),
  ]).filter(Boolean));
  assert.match(checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Object.keys(ratings).length > 0);
  for (const [slug, score] of Object.entries(ratings)) {
    assert.ok(slugs.has(slug), slug);
    assert.ok(Number.isFinite(score) && score >= 0.5 && score <= 5, slug);
    assert.equal(score * 10, Math.round(score * 10), slug);
  }
});

test('badges link outside the detail button and use the screening-specific rating', () => {
  const filmId = 'la-batalla-de-chile-parte-i-ii-y-iii';
  for (const event of fidocs.events.filter(event => event.filmId === filmId)) {
    const { html } = drawTimeline({ ...fidocs, events: [event] }, { date: event.date, search: '', venue: '', section: '' });
    assert.match(html, /<\/button>\s*<div class="event-footer">[\s\S]*?<a class="event-rating"/);
    assert.ok(html.includes(`href="https://letterboxd.com/film/${event.letterboxd}/"`));
    assert.ok(html.includes(`${ratings[event.letterboxd].toFixed(1)} de 5 en Letterboxd · ${checkedAt}`));
  }
});

test('missing scores, short films and unknown durations never invent badges', () => {
  const base = sanfic.events.find(event => event.filmId === 'a-useful-ghost');
  for (const override of [{ letterboxd: 'unverified' }, { duration: 20 }, { duration: null }]) {
    const event = { ...base, ...override };
    const { html } = drawTimeline({ ...sanfic, events: [event] }, { date: event.date, search: '', venue: '', section: '' });
    assert.doesNotMatch(html, /class="event-rating"/);
    assert.ok(html.includes(`data-detail="${event.id}"`));
  }
});

test('Letterboxd identities belong to individual films, never combined programmes', () => {
  for (const festival of festivals) {
    for (const film of Object.values(festival.films)) {
      if (film.components) assert.equal(film.letterboxd, undefined, film.title);
      for (const item of [film, ...(film.components || [])]) {
        if (item.letterboxd) {
          assert.match(item.letterboxd, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, item.title);
          assert.ok(item.director, item.title);
        }
      }
    }
  }
});

test('regenerating FIDOCS preserves curated film, component and part identities', () => {
  const regenerated = JSON.parse(execFileSync('python3', ['-B', '-c', `
import importlib.util, json, pathlib, sys
root = pathlib.Path(sys.argv[1])
spec = importlib.util.spec_from_file_location('fidocs_import', root / 'scripts/import-fidocs-2026.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
data = json.load(sys.stdin)
module.preserve_curated_metadata(root / 'data/fidocs-2026.js', data['films'], data['events'])
print(json.dumps(data))
`, new URL('..', import.meta.url).pathname], {
    encoding: 'utf8',
    input: JSON.stringify(fidocs, (key, value) => key === 'letterboxd' ? undefined : value),
  }));
  assert.deepEqual(regenerated.films, fidocs.films);
  assert.deepEqual(regenerated.events, fidocs.events);
});

test('translated titles and same-title films retain their verified identities', () => {
  assert.equal(sanfic.films['el-club'].letterboxd, 'the-club-2015');
  assert.equal(sanfic.films['el-vuelo-de-la-ciguena'].letterboxd, 'the-flight-of-the-stork-2025');
  assert.equal(fidocs.films['natureza-morta'].letterboxd, 'still-life-2005-2');
  assert.equal(fidocs.films['pensaba-que-te-habias-olvidado-de-escribirme'].letterboxd, undefined);
  const humedal = Object.values(sanfic.films).flatMap(film => film.components || [])
    .find(film => film.title === 'Humedal');
  assert.ok(humedal);
  assert.equal(humedal.letterboxd, undefined);
});

test('The Battle of Chile screenings link to their own parts', () => {
  const filmId = 'la-batalla-de-chile-parte-i-ii-y-iii';
  assert.equal(fidocs.films[filmId].letterboxd, undefined);
  const parts = fidocs.events.filter(event => event.filmId === filmId);
  assert.deepEqual(parts.map(event => event.letterboxd), [
    'the-battle-of-chile-part-i',
    'the-battle-of-chile-part-ii',
    'the-battle-of-chile-part-iii',
  ]);
});

test('shorts retain the same identity inside and outside a shared programme', () => {
  for (const film of Object.values(fidocs.films)) {
    for (const component of film.components || []) {
      if (component.filmId) {
        assert.equal(component.letterboxd, fidocs.films[component.filmId].letterboxd, component.title);
      }
    }
  }
});
