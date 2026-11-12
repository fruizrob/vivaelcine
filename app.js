import { applyFilmMetadata } from './film-metadata.js';
import { festivals, festivalFor } from './data.js?v=20261112-selection';
import { clock, durationOf, endOf, initialDay, roomLocation, yearOf } from './core.js?v=20261112-selection';
import { drawTimeline, escapeHtml as esc, sectionStyle, timelineRange, timelineWidth } from './timeline.js?v=20261112-zoom';
import { screeningUrl } from './story.js?v=20261112-short-links';
import { setupSharing } from './sharing.js?v=20261112-short-links';
import { renderFestivalHistory } from './festival-history.js?v=20261105-premieres';
import { renderFilmPoster } from './film-poster.js?v=20261105-posters';
import { archiveNavigation, hasExplicitSelection } from './archive-navigation.js?v=20261112-archive';

const now = new Date();
const data = { ...structuredClone(festivalFor(location.search, now)), festivalHistory: {}, filmPosters: {} };
const $ = selector => document.querySelector(selector);
const requestedDay = new URLSearchParams(location.search).get('dia');
const eventsById = new Map(data.events.map(event => [event.id, event]));
const roomsById = new Map(data.rooms.map(room => [room.id, room]));
const requestedScreening = eventsById.get(new URLSearchParams(location.search).get('funcion'));
const state = {
  date: requestedScreening?.date || initialDay(data, requestedDay, now),
  search: '',
  venue: '',
  section: '',
  zoom: 1,
};
const dialog = $('#film-dialog');
let detailEvent = null;
const showShare = setupSharing($('#share-menu'), $('#story-dialog'), data);
let showPast = new URLSearchParams(location.search).get('anteriores') === '1';
const pinnedArchive = hasExplicitSelection(data, location.search);

function navigation() {
  return archiveNavigation(festivals, data, { showPast, pinned: pinnedArchive, selectedDate: state.date });
}

