import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { festivals } from '../data.js';
import { yearOf } from '../core.js';
import { drawTimeline } from '../timeline.js';

const [sanfic, fidocs] = festivals;
const sources = JSON.parse(readFileSync(new URL('../assets/film-year-sources.json', import.meta.url)));
const card = (festival, event) => drawTimeline({ ...festival, events: [event] }, {
  date: event.date, search: '', venue: '', section: '',
}).html;

test('recent and retrospective films have sourced years on their cards', () => {
  for (const [festival, id, year] of [
    [sanfic, 'a-happy-family', 2026], [sanfic, 'el-club', 2015],
    [fidocs, 'hanabi', 2026], [fidocs, '48', 2009],
  ]) {
    const film = festival.films[id];
    const event = festival.events.find(item => item.filmId === id);
    assert.equal(yearOf(event, film), year);
    assert.match(card(festival, event), new RegExp(`class="event-year">${year}</span>`));
    assert.ok(card(festival, event).includes(`(${year}).`));
  }
  for (const film of Object.values(sanfic.films).flatMap(film => [film, ...(film.components || [])])) {
    if (!film.year) continue;
    assert.ok(sources.sanfic.some(source => source.url === film.yearSource && source.year === film.year), film.title);
  }
});

test('unknown years never inherit the festival year or a Letterboxd slug suffix', () => {
  const base = fidocs.events.find(event => !fidocs.films[event.filmId].year);
  assert.equal(yearOf(base, fidocs.films[base.filmId]), null);
  assert.doesNotMatch(card(fidocs, base), /class="event-year"/);
  for (const year of [undefined, null, '', '2026', '1975, 1977, 1979', '2019–2026', 0, 2026.5]) {
    assert.equal(yearOf({}, { year, letterboxd: 'film-2026' }), null);
  }
  assert.equal(yearOf({ year: null }, { year: 2026 }), null);
});

test('multi-film programmes keep years on their individual components', () => {
  for (const festival of festivals) {
    for (const [id, film] of Object.entries(festival.films)) {
      if (!film.components) continue;
      const event = festival.events.find(item => item.filmId === id);
      assert.equal(yearOf(event, { ...film, year: 2026 }), null);
      assert.doesNotMatch(card(festival, event), /class="event-year"/);
      for (const component of film.components) {
        if (component.filmId) assert.equal(component.year, festival.films[component.filmId].year);
      }
    }
  }
  assert.deepEqual(fidocs.films['sergio-bravo'].components.map(film => yearOf({}, film)), [1958, 1959, 1957]);
});

test('multipart screenings use their own verified year', () => {
  const parts = fidocs.events.filter(event => event.filmId === 'la-batalla-de-chile-parte-i-ii-y-iii');
  assert.deepEqual(parts.map(event => yearOf(event, fidocs.films[event.filmId])), [1975, 1977, 1979]);
  for (const event of parts) assert.match(card(fidocs, event), new RegExp(`class="event-year">${event.year}</span>`));
});

test('regeneration preserves sourced film, component and event years without replacing fresh official years', () => {
  const regenerated = JSON.parse(execFileSync('python3', ['-B', '-c', `
import importlib.util, json, pathlib, sys, tempfile
root = pathlib.Path(sys.argv[1])
spec = importlib.util.spec_from_file_location('fidocs_import', root / 'scripts/import-fidocs-2026.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as tmp:
    path = pathlib.Path(tmp) / 'films.js'
    previous = {'year': 1999, 'yearSource': 'https://example.com/film', 'components': [
        {'title': 'Short', 'year': 2001, 'yearSource': 'https://example.com/short'}]}
    path.write_text('"curated":'+json.dumps(previous)+',\\n"official":'+json.dumps({'year': 2000})+',\\n'+json.dumps(
        {'id': 'part', 'year': 1975, 'yearSource': 'https://example.com/part'})+',\\n')
    films = {'curated': {'components': [{'title': 'Short'}]}, 'official': {'year': 2026}}
    events = [{'id': 'part'}]
    module.preserve_curated_metadata(path, films, events)
    print(json.dumps({'films': films, 'events': events}))
`, new URL('..', import.meta.url).pathname], { encoding: 'utf8' }));
  assert.equal(regenerated.films.curated.year, 1999);
  assert.equal(regenerated.films.curated.components[0].year, 2001);
  assert.equal(regenerated.films.official.year, 2026);
  assert.equal(regenerated.events[0].year, 1975);
  assert.equal(regenerated.events[0].yearSource, 'https://example.com/part');
});
