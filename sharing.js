import { setupStory } from './story.js?v=20261114-artwork';
import { sharedScreeningUrl as screeningUrl } from './screening-links.js?v=20261112-short-links';
import { clock, endOf, roomLocation } from './core.js?v=20261112-selection';

export function invitationText(festival, event, base) {
  const film = festival.films[event.filmId];
  const room = festival.rooms.find(room => room.id === event.roomId);
  const date = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${event.date}T12:00:00Z`));
  return `¿Vamos a ver ${event.title || film.title}?\n${date}, ${clock(event.start)} · ${roomLocation(room)}\nAquí está la función: ${screeningUrl(festival, event, base)}`;
}

function calendarStamp(date, minutesFromMidnight) {
  const [year, month, day] = date.split('-').map(Number);
  const instant = new Date(Date.UTC(year, month - 1, day, 0, minutesFromMidnight));
  const pad = value => String(value).padStart(2, '0');
  return `${instant.getUTCFullYear()}${pad(instant.getUTCMonth() + 1)}${pad(instant.getUTCDate())}T${pad(instant.getUTCHours())}${pad(instant.getUTCMinutes())}00`;
}

export function googleCalendarUrl(festival, event, pageUrl) {
  const film = festival.films[event.filmId];
  const room = festival.rooms.find(item => item.id === event.roomId);
  const end = endOf(event, festival.films);
  const details = [
    festival.name,
    film.director,
    end == null ? 'Duración por confirmar.' : '',
    screeningUrl(festival, event, pageUrl),
  ].filter(Boolean).join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${event.title || film.title} · ${festival.name}`,
    ctz: festival.timeZone,
    location: roomLocation(room),
    details,
  });
  const dates = `${calendarStamp(event.date, event.start)}/${calendarStamp(event.date, end ?? event.start)}`;
  return `https://calendar.google.com/calendar/render?${params}&dates=${dates}`;
}

export function appleCalendarUrl(festival, event, pageUrl) {
  return new URL(`/calendarios/${encodeURIComponent(festival.id)}/${encodeURIComponent(event.id)}.ics`, pageUrl).href;
}

export function setupSharing(menu, storyDialog, festival) {
  const showStory = setupStory(storyDialog, festival);
  const story = menu.querySelector('#choose-story');
  const calendar = menu.querySelector('#google-calendar');
  const share = menu.querySelector('#share-link');
  const copy = menu.querySelector('#copy-link');
  const link = menu.querySelector('#share-url');
  const invite = menu.querySelector('#invite-screening');
  const message = menu.querySelector('#invitation-message');
  const status = menu.querySelector('#invitation-status');
  let screening;
  let trigger;
  let generation = 0;

  function position() {
    const anchor = trigger.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(14, Math.min(anchor.right - bounds.width, innerWidth - bounds.width - 14))}px`;
    const top = anchor.bottom + 6 + bounds.height <= innerHeight - 14
      ? anchor.bottom + 6 : anchor.top - bounds.height - 6;
    menu.style.top = `${Math.max(14, top)}px`;
  }

  function close() {
    if (menu.matches(':popover-open')) menu.hidePopover();
  }

  story.addEventListener('click', () => {
    close();
    showStory(screening);
  });

  calendar.addEventListener('click', () => close());

  invite.addEventListener('click', async () => {
    const current = generation;
    const text = invitationText(festival, screening, location.href);
    invite.disabled = true;
    message.hidden = status.hidden = true;
    try {
      try {
        if (navigator.share && (!navigator.canShare || navigator.canShare({ text }))) {
          await navigator.share({ text });
          if (current === generation) close();
          return;
        }
      } catch (error) {
        if (error.name === 'AbortError' || current !== generation) return;
      }
      if (current !== generation) return;
      try {
        await navigator.clipboard.writeText(text);
        if (current === generation) {
          status.textContent = 'Invitación copiada';
          status.hidden = false;
          position();
        }
      } catch {
        if (current === generation) {
          message.value = text;
          message.hidden = status.hidden = false;
          status.textContent = 'Copia la invitación seleccionada.';
          position();
          message.focus();
          message.select();
        }
      }
    } finally {
      if (current === generation) invite.disabled = false;
    }
  });

  copy.addEventListener('click', async () => {
    const current = generation;
    try {
      await navigator.clipboard.writeText(link.value);
      if (current === generation) copy.querySelector('span').textContent = 'Enlace copiado';
    } catch {
      if (current === generation) {
        link.hidden = false;
        position();
        link.select();
      }
    }
  });

  share.addEventListener('click', async () => {
    const current = generation;
    try {
      await navigator.share({ url: link.value });
      if (current === generation) close();
    } catch (error) {
      if (current === generation && error.name !== 'AbortError') {
        share.hidden = true;
        copy.focus();
      }
    }
  });

  menu.addEventListener('beforetoggle', event => {
    if (event.newState === 'closed') {
      generation++;
      trigger?.setAttribute('aria-expanded', 'false');
    }
  });
  storyDialog.addEventListener('close', () => trigger?.focus());
  window.addEventListener('resize', close);
  document.addEventListener('scroll', event => {
    if (menu.matches(':popover-open') && !menu.contains(event.target)) position();
  }, true);

  return (event, button) => {
    const wasOpen = menu.matches(':popover-open') && trigger === button;
    close();
    if (wasOpen) return;
    screening = event;
    trigger = button;
    generation++;
    link.value = screeningUrl(festival, screening, location.href);
    calendar.href = googleCalendarUrl(festival, screening, location.href);
    link.hidden = true;
    message.hidden = status.hidden = true;
    message.value = status.textContent = '';
    invite.disabled = false;
    copy.querySelector('span').textContent = 'Copiar enlace';
    share.hidden = !navigator.share;
    // Popovers opened from a modal must remain inside it to receive input.
    (trigger.closest('dialog') || document.body).append(menu);
    trigger.setAttribute('aria-expanded', 'true');
    menu.showPopover({ source: trigger });
    position();
    invite.focus({ preventScroll: true });
  };
}
