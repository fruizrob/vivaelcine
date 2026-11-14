import sanfic from './data/sanfic-2026.js?v=20261105-tmdb-years';
import fidocs from './data/fidocs-2026.js?v=20261113-program';
import { nextScreeningDay, todayFor } from './core.js?v=20261112-selection';
import ficvina from './data/ficvina-2026.js?v=20261113';

export const festivals = [
  {
    ...sanfic,
    id: 'sanfic-2026',
    name: 'SANFIC22',
    sourceUrl: 'https://sanfic.com/esta-edicion/programacion/',
    programUrl: './assets/programacion-sanfic22.pdf',
    range: { start: 900, end: 1500 },
  },
  { ...fidocs, id: 'fidocs-2026', name: 'FIDOCS 30', sourceUrl: 'https://fidocs.cl/programacion/' },
  ficvina,
];

export function festivalFor(search = '', now = new Date(), catalogue = festivals) {
  const params = new URLSearchParams(search);
  const explicit = catalogue.find(festival => festival.id === params.get('festival'))
    || catalogue.find(festival => festival.events.some(event => event.id === params.get('funcion')))
    || catalogue.find(festival => festival.days.some(day => day.date === params.get('dia')));
  if (explicit) return explicit;

  const upcoming = catalogue.map(festival => ({ festival, date: nextScreeningDay(festival, now) }))
    .filter(({ date }) => date)
    .map(candidate => ({ ...candidate, today: candidate.date === todayFor(candidate.festival, now) }));
  // Prefer each festival's local today, then its earliest civil date; registry order breaks ties.
  upcoming.sort((a, b) => Number(b.today) - Number(a.today) || a.date.localeCompare(b.date));
  return upcoming[0]?.festival || catalogue[0];
}

export default festivals[0];
