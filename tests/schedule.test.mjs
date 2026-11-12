import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../data.js';
import { minutes, clock, endOf, matches } from '../core.js';
import { drawTimeline, timelineRange, timelineWidth, escapeHtml } from '../timeline.js';

test('the complete schedule has verified runtimes, unique identities and seven rooms',()=>{
  assert.equal(data.events.length,100);
  assert.equal(Object.keys(data.films).length,51);
  assert.equal(data.rooms.length,7);
  assert.equal(new Set(data.events.map(e=>e.id)).size,100);
  assert.deepEqual(data.days.map(d=>data.events.filter(e=>e.date===d.date).length),[14,15,13,14,15,15,14]);
  for(const e of data.events){
    const film=data.films[e.filmId];
    assert.ok(film.duration>0 && film.duration<240);
    assert.ok(data.rooms.some(r=>r.id===e.roomId));
    assert.ok(film.director && film.source.startsWith('https://'));
    assert.ok(data.sections[film.section]);
    assert.ok(e.start>=900 && endOf(e,data.films)<=1500);
    assert.ok(!film.countries.includes('2026'));
  }
});

test('all three short programs reconcile to their seven sourced components',()=>{
  const blocks=Object.values(data.films).filter(f=>f.components);
  assert.deepEqual(blocks.map(f=>f.duration),[124,125,124]);
  for(const f of blocks){assert.equal(f.components.length,7);assert.equal(f.components.reduce((n,c)=>n+c.duration,0),f.duration);assert.equal(f.durationKind,'sum');}
});

test('time formatting preserves midnight',()=>{
  assert.equal(minutes('22:30'),1350);
  assert.equal(clock(1462,true),'00:22 (+1 día)');
});

test('search ignores accents and supports alias while combining independent filters',()=>{
  const e=data.events.find(e=>e.filmId==='the-dance-of-the-living');
  const base={search:'José Alayon',venue:'',section:''};
  assert.equal(matches(e,data.films[e.filmId],base),true);
  assert.equal(matches(e,data.films[e.filmId],{...base,search:'la lucha'}),true);
  assert.equal(matches(e,data.films[e.filmId],{...base,venue:'not-this-venue'}),false);
});


test('the grid preserves every screening and its exact time interval', () => {
  const RANGE = timelineRange(data);
  for (const day of data.days) {
    const result = drawTimeline(data, {date: day.date, search: '', venue: '', section: ''});
    assert.equal(result.shown.length, data.events.filter(event => event.date === day.date).length);
    assert.equal((result.html.match(/data-event=/g) || []).length, result.shown.length);
    assert.equal(result.visibleRooms.length, 7);
    for (const event of result.shown) {
      const width = data.films[event.filmId].duration / (RANGE.end - RANGE.start) * 100;
      const left = (event.start - RANGE.start) / (RANGE.end - RANGE.start) * 100;
      assert.ok(result.html.includes(`style="left:${left}%;width:${width}%;`));
      assert.ok(result.html.includes(`data-detail="${event.id}"`));
    }
  }
});

test('section and venue filters combine without changing room identities', () => {
  const event = data.events[0];
  const state = {date: event.date, search: '', venue: event.venueId, section: data.films[event.filmId].section};
  const result = drawTimeline(data, state);
  assert.ok(result.shown.length > 0);
  assert.ok(result.shown.every(item => item.venueId === state.venue && data.films[item.filmId].section === state.section));
  assert.ok(result.visibleRooms.every(room => room.venueId === state.venue));
  assert.equal(drawTimeline(data, {...state, search: 'no-such-film'}).shown.length, 0);
});

test('zoomed timelines fill their viewport, including fractional room-label widths', () => {
  for (const labelWidth of [117, 158, 158.5]) {
    for (const viewportWidth of [296, 366, 694, 976, 1366, 1686]) {
      for (const zoom of [.8, 1, 1.2, 1.4, 1.6, 1.8]) {
        const width = timelineWidth(viewportWidth, labelWidth, zoom);
        assert.ok(width + labelWidth >= viewportWidth,
          `${viewportWidth}px viewport at ${zoom * 100}% leaves a blank strip`);
      }
    }
  }
});

test('zoom keeps the compact mobile scale and expands desktop timelines for scrolling', () => {
  assert.equal(timelineWidth(366, 117, .8), 680);
  assert.equal(timelineWidth(366, 117, 1), 850);
  assert.equal(timelineWidth(1366, 158, 1), 1208);
  assert.equal(timelineWidth(1366, 158, 1.2), 1450);
  assert.equal(timelineWidth(1366, 158, 1.8), 2174);
});

test('film text cannot become markup', () => {
  assert.equal(escapeHtml('<img src="x"> &'), '&lt;img src=&quot;x&quot;&gt; &amp;');
});
