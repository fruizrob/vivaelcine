import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadInputs } from '../scripts/generate-pages.mjs';
import { endOf, roomLocation } from '../core.js';
import { appleCalendarUrl } from '../sharing.js';
import { agendaScreeningUrl } from '../screening-links.js';
import { buildCalendarFiles, calendarFile } from '../scripts/calendar-files.mjs';

const fixture = {
  id: 'festival', name: 'Festival', updated: '2026-11-14', timeZone: 'America/Santiago',
  films: { film: { title: 'Una película', director: 'Dirección', duration: 90 } },
  rooms: [{ id: 'room', venue: 'Cine', name: 'Sala 1' }],
};
const screening = { id: 'screening', filmId: 'film', roomId: 'room', date: '2026-11-14', start: 1200 };
const unfold = file => file.replace(/\r\n /g, '');
const field = (file, name) => unfold(file).split('\r\n').find(line => line.startsWith(`${name}:`))?.slice(name.length + 1);
const decodeText = value => value.replace(/\\([\\,;n])/g, (_, char) => char === 'n' ? '\n' : char);
const instant = value => Date.parse(value.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'));

test('each screening has a distinct served calendar file matching its visible action', async () => {
  const { festivals } = await loadInputs();
  const files = buildCalendarFiles(festivals);
  assert.equal(files.size, festivals.reduce((count, festival) => count + festival.events.length, 0));
  for (const festival of festivals) {
    for (const event of festival.events) {
      const href = appleCalendarUrl(festival, event, 'https://vivaelcine.cl/?festival=wrong#agenda');
      const url = new URL(href);
      assert.equal(url.origin, 'https://vivaelcine.cl');
      assert.equal(url.search, '');
      assert.equal(url.hash, '');
      const file = files.get(url.pathname.slice(1));
      assert.ok(file, event.id);
      assert.equal(await readFile(new URL(`..${url.pathname}`, import.meta.url), 'utf8'), file);
      assert.match(file, /^BEGIN:VCALENDAR\r\nVERSION:2.0\r\n/);
      assert.ok(file.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n'));
      assert.equal((file.match(/BEGIN:VEVENT/g) || []).length, 1);
      assert.equal(field(file, 'UID'), `${festival.id}/${event.id}@vivaelcine.cl`);
      assert.ok(decodeText(field(file, 'SUMMARY')).includes(event.title || festival.films[event.filmId].title));
      assert.equal(decodeText(field(file, 'LOCATION')), roomLocation(festival.rooms.find(room => room.id === event.roomId)));
      assert.equal(field(file, 'URL'), agendaScreeningUrl(festival, event, 'https://vivaelcine.cl'));
      const end = endOf(event, festival.films);
      if (end === null) {
        assert.equal(field(file, 'DTEND'), undefined);
        assert.ok(field(file, 'DESCRIPTION').includes('Duración por confirmar.'));
      } else {
        assert.equal(instant(field(file, 'DTEND')) - instant(field(file, 'DTSTART')), (end - event.start) * 60_000);
      }
    }
  }
});

test('calendar instants respect Chile daylight saving, midnight and the next year', () => {
  const file = (date, start) => calendarFile(fixture, { ...screening, date, start });
  assert.equal(field(file('2026-11-14', 1200), 'DTSTART'), '20261114T230000Z');
  assert.equal(field(file('2026-07-10', 1200), 'DTSTART'), '20260711T000000Z');
  assert.equal(field(file('2026-11-14', 1500), 'DTSTART'), '20261115T040000Z');
  assert.equal(field(file('2026-12-31', 1410), 'DTEND'), '20270101T040000Z');
  assert.throws(() => file('2026-09-06', 30), /nonexistent/);
  assert.throws(() => file('2026-04-04', 1410), /Ambiguous/);
});

test('an unknown runtime remains a start-only event; part titles keep their identity', () => {
  const data = { ...fixture, films: { film: { title: 'Película completa' } } };
  const file = calendarFile(data, { ...screening, title: 'Película — parte 2' });
  assert.equal(field(file, 'SUMMARY'), 'Película — parte 2 · Festival');
  assert.equal(field(file, 'DTEND'), undefined);
  assert.match(field(file, 'DESCRIPTION'), /Duración por confirmar\./);
  const moved = calendarFile(data, { ...screening, date: '2026-11-15', start: 1300 });
  assert.equal(field(moved, 'UID'), field(file, 'UID'));
  assert.notEqual(field(moved, 'DTSTART'), field(file, 'DTSTART'));
});

test('UTF-8 folding, CRLF and escaped text preserve titles without injecting calendar properties', () => {
  const title = 'Café 🎬, cine;\\\r\nBEGIN:VEVENT\r\n' + 'ñ🎞'.repeat(50);
  const file = calendarFile({ ...fixture, films: { film: { title, duration: 90 } } }, screening);
  assert.equal((file.match(/\r\nBEGIN:VEVENT\r\n/g) || []).length, 1);
  for (const line of file.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.ok(!file.replace(/\r\n/g, '').includes('\n'));
  const titleBack = decodeText(field(file, 'SUMMARY'));
  assert.equal(titleBack, `${title.replace(/\r\n/g, '\n')} · Festival`);
  assert.equal(field(file, 'DTSTAMP'), '20261114T000000Z');
});
