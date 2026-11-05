// Film facts come from accepted TMDB identities. Festival scheduling stays local.
export function applyFilmMetadata(festival, metadata = {}) {
  const apply = (film, key) => {
    const facts = metadata[key];
    if (!facts || !Number.isInteger(facts.tmdbId) || !Number.isInteger(facts.year)
      || facts.year < 1800 || facts.year > 2200) return;
    film.year = facts.year;
    film.yearSource = `https://www.themoviedb.org/movie/${facts.tmdbId}`;
  };
  for (const [id, film] of Object.entries(festival.films)) {
    if (film.components) {
      for (const component of film.components) apply(component,
        `${festival.id}/${component.filmId || `${id}/${component.title}`}`);
    } else apply(film, `${festival.id}/${id}`);
  }
  for (const event of festival.events) {
    if (event.title) apply(event, `${festival.id}/${event.id}`);
  }
  return festival;
}
