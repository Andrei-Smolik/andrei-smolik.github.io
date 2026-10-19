const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const sharp = require('sharp');
const { ROOT } = require('./helpers');
const { resolveSitePath, assertSafeOutputPath } = require('../lib/config');

// All writes and cleanup are confined to explicitly created temporary fixtures.
// Real assemblies and generated website files are never changed by these tests.
function temporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-generator-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function fixture(t, config = '', content = '') {
  const directory = temporaryDirectory(t);
  fs.mkdirSync(path.join(directory, 'build'));
  for (const filename of ['generate.js', 'lib', 'templates']) {
    fs.cpSync(path.join(ROOT, 'build', filename), path.join(directory, 'build', filename), { recursive: true });
  }
  for (const filename of ['style.css', 'include-partials.js']) {
    fs.copyFileSync(path.join(ROOT, filename), path.join(directory, filename));
  }
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
  fs.mkdirSync(path.join(directory, 'miscellaneous'));
  fs.mkdirSync(path.join(directory, 'content', 'sample'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'content', 'sample', 'cover.jpg'), 'invalid unless a test supplies image data');
  fs.writeFileSync(path.join(directory, 'content', 'sample.md'), content ||
    '---\ntitle: Sample\nID: 1\nmedia_folder: sample\ntitle_images:\n - cover\nyear_completed: 2023\n---\nDescription.\n');
  fs.writeFileSync(path.join(directory, 'site.ini'), 'name=Test\nversion=0.1\nproject_path=content\nimages_path=images\n' + config);
  fs.writeFileSync(path.join(directory, 'index.html'), 'existing index');
  fs.writeFileSync(path.join(directory, 'nav.html'), 'existing navigation');
  return directory;
}

function generate(directory) {
  return spawnSync(process.execPath, [path.join(directory, 'build', 'generate.js')], {
    cwd: directory, encoding: 'utf8', timeout: 30000,
  });
}

function assertPreflightFailure(directory, expectedMessage) {
  const result = generate(directory);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stderr + result.stdout, expectedMessage);
  assert.equal(fs.readFileSync(path.join(directory, 'index.html'), 'utf8'), 'existing index');
  assert.equal(fs.readFileSync(path.join(directory, 'nav.html'), 'utf8'), 'existing navigation');
  assert(!fs.existsSync(path.join(directory, 'images')));
  assert(!fs.existsSync(path.join(directory, 'project-sample.html')));
}

test('path resolution rejects siblings, traversal, and symlink escape', t => {
  const directory = temporaryDirectory(t);
  const site = path.join(directory, 'site');
  const sibling = path.join(directory, 'site-backup');
  fs.mkdirSync(site); fs.mkdirSync(sibling);
  fs.symlinkSync(sibling, path.join(site, 'linked'), 'dir');
  assert.equal(resolveSitePath(site, 'images_path', 'images/new'), path.join(site, 'images/new'));
  assert.throws(() => resolveSitePath(site, 'images_path', '../site-backup'), /outside/);
  assert.throws(() => resolveSitePath(site, 'images_path', 'linked/new'), /outside/);
  assert.throws(() => assertSafeOutputPath(site, site, []), /dedicated output/);
  assert.throws(() => assertSafeOutputPath(site, path.join(site, 'content/output'), [path.join(site, 'content')]), /read-only/);
});

test('missing media_folder stops before any output is written', t => {
  assertPreflightFailure(fixture(t, '', '---\ntitle: Sample\n---\nText'), /missing required media_folder/);
});

test('missing named source folder stops before any output is written', t => {
  assertPreflightFailure(fixture(t, '', '---\ntitle: Sample\nmedia_folder: absent\n---\nText'), /does not match/);
});

test('missing configured project directory stops before any output is written', t => {
  assertPreflightFailure(fixture(t, 'project_path=missing\n'), /does not exist/);
});

test('invalid navigation order stops before any output is written', t => {
  assertPreflightFailure(fixture(t, 'links=missing\n'), /unknown link/);
});

