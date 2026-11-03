import { clock, endOf, matches } from './core.js?v=20261103';

export const RANGE = { start: 900, end: 1500 };
export const escapeHtml = text => String(text ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
export const sectionStyle = section => `--event-color:${section.color};--event-edge:${section.edge};--event-ink:${section.ink}`;
const position = minute => (minute - RANGE.start) / (RANGE.end - RANGE.start) * 100;

function renderEvent(event, room, data, dayEvents) {
  const film = data.films[event.filmId];
  const finish = endOf(event, data.films);
  const isShort = film.duration < 45;
  const width = film.duration / (RANGE.end - RANGE.start) * 100;
  const nextInRoom = dayEvents
    .filter(next => next.roomId === room.id && next.start > event.start)
    .sort((a, b) => a.start - b.start)[0];
  // A short film's title uses the empty interval before the next screening.
  const shortLabel = isShort && nextInRoom
    ? `--short-label-width:calc(${Math.max(0, nextInRoom.start - finish) / film.duration * 100}% - 12px);`
    : '';
  const timeRange = `${clock(event.start)}–${clock(finish, true)}`;
  const label = `${film.title}. ${timeRange}. ${room.venue}, sala ${room.number}. ${film.duration} minutos. Ver detalle.`;
  return `
    <article class="event${isShort ? ' short' : ''}" data-event="${event.id}"
      style="left:${position(event.start)}%;width:${width}%;${shortLabel}${sectionStyle(data.sections[film.section])}">
      <button class="event-main" data-detail="${event.id}" aria-label="${escapeHtml(label)}"
        title="${escapeHtml(`${film.title} · ${timeRange} · ${film.duration} min`)}">
        <span class="event-time">${isShort ? clock(event.start) : `${clock(event.start)}–${clock(finish)}`}</span>
        <span class="event-title">${escapeHtml(film.title)}</span>
        <span class="event-meta">${film.duration} min</span>
      </button>
    </article>
  `;
}

export function drawTimeline(data, state) {
  const dayEvents = data.events.filter(event => event.date === state.date);
  const shown = dayEvents.filter(event => matches(event, data.films[event.filmId], state));
  const visibleRooms = data.rooms.filter(room => !state.venue || room.venueId === state.venue);
  let html = '<div class="axis"><div class="axis-label">Sala</div><div class="axis-times">';
  for (let minute = RANGE.start; minute <= RANGE.end; minute += 60) {
    html += `<span class="tick-label" style="left:${position(minute)}%">${clock(minute)}${minute >= 1440 ? '<sup>+1</sup>' : ''}</span>`;
  }
  html += '</div></div>';
  let previousVenue = null;
  for (const room of visibleRooms) {
    const isNewVenue = previousVenue !== null && previousVenue !== room.venueId;
    previousVenue = room.venueId;
    html += `
      <div class="room-row${isNewVenue ? ' new-venue' : ''}">
        <div class="room-label">
          <span class="venue-name">${escapeHtml(room.shortVenue)}</span>
          <strong>Sala ${room.number}</strong>
        </div>
        <div class="plot">${shown
          .filter(event => event.roomId === room.id)
          .map(event => renderEvent(event, room, data, dayEvents)).join('')}
        </div>
      </div>
    `;
  }
  return { html, shown, visibleRooms };
}
