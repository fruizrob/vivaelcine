import sanfic from './data/sanfic-2026.js?v=20261105-tmdb-years';
import fidocs from './data/fidocs-2026.js?v=20261105-years';

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
];

export function festivalFor(search = '') {
  const id = new URLSearchParams(search).get('festival');
  return festivals.find(festival => festival.id === id) || festivals[0];
}

export default festivals[0];