test('output overlapping source directories is rejected before writes', t => {
  assertPreflightFailure(fixture(t, 'images_path=content\n'), /read-only source/);
});

test('unresolved cross-project links stop before any output is written', t => {
  assertPreflightFailure(fixture(t, '', '---\ntitle: Sample\nmedia_folder: sample\n---\n[[Other|missing]]'), /was not found/);
});

test('duplicate output slugs stop before any output is written', t => {
  const directory = fixture(t);
  fs.mkdirSync(path.join(directory, 'content', 'second'));
  fs.writeFileSync(path.join(directory, 'content', 'second', 'cover.jpg'), 'dummy');
  fs.writeFileSync(path.join(directory, 'content', 'second.md'), '---\ntitle: Sample\nmedia_folder: second\n---\nSecond.');
  assertPreflightFailure(directory, /same page filename/);
});

test('standalone page with missing title image stops before writes', t => {
  const directory = fixture(t);
  fs.mkdirSync(path.join(directory, 'about-assemblies'));
  fs.writeFileSync(path.join(directory, 'about-assemblies', 'about.md'), '---\ntitle: About\ntitle_images:\n - absent\n---\nAbout.');
  assertPreflightFailure(directory, /title image.*does not exist/);
});

test('full fixture build preserves source, rotates images, renders About/year, and reuses cache', async t => {
  const directory = fixture(t, 'links=about,content\n');
  const cover = path.join(directory, 'content', 'sample', 'cover.jpg');
  await sharp({ create: { width: 40, height: 20, channels: 3, background: '#123456' } })
    .jpeg().withMetadata({ orientation: 6 }).toFile(cover);
  const before = fs.readFileSync(cover);
  for (const [slug, id] of [['early', -1], ['late', 5], ['unnumbered', null]]) {
    fs.mkdirSync(path.join(directory, 'content', slug));
    fs.copyFileSync(cover, path.join(directory, 'content', slug, 'cover.jpg'));
    fs.writeFileSync(path.join(directory, 'content', `${slug}.md`),
      `---\ntitle: ${slug}\n${id === null ? '' : `ID: ${id}\n`}media_folder: ${slug}\ntitle_images:\n - cover\n---\nDescription.`);
  }
  fs.mkdirSync(path.join(directory, 'about-assemblies'));
  fs.copyFileSync(cover, path.join(directory, 'about-assemblies', 'portrait.jpg'));
  fs.writeFileSync(path.join(directory, 'about-assemblies', 'about.md'), '---\ntitle: About\ntitle_images:\n - portrait\n---\nAbout text.');
  const first = generate(directory);
  assert.equal(first.status, 0, first.stderr);
  const project = fs.readFileSync(path.join(directory, 'project-sample.html'), 'utf8');
  const about = fs.readFileSync(path.join(directory, 'about.html'), 'utf8');
  const nav = fs.readFileSync(path.join(directory, 'nav.html'), 'utf8');
  const index = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  const orderedLinks = [...index.matchAll(/href="project-([^"/]+)\.html"/g)].map(match => match[1]);
  assert.deepEqual(orderedLinks, ['early', 'sample', 'late', 'unnumbered']);
  assert.match(project, /project-subtitle[^>]*>[^<]*2023/);
  assert.match(project, /width="20"\s+height="40"/);
  assert.match(about, /class="project about-page"/);
  assert(nav.indexOf('>About</a>') < nav.indexOf('>Content</a>'));
  assert(!/\{\{[A-Z_]+\}\}|<!-- (IF|EACH|END):/.test(project + about + nav));
  const metadata = await sharp(path.join(directory, 'images', 'sample', 'cover-20w.webp')).metadata();
  assert.equal(metadata.width, 20); assert.equal(metadata.height, 40);
  const second = generate(directory);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /0 images processed, 1 cached/);
  assert.equal(fs.readFileSync(path.join(directory, 'project-sample.html'), 'utf8'), project);
  assert.deepEqual(fs.readFileSync(cover), before);
});
