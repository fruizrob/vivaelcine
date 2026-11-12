import links from './data/short-links.js?v=20261112-short-links';

const codes = new Map(Object.entries(links).map(([code, entry]) => [
  `${entry.festivalId}/${entry.eventId}`, code,
]));

export function sharedScreeningUrl(festival, event, base) {
  const code = codes.get(`${festival.id}/${event.id}`);
  if (code) return new URL(`/s/${code}/`, base).href;
  // Unpublished screenings keep an exact usable link until pages are generated.
  return agendaScreeningUrl(festival, event, base);
}

export function agendaScreeningUrl(festival, event, base) {
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  url.searchParams.set('festival', festival.id);
  url.searchParams.set('dia', event.date);
  url.searchParams.set('funcion', event.id);
  return url.href;
}
