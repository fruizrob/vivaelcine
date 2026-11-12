// Calendar labels describe scheduled dates, never attendance or ticket inventory.
export function localDate(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
}

export function calendarState(first, last, today) {
  if (last < today) return 'Archivo de fechas pasadas';
  if (first > today) return 'Programación futura';
  return 'Dentro de las fechas programadas';
}

// Resolve the offset for this local date using IANA timezone data, not a fixed -03.
// Ambiguous/nonexistent wall times fail rather than silently choosing an instant.
export function zonedStart(date, minutes, timeZone) {
  const wall = Date.parse(`${date}T00:00:00Z`) + minutes * 60_000;
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const offsets = new Set();
  for (const hours of [-36, 0, 36]) {
    const sample = wall + hours * 3_600_000;
    const parts = Object.fromEntries(format.formatToParts(new Date(sample)).map(part => [part.type, part.value]));
    offsets.add((Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`) - sample) / 60_000);
  }
  const candidates = [...offsets].filter(offset => {
    const parts = Object.fromEntries(format.formatToParts(new Date(wall - offset * 60_000)).map(part => [part.type, part.value]));
    return Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`) === wall;
  });
  if (candidates.length !== 1) throw new Error(`Ambiguous or nonexistent local screening time: ${date} ${minutes} ${timeZone}`);
  const offset = candidates[0];
  const sign = offset < 0 ? '-' : '+';
  const pad = value => String(value).padStart(2, '0');
  return new Date(wall).toISOString().slice(0, 16) + `:00${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}
