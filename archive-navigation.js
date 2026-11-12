import { endOf } from './core.js?v=20261105-years';

function localParts(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

function localDate(now, timeZone) {
  const parts = localParts(now, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Resolve a published local start before adding elapsed runtime (including DST).
function startInstant(date, minutes, timeZone) {
  const target = Date.parse(`${date}T00:00:00Z`) + minutes * 60000;
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = localParts(new Date(instant), timeZone);
    const represented = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    const correction = target - represented;
    instant += correction;
    if (!correction) break;
  }
  return instant;
}

function eventBoundary(data, event) {
  const finish = endOf(event, data.films);
  // No invented runtime: unpublished durations keep their entire local date.
  return finish === null
    ? startInstant(event.date, (Math.floor(event.start / 1440) + 1) * 1440, data.timeZone)
    : startInstant(event.date, event.start, data.timeZone) + (finish - event.start) * 60000;
}

export function festivalFinished(data, now = new Date()) {
  const lastDay = data.days.map(day => day.date).sort().at(-1);
  const finalEvents = data.events.filter(event => event.date === lastDay);
  const boundaries = data.events.map(event => eventBoundary(data, event));
  if (!finalEvents.length) boundaries.push(startInstant(lastDay, 1440, data.timeZone));
  return Math.max(...boundaries) <= now.getTime();
}

function weekStart(date) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day.toISOString().slice(0, 10);
}

export function visibleDays(data, { showPast = false, selectedDate, now = new Date() } = {}) {
  const start = weekStart(localDate(now, data.timeZone));
  return data.days.filter(day => showPast || day.date === selectedDate || day.date >= start
    || data.events.some(event => event.date === day.date && eventBoundary(data, event) > now.getTime()));
}

export function hasExplicitSelection(data, search) {
  const params = new URLSearchParams(search);
  return params.get('festival') === data.id
    || data.days.some(day => day.date === params.get('dia'))
    || data.events.some(event => event.id === params.get('funcion'));
}

export function archiveNavigation(festivals, data, options = {}) {
  const { showPast = false, pinned = false, selectedDate, now = new Date() } = options;
  const current = festivals.filter(festival => !festivalFinished(festival, now));
  const days = visibleDays(data, { showPast, selectedDate, now });
  return {
    festivals: festivals.filter(festival => showPast || current.includes(festival) || (pinned && festival.id === data.id)),
    days,
    showSchedule: showPast || pinned || current.some(festival => festival.id === data.id),
    hasPast: current.length < festivals.length || visibleDays(data, { now }).length < data.days.length,
  };
}
