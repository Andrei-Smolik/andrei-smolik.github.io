const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../include-partials.js'), 'utf8');

// This tests scroll ownership/chrome bookkeeping, not a simulated spring.
// Native momentum and elasticity are deliberately left to browser testing.
function element() {
  const classes = new Set();
  return {
    scrollTop: 0, scrollHeight: 1500, clientHeight: 500, offsetHeight: 58,
    handlers: {}, children: [], attributes: {},
    style: { setProperty(key, value) { this[key] = value; } },
    classList: {
      add(value) { classes.add(value); },
      contains(value) { return classes.has(value); },
      toggle(value, enabled) { if (enabled) classes.add(value); else classes.delete(value); },
    },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(type, handler, options) {
      (this.handlers[type] ||= []).push({ handler, options });
    },
    append(child) { child.parentElement = this; },
    insertBefore(child) { child.parentElement = this; },
    querySelectorAll() { return []; },
    scrollTo(options) { this.lastScroll = options; this.scrollTop = options.top; },
  };
}

function setup(project = true) {
  const page = element(), media = element(), footer = element(), main = element(), button = element();
  const desktop = { matches: true, handlers: [], addEventListener(type, fn) { this.handlers.push(fn); } };
  let id = 0;
  const frames = new Map();
  page.querySelector = selector => selector === '.site-footer' ? footer : main;
  const document = {
    getElementById: key => key === 'pageScroll' ? page : key === 'backToTop' ? button : null,
    querySelector: () => project ? media : null,
    createElement: element,
  };
  const context = {
    module: { exports: {} },
    document,
    window: {
      matchMedia: query => query.includes('min-width') ? desktop : { matches: false },
      addEventListener() {}, innerHeight: 720,
    },
    ResizeObserver: class { observe() {} },
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.module.exports.initNativeScrollLayout();
  function flush() {
    const callbacks = [...frames.values()]; frames.clear();
    callbacks.forEach(fn => fn());
    assert.equal(frames.size, 0, 'no continuous animation loop');
  }
  function scroll(target, top) {
    target.scrollTop = top;
    target.handlers.scroll?.forEach(({ handler }) => handler());
    flush();
    assert.equal(target.scrollTop, top, 'never clamp or rewrite native scrolling');
  }
  flush();
  return { page, media, footer, button, desktop, context, flush, scroll };
}

for (const project of [true, false]) {
  const test = setup(project);
  const { page, media, footer, desktop, scroll, flush, context, button } = test;
  const target = project ? media : page;
  assert.equal(vm.runInContext('getMediaScrollTarget()', context), target);
  assert.equal(page.classList.contains('native-project-columns'), project);
  for (const region of [page, media]) {
    assert.equal(region.handlers.wheel, undefined, 'no wheel interception');
    assert.equal(region.handlers.touchmove, undefined, 'no touch interception');
    for (const { options } of region.handlers.scroll || []) assert.equal(options.passive, true);
  }
  for (let cycle = 0; cycle < 40; cycle++) {
    for (const top of [0, -80, 0, 250, 960, 1000, 1080, 1000, 960, 250, 0]) {
      scroll(target, top);
      assert.equal(footer.style['--footer-offset'], Math.min(58, 1000 - Math.max(0, Math.min(1000, top))) + 'px');
      assert.equal(footer.classList.contains('is-scroll-visible'), top > 942);
    }
  }
  // Elasticity in the media must never drive a second/page scroll position.
  if (project) assert.equal(page.scrollTop, 0);
  context.module.exports.initBackToTop();
  scroll(target, 1000);
  button.handlers.click[0].handler();
  assert.equal(target.lastScroll.top, 0);
  assert.equal(target.lastScroll.behavior, 'smooth');
  if (project) assert.equal(page.lastScroll, undefined);
  scroll(target, 300);
  assert(button.classList.contains('is-visible'), 'keep the control visible during the return');
  scroll(target, 0);
  assert(!button.classList.contains('is-visible'), 'hide only when the return reaches the top');

  desktop.matches = false;
  desktop.handlers.forEach(handler => handler());
  flush();
  assert.equal(vm.runInContext('getMediaScrollTarget()', context), page);
  assert.equal(page.classList.contains('native-project-columns'), false);
  scroll(page, 1000);
  button.handlers.click[0].handler();
  assert.equal(page.lastScroll.top, 0, 'phone arrow scrolls the page, not the desktop media column');
  scroll(page, 300);
  assert(button.classList.contains('is-visible'));
  scroll(page, 0);
  assert(!button.classList.contains('is-visible'));
  scroll(page, 1070);
  assert.equal(footer.style['--footer-offset'], '0px');
  // Empty results / short pages keep the footer at the viewport bottom.
  page.scrollHeight = page.clientHeight;
  scroll(page, 0);
  assert.equal(footer.style['--footer-offset'], '0px');
  assert(footer.classList.contains('is-scroll-visible'));
}

assert(!source.includes('--rubberband-offset'), 'no synthetic content translations');
assert(!source.includes('columnoverscroll'), 'dragging cannot start a second bounce');
assert(source.includes('openingGesture.abort()'), 'splash releases its blocking listeners');
const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
assert(css.includes('overscroll-behavior-y: contain;'));
assert(!css.includes('.is-rubberband-active'));
console.log('PASS: native scroll ownership, 80 boundary/reversal cycles, fixed footer during elasticity, scoped back-to-top, mobile fallback, short pages, no wheel interception or spring loop.');
