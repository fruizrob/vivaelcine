import histories from './data/festival-history.js?v=20261104-history-2';
import { escapeHtml as esc } from './timeline.js?v=20261105-years';

const firstDate = date => date.length === 4 ? `${date}-01-01` : date.length === 7 ? `${date}-01` : date;

function dateLabel({ date, endDate }) {
  if (!date) return '';
  if (date.length === 4) return endDate ? `${date}–${endDate}` : date;
  const format = new Intl.DateTimeFormat('es-CL', {
    ...(date.length === 10 ? { day: 'numeric' } : {}),
    month: 'short', year: 'numeric', timeZone: 'UTC',
  });
  const start = new Date(`${firstDate(date)}T12:00:00Z`);
  return endDate ? format.formatRange(start, new Date(`${firstDate(endDate)}T12:00:00Z`)) : format.format(start);
}

export function renderHistory(appearances, festival, event) {
  if (!appearances?.length) return '';
  return `<ol class="festival-history-list" aria-label="Festivales">${[...appearances]
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
    .map(appearance => {
      const upcoming = appearance.festivalId !== festival.id && appearance.date && firstDate(appearance.date) > event.date;
      return `<li>
        <span class="history-date">${esc(dateLabel(appearance))}</span>
        <div><a href="${esc(appearance.source)}" target="_blank" rel="noopener"${appearance.edition ? ` title="${esc(appearance.edition)}"` : ''}>${esc(appearance.festival)}</a>${upcoming ? '<span class="history-date"> · Anunciada</span>' : ''}
          ${appearance.premiere ? `<span class="history-premiere">${esc(appearance.premiere)}</span>` : ''}
        </div>
      </li>`;
    }).join('')}</ol>`;
}

export function renderFestivalHistory(festival, event, component = null) {
  // Parts require their own event key; programme members never inherit the block's history.
  let filmId = event.title ? event.id : event.filmId;
  if (component) filmId = component.filmId || `${event.filmId}/${component.title}`;
  if (!component && festival.films[event.filmId].components) return '';
  const list = renderHistory(histories[`${festival.id}/${filmId}`], festival, event);
  return !list || component ? list : `<section class="festival-history"><h3>Festivales</h3>${list}</section>`;
}
