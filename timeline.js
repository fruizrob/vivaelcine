import { clock, durationOf, endOf, matches, roomName, roomLocation } from './core.js?v=20261104';

export const escapeHtml = text => String(text ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
export const sectionStyle = section => `--event-color:${section.color};--event-edge:${section.edge};--event-ink:${section.ink}`;
export function timelineRange(data, date) {
  if (data.range) return data.range;
  const events = date ? data.events.filter(event => event.date === date) : data.events;
  return {
    start: Math.floor(Math.min(...events.map(event => event.start)) / 60) * 60,
    end: Math.ceil(Math.max(...events.map(event => endOf(event, data.films) ?? event.start + 120)) / 60) * 60,
  };
}

function placeEvents(events, films) {
  const ends = [];
  return [...events].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id)).map(event => {
    let lane = ends.findIndex(end => end <= event.start);
    if (lane === -1) lane = ends.length;
    ends[lane] = endOf(event, films) ?? event.start;
    return { event, lane };
  });
}

function renderEvent(event, lane, room, data, dayEvents, range) {
  const film = data.films[event.filmId];
  const duration = durationOf(event, data.films);
  const finish = endOf(event, data.films);
  const unknown = duration === null;
  const isShort = !unknown && duration < 45;
  const span = range.end - range.start;
  const nextInRoom = dayEvents
    .filter(next => next.roomId === room.id && next.start > event.start)
    .sort((a, b) => a.start - b.start)[0];
  const shortLabel = isShort && nextInRoom
    ? `--short-label-width:calc(${Math.max(0, nextInRoom.start - finish) / duration * 100}% - 12px);`
    : '';
  const unknownLabel = unknown && nextInRoom
    ? `--unknown-label-width:calc(var(--plot-width)*${(nextInRoom.start - event.start) / span} - 12px);`
    : '';
  const title = event.title || film.title;
  const timeRange = unknown ? clock(event.start) : `${clock(event.start)}–${clock(finish, true)}`;
  const length = unknown ? 'Duración por confirmar' : `${duration} min`;
  const label = `${title}. ${timeRange}. ${roomLocation(room)}. ${length}. Ver detalle.`;
  return `
    <article class="event${unknown ? ' unknown' : isShort ? ' short' : ''}" data-event="${event.id}"
      style="left:${(event.start - range.start) / span * 100}%;width:${unknown ? 0 : duration / span * 100}%;--lane:${lane};${shortLabel}${unknownLabel}${sectionStyle(data.sections[film.section])}">
      <button class="event-main" data-detail="${event.id}" aria-label="${escapeHtml(label)}"
        title="${escapeHtml(`${title} · ${timeRange} · ${length}`)}">
        <span class="event-time">${isShort || unknown ? clock(event.start) : `${clock(event.start)}–${clock(finish)}`}</span>
        <span class="event-title">${escapeHtml(title)}</span>
        <span class="event-meta">${escapeHtml(length)}</span>
      </button>
    </article>
  `;
}

export function drawTimeline(data, state) {
  const range = timelineRange(data, state.date);
  const dayEvents = data.events.filter(event => event.date === state.date);
  const shown = dayEvents.filter(event => matches(event, data.films[event.filmId], state));
  const visibleRooms = data.rooms.filter(room => !state.venue || room.venueId === state.venue);
  let html = '<div class="axis"><div class="axis-label">Sala</div><div class="axis-times">';
  for (let minute = range.start; minute <= range.end; minute += 60) {
    html += `<span class="tick-label" style="left:${(minute - range.start) / (range.end - range.start) * 100}%">${clock(minute)}${minute >= 1440 ? '<sup>+1</sup>' : ''}</span>`;
  }
  html += '</div></div>';
  let previousVenue = null;
  for (const room of visibleRooms) {
    const isNewVenue = previousVenue !== null && previousVenue !== room.venueId;
    previousVenue = room.venueId;
    const placed = placeEvents(shown.filter(event => event.roomId === room.id), data.films);
    const lanes = Math.max(1, ...placed.map(item => item.lane + 1));
    const name = roomName(room);
    html += `
      <div class="room-row${isNewVenue ? ' new-venue' : ''}" style="--lanes:${lanes}">
        <div class="room-label">
          ${room.venue === name ? '' : `<span class="venue-name">${escapeHtml(room.shortVenue || room.venue)}</span>`}
          <strong>${escapeHtml(name)}</strong>
        </div>
        <div class="plot">${placed.map(({ event, lane }) => renderEvent(event, lane, room, data, dayEvents, range)).join('')}</div>
      </div>
    `;
  }
  return { html, shown, visibleRooms, range };
}
