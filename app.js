import { festivals, festivalFor } from './data.js?v=20261103-2';
import { clock, durationOf, endOf, initialDay, roomLocation } from './core.js?v=20261104';
import { drawTimeline, escapeHtml as esc, sectionStyle, timelineRange } from './timeline.js?v=20261104';

const data = festivalFor(location.search);
const $ = selector => document.querySelector(selector);
const requestedDay = new URLSearchParams(location.search).get('dia');
const eventsById = new Map(data.events.map(event => [event.id, event]));
const roomsById = new Map(data.rooms.map(room => [room.id, room]));
const state = {
  date: initialDay(data, requestedDay),
  search: '',
  venue: '',
  section: '',
  zoom: 1,
};
const dialog = $('#film-dialog');
let detailEvent = null;

function dateLabel(date, short = false) {
  return new Intl.DateTimeFormat('es-CL', {
    weekday: short ? 'short' : 'long', day: 'numeric', month: short ? 'short' : 'long', timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

function renderFestival() {
  document.title = `¡Viva el Cine! · ${data.name}`;
  document.querySelector('meta[name="description"]').content = `Programación de ${data.name}. Horarios y películas por sala.`;
  $('#festivals').innerHTML = festivals.map(festival => `
    <a href="?festival=${festival.id}" ${festival.id === data.id ? 'aria-current="page"' : ''}>${esc(festival.name)}</a>
  `).join('');
  const first = data.days[0].date;
  const last = data.days.at(-1).date;
  const format = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  $('#festival-dates').textContent = format.formatRange(new Date(`${first}T12:00:00Z`), new Date(`${last}T12:00:00Z`));
  $('#program-source').href = data.programUrl || data.sourceUrl;
  $('#festival-source').href = data.sourceUrl;
  $('#festival-source').textContent = `${data.name} ↗`;
  $('#days').style.setProperty('--day-count', data.days.length);
}

function renderDays() {
  $('#days').innerHTML = data.days.map(day => `
    <button class="day-button" data-day="${day.date}"
      ${day.date === state.date ? 'aria-current="date"' : ''}
      aria-label="${dateLabel(day.date)}">
      <span class="day-name">${day.short}</span>
      <span class="day-number">${String(day.number).padStart(2, '0')}</span>
    </button>
  `).join('');
}

function resizeTimeline() {
  const range = timelineRange(data, state.date);
  const scroll = $('#timeline-scroll');
  const labelWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--label-width'));
  const width = Math.round(Math.max(850, scroll.clientWidth - labelWidth) * state.zoom);
  $('#timeline').style.setProperty('--plot-width', `${width}px`);
  $('#timeline').style.setProperty('--hours', (range.end - range.start) / 60);
  $('#timeline').style.setProperty('--hour-width', `${width / ((range.end - range.start) / 60)}px`);
  $('#zoom-fit').textContent = `${Math.round(state.zoom * 100)}%`;
  $('#zoom-out').disabled = state.zoom <= .8;
  $('#zoom-in').disabled = state.zoom >= 1.8;
}

function renderSchedule() {
  const { html, shown } = drawTimeline(data, state);
  $('#timeline').innerHTML = html;
  $('#day-heading').textContent = dateLabel(state.date);
  $('#empty-results').hidden = shown.length !== 0;
  for (const button of document.querySelectorAll('[data-section]')) {
    button.setAttribute('aria-pressed', button.dataset.section === state.section);
  }
  resizeTimeline();
}

function renderScreenings(filmId) {
  const screenings = data.events
    .filter(event => event.filmId === filmId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  return screenings.map(event => {
    const room = roomsById.get(event.roomId);
    const current = event.id === detailEvent;
    return `
      <button class="screening" data-detail="${event.id}" ${current ? 'aria-current="true"' : ''}>
        <span>${dateLabel(event.date, true)} <strong>${clock(event.start)}</strong></span>
        <span>${esc(roomLocation(room))}${event.title ? ` · ${esc(event.title)}` : ''}</span>
      </button>
    `;
  }).join('');
}

function renderDetail() {
  const event = eventsById.get(detailEvent);
  const film = data.films[event.filmId];
  const room = roomsById.get(event.roomId);
  const section = data.sections[film.section];
  const duration = durationOf(event, data.films);
  const finish = endOf(event, data.films);
  const source = event.source || film.source;
  const ticket = event.ticketUrl || film.ticketUrl;
  const notes = [...new Set([event.note, film.note].filter(Boolean))];
  $('#film-detail').innerHTML = `
    <p class="film-section" style="color:${section.ink}">${esc(section.label)}</p>
    <h2 id="film-title">${esc(event.title || film.title)}</h2>
    <p class="detail-when">
      ${dateLabel(event.date)} · ${clock(event.start)}${finish === null ? '' : `–${clock(finish, true)}`}
      <span>${esc(roomLocation(room))}</span>
    </p>
    <dl class="film-facts">
      ${film.director ? `<dt>Dirección</dt><dd>${esc(film.director)}</dd>` : ''}
      <dt>Duración</dt><dd>${duration === null ? 'Por confirmar' : `${duration} min`}${film.durationKind === 'sum' ? ` · ${film.components.length} cortometrajes` : ''}</dd>
      ${film.countries ? `<dt>Países</dt><dd>${esc(film.countries)}</dd>` : ''}
      ${film.year ? `<dt>Año</dt><dd>${esc(film.year)}</dd>` : ''}
      ${film.free ? '<dt>Entrada</dt><dd>Gratuita</dd>' : ''}
      ${film.language ? `<dt>Idioma</dt><dd>${esc(film.language)}</dd>` : ''}
      ${film.alias ? `<dt>Otro título</dt><dd>${esc(film.alias)}</dd>` : ''}
    </dl>
    ${notes.map(note => `<p>${esc(note)}</p>`).join('')}
    <a class="detail-source" href="${esc(source)}" target="_blank" rel="noopener">${source === ticket ? 'Entradas' : film.components ? 'Programa del bloque' : 'Ficha oficial'} ↗</a>
    ${ticket && ticket !== source ? `<a class="detail-source ticket-link" href="${esc(ticket)}" target="_blank" rel="noopener">Entradas ↗</a>` : ''}
    ${film.components ? `
      <details>
        <summary>Cortometrajes</summary>
        <ul class="short-list">${film.components.map(short => `
          <li><a href="${esc(short.source)}" target="_blank" rel="noopener">${esc(short.title)}</a>${Number.isFinite(short.duration) ? ` · ${short.duration} min` : ''}${short.director ? `<br>${esc(short.director)}` : ''}</li>
        `).join('')}</ul>
      </details>
    ` : ''}
    ${finish === null ? '' : '<p class="runtime-note">Fin estimado por metraje.</p>'}
    ${film.aliasSources ? `<p class="alias-sources">${film.aliasSources.map((url, index) => `<a href="${esc(url)}" target="_blank" rel="noopener">${index ? 'Festival de San Sebastián' : 'Distribuidora'} ↗</a>`).join(' · ')}</p>` : ''}
    <section class="screenings" aria-labelledby="screenings-title">
      <h3 id="screenings-title">Funciones</h3>
      ${renderScreenings(event.filmId)}
    </section>
  `;
}

function showDetail(id) {
  if (!eventsById.has(id)) return;
  const wasOpen = dialog.open;
  detailEvent = id;
  renderDetail();
  if (!wasOpen) dialog.showModal();
  else dialog.querySelector('[aria-current="true"]').focus();
}

function changeDay(date, focus = false) {
  if (!data.days.some(day => day.date === date)) return;
  state.date = date;
  const url = new URL(location.href);
  url.searchParams.set('dia', date);
  history.replaceState(null, '', url);
  renderDays();
  renderSchedule();
  if (focus) $(`[data-day="${date}"]`).focus();
}

function setZoom(zoom) {
  state.zoom = Math.max(.8, Math.min(1.8, Math.round(zoom * 10) / 10));
  resizeTimeline();
}

document.addEventListener('click', event => {
  const detailButton = event.target.closest('[data-detail]');
  if (detailButton) {
    showDetail(detailButton.dataset.detail);
    return;
  }
  const dayButton = event.target.closest('[data-day]');
  if (dayButton) {
    changeDay(dayButton.dataset.day);
    return;
  }
  const sectionButton = event.target.closest('[data-section]');
  if (sectionButton) {
    state.section = state.section === sectionButton.dataset.section ? '' : sectionButton.dataset.section;
    renderSchedule();
  }
});

$('#days').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const count = data.days.length;
  const index = data.days.findIndex(day => day.date === state.date);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1
    : (index + (event.key === 'ArrowRight' ? 1 : count - 1)) % count;
  changeDay(data.days[next].date, true);
});
$('#search').addEventListener('input', event => {
  state.search = event.target.value;
  renderSchedule();
});
$('#venue').addEventListener('change', event => {
  state.venue = event.target.value;
  renderSchedule();
});
$('#reset-filters').addEventListener('click', () => {
  state.search = state.venue = state.section = '';
  $('#search').value = $('#venue').value = '';
  renderSchedule();
});
$('#zoom-in').addEventListener('click', () => setZoom(state.zoom + .2));
$('#zoom-out').addEventListener('click', () => setZoom(state.zoom - .2));
$('#zoom-fit').addEventListener('click', () => {
  setZoom(1);
  $('#timeline-scroll').scrollLeft = 0;
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
window.addEventListener('resize', resizeTimeline);

const venues = new Map(data.rooms.map(room => [room.venueId, room.venue]));
$('#venue').insertAdjacentHTML('beforeend', [...venues].map(([id, title]) => `<option value="${id}">${esc(title)}</option>`).join(''));
$('#legend').innerHTML = Object.entries(data.sections).map(([id, section]) => `
  <button class="legend-button" data-section="${id}" aria-pressed="false" style="${sectionStyle(section)}">
    <span class="legend-dot" aria-hidden="true"></span>${esc(section.label)}
  </button>
`).join('');
renderFestival();
renderDays();
renderSchedule();
