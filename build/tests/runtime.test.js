const assert = require('node:assert/strict');
const test = require('node:test');
const { loadRuntime, element } = require('./helpers');

function searchFixture() {
  const document = { activeElement: null };
  const nodes = Object.fromEntries(['siteNavLinks', 'siteNavSearchToggle', 'siteNavSearchInput', 'siteNavSearchClose']
    .map(id => [id, element(document)]));
  document.getElementById = id => nodes[id];
  const api = loadRuntime({ document });
  api.initNavSearch();
  const [links, toggle, input, close] = Object.values(nodes);
  toggle.dispatchEvent({ type: 'click', detail: 1 });
  return { document, links, toggle, input, close };
}

test('opening search focuses the field; pointer close does not leave sticky focus', () => {
  const { document, links, toggle, input, close } = searchFixture();
  assert(links.classList.contains('is-searching'));
  assert.equal(document.activeElement, input);
  let filterUpdates = 0;
  input.addEventListener('input', () => filterUpdates++);
  input.value = 'test';
  close.dispatchEvent({ type: 'click', detail: 1 });
  assert(!links.classList.contains('is-searching'));
  assert.equal(input.value, '');
  assert.equal(filterUpdates, 1);
  assert.notEqual(document.activeElement, toggle);
});

test('Escape and keyboard activation return focus to the search button', () => {
  for (const keyboard of ['escape', 'click']) {
    const { document, toggle, input, close } = searchFixture();
    if (keyboard === 'escape') input.dispatchEvent({ type: 'keydown', key: 'Escape' });
    else close.dispatchEvent({ type: 'click', detail: 0 });
    assert.equal(document.activeElement, toggle);
    assert.equal(toggle.focusOptions.preventScroll, true);
  }
});

test('search is case-insensitive, supports empty results, and resets all tiles', () => {
  const input = element();
  const items = [element(), element()];
  const cards = items.map((item, i) => ({
    dataset: i ? {} : { search: 'The Exchange Carine 2023' },
    textContent: i ? 'Wind Swept' : '', closest: () => item,
  }));
  const api = loadRuntime({ document: {
    querySelector: () => ({ querySelectorAll: () => cards }), getElementById: () => input,
  } });
  api.initProjectSearch();
  for (const [query, expected] of [[' CARINE ', ['', 'none']], ['no-match', ['none', 'none']], ['', ['', '']]]) {
    input.value = query;
    input.dispatchEvent({ type: 'input' });
    assert.deepEqual(items.map(item => item.style.display), expected);
  }
});

test('only the current navigation page is disabled (not Projects on project details)', () => {
  for (const pathname of ['/index.html', '/about.html', '/project-the-exchange.html']) {
    const links = ['index.html#projects', 'about.html'].map(href => {
      const link = element(); link.href = `http://localhost/${href}`; link.setAttribute('href', href); return link;
    });
    links[0].classList.add('site-nav__link--portfolio');
    loadRuntime({ document: { querySelectorAll: () => links }, window: { location: { pathname } } }).markCurrentNavLink();
    assert.equal(links[0].getAttribute('aria-disabled') === 'true', pathname === '/index.html');
    assert.equal(links[1].getAttribute('aria-disabled') === 'true', pathname === '/about.html');
  }
});

test('text dragging clamps to its own bounds and releases pointer capture', () => {
  const panel = element();
  Object.assign(panel, { scrollTop: 300, scrollHeight: 1500, clientHeight: 500, clientWidth: 500, clientLeft: 0,
    getBoundingClientRect: () => ({ left: 0 }), scrollTo({ top }) { this.scrollTop = top; },
    setPointerCapture(id) { this.capture = id; }, hasPointerCapture(id) { return this.capture === id; },
    releasePointerCapture() { this.capture = null; },
  });
  panel.classList.add('is-text-scrollable');
  loadRuntime({ window: { addEventListener() {} } }).initProjectTextDrag(panel, { matches: true, addEventListener() {} });
  const event = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1,
    clientX: 100, clientY: 200, preventDefault() {}, target: { closest: () => null } };
  panel.dispatchEvent({ ...event, type: 'pointerdown' });
  panel.dispatchEvent({ ...event, type: 'pointermove', clientY: 1000 });
  assert.equal(panel.scrollTop, 0);
  panel.dispatchEvent({ ...event, type: 'pointermove', clientY: -2000 });
  assert.equal(panel.scrollTop, 1000);
  panel.dispatchEvent({ ...event, type: 'pointerup' });
  assert.equal(panel.capture, null);
  assert(!panel.classList.contains('is-text-dragging'));
});

