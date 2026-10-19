const fs = require('node:fs');
const path = require('node:path');

function parseIni(text) {
  const config = {};

  text
    .split('\n')
    .forEach((line) => {
      const trimmed =
        line
          .trim()
          .replace(/\r$/, '');

      if (
        !trimmed ||
        trimmed.startsWith(';') ||
        trimmed.startsWith('#')
      ) {
        return;
      }

      const equalsIndex =
        trimmed.indexOf('=');

      if (equalsIndex === -1) {
        return;
      }

      const key =
        trimmed
          .slice(0, equalsIndex)
          .trim();

      let value =
        trimmed
          .slice(equalsIndex + 1)
          .trim();

      value = value.replace(
        /^["'](.*)["']$/,
        '$1'
      );

      config[key] = value;
    });

  return config;
}

// Resolve existing ancestors as well as the lexical path, so a symlink or a
// sibling such as Website-backup cannot bypass the site's output boundary.
function canonicalPath(filename) {
  if (fs.existsSync(filename)) return fs.realpathSync(filename);
  const parent = path.dirname(filename);
  if (parent === filename) return filename;
  return path.join(canonicalPath(parent), path.basename(filename));
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!path.isAbsolute(relative) &&
    relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function resolveSitePath(root, key, value) {
  const resolved = path.resolve(root, value);
  if (!isWithin(root, resolved) || !isWithin(canonicalPath(root), canonicalPath(resolved))) {
    throw new Error(`${key} "${value}" resolves outside the site root (${root}).`);
  }
  return resolved;
}

function assertSafeOutputPath(root, output, sources) {
  const destination = canonicalPath(output);
  if (destination === canonicalPath(root)) {
    throw new Error('images_path must be a dedicated output directory, not the site root.');
  }
  for (const source of sources) {
    const input = canonicalPath(source);
    if (isWithin(input, destination) || isWithin(destination, input)) {
      throw new Error(`images_path overlaps read-only source folder: ${source}.`);
    }
  }
}

module.exports = { parseIni, resolveSitePath, assertSafeOutputPath };
