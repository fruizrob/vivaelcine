import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { festivals, festivalFor } from '../data.js';
import { filmCatalogue } from '../scripts/import-tmdb.mjs';
import { matches, durationOf } from '../core.js';
import { googleCalendarUrl } from '../sharing.js';
import { loadInputs } from '../scripts/generate-pages.mjs';

const amor = festivals.find(f => f.id === 'amor-2026');
const source = JSON.parse(readFileSync(new URL('../assets/amor-2026-sources.json', import.meta.url)));

test('AMOR canonical film runtimes agree across programme totals, pages and calendar links', async () => {
  const { festivals } = await loadInputs();
  const enriched = festivals.find(f => f.id === amor.id);
  assert.deepEqual(enriched.events.map(e => durationOf(e, enriched.films)), [94, 85, 74, 111]);
  const event = enriched.events.find(e => e.filmId === 'guerrilla-2');
  assert.equal(new URL(googleCalendarUrl(enriched, event, 'https://vivaelcine.cl')).searchParams.get('dates'),
    '20261126T200000/20261126T212500');
  assert.equal(enriched.films['the-wind-in-ash'].year, 2025);
  assert.equal(amor.films['the-wind-in-ash'].year, 2024);
  assert.ok(matches(event, enriched.films[event.filmId], { search: 'Xiaoxiao', venue: '', section: '' }));
});

test('AMOR includes every confirmed M100 session, ordered shorts and pending official film', () => {
  assert.equal(festivalFor('?festival=amor-2026'), amor);
  assert.equal(amor.programmeStatus, 'partial');
  assert.deepEqual(amor.events.map(e => [e.date, e.start]), [
    ['2026-11-25', 1200], ['2026-11-26', 1200], ['2026-11-28', 1200], ['2026-11-29', 1200],
  ]);
  const catalogue = filmCatalogue([amor]);
  assert.deepEqual(new Set([...catalogue.keys()].map(key => key.split('/')[1])),
    new Set([...source.officialFilmIds, ...source.venueOnlyFilmIds]));
  assert.deepEqual(amor.unscheduledFilmIds, source.unscheduledFilmIds);
  assert.ok(!amor.events.some(e => amor.unscheduledFilmIds.includes(e.filmId)));
  const programme = amor.films['guerrilla-1'];
  assert.deepEqual(programme.components.map(c => c.filmId), [
    'la-hora-de-irse', 'terra', 'corazon-danzante-cuando-el-amor-es-baile', 'travesti-travesti-travesti', 'el-velo-o-veu',
  ]);
  assert.ok(matches(amor.events[0], programme, { search: 'Yoksan', venue: '', section: '' }));
  assert.deepEqual(amor.events.slice(0, 3).map(e => durationOf(e, amor.films)), [94, 82, 73]);
  assert.equal(new URL(googleCalendarUrl(amor, amor.events[0], 'https://vivaelcine.cl')).searchParams.get('dates'),
    '20261125T200000/20261125T213400');
});

test('AMOR offline replay preserves the complete schedule and source limitations', () => {
  const root = new URL('../', import.meta.url);
  const paths = ['data/amor-2026.js', 'assets/amor-2026-sources.json', 'assets/amor-2026-programme-changes.json'];
  const before = paths.map(p => readFileSync(new URL(p, root), 'utf8'));
  for (let run = 0; run < 2; run++) {
    execFileSync('python3', ['scripts/import-amor-2026.py'], { cwd: root });
    assert.deepEqual(paths.map(p => readFileSync(new URL(p, root), 'utf8')), before);
  }
  assert.ok(source.limitations.length);
  assert.equal(source.sources.find(s => s.id === 'old-programme').status, 404);
});

test('failed AMOR acquisition preserves every last good source and generated output', () => {
  const root = new URL('../', import.meta.url);
  const paths = ['data/amor-2026.js', 'assets/amor-2026-sources.json',
    'assets/amor-2026/observations.json', 'assets/amor-2026/film-index.json'];
  const before = paths.map(p => readFileSync(new URL(p, root), 'utf8'));
  execFileSync('python3', ['-c', `
import json, pathlib, runpy, subprocess, sys
from unittest.mock import patch
def response(args, **kwargs):
    if 'wp-json' not in args[-1]:
        raise RuntimeError('Simulated failed detail download')
    pathlib.Path(args[args.index('-o') + 1]).write_text(json.dumps([
        dict(slug='new-film', link='https://www.amorfestival.com/pelicula/new-film/')]))
    return subprocess.CompletedProcess(args, 0, stdout='200')
sys.argv = ['scripts/import-amor-2026.py', '--fetch']
with patch('subprocess.run', side_effect=response):
    try:
        runpy.run_path(sys.argv[0], run_name='__main__')
    except RuntimeError as error:
        assert 'Simulated failed detail download' in str(error)
    else:
        raise AssertionError('Expected acquisition to fail')
`], { cwd: root });
  assert.deepEqual(paths.map(p => readFileSync(new URL(p, root), 'utf8')), before);
});
