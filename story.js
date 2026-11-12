import { clock, roomLocation } from './core.js?v=20261104';
import { sharedScreeningUrl } from './screening-links.js?v=20261112-short-links';
export { agendaScreeningUrl as screeningUrl } from './screening-links.js?v=20261112-short-links';

function linesFor(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && ctx.measureText(`${line} ${word}`).width > width) {
      lines.push(line);
      line = '';
    }
    for (const character of (line ? ' ' : '') + word) {
      if (line && ctx.measureText(line + character).width > width) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawText(ctx, text, y, size, maxHeight, family = 'Arial', color = '#292720') {
  let lines;
  do {
    ctx.font = `${size}px ${family}`;
    lines = linesFor(ctx, text, 888);
    if (lines.length * size * 1.2 <= maxHeight || size <= 24) break;
    size -= 2;
  } while (true);
  ctx.fillStyle = color;
  lines.forEach((line, index) => ctx.fillText(line, 96, y + index * size * 1.2));
  return lines.length * size * 1.2;
}

export function drawStory(canvas, festival, event) {
  const film = festival.films[event.filmId];
  const room = festival.rooms.find(room => room.id === event.roomId);
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f04c2c';
  ctx.fillRect(0, 0, canvas.width, 24);
  ctx.textBaseline = 'top';
  drawText(ctx, '¡Viva el Cine!', 190, 80, 110, 'Georgia', '#f04c2c');
  drawText(ctx, festival.name, 300, 36, 50);
  const titleHeight = drawText(ctx, event.title || film.title, 565, 108, 420, 'Georgia');
  if (film.director) drawText(ctx, film.director, 605 + titleHeight, 36, 100, 'Arial', '#706d64');
  const date = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${event.date}T12:00:00Z`));
  drawText(ctx, date, 1175, 38, 100);
  drawText(ctx, clock(event.start), 1300, 124, 150);
  drawText(ctx, roomLocation(room), 1490, 44, 160);
  ctx.fillStyle = '#dedbd1';
  ctx.fillRect(96, 1710, 888, 2);
  drawText(ctx, 'vivaelcine.cl', 1750, 36, 50, 'Arial', '#706d64');
}

export function setupStory(dialog, festival) {
  const $ = selector => dialog.querySelector(selector);
  const preview = $('.story-preview');
  const share = $('#share-story');
  const download = $('#download-story');
  const copy = $('#copy-screening');
  const retry = $('#retry-story');
  const status = $('#story-status');
  const link = $('#screening-url');
  let event;
  let imageUrl;
  let file;
  let generation = 0;

  function releaseImage() {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = null;
    file = null;
    $('#story-image').hidden = true;
    $('#story-image').removeAttribute('src');
  }

  async function open(screening) {
    const current = ++generation;
    event = screening;
    releaseImage();
    link.value = sharedScreeningUrl(festival, event, location.href);
    link.hidden = true;
    share.hidden = download.hidden = retry.hidden = true;
    copy.disabled = true;
    preview.hidden = false;
    preview.setAttribute('aria-busy', 'true');
    status.textContent = '';
    if (!dialog.open) dialog.showModal();
    try {
      const canvas = document.createElement('canvas');
      drawStory(canvas, festival, event);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (current !== generation) return;
      if (!blob) throw new Error('Image export failed');
      file = new File([blob], `${event.id}.png`, { type: 'image/png' });
      imageUrl = URL.createObjectURL(blob);
      $('#story-image').src = imageUrl;
      $('#story-image').hidden = false;
      download.href = imageUrl;
      download.download = file.name;
      download.hidden = false;
      share.hidden = !(navigator.share && navigator.canShare?.({ files: [file] }));
      download.classList.toggle('primary', share.hidden);
    } catch {
      if (current === generation) {
        preview.hidden = true;
        retry.hidden = false;
        status.textContent = 'No se pudo crear la imagen.';
      }
    } finally {
      if (current === generation) {
        copy.disabled = false;
        preview.setAttribute('aria-busy', 'false');
      }
    }
  }

  share.addEventListener('click', async () => {
    const current = generation;
    share.disabled = true;
    status.textContent = '';
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      if (current === generation && error.name !== 'AbortError') {
        status.textContent = 'No se pudo compartir. Descarga la imagen.';
      }
    } finally {
      share.disabled = false;
    }
  });

  copy.addEventListener('click', async () => {
    const current = generation;
    try {
      await navigator.clipboard.writeText(link.value);
      if (current === generation) status.textContent = 'Enlace copiado';
    } catch {
      if (current === generation) {
        link.hidden = false;
        link.select();
        status.textContent = 'Copia el enlace seleccionado.';
      }
    }
  });

  retry.addEventListener('click', () => open(event));
  dialog.addEventListener('close', () => {
    generation++;
    releaseImage();
    preview.setAttribute('aria-busy', 'false');
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  return open;
}
