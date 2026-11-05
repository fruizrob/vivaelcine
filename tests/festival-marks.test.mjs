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

test('the earliest recorded festival wins regardless of prestige or input order; cards keep one mark', () => {
  const appearances = [
    { festival: 'Cannes', date: '2025-05-17', source },
    { festival: 'Berlinale', date: '2025-02-15', source },
    { festival: 'Sundance', date: '2025-01-24', source },
  ];
  const data = withHistory(appearances);
  assert.equal(festivalMark(data, screening).id, 'sundance');
  assert.equal(festivalMark(withHistory([...appearances].reverse()), screening).id, 'sundance');
  const html = drawTimeline({ ...data, events: [screening] }, { date: screening.date, search: '', venue: '', section: '' }).html;
  assert.equal((html.match(/data-festival-mark=/g) || []).length, 1);
  assert.match(html, /data-festival-mark="sundance"/);
  assert.match(html, /Sundance · 2025 · Primera aparición registrada/);
  assert.doesNotMatch(html, /Ganadora|Palma de Oro|Seleccionada/);
});

test('future appearances and missing dates do not create marks', () => {
  for (const appearances of [[], [{ festival: 'Cannes', date: '2027', source }], [{ festival: 'Cannes', source }], [{ festival: 'Cannes', date: `${screening.date.slice(0, 7)}-30`, source }]]) {
    assert.equal(festivalMark(withHistory(appearances), screening), null);
  }
  assert.equal(festivalMark(withHistory([{ festival: 'Toronto', date: '2025', source }]), screening).id, 'tiff');
});

test('explicit world premieres take precedence; territorial premieres do not outrank earlier appearances', () => {
  const appearances = [
    { festival: 'Berlinale', date: '2025-02-15', premiere: 'Estreno internacional', source },
    { festival: 'Sundance', date: '2025-01-24', premiere: 'Estreno mundial', source },
    { festival: 'Cannes', date: '2025-05-17', premiere: 'Estreno nacional (Chile)', source },
    { festival: 'Toronto', date: '2024', source },
  ];
  assert.equal(festivalMark(withHistory(appearances), screening).id, 'sundance');
  assert.match(festivalMark(withHistory(appearances), screening).label, /Estreno mundial/);
  assert.equal(festivalMark(withHistory(appearances.filter(a => a.premiere !== 'Estreno mundial')), screening).id, 'tiff');
  const event = sanfic.events.find(event => event.filmId === 'animales');
  assert.equal(festivalMark(sanfic, event).id, 'sanfic');
});

test('a missing logo never substitutes a later festival for the first appearance', () => {
  const data = withHistory([
    { festival: 'Cannes', date: '2025-05-17', source },
    { festival: 'An unfamiliar festival', date: '2024', source },
  ]);
  const mark = festivalMark(data, screening);
  assert.equal(mark.name, 'An unfamiliar festival');
  assert.equal(mark.logo, null);
  const html = drawTimeline({ ...data, events: [screening] }, { date: screening.date, search: '', venue: '', section: '' }).html;
  assert.match(html, /An unfamiliar festival/);
  assert.doesNotMatch(html, /<img|data-festival-mark="cannes"/);
});

test('equal and partial dates resolve consistently without changing stored date precision', () => {
  const appearances = ['Toronto', 'Berlinale', 'Cannes'].map(festival => ({ festival, date: '2025', source }));
  const mark = festivalMark(withHistory(appearances), screening);
  assert.equal(mark.id, festivalMark(withHistory([...appearances].reverse()), screening).id);
  assert.match(mark.label, /2025/);
  assert.ok(appearances.every(a => a.date === '2025'));
  assert.equal(festivalMark(withHistory([{ festival: 'Toronto', date: '2025-02', source }, { festival: 'Cannes', date: '2025-05-01', source }]), screening).id, 'tiff');
});

test('programme marks attribute the individual film; separate parts cannot inherit the full work history', () => {
  const programme = fidocs.events.find(event => event.filmId === 'foco-federico-luis');
  const mark = festivalMark(fidocs, programme);
  assert.equal(mark.id, 'cannes');
  assert.equal(mark.subject, 'La siesta');
  assert.match(mark.label, /La siesta · Cannes · 2019/);
  const html = drawTimeline({ ...fidocs, events: [programme] }, { date: programme.date, search: '', venue: '', section: '' }).html;
  assert.match(html, /Incluye La siesta · Cannes · 2019/);
  const [first, second] = fidocs.films[programme.filmId].components;
  const dataWithMembers = { ...fidocs, festivalHistory: {
    [`${fidocs.id}/${programme.filmId}/${first.title}`]: [{ festival: 'Cannes', date: '2025', source }],
    [`${fidocs.id}/${programme.filmId}/${second.title}`]: [{ festival: 'Sundance', date: '2018', source }],
  } };
  assert.equal(festivalMark(dataWithMembers, programme).id, 'sundance');
  assert.equal(festivalMark(dataWithMembers, programme).subject, second.title);
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
