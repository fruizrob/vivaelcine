import { escapeHtml as esc } from './timeline.js?v=20261105-festival-labels';

export function filmPoster(festival, event, component = null) {
  const film = festival.films[event.filmId];
  // A programme has no single movie poster; each member keeps its own artwork.
  if (!component && film.components) return null;
  const id = component ? component.filmId || `${event.filmId}/${component.title}` : event.title ? event.id : event.filmId;
  const poster = festival.filmPosters?.[`${festival.id}/${id}`];
  return /^\/[a-zA-Z0-9]+\.(jpg|png|webp)$/.test(poster?.path || '') ? poster : null;
}

export function renderFilmPoster(festival, event, component = null) {
  const film = festival.films[event.filmId];
  const poster = filmPoster(festival, event, component);
  if (!poster) return '';
  const title = component?.title || event.title || film.title;
  return `<img class="film-poster" src="https://image.tmdb.org/t/p/w342${poster.path}"
    alt="Afiche de ${esc(title)}" width="200" height="300" decoding="async"${component ? ' loading="lazy"' : ''}>`;
}