test('autoplay setup tolerates rejection, synchronous errors, and older play implementations', async () => {
  const videos = [() => Promise.reject(new Error('Blocked')), () => undefined, () => { throw new Error('Not ready'); }]
    .map(play => Object.assign(element(), { play, paused: true }));
  const document = Object.assign(element(), { querySelectorAll: () => videos });
  loadRuntime({ document, window: element() }).initProjectVideos();
  await new Promise(resolve => setImmediate(resolve));
  for (const video of videos) {
    assert.equal(video.controls, false);
    assert.equal(video.muted, true);
    assert.equal(video.defaultMuted, true);
    assert.equal(video.playsInline, true);
    assert.equal(video.loop, true);
  }
});

function autoplayFixture(play) {
  const document = Object.assign(element(), { hidden: false });
  const window = element();
  const video = Object.assign(element(), { paused: true, isConnected: true, play });
  let intersection;
  const api = loadRuntime({ document, window, IntersectionObserver: class {
    constructor(callback) { intersection = callback; }
    observe(target) { assert.equal(target, video); }
  } });
  return { api, document, window, video, intersect: visible => intersection([{ isIntersecting: visible }]) };
}

test('blocked autoplay retries synchronously on every eligible iPhone touch gesture', async () => {
  let calls = 0;
  const fixture = autoplayFixture(() => { calls++; return Promise.reject(new Error('NotAllowedError')); });
  fixture.api.initVideoAutoplay(fixture.video);
  assert.equal(calls, 1);
  // A gesture can retry even before the original rejection has settled.
  fixture.document.dispatchEvent({ type: 'touchend' });
  assert.equal(calls, 2);
  await new Promise(resolve => setImmediate(resolve));
  fixture.document.dispatchEvent({ type: 'touchend' });
  assert.equal(calls, 3);
  await new Promise(resolve => setImmediate(resolve));
});

test('autoplay retries on viewport entry, page reveal, Safari restoration and tab return', () => {
  let calls = 0;
  const fixture = autoplayFixture(() => { calls++; });
  fixture.api.initVideoAutoplay(fixture.video);
  fixture.intersect(false);
  assert.equal(calls, 1);
  fixture.intersect(true);
  fixture.document.dispatchEvent({ type: 'page-visible' });
  fixture.window.dispatchEvent({ type: 'pageshow', persisted: true });
  assert.equal(calls, 4);
  fixture.document.hidden = true;
  fixture.document.dispatchEvent({ type: 'visibilitychange' });
  assert.equal(calls, 4);
  fixture.document.hidden = false;
  fixture.document.dispatchEvent({ type: 'visibilitychange' });
  assert.equal(calls, 5);
  fixture.video.paused = false;
  fixture.document.dispatchEvent({ type: 'click' });
  assert.equal(calls, 5, 'do not restart a playing video');
});

test('autoplay does not restart dismissed splash or removed/broken videos', () => {
  let calls = 0;
  let enabled = false;
  const fixture = autoplayFixture(() => { calls++; });
  const retry = fixture.api.initVideoAutoplay(fixture.video, () => enabled);
  fixture.document.dispatchEvent({ type: 'touchend' });
  fixture.video.dispatchEvent({ type: 'canplay' });
  fixture.intersect(true);
  assert.equal(calls, 0);
  enabled = true;
  retry();
  assert.equal(calls, 1);
  fixture.video.isConnected = false;
  retry();
  assert.equal(calls, 1);
  fixture.video.isConnected = true;
  fixture.video.error = { code: 4 };
  retry();
  assert.equal(calls, 1);
});

test('readiness events do not flood an in-flight play request, but can retry afterward', async () => {
  let calls = 0;
  let finish;
  const fixture = autoplayFixture(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  fixture.api.initVideoAutoplay(fixture.video);
  fixture.video.dispatchEvent({ type: 'loadeddata' });
  fixture.video.dispatchEvent({ type: 'canplay' });
  assert.equal(calls, 1);
  finish();
  await new Promise(resolve => setImmediate(resolve));
  fixture.video.dispatchEvent({ type: 'canplay' });
  assert.equal(calls, 2);
  finish();
});
