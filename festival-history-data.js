import curated from './data/festival-history.js?v=20261104-history-2';

// Festival identities only; array order never determines the selected appearance.
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
  { name: 'SANFIC', id: 'sanfic', extension: 'png' },
  { name: 'FIDOCS', id: 'fidocs', extension: 'png' },
  { name: 'Guadalajara', id: 'guadalajara' },
  { name: 'Punto de Vista', id: 'punto-de-vista' },
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
  const appearances = members.flatMap(component => filmHistory(festival, event, component)
    .filter(item => item.date && item.date <= event.date)
    .map(appearance => ({ appearance, subject: component?.title })))
    .sort((a, b) => a.appearance.date.localeCompare(b.appearance.date)
      || a.appearance.festival.localeCompare(b.appearance.festival)
      || (a.subject || '').localeCompare(b.subject || ''));
  const first = appearances.find(({ appearance }) => appearance.premiere === 'Estreno mundial') || appearances[0];
  if (!first) return null;
  const { appearance, subject } = first;
  const name = appearance.festival.split(' · ')[0];
  const mark = festivalMarks.find(item => item.name === name);
  const scope = appearance.premiere || 'Primera aparición registrada';
  const label = `${subject ? `${subject} · ` : ''}${appearance.festival} · ${appearance.date.slice(0, 4)} · ${scope}`;
  return {
    name, id: mark?.id || 'other', label, subject,
    year: appearance.date.slice(0, 4), scope,
    logo: mark ? `./assets/festivals/${mark.id}.${mark.extension || 'svg'}` : null,
  };
}
