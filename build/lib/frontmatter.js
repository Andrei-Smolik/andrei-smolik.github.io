// The site's deliberately small frontmatter format (not a full YAML parser).
// Keep parsing and key normalization independent of filesystem/build side effects.

function parseScalar(raw) {
  const value = raw.trim();

  const quoted =
    value.match(/^"(.*)"$/) ||
    value.match(/^'(.*)'$/);

  if (quoted) {
    return quoted[1];
  }

  if (
    /^-?\d+(\.\d+)?$/.test(value)
  ) {
    return Number(value);
  }

  return value;
}

function parseFrontmatter(raw) {
  const match = raw.match(
    /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
  );

  if (!match) {
    return {
      data: {},
      content: raw,
    };
  }

  const [
    ,
    frontmatterText,
    body,
  ] = match;

  const data = {};
  let currentListKey = null;

  for (
    const line of
    frontmatterText.split(/\r?\n/)
  ) {
    const trimmedLine =
      line.trim();

    if (
      !trimmedLine ||
      trimmedLine.startsWith('#')
    ) {
      continue;
    }

    const listItem =
      line.match(
        /^\s*-\s*(.+)$/
      );

    if (
      listItem &&
      currentListKey
    ) {
      data[currentListKey].push(
        parseScalar(
          listItem[1]
        )
      );

      continue;
    }

    const keyValue =
      line.match(
        /^([^:]+):\s*(.*)$/
      );

    if (!keyValue) {
      currentListKey = null;
      continue;
    }

    const key =
      keyValue[1].trim();

    const value =
      keyValue[2].trim();

    if (value === '') {
      data[key] = [];
      currentListKey = key;
    } else {
      data[key] =
        parseScalar(value);

      currentListKey = null;
    }
  }

  return {
    data,
    content: body,
  };
}

function asArray(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return [];
  }

  return Array.isArray(value)
    ? value
    : [value];
}

function normalizeFrontmatterKey(key) {
  return String(key)
    .trim()
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      '_'
    );
}

function makeFactLabel(key) {
  const label =
    String(key)
      .trim()
      .replace(
        /[_-]+/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      );

  return (
    label.charAt(0).toUpperCase() +
    label.slice(1)
  );
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      '-'
    )
    .replace(
      /^-+|-+$/g,
      ''
    );
}

module.exports = { parseScalar, parseFrontmatter, asArray, normalizeFrontmatterKey, makeFactLabel, slugify };
