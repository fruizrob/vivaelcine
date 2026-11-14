import { clock, durationOf, roomLocation, yearOf } from './core.js?v=20261112-selection';
import { filmPoster } from './film-poster.js?v=20261114-story';
import { festivalMark } from './festival-history-data.js?v=20261114-story';
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

function drawText(ctx, text, y, size, maxHeight, family = 'Arial', color = '#292720', x = 96, width = 888) {
  let lines;
  do {
    ctx.font = `${size}px ${family}`;
    lines = linesFor(ctx, text, width);
    if (lines.length * size * 1.2 <= maxHeight || size <= 2) break;
    size -= 2;
  } while (true);
  ctx.fillStyle = color;
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * size * 1.2));
  return lines.length * size * 1.2;
}

function loadImage(src) {
  if (!src) return Promise.resolve(null);
  return new Promise(resolve => {
    const image = new Image();
    const finish = value => {
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      resolve(value);
    };
    const timeout = setTimeout(() => finish(null), 4000);
    // Anonymous requests keep remote artwork safe to export from Canvas.
    image.crossOrigin = 'anonymous';
    image.onload = () => finish(image.naturalWidth && image.naturalHeight ? image : null);
    image.onerror = () => finish(null);
    image.src = src;
  });
}

function drawContained(ctx, image, x, y, width, height) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
}

export async function drawStory(canvas, festival, event, { artwork = true } = {}) {
  const film = festival.films[event.filmId];
  const room = festival.rooms.find(room => room.id === event.roomId);
  const poster = filmPoster(festival, event);
  const mark = festivalMark(festival, event);
  const [posterImage, logoImage] = await Promise.all([
    loadImage(artwork && poster ? `https://image.tmdb.org/t/p/w780${poster.path}` : null),
    loadImage(artwork ? mark?.logo : null),
  ]);
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f04c2c';
  ctx.fillRect(0, 0, canvas.width, 24);
  ctx.textBaseline = 'top';
  drawText(ctx, '¡Viva el Cine!', 170, 56, 80, 'Georgia', '#f04c2c');
  drawText(ctx, festival.name, 246, 30, 44, 'Arial', '#706d64');
  if (posterImage) drawContained(ctx, posterImage, 96, 310, 888, 640);
  if (mark) {
    if (logoImage) drawContained(ctx, logoImage, 96, 984, 96, 70);
    const x = logoImage ? 220 : 96;
    drawText(ctx, mark.name === 'Toronto' ? 'TIFF' : mark.name, 980, 38, 46, 'Arial', '#292720', x, 984 - x);
    drawText(ctx, `${mark.scope} · ${mark.year}`, 1032, 26, 34, 'Arial', '#706d64', x, 984 - x);
    if (mark.subject) drawText(ctx, `Incluye ${mark.subject}`, 1068, 24, 32, 'Arial', '#706d64', x, 984 - x);
  }
  const titleY = posterImage ? (mark ? 1120 : 992) : 440;
  const titleHeight = drawText(ctx, event.title || film.title, titleY, posterImage ? 76 : 108, posterImage ? 144 : 400, 'Georgia');
  let creditsY = titleY + titleHeight + 16;
  const director = event.director || film.director;
  if (director) creditsY += drawText(ctx, director, creditsY, 32, 64, 'Arial', '#706d64') + 12;
  const year = yearOf(event, film);
  const duration = durationOf(event, festival.films);
  const metadata = [year, duration ? `${duration} min` : null].filter(Boolean).join(' · ');
  if (metadata) drawText(ctx, metadata, creditsY, 28, 36, 'Arial', '#706d64');
  const date = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${event.date}T12:00:00Z`));
  drawText(ctx, date, 1430, 32, 48);
  drawText(ctx, clock(event.start, true), 1490, 88, 106);
  drawText(ctx, roomLocation(room), 1610, 34, 72);
  ctx.fillStyle = '#dedbd1';
  ctx.fillRect(96, 1720, 888, 2);
  drawText(ctx, 'vivaelcine.cl', 1744, 28, 40, 'Arial', '#706d64');
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
      await drawStory(canvas, festival, event);
      if (current !== generation) return;
      let blob;
      try {
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Image export failed');
      } catch {
        // A browser rejecting an image must not prevent a usable Story export.
        await drawStory(canvas, festival, event, { artwork: false });
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      }
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
