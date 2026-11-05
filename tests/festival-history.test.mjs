import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import histories from '../data/festival-history.js';
import { festivals } from '../data.js';
import { renderHistory, renderFestivalHistory } from '../festival-history.js';

const [sanfic, fidocs] = festivals;
const screening = { date: '2026-11-04' };
const source = 'https://example.org/programme';

test('curated histories reference exact films/components and documented primary sources', () => {
  const notes = readFileSync(new URL('../docs/festival-history-sources.md', import.meta.url), 'utf8');
  for (const [key, appearances] of Object.entries(histories)) {
    const [festivalId, filmId, componentTitle] = key.split('/');
    const festival = festivals.find(festival => festival.id === festivalId);
    const part = festival.events.find(event => event.id === filmId);
    const film = festival.films[part?.filmId || filmId];
    assert.ok(film, key);
    assert.ok(componentTitle ? film.components.some(component => component.title === componentTitle) : !film.components, key);
    assert.ok(appearances.length, key);
    for (const appearance of appearances) {
      assert.equal(new URL(appearance.source).protocol, 'https:');
      assert.ok(notes.includes(appearance.source), appearance.source);
      assert.ok(appearance.festival);
      for (const date of [appearance.date, appearance.endDate].filter(Boolean)) {
        assert.match(date, /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/);
        const full = date.length === 4 ? `${date}-01-01` : date.length === 7 ? `${date}-01` : date;
        assert.equal(new Date(`${full}T12:00:00Z`).toISOString().slice(0, 10), full);
      }
      if (appearance.endDate) assert.ok(appearance.date <= appearance.endDate);
      if (appearance.festivalId) {
        const edition = festivals.find(festival => festival.id === appearance.festivalId);
        assert.equal(appearance.date, edition.days[0].date);
        assert.equal(appearance.endDate, edition.days.at(-1).date);
      }
    }
  }
});

test('one chronological list preserves date precision and flags later announcements', () => {
  const appearances = [
    { festival: 'Later', date: '2027', source },
    { festival: 'Recent', date: '2025-06', source },
    { festival: 'Same year', date: '2026', source },
    { festival: 'Oldest', date: '2019', source },
  ];
  const html = renderHistory(appearances, sanfic, screening);
  assert.ok(html.indexOf('Oldest') < html.indexOf('Recent'));
  assert.ok(html.indexOf('Recent') < html.indexOf('Same year'));
  assert.ok(html.indexOf('Same year') < html.indexOf('Later'));
  assert.match(html, /Later<\/a><span[^>]*> · Anunciada/);
  assert.doesNotMatch(html, /Same year<\/a><span|Estreno|ene.*2019/);
  assert.doesNotMatch(renderHistory(appearances, sanfic, { date: '2028-01-01' }), /Anunciada/);
  assert.equal((html.match(/href="https:\/\/example.org\/programme"/g) || []).length, 4);
});

test('partial months and overlapping ranges do not claim a future appearance', () => {
  for (const appearance of [
    { date: '2026' }, { date: '2026-11' }, { date: '2026-11-04' },
    { date: '2026-11-01', endDate: '2026-11-08' }, {},
  ]) assert.doesNotMatch(renderHistory([{ festival: 'Festival', source, ...appearance }], sanfic, screening), /Anunciada/);
  for (const date of ['2026-11-05', '2026-12', '2027']) {
    assert.match(renderHistory([{ festival: 'Festival', source, date }], sanfic, screening), /Anunciada/);
  }
});

test('verified premiere scopes stay with their named festival, including repeat screenings', () => {
  for (const event of sanfic.events.filter(event => event.filmId === 'animales')) {
    const html = renderFestivalHistory(sanfic, event);
    assert.match(html, /SANFIC/);
    assert.match(html, /Estreno mundial/);
    assert.doesNotMatch(html, /Anunciada|Esta función/);
  }
  for (const [id, label] of [['cuadro-negro', 'Estreno latinoamericano'], ['el-tigre-del-este', 'Estreno nacional (Chile)']]) {
    const html = renderFestivalHistory(sanfic, sanfic.events.find(event => event.filmId === id));
    assert.ok(html.includes(label));
    assert.doesNotMatch(html, /Estreno mundial/);
  }
  const ghost = renderFestivalHistory(sanfic, sanfic.events.find(event => event.filmId === 'a-useful-ghost'));
  assert.match(ghost, /Cannes/);
  assert.match(ghost, /2025/);
  assert.doesNotMatch(ghost, /SANFIC/);
});

test('programme members stay separate; missing films and alternate parts add no UI', () => {
  const event = fidocs.events.find(event => event.filmId === 'foco-federico-luis');
  const [siesta, ...others] = fidocs.films[event.filmId].components;
  assert.equal(renderFestivalHistory(fidocs, event), '');
  assert.match(renderFestivalHistory(fidocs, event, siesta), /Estreno internacional/);
  for (const component of others) assert.equal(renderFestivalHistory(fidocs, event, component), '');
  const part = { ...sanfic.events.find(event => event.filmId === 'animales'), title: 'A separately identified version' };
  assert.equal(renderFestivalHistory(sanfic, part), '');
  assert.equal(renderFestivalHistory(sanfic, sanfic.events.find(event => event.filmId === 'a-happy-family')), '');
});

test('untrusted festival text, URLs, editions and premiere labels cannot become markup', () => {
  const html = renderHistory([{
    festival: '<script>', date: '2025', edition: '<b>',
    source: 'https://example.org/?x=" onclick="oops', premiere: '<svg>',
  }], sanfic, screening);
  assert.doesNotMatch(html, /<script>|<b>|<svg>|" onclick="/);
  assert.match(html, /&lt;script&gt;/);
});
