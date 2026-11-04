import { screeningUrl, setupStory } from './story.js?v=20261104-2';

export function setupSharing(menu, storyDialog, festival) {
  const showStory = setupStory(storyDialog, festival);
  const story = menu.querySelector('#choose-story');
  const share = menu.querySelector('#share-link');
  const copy = menu.querySelector('#copy-link');
  const link = menu.querySelector('#share-url');
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
    link.hidden = true;
    copy.querySelector('span').textContent = 'Copiar enlace';
    share.hidden = !navigator.share;
    // Popovers opened from a modal must remain inside it to receive input.
    (trigger.closest('dialog') || document.body).append(menu);
    trigger.setAttribute('aria-expanded', 'true');
    menu.showPopover({ source: trigger });
    position();
    story.focus({ preventScroll: true });
  };
}
