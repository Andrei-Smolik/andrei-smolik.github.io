const assert = require('node:assert/strict');
const test = require('node:test');
const { parseIni } = require('../lib/config');
const { parseFrontmatter, parseScalar, asArray, slugify } = require('../lib/frontmatter');
const { orderNavigationPages, renderNavigation } = require('../lib/navigation');
const generator = require('../generate');
const { loadRuntime } = require('./helpers');

test('INI parsing agrees between generator and browser', () => {
  const text = '# comment\r\n; comment\nname="Andrei Smolik"\nemail=a=b@example.com\nlinks=projects, about\ninvalid\nname=Updated\n';
  const expected = { name: 'Updated', email: 'a=b@example.com', links: 'projects, about' };
  assert.deepEqual(parseIni(text), expected);
  assert.deepEqual(JSON.parse(JSON.stringify(loadRuntime().parseIni(text))), expected);
});

test('frontmatter preserves numbers, quoted strings, lists, comments, and body', () => {
  const parsed = parseFrontmatter('---\r\ntitle: "Test: Pavilion"\r\nID: 2\r\n# hidden: secret\r\ndesign:\r\n - "One"\r\n - Two\r\n---\r\nDescription\r\n');
  assert.deepEqual(parsed.data, { title: 'Test: Pavilion', ID: 2, design: ['One', 'Two'] });
  assert.equal(parsed.content, 'Description\r\n');
  assert.deepEqual(parseFrontmatter('Plain text'), { data: {}, content: 'Plain text' });
  assert.equal(parseScalar('"001"'), '001');
  assert.equal(parseScalar('-3.5'), -3.5);
  assert.deepEqual(asArray(0), [0]);
  assert.deepEqual(asArray(null), []);
  assert.equal(slugify(' The Exchange! '), 'the-exchange');
});

test('facts exclude internal fields and retain labels, order, and list values', () => {
  assert.deepEqual(generator.buildFactRows({
    ID: 2, title: 'Title', 'media-folder': 'x', title_images: ['a'],
    design: ['One', 'Two'], year_completed: 2023, blank: '', 'custom-field': 'Value',
  }), [['Design', 'One, Two'], ['Year completed', '2023'], ['Custom field', 'Value']]);
});

test('navigation defaults alphabetically, with Contact last', () => {
  const pages = orderNavigationPages('projects', [{ slug: 'zebra' }, { slug: 'about' }]);
  assert.deepEqual(pages.map(page => page.label), ['about', 'projects', 'zebra', 'contact']);
});

test('explicit navigation order is case-insensitive and retains unspecified links', () => {
  const pages = orderNavigationPages('projects', [{ slug: 'about' }], 'CONTACT, Projects');
  assert.deepEqual(pages.map(page => page.label), ['contact', 'projects', 'about']);
  const html = renderNavigation('{{ASSEMBLY_LINKS}}', pages, generator.escapeHtml);
  assert.match(html, /data-contact-mailto/);
  assert.match(html, /href="index.html#projects"/);
});

test('invalid/duplicate navigation links fail explicitly', () => {
  assert.throws(() => orderNavigationPages('projects', [], 'missing'), /unknown link/);
  assert.throws(() => orderNavigationPages('projects', [], 'projects,PROJECTS'), /duplicate link/);
});

test('template markers and literal replacement values remain intact', () => {
  const template = 'A<!-- IF:X -->yes<!-- END:X -->B';
  assert.equal(generator.resolveIf(template, 'X', true), 'AyesB');
  assert.equal(generator.resolveIf(template, 'X', false), 'AB');
  assert.equal(generator.resolveEach('<!-- EACH:X -->{{VALUE}}<!-- END:X -->', 'X', ['$&', '$1'],
    (html, value) => generator.fillTokens(html, { VALUE: value })), '$&$1');
  assert.equal(generator.fillTokens('{{VALUE}} {{EMPTY}}', { VALUE: '$&', EMPTY: null }), '$& ');
  assert.equal(generator.escapeHtml('<img title="a&b">'), '&lt;img title=&quot;a&amp;b&quot;&gt;');
  assert.equal(generator.stripComments('<!-- hidden -->\nPage '), 'Page\n');
});

test('responsive image URLs retain encoding, srcset, and intrinsic dimensions', () => {
  const resolve = generator.makeImageResolver('images', 'sample', new Map([['a b', [480, 800]]]),
    new Map([['a b', { width: 1600, height: 900 }]]));
  assert.deepEqual(resolve('a b'), {
    src: 'images/sample/a%20b-800w.webp',
    srcset: 'images/sample/a%20b-480w.webp 480w, images/sample/a%20b-800w.webp 800w',
    width: 1600, height: 900,
  });
});

test('malformed cross-project references are identified before rendering', () => {
  assert.equal(generator.findProjectLinkMarkers('[[label|target]]')[0].target, 'target');
  for (const text of ['[[target]]', '[[|target]]', '[[label|]]']) {
    assert(generator.findProjectLinkMarkers(text)[0].error);
  }
  const missing = generator.validateDescriptionProjectLinks([
    { markdownPath: 'sample.md', content: '[[Example|missing]]' },
  ], new Map());
  assert.match(missing[0], /was not found/);
});