function dateLabel(date, short = false) {
  return new Intl.DateTimeFormat('es-CL', {
    weekday: short ? 'short' : 'long', day: 'numeric', month: short ? 'short' : 'long', timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

function renderFestival() {
  const nav = navigation();
  document.title = nav.showSchedule ? `¡Viva el Cine! · ${data.name}` : '¡Viva el Cine!';
  document.querySelector('meta[name="description"]').content = nav.showSchedule
    ? `Programación de ${data.name}. Horarios y películas por sala.` : 'Programación de festivales de cine.';
  $('#festivals').hidden = nav.festivals.length === 0;
  $('#festivals').innerHTML = nav.festivals.map(festival => `
    <a href="?festival=${festival.id}${showPast ? '&amp;anteriores=1' : ''}" ${festival.id === data.id ? 'aria-current="page"' : ''}>${esc(festival.name)}</a>
  `).join('');
  $('#archive-toggle').hidden = !nav.hasPast;
  $('#archive-toggle').textContent = showPast ? 'Ocultar anteriores' : 'Mostrar anteriores';
  $('#archive-toggle').setAttribute('aria-pressed', String(showPast));
  $('#archive-empty').hidden = nav.showSchedule;
  for (const selector of ['#festival-dates', '#program-source', '#days', '#schedule', '#festival-source']) {
    $(selector).hidden = !nav.showSchedule;
  }
  const first = data.days[0].date;
  const last = data.days.at(-1).date;
  const format = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  $('#festival-dates').textContent = format.formatRange(new Date(`${first}T12:00:00Z`), new Date(`${last}T12:00:00Z`));
  $('#program-source').href = data.programUrl || data.sourceUrl;
  $('#festival-source').href = data.sourceUrl;
  $('#festival-source').textContent = `${data.name} ↗`;
}

function renderDays() {
  const days = navigation().days;
  $('#days').innerHTML = days.map(day => `
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
  const width = timelineWidth(scroll.clientWidth, labelWidth, state.zoom);
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
  const letterboxd = event.letterboxd || film.letterboxd;
  const ratingTitle = event.letterboxd ? event.title || film.title : film.title;
  const notes = [...new Set([event.note, film.note].filter(Boolean))];
  const year = yearOf(event, film);
  const facts = [
    duration === null ? 'Duración por confirmar' : `${duration} min`,
    film.countries, film.language,
  ].filter(Boolean);
  $('#film-detail').innerHTML = `
    <p class="film-section" style="color:${section.ink}">${esc(section.label)}</p>
    <div class="film-heading">
      ${renderFilmPoster(data, event)}
      <div class="film-heading-text">
        <h2 id="film-title">${esc(event.title || film.title)}${year ? ` <span class="film-year">(${year})</span>` : ''}</h2>
        ${film.director ? `<p class="film-director">${esc(film.director)}</p>` : ''}
        <p class="film-meta">${facts.map(esc).join(' · ')}</p>
        ${film.alias ? `<p class="film-meta">${esc(film.alias)}</p>` : ''}
        ${film.free ? '<p class="film-admission">Entrada gratuita</p>' : ''}
      </div>
    </div>
    <p class="detail-when">
      ${dateLabel(event.date)}
      <strong>${clock(event.start)}${finish === null ? '' : `–${clock(finish, true)}`}</strong>
      <span>${esc(roomLocation(room))}</span>
    </p>
    ${notes.map(note => `<p>${esc(note)}</p>`).join('')}
    <div class="detail-links">
      <a href="${esc(source)}" target="_blank" rel="noopener">${source === ticket ? 'Entradas' : film.components ? 'Programa' : 'Ficha'} ↗</a>
      ${ticket && ticket !== source ? `<a href="${esc(ticket)}" target="_blank" rel="noopener">Entradas ↗</a>` : ''}
      ${letterboxd ? `<a href="https://letterboxd.com/film/${esc(letterboxd)}/" target="_blank" rel="noopener">Letterboxd ↗</a>` : ''}
    </div>
    ${renderFestivalHistory(data, event)}
    ${letterboxd ? `
      <iframe class="letterboxd-rating"
        src="https://embed.letterboxd.com/film/${esc(letterboxd)}/embed-histogram/?theme=light&notitle=true&nobackground=true"
        title="Valoraciones de ${esc(ratingTitle)} en Letterboxd"
        width="100%" height="120" loading="lazy"></iframe>
    ` : ''}
    ${film.components ? `
      <details>
        <summary>Películas</summary>
        <ul class="short-list">${film.components.map(short => `
          <li><div class="short-heading">${renderFilmPoster(data, event, short)}<div><a href="${esc(short.source)}" target="_blank" rel="noopener">${esc(short.title)}</a>${yearOf({}, short) ? ` · ${yearOf({}, short)}` : ''}${Number.isFinite(short.duration) ? ` · ${short.duration} min` : ''}${short.director ? `<br>${esc(short.director)}` : ''}${short.letterboxd ? `<br><a href="https://letterboxd.com/film/${esc(short.letterboxd)}/" target="_blank" rel="noopener" aria-label="${esc(short.title)} en Letterboxd">Letterboxd ↗</a>` : ''}</div></div>${renderFestivalHistory(data, event, short)}</li>
        `).join('')}</ul>
      </details>
    ` : ''}
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
  const event = eventsById.get(id);
  if (state.date !== event.date) changeDay(event.date);
  history.replaceState(null, '', screeningUrl(data, event, location.href));
  renderDetail();
  if (!wasOpen) dialog.showModal();
  else dialog.querySelector('[aria-current="true"]').focus();
}

function changeDay(date, focus = false) {
  if (!data.days.some(day => day.date === date)) return;
  state.date = date;
  const url = new URL(location.href);
  url.searchParams.set('dia', date);
  url.searchParams.delete('funcion');
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
  const shareButton = event.target.closest('[data-share]');
  if (shareButton) {
    showShare(eventsById.get(shareButton.dataset.share), shareButton);
    return;
  }
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
  const days = navigation().days;
  const count = days.length;
  const index = days.findIndex(day => day.date === state.date);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1
    : (index + (event.key === 'ArrowRight' ? 1 : count - 1)) % count;
  changeDay(days[next].date, true);
});
$('#archive-toggle').addEventListener('click', () => {
  if (showPast) {
    // Return through the normal festival/day selection; release any archived link.
    location.assign(location.pathname);
    return;
  }
  showPast = true;
  const url = new URL(location.href);
  url.searchParams.set('anteriores', '1');
  history.replaceState(null, '', url);
  renderFestival();
  renderDays();
  renderSchedule();
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
dialog.addEventListener('error', event => {
  if (event.target.matches('.film-poster')) event.target.hidden = true;
}, true);
$('#share-screening').addEventListener('click', event => showShare(eventsById.get(detailEvent), event.currentTarget));
dialog.addEventListener('close', () => {
  const url = new URL(location.href);
  url.searchParams.delete('funcion');
  history.replaceState(null, '', url);
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
if (requestedScreening) showDetail(requestedScreening.id);

// The agenda works immediately, even if the optional local snapshot is unavailable.
fetch('./data/tmdb-festival-history.json?v=20261105-tmdb-authority', { signal: AbortSignal.timeout(5000) })
  .then(response => { if (!response.ok) throw new Error('History unavailable'); return response.json(); })
  .then(snapshot => {
    data.festivalHistory = snapshot.films || {};
    data.filmPosters = snapshot.posters || {};
    applyFilmMetadata(data, snapshot.metadata);
    const active = document.activeElement;
    const focusedEvent = active.closest('[data-event]')?.dataset.event;
    const focusedControl = active.matches('.event-share') ? '.event-share' : active.matches('.event-rating') ? '.event-rating' : '.event-main';
    renderSchedule();
    if (focusedEvent) {
      const card = document.querySelector(`[data-event="${focusedEvent}"]`);
      const control = card?.querySelector(focusedControl);
      (control?.offsetParent ? control : card?.querySelector('.event-main'))?.focus({ preventScroll: true });
    }
    if (dialog.open) {
      const programmeOpen = $('#film-detail details')?.open;
      renderDetail();
      if (programmeOpen) $('#film-detail details').open = true;
    }
  })
  .catch(() => {});
