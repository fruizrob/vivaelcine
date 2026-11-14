import { test } from 'node:test';
import assert from 'node:assert/strict';
import { festivals } from '../data.js';
import { setupStory } from '../story.js';

test('Story sharing sends the prepared image directly, with cancellation and download fallback', async t => {
  class Element extends EventTarget {
    hidden = false;
    disabled = false;
    textContent = '';
    attributes = new Map();
    classList = { toggle() {} };
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { delete this[name]; }
    click() { this.dispatchEvent(new Event('click')); }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatchEvent(new Event('close')); }
  }
  const elements = new Map();
  const dialog = new Element();
  dialog.querySelector = selector => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  const $ = selector => dialog.querySelector(selector);
  const context = {
    fillRect() {}, fillText() {}, drawImage() {},
    measureText(text) { return { width: text.length * 12 }; },
  };
  const descriptors = new Map(['document', 'location', 'navigator', 'Image']
    .map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    dialog.close();
  });
  let exports = 0;
  let payload;
  let outcome;
  let supported = true;
  let exportFailure;
  const pendingImages = [];
  Object.defineProperties(globalThis, {
    Image: { configurable: true, value: class {
      naturalWidth = 600;
      naturalHeight = 900;
      set src(value) { pendingImages.push(this); }
    } },
    location: { configurable: true, value: { href: 'https://vivaelcine.cl/' } },
    document: { configurable: true, value: {
      createElement(tag) {
        assert.equal(tag, 'canvas');
        return {
          getContext: () => context,
          toBlob(callback) {
            exports++;
            if (exportFailure) {
              const failure = exportFailure;
              exportFailure = null;
              if (failure === 'null') return callback(null);
              throw new DOMException('Artwork rejected', 'SecurityError');
            }
            callback(new Blob(['image'], { type: 'image/png' }));
          },
        };
      },
    } },
    navigator: { configurable: true, value: {
      canShare: ({ files }) => supported && files[0] instanceof File,
      share(data) {
        payload = data;
        return outcome ? Promise.reject(new DOMException('', outcome)) : Promise.resolve();
      },
    } },
  });

  const festival = { ...festivals[0] };
  const event = festival.events[0];
  const open = setupStory(dialog, festival);
  await open(event);
  assert.equal($('#share-story').hidden, false);
  assert.equal($('#download-story').hidden, false);
  assert.equal(payload, undefined, 'opening the preview must not invoke the share sheet');

  $('#share-story').click();
  assert.ok(payload, 'share must run during the click, preserving user activation');
  assert.deepEqual(Object.keys(payload), ['files'], 'send artwork without URL/text changing the share target');
  assert.equal(payload.files.length, 1);
  assert.equal(payload.files[0].type, 'image/png');
  assert.equal(payload.files[0].name, `${event.id}.png`);
  assert.ok(payload.files[0].size > 0);
  assert.equal(exports, 1, 'sharing reuses the prepared file');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal($('#share-story').disabled, false);

  outcome = 'AbortError';
  $('#share-story').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal($('#story-status').textContent, '');
  assert.equal($('#share-story').disabled, false);

  outcome = 'NotAllowedError';
  $('#share-story').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.match($('#story-status').textContent, /Descarga la imagen/);
  assert.equal($('#download-story').hidden, false);
  assert.equal($('#share-story').disabled, false);

  supported = false;
  await open(event);
  assert.equal($('#share-story').hidden, true);
  assert.equal($('#download-story').hidden, false);
  assert.equal($('#download-story').download, `${event.id}.png`);
  assert.equal($('#story-status').textContent, '');

  festival.filmPosters = { [`${festival.id}/${event.filmId}`]: { path: '/poster123.jpg' } };
  const closing = open(event);
  assert.equal($('#download-story').hidden, true, 'do not offer a file before artwork finishes');
  dialog.close();
  pendingImages.shift().onload();
  await closing;
  assert.equal($('#story-image').hidden, true, 'closing invalidates an in-flight image');

  const replacing = open(event);
  const next = { ...event, id: 'next-screening', title: 'Separate part' };
  await open(next);
  const nextImage = $('#story-image').src;
  pendingImages.shift().onload();
  await replacing;
  assert.equal($('#story-image').src, nextImage, 'late artwork cannot replace the next Story');
  assert.equal($('#download-story').download, 'next-screening.png');

  for (const failure of ['security', 'null']) {
    exportFailure = failure;
    const opening = open(event);
    pendingImages.shift().onload();
    await opening;
    assert.equal($('#download-story').hidden, false, 'image export failure retries without artwork');
    assert.equal($('#retry-story').hidden, true);
    assert.equal($('#story-status').textContent, '');
  }
});
