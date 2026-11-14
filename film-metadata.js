// Film facts come from accepted TMDB identities. Festival scheduling stays local.
export function applyFilmMetadata(festival, metadata = {}) {
  const apply = (film, key, isEvent = false) => {
    const facts = metadata[key];
    if (!facts || !Number.isInteger(facts.tmdbId) || facts.tmdbId <= 0) return;
    const source = `https://www.themoviedb.org/movie/${facts.tmdbId}`;
    film.metadataSource = source;
    if (Number.isInteger(facts.year) && facts.year >= 1800 && facts.year <= 2200) {
      film.year = facts.year;
      film.yearSource = source;
    }
    for (const field of ['originalTitle', 'synopsis']) {
      if (typeof facts[field] === 'string' && facts[field].trim()) film[field] = facts[field];
    }
    if (typeof facts.title === 'string' && facts.title.trim()) film.providerTitle = facts.title;
    const names = values => Array.isArray(values) && values.every(value => typeof value === 'string' && value.trim()) && values.length;
    if (names(facts.directors)) film.director = facts.directors.join(', ');
    if (names(facts.countries)) film.countries = facts.countries.join(', ');
    // Film runtime never overwrites an explicit screening window (event.duration).
    if (Number.isFinite(facts.runtime) && facts.runtime > 0) {
      film.filmRuntime = facts.runtime;
      if (!isEvent) film.duration = facts.runtime;
    }
  };
  for (const [id, film] of Object.entries(festival.films)) {
    if (film.components) {
      for (const component of film.components) apply(component,
        `${festival.id}/${component.filmId || `${id}/${component.title}`}`);
      if (film.durationKind === 'sum' && film.components.every(component => Number.isFinite(component.duration) && component.duration > 0)) {
        film.duration = film.components.reduce((total, component) => total + component.duration, 0);
      }
    } else apply(film, `${festival.id}/${id}`);
  }
  for (const event of festival.events) {
    if (event.title) apply(event, `${festival.id}/${event.id}`, true);
  }
  return festival;
}
