import { test } from 'node:test';
import assert from 'node:assert/strict';
import { festivals } from '../data.js';
import { invitationText, setupSharing } from '../sharing.js';
import { screeningUrl } from '../story.js';
import { clock, roomLocation } from '../core.js';

const base = 'https://vivaelcine.cl/?festival=old&dia=wrong#agenda';

test('invitations contain the actual title, full Spanish date, time, venue and exact link', () => {
  for (const festival of festivals) {
    for (const event of festival.events) {
      const text = invitationText(festival, event, base);
      assert.ok(text.startsWith(`¿Vamos a ver ${event.title || festival.films[event.filmId].title}?\n`));
      assert.ok(text.includes(String(Number(event.date.slice(-2)))));
      assert.ok(text.includes(event.date.slice(0, 4)));
      assert.ok(text.includes(clock(event.start)));
      assert.ok(text.includes(roomLocation(festival.rooms.find(room => room.id === event.roomId))));
      assert.ok(text.endsWith(`Aquí está la función: ${screeningUrl(festival, event, base)}`));
    }
  }
  const festival = festivals[0];
  const event = { ...festival.events[0], title: 'Una parte específica', date: '2026-11-02', start: 1110 };
  assert.match(invitationText(festival, event, base), /^¿Vamos a ver Una parte específica\?\nlunes, 2 de noviembre de 2026, 18:30 · /);
  const other = { ...event, id: 'another-screening', date: '2026-11-03' };
  assert.notEqual(invitationText(festival, event, base), invitationText(festival, other, base));
});

// Minimal browser boundary: exercise the real event handlers without a DOM dependency.
function element() {
  return {
    listeners: {}, hidden: true, value: '', textContent: '', disabled: false,
    style: {}, attributes: {}, children: new Map(),
    addEventListener(name, handler) { this.listeners[name] = handler; },
    querySelector(selector) {
      if (!this.children.has(selector)) this.children.set(selector, element());
      return this.children.get(selector);
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    getBoundingClientRect() { return { right: 400, top: 80, bottom: 100, width: 240, height: 200 }; },
    matches() { return this.open; },
    showPopover() { this.open = true; },
    hidePopover() { this.open = false; this.listeners.beforetoggle({ newState: 'closed' }); },
    closest() { return null; },
    append() {},
    focus() { this.focused = true; },
    select() { this.selected = true; },
    click() { return this.listeners.click(); },
  };
}

function harness(t, navigator) {
  const menu = element();
  const document = element();
  document.body = element();
  const globals = { navigator, document, window: element(), location: { href: base }, innerWidth: 1024, innerHeight: 768 };
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    });
  }
  const festival = festivals[0];
  const event = festival.events[0];
  const open = setupSharing(menu, element(), festival);
  open(event, element());
  return {
    menu, open, event, festival,
    invite: menu.querySelector('#invite-screening'),
    message: menu.querySelector('#invitation-message'),
    status: menu.querySelector('#invitation-status'),
  };
}

test('native text sharing receives the full invitation and closes the menu', async t => {
  let payload;
  const ui = harness(t, { share: async data => { payload = data; } });
  await ui.invite.click();
  assert.deepEqual(payload, { text: invitationText(ui.festival, ui.event, base) });
  assert.equal(ui.menu.open, false);
  assert.equal(ui.message.hidden, true);
});

test('cancelled native sharing leaves the invitation available without copying', async t => {
  let copied = false;
  const ui = harness(t, {
    share: async () => { throw { name: 'AbortError' }; },
    clipboard: { writeText: async () => { copied = true; } },
  });
  await ui.invite.click();
  assert.equal(copied, false);
  assert.equal(ui.menu.open, true);
  assert.equal(ui.status.hidden, true);
  assert.equal(ui.invite.disabled, false);
});

for (const mode of ['unavailable', 'unsupported', 'failed', 'capability-error']) {
  test(`${mode} native sharing copies the whole invitation`, async t => {
    let copied;
    const navigator = { clipboard: { writeText: async text => { copied = text; } } };
    if (mode !== 'unavailable') navigator.share = async () => { throw new Error('share failed'); };
    if (mode === 'unsupported') {
      navigator.canShare = () => false;
      navigator.share = () => assert.fail('unsupported share must not be called');
    }
    if (mode === 'capability-error') navigator.canShare = () => { throw new Error('capability failed'); };
    const ui = harness(t, navigator);
    await ui.invite.click();
    assert.equal(copied, invitationText(ui.festival, ui.event, base));
    assert.equal(ui.status.textContent, 'Invitación copiada');
    assert.equal(ui.status.hidden, false);
    assert.equal(ui.message.hidden, true);
    assert.equal(ui.invite.disabled, false);
  });
}

for (const clipboard of [undefined, { writeText: async () => { throw new Error('denied'); } }]) {
  test('unavailable or denied clipboard exposes and selects the complete message', async t => {
    const ui = harness(t, { clipboard });
    await ui.invite.click();
    assert.equal(ui.message.value, invitationText(ui.festival, ui.event, base));
    assert.equal(ui.message.hidden, false);
    assert.equal(ui.message.focused, true);
    assert.equal(ui.message.selected, true);
    assert.equal(ui.status.textContent, 'Copia la invitación seleccionada.');
    ui.open(ui.festival.events[1], element());
    assert.equal(ui.message.hidden, true);
    assert.equal(ui.message.value, '');
    assert.equal(ui.status.hidden, true);
  });
}

for (const outcome of ['success', 'failure']) {
  test(`late native ${outcome} cannot affect another screening`, async t => {
    let finish;
    const ui = harness(t, { share: () => new Promise((resolve, reject) => {
      finish = outcome === 'success' ? resolve : () => reject(new Error('late failure'));
    }), clipboard: { writeText: () => assert.fail('stale share must not copy') } });
    const pending = ui.invite.click();
    assert.equal(ui.invite.disabled, true);
    ui.open(ui.festival.events[1], element());
    finish();
    await pending;
    assert.equal(ui.menu.open, true);
    assert.equal(ui.message.hidden, true);
    assert.equal(ui.status.hidden, true);
    assert.equal(ui.invite.disabled, false);
  });
}

test('late clipboard failure cannot reveal the previous screening invitation', async t => {
  let fail;
  const ui = harness(t, { clipboard: { writeText: () => new Promise((_, reject) => { fail = reject; }) } });
  const pending = ui.invite.click();
  ui.open(ui.festival.events[1], element());
  fail(new Error('late clipboard failure'));
  await pending;
  assert.equal(ui.message.hidden, true);
  assert.equal(ui.status.hidden, true);
});
