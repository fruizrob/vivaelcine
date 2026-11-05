import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { festivals } from '../data.js';
import { festivalMark, festivalMarks } from '../festival-history-data.js';
import { drawTimeline } from '../timeline.js';

const [sanfic, fidocs] = festivals;
const screening = sanfic.events.find(event => event.filmId === 'a-happy-family');
const source = 'https://example.org/programme';
const withHistory = appearances => ({ ...sanfic, festivalHistory: { [`${sanfic.id}/${screening.filmId}`]: appearances } });

test('Cannes leads editorial priority; input order and number of festivals do not add logo stacks', () => {
  const data = withHistory(['Toronto', 'Berlinale', 'Cannes', 'Venecia'].map(festival => ({ festival, date: '2025', source })));
  assert.equal(festivalMark(data, screening).id, 'cannes');
  assert.equal(festivalMarks[0].name, 'Cannes');
  const html = drawTimeline({ ...data, events: [screening] }, { date: screening.date, search: '', venue: '', section: '' }).html;
  assert.equal((html.match(/data-festival-mark=/g) || []).length, 1);
  assert.match(html, /data-festival-mark="cannes"/);
  assert.match(html, /Cannes · 2025/);
  assert.doesNotMatch(html, /Ganadora|Palma de Oro|Seleccionada/);
});

test('future appearances, unranked festivals and missing histories do not create marks', () => {
  for (const appearances of [[], [{ festival: 'Cannes', date: '2027', source }], [{ festival: 'Cannes', source }], [{ festival: 'SANFIC', date: '2025', source }]]) {
    assert.equal(festivalMark(withHistory(appearances), screening), null);
  }
  assert.equal(festivalMark(withHistory([{ festival: 'Toronto', date: '2025', source }]), screening).id, 'tiff');
});

test('programme marks attribute the individual film; separate parts cannot inherit the full work history', () => {
  const programme = fidocs.events.find(event => event.filmId === 'foco-federico-luis');
  const mark = festivalMark(fidocs, programme);
  assert.equal(mark.id, 'cannes');
  assert.equal(mark.subject, 'La siesta');
  assert.match(mark.label, /La siesta · Cannes · 2019/);
  const html = drawTimeline({ ...fidocs, events: [programme] }, { date: programme.date, search: '', venue: '', section: '' }).html;
  assert.match(html, /Incluye La siesta · Cannes · 2019/);
  const part = { ...screening, title: 'A different part', id: 'separate-part' };
  const data = withHistory([{ festival: 'Cannes', date: '2025', source }]);
  assert.equal(festivalMark(data, part), null);
  data.festivalHistory[`${sanfic.id}/${part.id}`] = [{ festival: 'Berlinale', date: '2025', source }];
  assert.equal(festivalMark(data, part).id, 'berlinale');
});

test('curated appearances produce marks without the optional TMDB snapshot', () => {
  const event = sanfic.events.find(event => event.filmId === 'a-useful-ghost');
  const mark = festivalMark(sanfic, event);
  assert.equal(mark.id, 'cannes');
  assert.match(mark.label, /Semaine de la Critique/);
});

test('every configured mark has a local logo and source documentation', () => {
  const notes = readFileSync(new URL('../docs/festival-marks.md', import.meta.url), 'utf8');
  for (const mark of festivalMarks) {
    const path = `assets/festivals/${mark.id}.${mark.extension || 'svg'}`;
    assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
    assert.ok(notes.includes(path), path);
  }
});
