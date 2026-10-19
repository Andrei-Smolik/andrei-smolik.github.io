const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { ROOT } = require('./helpers');

const pages = fs.readdirSync(ROOT).filter(name => name.endsWith('.html'));

test('generated pages contain no unresolved template markers', () => {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert(!/\{\{[A-Z_]+\}\}|<!-- (IF|EACH|END):/.test(html), page);
  }
});

test('generated local links, images, scripts, styles, and srcset assets exist', () => {
  let checked = 0;
  function checkUrl(url, page) {
    if (!url || url.startsWith('#') || /^(?:[a-z]+:|\/\/)/i.test(url)) return;
    const pathname = decodeURIComponent(new URL(url.replace(/&amp;/g, '&'), 'https://local.test/').pathname);
    assert(fs.existsSync(path.join(ROOT, pathname)), `${page}: missing ${url}`);
    checked++;
  }
  for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    for (const tag of html.match(/<(?:a|img|source|script|link)\b[^>]*>/g) || []) {
      for (const match of tag.matchAll(/\b(?:src|href)="([^"]*)"/g)) checkUrl(match[1], page);
      const srcset = tag.match(/\bsrcset="([^"]*)"/);
      for (const candidate of (srcset?.[1] || '').split(',').filter(Boolean)) {
        checkUrl(candidate.trim().split(/\s+/)[0], page);
      }
    }
  }
  assert(checked > 0);
});

test('project images reserve intrinsic dimensions and all videos remain control-free', () => {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    if (page.startsWith('project-') || page === 'about.html') {
      for (const tag of html.match(/<img\b[^>]*>/g) || []) {
        assert(Number(tag.match(/\bwidth="(\d+)"/)?.[1]) > 0, `${page}: missing image width`);
        assert(Number(tag.match(/\bheight="(\d+)"/)?.[1]) > 0, `${page}: missing image height`);
      }
    }
    for (const tag of html.match(/<video\b[^>]*>/g) || []) {
      for (const attribute of ['autoplay', 'loop', 'muted', 'playsinline']) {
        assert(new RegExp(`\\b${attribute}\\b`).test(tag), `${page}: missing ${attribute}`);
      }
      assert(!/\bcontrols(?:\s|=|>)/.test(tag), `${page}: video controls returned`);
    }
  }
});
