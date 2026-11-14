import { endOf, roomLocation } from '../core.js';
import { zonedStart } from '../discovery-time.js';
import { agendaScreeningUrl } from '../screening-links.js';
import { appleCalendarUrl } from '../sharing.js';

const origin = 'https://vivaelcine.cl';
const stamp = date => new Date(date).toISOString().replace(/[-:]|\.\d{3}/g, '');
const text = value => String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/[,;]/g, '\\$&');

// RFC 5545 folds at 75 UTF-8 octets, never inside a character.
function fold(line) {
  let result = '';
  let bytes = 0;
  for (const character of line) {
    const size = Buffer.byteLength(character);
    if (bytes + size > 75) {
      result += '\r\n ';
      bytes = 1;
    }
    result += character;
    bytes += size;
  }
  return result;
}

export function calendarFile(festival, event) {
  const film = festival.films[event.filmId];
  const room = festival.rooms.find(room => room.id === event.roomId);
  const end = endOf(event, festival.films);
  const url = agendaScreeningUrl(festival, event, origin);
  const description = [
    festival.name, event.director || film.director,
    end === null ? 'Duración por confirmar.' : '', url,
  ].filter(Boolean).join('\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Viva el Cine//Screenings//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${text(`${festival.id}/${event.id}@vivaelcine.cl`)}`,
    `DTSTAMP:${stamp(`${festival.updated}T00:00:00Z`)}`,
    `DTSTART:${stamp(zonedStart(event.date, event.start, festival.timeZone))}`,
    // An unknown runtime is an instant; never invent an end time.
    ...(end === null ? [] : [`DTEND:${stamp(zonedStart(event.date, end, festival.timeZone))}`]),
    `SUMMARY:${text(`${event.title || film.title} · ${festival.name}`)}`,
    `LOCATION:${text(roomLocation(room))}`,
    `DESCRIPTION:${text(description)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function buildCalendarFiles(festivals) {
  return new Map(festivals.flatMap(festival => festival.events.map(event => [
    new URL(appleCalendarUrl(festival, event, origin)).pathname.slice(1),
    calendarFile(festival, event),
  ])));
}
