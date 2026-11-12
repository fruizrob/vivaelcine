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

function eventFinished(data, event, now) {
  const finish = endOf(event, data.films);
  if (finish === null) {
    // Compare dates rather than resolving a midnight that may be skipped/repeated.
    const startDate = new Date(Date.parse(`${event.date}T00:00:00Z`)
      + Math.floor(event.start / 1440) * 86400000).toISOString().slice(0, 10);
    return localDate(now, data.timeZone) > startDate;
  }
  return startInstant(event.date, event.start, data.timeZone)
    + (finish - event.start) * 60000 <= now.getTime();
}

export function festivalFinished(data, now = new Date()) {
  const lastDay = data.days.map(day => day.date).sort().at(-1);
  const finalEvents = data.events.filter(event => event.date === lastDay);
  if (!finalEvents.length && localDate(now, data.timeZone) <= lastDay) return false;
  return data.events.every(event => eventFinished(data, event, now));
}

function weekStart(date) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day.toISOString().slice(0, 10);
}

export function visibleDays(data, { showPast = false, selectedDate, now = new Date() } = {}) {
  const start = weekStart(localDate(now, data.timeZone));
  return data.days.filter(day => showPast || day.date === selectedDate || day.date >= start
    || data.events.some(event => event.date === day.date && !eventFinished(data, event, now)));
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
