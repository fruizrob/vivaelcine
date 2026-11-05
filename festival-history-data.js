import curated from './data/festival-history.js?v=20261104-history-2';

// Editorial display priority, not an official ranking. One mark per screening.
export const festivalMarks = [
  { name: 'Cannes', id: 'cannes' },
  { name: 'Venecia', id: 'venice' },
  { name: 'Berlinale', id: 'berlinale' },
  { name: 'Toronto', id: 'tiff' },
  { name: 'Sundance', id: 'sundance', extension: 'png' },
  { name: 'Locarno', id: 'locarno', extension: 'png' },
  { name: 'San Sebastián', id: 'san-sebastian' },
  { name: 'Rotterdam', id: 'rotterdam' },
  { name: 'IDFA', id: 'idfa' },
  { name: 'New York', id: 'nyff', extension: 'png' },
  { name: 'BFI London', id: 'bfi-london', extension: 'ico' },
  { name: 'Karlovy Vary', id: 'karlovy-vary' },
  { name: 'Busan', id: 'busan' },
  { name: 'Ji.hlava', id: 'jihlava' },
  { name: 'Valdivia', id: 'valdivia', extension: 'png' },
];

export function filmHistory(festival, event, component = null) {
  const film = festival.films[event.filmId];
  if (!component && film.components) return [];
  const id = component ? component.filmId || `${event.filmId}/${component.title}` : event.title ? event.id : event.filmId;
  const key = `${festival.id}/${id}`;
  const known = curated[key] || [];
  const imported = (festival.festivalHistory?.[key] || []).filter(item => !known.some(appearance =>
    appearance.festival.split(' · ')[0] === item.festival.split(' · ')[0] && appearance.date?.slice(0, 4) === item.date?.slice(0, 4)));
  return [...known, ...imported];
}

export function festivalMark(festival, event) {
  const film = festival.films[event.filmId];
  const members = film.components || [null];
  for (const mark of festivalMarks) {
    for (const component of members) {
      const appearance = filmHistory(festival, event, component).find(item =>
        item.festival.split(' · ')[0] === mark.name && item.date && item.date <= event.date);
      if (!appearance) continue;
      const subject = component?.title;
      const label = `${subject ? `${subject} · ` : ''}${appearance.festival} · ${appearance.date.slice(0, 4)}`;
      return { ...mark, label, subject, logo: `./assets/festivals/${mark.id}.${mark.extension || 'svg'}` };
    }
  }
  return null;
}
