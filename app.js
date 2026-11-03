import data from './data.js';
import { clock, endOf } from './core.js?v=20261103';
import { drawTimeline, escapeHtml as esc, sectionStyle, RANGE } from './timeline.js?v=20261103';

const $ = selector => document.querySelector(selector);
const requestedDay = new URLSearchParams(location.search).get('dia');
const eventsById = new Map(data.events.map(event => [event.id, event]));
const roomsById = new Map(data.rooms.map(room => [room.id, room]));
const state = {
  date: data.days.some(day => day.date === requestedDay) ? requestedDay : data.days[0].date,
  search: '',
  venue: '',
  section: '',
  zoom: 1,
};
const dialog = $('#film-dialog');
let detailEvent = null;

function dateLabel(date, short = false) {
  const day = data.days.find(day => day.date === date);
  return short
    ? `${day.short.toLowerCase()} ${day.number} nov`
    : `${day.label} ${day.number} de noviembre`;
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
  const scroll = $('#timeline-scroll');
  const labelWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--label-width'));
  const width = Math.round(Math.max(850, scroll.clientWidth - labelWidth) * state.zoom);
  $('#timeline').style.setProperty('--plot-width', `${width}px`);
  $('#timeline').style.setProperty('--hour-width', `${width / ((RANGE.end - RANGE.start) / 60)}px`);
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
        <span>${esc(room.venue)} · Sala ${room.number}</span>
      </button>
    `;
  }).join('');
}

function renderDetail() {
  const event = eventsById.get(detailEvent);
  const film = data.films[event.filmId];
  const room = roomsById.get(event.roomId);
  const section = data.sections[film.section];
  $('#film-detail').innerHTML = `
    <p class="film-section" style="color:${section.ink}">${esc(section.label)}</p>
    <h2 id="film-title">${esc(film.title)}</h2>
    <p class="detail-when">
      ${dateLabel(event.date)} · ${clock(event.start)}–${clock(endOf(event, data.films), true)}
      <span>${esc(room.venue)} · Sala ${room.number}</span>
    </p>
    <dl class="film-facts">
      <dt>Dirección</dt><dd>${esc(film.director)}</dd>
      <dt>Duración</dt><dd>${film.duration} min${film.durationKind === 'sum' ? ' · siete cortometrajes' : ''}</dd>
      <dt>Países</dt><dd>${esc(film.countries)}</dd>
      <dt>Idioma</dt><dd>${esc(film.language)}</dd>
      ${film.alias ? `<dt>Otro título</dt><dd>${esc(film.alias)}</dd>` : ''}
    </dl>
    ${film.note ? `<p>${esc(film.note)}</p>` : ''}
    <a class="detail-source" href="${esc(film.source)}" target="_blank" rel="noopener">${film.components ? 'Programa del bloque' : 'Ficha oficial'} ↗</a>
    ${film.components ? `
      <details>
        <summary>Cortometrajes</summary>
        <ul class="short-list">${film.components.map(short => `
          <li><a href="${esc(short.source)}" target="_blank" rel="noopener">${esc(short.title)}</a> · ${short.duration} min<br>${esc(short.director)}</li>
        `).join('')}</ul>
      </details>
    ` : ''}
    <p class="runtime-note">Fin estimado por metraje; sin presentación ni conversatorio.</p>
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
renderDays();
renderSchedule();
