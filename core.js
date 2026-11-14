export function minutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function clock(value, withDay = false) {
  const n = Math.round(value);
  const time = `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  return time + (withDay && n >= 1440 ? ' (+1 día)' : '');
}

export function normalize(value) {
  return String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function todayFor(data, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: data.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
}

export function nextScreeningDay(data, now = new Date()) {
  const today = todayFor(data, now);
  const publishedDates = new Set(data.events.map(event => event.date));
  return data.days.map(day => day.date)
    .filter(date => date >= today && publishedDates.has(date)).sort()[0];
}

export function initialDay(data, requestedDay, now = new Date()) {
  if (data.days.some(day => day.date === requestedDay)) return requestedDay;
  return nextScreeningDay(data, now) || data.days[0]?.date;
}

export function durationOf(event, films) {
  const duration = Object.hasOwn(event, 'duration') ? event.duration : films[event.filmId]?.duration;
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

export function yearOf(event, film) {
  const year = Object.hasOwn(event, 'year') ? event.year : film.components ? null : film.year;
  return Number.isInteger(year) && year >= 1000 && year <= 9999 ? year : null;
}

export function endOf(event, films) {
  const duration = durationOf(event, films);
  return Number.isFinite(duration) && duration > 0 ? event.start + duration : null;
}

export function roomName(room) {
  return room.name || `Sala ${room.number}`;
}

export function roomLocation(room) {
  const name = roomName(room);
  return room.venue === name ? name : `${room.venue} · ${name}`;
}

export function matches(event, film, filters) {
  if (filters.venue && event.venueId !== filters.venue) return false;
  if (filters.section && film.section !== filters.section) return false;
  const searchable = record => [record.title, record.originalTitle, record.director, record.countries,
    record.alias, ...(record.aliases || []), ...(record.searchAliases || [])];
  const components = (film.components || []).flatMap(searchable);
  return normalize([...searchable(event), ...searchable(film), ...components].join(' ')).includes(normalize(filters.search).trim());
}
