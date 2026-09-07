#!/usr/bin/env node
/**
 * build/generate.js - website media and page generator
 *
 * Run with: npm run generate   (or: node build/generate.js)
 *
 * Project metadata lives in named .md files directly inside site.ini's
 * `project_path`. Media remains in immediate subfolders of that directory.
 * Every Markdown file must provide a `media_folder` frontmatter field.
 *
 * Description text can link to another generated project with:
 *
 *   [[visible text|target project]]
 *
 * The target may be the project's Markdown filename, title, media folder,
 * or generated slug. Invalid links abort the run before files are changed.
 */

const fs = require('fs');
const path = require('path');
const {
  spawn,
  spawnSync,
} = require('child_process');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tif',
  '.tiff',
]);

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.m4v',
  '.avi',
  '.mkv',
  '.webm',
]);

const RESPONSIVE_WIDTHS = [
  480,
  800,
  1200,
  1800,
];

const OUTPUT_IMAGE_QUALITY = 82;
const IMAGE_PIPELINE_REVISION = 2;
const OUTPUT_VIDEO_MAX_WIDTH = 1920;
const OUTPUT_VIDEO_CRF = 23;
const OUTPUT_VIDEO_AUDIO_BITRATE = '128k';
const MISCELLANEOUS_FOLDER_NAME =
  'miscellaneous';

/* --------------------------------------------------------------------------
   Config
   -------------------------------------------------------------------------- */

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

function loadConfig() {
  const iniPath =
    path.join(ROOT, 'site.ini');

  if (!fs.existsSync(iniPath)) {
    warnAndExit(
      `site.ini not found at ${iniPath}. ` +
      'Expected it next to build/.'
    );
  }

  const config =
    parseIni(
      fs.readFileSync(
        iniPath,
        'utf8'
      )
    );

  if (!config.project_path) {
    warnAndExit(
      'site.ini is missing a ' +
      '"project_path" value.'
    );
  }

  if (!config.images_path) {
    warnAndExit(
      'site.ini is missing an ' +
      '"images_path" value.'
    );
  }

  return config;
}

function resolveWithinRoot(
  configKey,
  configValue
) {
  const resolved =
    path.resolve(
      ROOT,
      configValue
    );

  if (!resolved.startsWith(ROOT)) {
    warnAndExit(
      `${configKey} "${configValue}" ` +
      `resolves outside the site root (${ROOT}).`
    );
  }

  return resolved;
}

function resolveProjectPath(config) {
  const resolved =
    resolveWithinRoot(
      'project_path',
      config.project_path
    );

  if (!fs.existsSync(resolved)) {
    warnAndExit(
      `project_path "${config.project_path}" ` +
      `does not exist at ${resolved}.`
    );
  }

  return resolved;
}

function resolveImagesPath(config) {
  return resolveWithinRoot(
    'images_path',
    config.images_path
  );
}

function warnAndExit(message) {
  console.warn(`⚠ ${message}`);
  process.exit(1);
}

/* --------------------------------------------------------------------------
   Discovery
   -------------------------------------------------------------------------- */

function findSubfolders(directory) {
  return fs
    .readdirSync(
      directory,
      {
        withFileTypes: true,
      }
    )
    .filter(
      (entry) =>
        entry.isDirectory()
    )
    .map(
      (entry) =>
        path.join(
          directory,
          entry.name
        )
    );
}

function listMarkdownFiles(directory) {
  return fs
    .readdirSync(
      directory,
      {
        withFileTypes: true,
      }
    )
    .filter(
      (entry) =>
        entry.isFile()
    )
    .map(
      (entry) =>
        entry.name
    )
    .filter(
      (name) =>
        path
          .extname(name)
          .toLowerCase() === '.md'
    )
    .sort(
      (first, second) =>
        first.localeCompare(second)
    )
    .map(
      (name) =>
        path.join(
          directory,
          name
        )
    );
}

function listImagesInFolder(directory) {
  return fs
    .readdirSync(
      directory,
      {
        withFileTypes: true,
      }
    )
    .filter(
      (entry) =>
        entry.isFile()
    )
    .map(
      (entry) =>
        entry.name
    )
    .filter(
      (name) =>
        IMAGE_EXTENSIONS.has(
          path
            .extname(name)
            .toLowerCase()
        )
    )
    .sort();
}

function listVideosInFolder(directory) {
  return fs
    .readdirSync(
      directory,
      {
        withFileTypes: true,
      }
    )
    .filter(
      (entry) =>
        entry.isFile()
    )
    .map(
      (entry) =>
        entry.name
    )
    .filter(
      (name) =>
        VIDEO_EXTENSIONS.has(
          path
            .extname(name)
            .toLowerCase()
        )
    )
    .sort();
}

function folderHasMedia(directory) {
  return (
    listImagesInFolder(directory).length > 0 ||
    listVideosInFolder(directory).length > 0
  );
}

/* --------------------------------------------------------------------------
   Media processing
   -------------------------------------------------------------------------- */

function basenameNoExt(filename) {
  return filename.slice(
    0,
    filename.length -
    path.extname(filename).length
  );
}

function ensureProjectImagesOutputFolder(
  imagesRoot,
  slug
) {
  const outputDirectory =
    path.join(
      imagesRoot,
      slug
    );

  fs.mkdirSync(
    outputDirectory,
    {
      recursive: true,
    }
  );

  return outputDirectory;
}

function ensureMiscellaneousInputFolder(
  projectRoot
) {
  const miscellaneousDirectory =
    path.join(
      projectRoot,
      MISCELLANEOUS_FOLDER_NAME
    );

  if (
    !fs.existsSync(
      miscellaneousDirectory
    )
  ) {
    fs.mkdirSync(
      miscellaneousDirectory,
      {
        recursive: true,
      }
    );

    console.log(
      `Created ${path.relative(
        ROOT,
        miscellaneousDirectory
      )} for non-project website media.`
    );
  }

  return miscellaneousDirectory;
}

function outputIsCurrent(
  sourcePath,
  outputPath
) {
  if (!fs.existsSync(outputPath)) {
    return false;
  }

  const source =
    fs.statSync(sourcePath);

  const output =
    fs.statSync(outputPath);

  return (
    output.size > 0 &&
    output.mtimeMs >= source.mtimeMs
  );
}

function imagePipelineIsCurrent(
  outputDirectory
) {
  const markerPath =
    path.join(
      outputDirectory,
      '.image-pipeline-revision'
    );

  try {
    return (
      fs
        .readFileSync(
          markerPath,
          'utf8'
        )
        .trim() ===
      String(IMAGE_PIPELINE_REVISION)
    );
  } catch {
    return false;
  }
}

function markImagePipelineCurrent(
  outputDirectory
) {
  fs.writeFileSync(
    path.join(
      outputDirectory,
      '.image-pipeline-revision'
    ),
    `${IMAGE_PIPELINE_REVISION}\n`,
    'utf8'
  );
}

async function processImageResponsive(
  sourcePath,
  outputDirectory,
  forceRebuild = false
) {
  const basename =
    basenameNoExt(
      path.basename(sourcePath)
    );

  const metadata =
    await sharp(sourcePath)
      .metadata();

  const largestBreakpoint =
    RESPONSIVE_WIDTHS[
      RESPONSIVE_WIDTHS.length - 1
    ];

  const orientationSwapsDimensions =
    [5, 6, 7, 8].includes(
      metadata.orientation
    );

  const naturalWidth =
    (
      orientationSwapsDimensions
        ? metadata.height
        : metadata.width
    ) ||
    largestBreakpoint;

  const widths =
    RESPONSIVE_WIDTHS.filter(
      (width) =>
        width < naturalWidth
    );

  widths.push(
    Math.min(
      naturalWidth,
      largestBreakpoint
    )
  );

  const uniqueWidths = [
    ...new Set(widths),
  ].sort(
    (first, second) =>
      first - second
  );

  let rebuilt = false;

  for (const width of uniqueWidths) {
    const outputPath =
      path.join(
        outputDirectory,
        `${basename}-${width}w.webp`
      );

    if (
      !forceRebuild &&
      outputIsCurrent(
        sourcePath,
        outputPath
      )
    ) {
      continue;
    }

    await sharp(sourcePath)
      .rotate()
      .resize({
        width,
        withoutEnlargement: true,
      })
      .webp({
        quality:
          OUTPUT_IMAGE_QUALITY,
      })
      .toFile(outputPath);

    rebuilt = true;
  }

  return {
    basename,
    widths: uniqueWidths,
    cached: !rebuilt,
  };
}

function isFfmpegAvailable() {
  const check =
    spawnSync(
      'ffmpeg',
      ['-version'],
      {
        stdio: 'ignore',
      }
    );

  return (
    !check.error &&
    check.status === 0
  );
}

function runFfmpeg(
  argumentsList,
  filename
) {
  return new Promise(
    (resolve, reject) => {
      const childProcess =
        spawn(
          'ffmpeg',
          argumentsList,
          {
            stdio: [
              'ignore',
              'ignore',
              'pipe',
            ],
          }
        );

      let errorOutput = '';

      childProcess.stderr.on(
        'data',
        (chunk) => {
          errorOutput +=
            chunk.toString();

          if (
            errorOutput.length >
            12000
          ) {
            errorOutput =
              errorOutput.slice(-12000);
          }
        }
      );

      childProcess.on(
        'error',
        (error) => {
          reject(error);
        }
      );

      childProcess.on(
        'close',
        (code) => {
          if (code === 0) {
            resolve();
            return;
          }

          reject(
            new Error(
              `FFmpeg could not compress ` +
              `${filename}.\n` +
              errorOutput.trim()
            )
          );
        }
      );
    }
  );
}

async function processVideo(
  sourcePath,
  outputDirectory,
  allowCompression = true
) {
  const basename =
    basenameNoExt(
      path.basename(sourcePath)
    );

  const outputPath =
    path.join(
      outputDirectory,
      `${basename}.mp4`
    );

  if (
    outputIsCurrent(
      sourcePath,
      outputPath
    )
  ) {
    return {
      basename,
      outputPath,
      cached: true,
      skipped: false,
    };
  }

  if (!allowCompression) {
    return {
      basename,
      outputPath,
      cached: false,
      skipped: true,
    };
  }

  await runFfmpeg(
    [
      '-y',
      '-i',
      sourcePath,
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-vf',
      `scale='min(${OUTPUT_VIDEO_MAX_WIDTH},iw)':-2`,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      String(OUTPUT_VIDEO_CRF),
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      OUTPUT_VIDEO_AUDIO_BITRATE,
      '-ac',
      '2',
      '-sn',
      '-map_metadata',
      '-1',
      outputPath,
    ],
    path.basename(sourcePath)
  );

  return {
    basename,
    outputPath,
    cached: false,
    skipped: false,
  };
}

async function processProjectFolder(
  projectFolder,
  outputDirectory,
  processVideos = true
) {
  const images =
    listImagesInFolder(
      projectFolder
    );

  const videos =
    listVideosInFolder(
      projectFolder
    );

  if (
    images.length === 0 &&
    videos.length === 0
  ) {
    return {
      processedImages: 0,
      cachedImages: 0,
      processedVideos: 0,
      cachedVideos: 0,
      skippedVideos: 0,
      processedVideoBasenames: [],
      widthsByBasename: new Map(),
    };
  }

  fs.mkdirSync(
    outputDirectory,
    {
      recursive: true,
    }
  );

  const forceImageRebuild =
    !imagePipelineIsCurrent(
      outputDirectory
    );

  const widthsByBasename =
    new Map();

  let processedImages = 0;
  let cachedImages = 0;

  for (const filename of images) {
    const {
      basename,
      widths,
      cached,
    } =
      await processImageResponsive(
        path.join(
          projectFolder,
          filename
        ),
        outputDirectory,
        forceImageRebuild
      );

    widthsByBasename.set(
      basename,
      widths
    );

    if (cached) {
      cachedImages += 1;
    } else {
      processedImages += 1;
    }
  }

  if (images.length > 0) {
    markImagePipelineCurrent(
      outputDirectory
    );
  }

  const processedVideoBasenames = [];

  let processedVideos = 0;
  let cachedVideos = 0;
  let skippedVideos = 0;

  for (const filename of videos) {
    const {
      basename,
      cached,
      skipped,
    } =
      await processVideo(
        path.join(
          projectFolder,
          filename
        ),
        outputDirectory,
        processVideos
      );

    if (skipped) {
      skippedVideos += 1;
      continue;
    }

    processedVideoBasenames.push(
      basename
    );

    if (cached) {
      cachedVideos += 1;
    } else {
      processedVideos += 1;
    }
  }

  return {
    processedImages,
    cachedImages,
    processedVideos,
    cachedVideos,
    skippedVideos,
    processedVideoBasenames,
    widthsByBasename,
  };
}

/* --------------------------------------------------------------------------
   Frontmatter parsing
   -------------------------------------------------------------------------- */

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

/* --------------------------------------------------------------------------
   Small helpers
   -------------------------------------------------------------------------- */

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

function getFrontmatterValue(
  data,
  wantedKey
) {
  const wanted =
    normalizeFrontmatterKey(
      wantedKey
    );

  const entry =
    Object.entries(data)
      .find(
        ([key]) =>
          normalizeFrontmatterKey(
            key
          ) === wanted
      );

  return entry
    ? entry[1]
    : undefined;
}

function matchFolderByName(
  folders,
  requestedName
) {
  const requested =
    String(
      requestedName ?? ''
    ).trim();

  if (!requested) {
    return {
      folder: null,
      ambiguous: [],
    };
  }

  const exactMatches =
    folders.filter(
      (folder) =>
        path
          .basename(folder)
          .toLowerCase() ===
        requested.toLowerCase()
    );

  if (exactMatches.length === 1) {
    return {
      folder: exactMatches[0],
      ambiguous: [],
    };
  }

  if (exactMatches.length > 1) {
    return {
      folder: null,
      ambiguous: exactMatches,
    };
  }

  const normalizedRequested =
    slugify(requested);

  if (!normalizedRequested) {
    return {
      folder: null,
      ambiguous: [],
    };
  }

  const normalizedMatches =
    folders.filter(
      (folder) =>
        slugify(
          path.basename(folder)
        ) === normalizedRequested
    );

  if (
    normalizedMatches.length === 1
  ) {
    return {
      folder:
        normalizedMatches[0],
      ambiguous: [],
    };
  }

  return {
    folder: null,

    ambiguous:
      normalizedMatches.length > 1
        ? normalizedMatches
        : [],
  };
}

function resolveMarkdownMediaFolder(
  markdownPath,
  data,
  folders
) {
  const explicitFolder =
    getFrontmatterValue(
      data,
      'media_folder'
    );

  if (
    explicitFolder === undefined
  ) {
    return {
      folder: null,
      error:
        'missing required media_folder field',
    };
  }

  if (
    Array.isArray(
      explicitFolder
    )
  ) {
    if (
      explicitFolder.length === 0
    ) {
      return {
        folder: null,
        error:
          'media_folder is blank',
      };
    }

    return {
      folder: null,
      error:
        'media_folder must contain ' +
        'one folder name, not a list',
    };
  }

  const folderName =
    String(
      explicitFolder ?? ''
    ).trim();

  if (!folderName) {
    return {
      folder: null,
      error:
        'media_folder is blank',
    };
  }

  const match =
    matchFolderByName(
      folders,
      folderName
    );

  if (match.folder) {
    return {
      folder: match.folder,
      matchedBy:
        'media_folder',
    };
  }

  if (
    match.ambiguous.length > 0
  ) {
    return {
      folder: null,

      error:
        `media_folder "${folderName}" ` +
        'matches more than one folder: ' +
        match.ambiguous
          .map(
            (folder) =>
              path.basename(folder)
          )
          .join(', '),
    };
  }

  return {
    folder: null,

    error:
      `media_folder "${folderName}" ` +
      'does not match a project folder',
  };
}

/* --------------------------------------------------------------------------
   Cross-project description links
   -------------------------------------------------------------------------- */

function findProjectLinkMarkers(text) {
  const markers = [];

  const expression =
    /\[\[([^\]\r\n]*)\]\]/g;

  let match;

  while (
    (
      match =
        expression.exec(text)
    ) !== null
  ) {
    const contents =
      match[1];

    const separatorIndex =
      contents.indexOf('|');

    if (separatorIndex === -1) {
      markers.push({
        raw: match[0],
        label: '',
        target: '',
        error:
          'project link must use ' +
          '[[visible text|target project]]',
      });

      continue;
    }

    const label =
      contents
        .slice(
          0,
          separatorIndex
        )
        .trim();

    const target =
      contents
        .slice(
          separatorIndex + 1
        )
        .trim();

    markers.push({
      raw: match[0],
      label,
      target,

      error:
        !label
          ? 'project link has no visible text'
          : !target
            ? 'project link has no target project'
            : '',
    });
  }

  return markers;
}

function buildProjectReferenceIndex(
  markdownByFolder
) {
  const projects = [];
  const references = new Map();
  const problems = [];

  for (
    const [
      folder,
      markdownPath,
    ] of markdownByFolder
  ) {
    const {
      data,
      content,
    } =
      parseFrontmatter(
        fs.readFileSync(
          markdownPath,
          'utf8'
        )
      );

    const folderName =
      path.basename(folder);

    const title =
      data.title ||
      folderName;

    const slug =
      slugify(title) ||
      slugify(folderName);

    const project = {
      folder,
      markdownPath,
      data,
      content,
      title,
      slug,
      href:
        `project-${slug}.html`,
    };

    projects.push(project);

    const aliases =
      new Set([
        path.basename(
          markdownPath
        ),

        basenameNoExt(
          path.basename(
            markdownPath
          )
        ),

        folderName,
        title,
        slug,
      ]);

    for (const alias of aliases) {
      const normalized =
        slugify(alias);

      if (!normalized) {
        continue;
      }

      const matches =
        references.get(
          normalized
        ) || [];

      if (
        !matches.some(
          (item) =>
            item.markdownPath ===
            markdownPath
        )
      ) {
        matches.push(project);
      }

      references.set(
        normalized,
        matches
      );
    }
  }

  const projectsByHref =
    new Map();

  for (
    const project of projects
  ) {
    const matches =
      projectsByHref.get(
        project.href
      ) || [];

    matches.push(project);

    projectsByHref.set(
      project.href,
      matches
    );
  }

  for (
    const [
      href,
      matches,
    ] of projectsByHref
  ) {
    if (matches.length > 1) {
      problems.push(
        matches
          .map(
            (project) =>
              path.basename(
                project.markdownPath
              )
          )
          .join(', ') +
        ` -> "${href}": ` +
        'project titles generate ' +
        'the same page filename'
      );
    }
  }

  return {
    projects,
    references,
    problems,
  };
}

function resolveProjectReference(
  references,
  target
) {
  return (
    references.get(
      slugify(target)
    ) ||
    []
  );
}

function validateDescriptionProjectLinks(
  projects,
  references
) {
  const problems = [];

  for (
    const project of projects
  ) {
    const markers =
      findProjectLinkMarkers(
        project.content
      );

    for (const marker of markers) {
      if (marker.error) {
        problems.push(
          `${path.basename(
            project.markdownPath
          )} -> ${marker.raw}: ` +
          marker.error
        );

        continue;
      }

      const matches =
        resolveProjectReference(
          references,
          marker.target
        );

      if (matches.length === 0) {
        problems.push(
          `${path.basename(
            project.markdownPath
          )} -> ${marker.raw}: ` +
          `target project "${marker.target}" ` +
          'was not found'
        );

        continue;
      }

      if (matches.length > 1) {
        problems.push(
          `${path.basename(
            project.markdownPath
          )} -> ${marker.raw}: ` +
          `target project "${marker.target}" ` +
          'is ambiguous; it matches ' +
          matches
            .map(
              (item) =>
                path.basename(
                  item.markdownPath
                )
            )
            .join(', ')
        );

        continue;
      }

      if (
        matches[0].markdownPath ===
        project.markdownPath
      ) {
        problems.push(
          `${path.basename(
            project.markdownPath
          )} -> ${marker.raw}: ` +
          'the link points back to ' +
          'the same project'
        );
      }
    }
  }

  return problems;
}

/* --------------------------------------------------------------------------
   Preflight validation
   -------------------------------------------------------------------------- */

function validateMarkdownFolderLinks(
  markdownPaths,
  folders
) {
  const matchesByFolder =
    new Map();

  const problems = [];

  const availableFolders =
    folders.length > 0
      ? folders
          .map(
            (folder) =>
              `"${path.basename(folder)}"`
          )
          .join(', ')
      : '(none)';

  for (
    const markdownPath of
    markdownPaths
  ) {
    const {
      data,
    } =
      parseFrontmatter(
        fs.readFileSync(
          markdownPath,
          'utf8'
        )
      );

    const resolution =
      resolveMarkdownMediaFolder(
        markdownPath,
        data,
        folders
      );

    if (!resolution.folder) {
      problems.push(
        `${path.basename(markdownPath)} ` +
        '-> [no unique folder]: ' +
        `${resolution.error}. ` +
        'Available folders: ' +
        availableFolders
      );

      continue;
    }

    const existing =
      matchesByFolder.get(
        resolution.folder
      ) || [];

    existing.push({
      markdownPath,
      matchedBy:
        resolution.matchedBy,
    });

    matchesByFolder.set(
      resolution.folder,
      existing
    );
  }

  const result = new Map();

  for (
    const [
      folder,
      matches,
    ] of matchesByFolder
  ) {
    if (matches.length > 1) {
      problems.push(
        matches
          .map(
            ({ markdownPath }) =>
              path.basename(
                markdownPath
              )
          )
          .join(', ') +
        ` -> "${path.basename(folder)}": ` +
        'multiple Markdown files target ' +
        'the same folder'
      );

      continue;
    }

    if (!folderHasMedia(folder)) {
      problems.push(
        `${path.basename(
          matches[0].markdownPath
        )} -> "${path.basename(folder)}": ` +
        'the matched folder contains ' +
        'no supported media'
      );

      continue;
    }

    result.set(
      folder,
      matches[0].markdownPath
    );
  }

  return {
    markdownByFolder: result,
    problems,
  };
}

function printMarkdownFolderProblems(
  problems
) {
  console.warn(
    '⚠ Project link validation failed ' +
    `with ${problems.length} ` +
    `problem${
      problems.length === 1
        ? ''
        : 's'
    }. No files were changed.`
  );

  for (const problem of problems) {
    console.warn(
      `  - ${problem}`
    );
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveSplashVideoSource(
  value,
  imagesPathConfig
) {
  const raw =
    String(value ?? '')
      .trim();

  if (!raw) {
    return '';
  }

  const isDirectReference =
    /^(?:https?:)?\/\//i.test(raw) ||
    raw.startsWith('/') ||
    raw.includes('/');

  if (isDirectReference) {
    return raw;
  }

  const outputBasename =
    basenameNoExt(raw);

  return (
    `${imagesPathConfig}/` +
    `${MISCELLANEOUS_FOLDER_NAME}/` +
    `${encodeURIComponent(
      outputBasename
    )}.mp4`
  );
}

function resolveSplashTextClass(
  value
) {
  return (
    String(value ?? '')
      .trim()
      .toLowerCase() === 'black'
  )
    ? ' splash--black-text'
    : '';
}

/* --------------------------------------------------------------------------
   Template engine
   -------------------------------------------------------------------------- */

function loadTemplate(filename) {
  return fs.readFileSync(
    path.join(
      TEMPLATES_DIR,
      filename
    ),
    'utf8'
  );
}

function resolveIf(
  html,
  name,
  keep
) {
  const expression =
    new RegExp(
      `<!-- IF:${name} -->` +
      `([\\s\\S]*?)` +
      `<!-- END:${name} -->`,
      'g'
    );

  return html.replace(
    expression,
    keep ? '$1' : ''
  );
}

function resolveEach(
  html,
  name,
  items,
  fillItem
) {
  const expression =
    new RegExp(
      `<!-- EACH:${name} -->` +
      `([\\s\\S]*?)` +
      `<!-- END:${name} -->`
    );

  const match =
    html.match(expression);

  if (!match) {
    return html;
  }

  const itemTemplate =
    match[1];

  const filled =
    items
      .map(
        (item, index) =>
          fillItem(
            itemTemplate,
            item,
            index
          )
      )
      .join('');

  return html.replace(
    expression,
    () => filled
  );
}

function fillTokens(
  html,
  tokens
) {
  let result = html;

  for (
    const [
      key,
      value,
    ] of Object.entries(tokens)
  ) {
    result =
      result
        .split(`{{${key}}}`)
        .join(value ?? '');
  }

  return result;
}

function stripComments(html) {
  return (
    html
      .replace(
        /<!--[\s\S]*?-->/g,
        ''
      )
      .trim() +
    '\n'
  );
}

/* --------------------------------------------------------------------------
   Project content assembly
   -------------------------------------------------------------------------- */

function buildFactRows(data) {
  const rows = [];

  const addRow = (
    label,
    value
  ) => {
    const values =
      asArray(value)
        .map(
          (item) =>
            String(item).trim()
        )
        .filter(Boolean);

    if (values.length > 0) {
      rows.push([
        label,
        values.join(', '),
      ]);
    }
  };

  const internallyUsedFields =
    new Set([
      'id',
      'title',
      'subtitle',
      'media_folder',
      'link_image',
      'title_images',
      'excluded_images',
      'remove_images',
    ]);

  for (
    const [
      key,
      value,
    ] of Object.entries(data)
  ) {
    const normalizedKey =
      normalizeFrontmatterKey(key);

    if (
      internallyUsedFields.has(
        normalizedKey
      )
    ) {
      continue;
    }

    addRow(
      makeFactLabel(key),
      value
    );
  }

  return rows;
}

function splitParagraphs(body) {
  return body
    .split(/\n\s*\n/)
    .map(
      (paragraph) =>
        paragraph.trim()
    )
    .filter(Boolean);
}

function renderDescriptionText(
  text,
  projectReferences
) {
  const expression =
    /\[\[([^\]\r\n]*)\]\]/g;

  let html = '';
  let previousIndex = 0;
  let match;

  while (
    (
      match =
        expression.exec(text)
    ) !== null
  ) {
    html += escapeHtml(
      text.slice(
        previousIndex,
        match.index
      )
    );

    const contents =
      match[1];

    const separatorIndex =
      contents.indexOf('|');

    const label =
      contents
        .slice(
          0,
          separatorIndex
        )
        .trim();

    const target =
      contents
        .slice(
          separatorIndex + 1
        )
        .trim();

    const projects =
      resolveProjectReference(
        projectReferences,
        target
      );

    if (
      separatorIndex === -1 ||
      !label ||
      projects.length !== 1
    ) {
      html +=
        escapeHtml(match[0]);
    } else {
      html +=
        `<a class="project-description__link" ` +
        `href="${escapeHtml(
          projects[0].href
        )}">` +
        `${escapeHtml(label)}</a>`;
    }

    previousIndex =
      expression.lastIndex;
  }

  html += escapeHtml(
    text.slice(previousIndex)
  );

  return html;
}

function makeImageResolver(
  imagesPathConfig,
  slug,
  widthsByBasename
) {
  return (basename) => {
    const widths =
      widthsByBasename.get(
        basename
      ) || [];

    const urlBase =
      `${imagesPathConfig}/` +
      `${slug}/` +
      `${encodeURIComponent(
        basename
      )}`;

    if (widths.length === 0) {
      return {
        src: `${urlBase}.webp`,
        srcset: '',
      };
    }

    const largest =
      widths[
        widths.length - 1
      ];

    const srcset =
      widths
        .map(
          (width) =>
            `${urlBase}-${width}w.webp ` +
            `${width}w`
        )
        .join(', ');

    return {
      src:
        `${urlBase}-${largest}w.webp`,
      srcset,
    };
  };
}

function makeVideoResolver(
  imagesPathConfig,
  slug
) {
  return (basename) =>
    `${imagesPathConfig}/` +
    `${slug}/` +
    `${encodeURIComponent(
      basename
    )}.mp4`;
}

function buildProjectPageData({
  mdPath,
  projectDir,
  slug,
  imageWebPath,
  videoWebPath,
  processedVideoBasenames,
}) {
  const {
    data,
    content,
  } =
    parseFrontmatter(
      fs.readFileSync(
        mdPath,
        'utf8'
      )
    );

  if (
    Object.keys(data).length === 0
  ) {
    console.warn(
      `  ! ${path.basename(projectDir)}: ` +
      'the Markdown file has no valid ' +
      'frontmatter — skipping page/tile.'
    );

    return null;
  }

  const title =
    data.title ||
    path.basename(projectDir);

  const titleImages =
    asArray(
      data.title_images
    );

  const excluded =
    new Set(
      asArray(
        data.excluded_images ??
        data['excluded images']
      )
    );

  const sourceImages =
    listImagesInFolder(
      projectDir
    );

  const contentBasenames =
    sourceImages
      .map(basenameNoExt)
      .filter(
        (basename) =>
          !excluded.has(basename)
      );

  const processedVideos =
    new Set(
      processedVideoBasenames
    );

  const sourceVideos =
    listVideosInFolder(
      projectDir
    ).filter(
      (filename) =>
        processedVideos.has(
          basenameNoExt(filename)
        )
    );

  const galleryMedia = [
    ...sourceImages,
    ...sourceVideos,
  ]
    .sort()
    .map(
      (filename) => ({
        basename:
          basenameNoExt(filename),

        type:
          VIDEO_EXTENSIONS.has(
            path
              .extname(filename)
              .toLowerCase()
          )
            ? 'video'
            : 'image',
      })
    )
    .filter(
      (item) =>
        !excluded.has(
          item.basename
        )
    )
    .filter(
      (item) =>
        item.type === 'video' ||
        !titleImages.includes(
          item.basename
        )
    );

  const coverBasename =
    data.link_image ||
    contentBasenames[0];

  if (!coverBasename) {
    console.warn(
      `  ! ${title}: no usable ` +
      'cover image — skipping page/tile.'
    );

    return null;
  }

  return {
    title,
    slug,
    data,
    body: content.trim(),
    titleImages,
    galleryMedia,
    imageWebPath,
    videoWebPath,
    coverBasename,
    href:
      `project-${slug}.html`,
  };
}

function renderProjectPage(
  project,
  siteName,
  template,
  projectReferences
) {
  const {
    data,
    body,
    titleImages,
    galleryMedia,
    imageWebPath,
    videoWebPath,
    title,
  } = project;

  const year =
    data.year ?? '';

  const subtitle =
    data.subtitle || '';

  const descriptionParagraphs =
    splitParagraphs(body);

  const factRows =
    buildFactRows(data);

  const informationColumnCount =
    Number(
      descriptionParagraphs.length > 0
    ) +
    Number(
      factRows.length > 0
    );

  let html = template;

  html = resolveIf(
    html,
    'TITLE_IMAGE_SINGLE',
    titleImages.length === 1
  );

  html = resolveIf(
    html,
    'TITLE_IMAGE_PAIR',
    titleImages.length >= 2
  );

  html = resolveIf(
    html,
    'CLIENT',
    Boolean(data.client)
  );

  html = resolveIf(
    html,
    'YEAR',
    Boolean(year)
  );

  html = resolveIf(
    html,
    'DESCRIPTION',
    descriptionParagraphs.length > 0
  );

  html = resolveIf(
    html,
    'FACTS',
    factRows.length > 0
  );

  html = resolveEach(
    html,
    'TITLE_IMAGE',
    titleImages.length >= 2
      ? titleImages
      : [],
    (
      itemTemplate,
      basename
    ) => {
      const {
        src,
        srcset,
      } =
        imageWebPath(basename);

      return itemTemplate
        .split(
          '{{TITLE_IMAGE_SRC}}'
        )
        .join(src)
        .split(
          '{{TITLE_IMAGE_SRCSET}}'
        )
        .join(srcset);
    }
  );

  html = resolveEach(
    html,
    'DESCRIPTION_PARAGRAPH',
    descriptionParagraphs,
    (
      itemTemplate,
      paragraph
    ) =>
      itemTemplate
        .split(
          '{{PARAGRAPH_TEXT}}'
        )
        .join(
          renderDescriptionText(
            paragraph,
            projectReferences
          )
        )
  );

  html = resolveEach(
    html,
    'FACT',
    factRows,
    (
      itemTemplate,
      [label, value]
    ) =>
      itemTemplate
        .split(
          '{{FACT_LABEL}}'
        )
        .join(
          escapeHtml(label)
        )
        .split(
          '{{FACT_VALUE}}'
        )
        .join(
          escapeHtml(value)
        )
  );

  html = resolveEach(
    html,
    'GALLERY_MEDIA',
    galleryMedia,
    (
      itemTemplate,
      item
    ) => {
      let mediaHtml =
        resolveIf(
          itemTemplate,
          'GALLERY_IMAGE_ITEM',
          item.type === 'image'
        );

      mediaHtml =
        resolveIf(
          mediaHtml,
          'GALLERY_VIDEO_ITEM',
          item.type === 'video'
        );

      if (
        item.type === 'video'
      ) {
        return mediaHtml
          .split(
            '{{GALLERY_VIDEO_SRC}}'
          )
          .join(
            videoWebPath(
              item.basename
            )
          );
      }

      const {
        src,
        srcset,
      } =
        imageWebPath(
          item.basename
        );

      return mediaHtml
        .split(
          '{{GALLERY_IMAGE_SRC}}'
        )
        .join(src)
        .split(
          '{{GALLERY_IMAGE_SRCSET}}'
        )
        .join(srcset);
    }
  );

  const singleTitleImage =
    titleImages.length === 1
      ? imageWebPath(
          titleImages[0]
        )
      : {
          src: '',
          srcset: '',
        };

  html = fillTokens(
    html,
    {
      TITLE:
        escapeHtml(title),

      SITE_NAME:
        escapeHtml(siteName),

      SUBTITLE:
        escapeHtml(subtitle),

      YEAR:
        escapeHtml(
          String(year)
        ),

      CLIENT:
        escapeHtml(
          data.client || ''
        ),

      PROJECT_COLUMNS_CLASS:
        informationColumnCount === 0
          ? ' project-columns--empty'
          : informationColumnCount === 1
            ? ' project-columns--single'
            : '',

      TITLE_IMAGE_SRC:
        singleTitleImage.src,

      TITLE_IMAGE_SRCSET:
        singleTitleImage.srcset,
    }
  );

  return stripComments(html);
}

function buildSplashImages(projects) {
  const groups =
    projects.map(
      (project) => {
        const candidates = [
          project.coverBasename,
          ...project.titleImages,
        ];

        const unique = [
          ...new Set(candidates),
        ];

        return unique.map(
          (basename) =>
            project.imageWebPath(
              basename
            )
        );
      }
    );

  const queues =
    groups.map(
      (group) =>
        [...group]
    );

  const result = [];
  let lastGroupIndex = -1;

  while (
    queues.some(
      (queue) =>
        queue.length > 0
    )
  ) {
    let picked = -1;

    for (
      let offset = 1;
      offset <= queues.length;
      offset += 1
    ) {
      const index =
        (
          lastGroupIndex +
          offset
        ) %
        queues.length;

      if (
        queues[index].length > 0
      ) {
        picked = index;
        break;
      }
    }

    if (picked === -1) {
      break;
    }

    result.push(
      queues[picked].shift()
    );

    lastGroupIndex = picked;
  }

  return result;
}

function renderIndexPage(
  projects,
  siteName,
  template,
  splashVideoSource,
  splashTextClass
) {
  const sorted = [
    ...projects,
  ].sort(
    (first, second) => {
      const firstId =
        Number(first.data.ID);

      const secondId =
        Number(second.data.ID);

      const firstHasId =
        Number.isFinite(firstId);

      const secondHasId =
        Number.isFinite(secondId);

      if (
        firstHasId &&
        secondHasId
      ) {
        return (
          firstId -
          secondId
        );
      }

      if (firstHasId) {
        return -1;
      }

      if (secondHasId) {
        return 1;
      }

      return (
        first.title.localeCompare(
          second.title
        )
      );
    }
  );

  const splashImages =
  splashVideoSource
    ? []
    : buildSplashImages(projects);

  let html =
    resolveIf(
      template,
      'SPLASH_VIDEO',
      Boolean(
        splashVideoSource
      )
    );

  html = resolveEach(
    html,
    'SPLASH_IMAGE',
    splashImages,
    (
      itemTemplate,
      image,
      index
    ) =>
      itemTemplate
        .split(
          '{{SPLASH_IMAGE_SRC}}'
        )
        .join(image.src)
        .split(
          '{{SPLASH_IMAGE_SRCSET}}'
        )
        .join(image.srcset)
        .split(
          '{{SPLASH_IMAGE_ACTIVE_CLASS}}'
        )
        .join(
          index === 0
            ? ' is-active'
            : ''
        )
  );

  html = resolveEach(
    html,
    'PROJECT',
    sorted,
    (
      itemTemplate,
      project
    ) => {
      const factSearchTerms =
        buildFactRows(
          project.data
        ).flatMap(
          ([label, value]) => [
            label,
            value,
          ]
        );

      const searchTerms = [
        project.title,
        project.data.subtitle,
        ...factSearchTerms,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const cover =
        project.imageWebPath(
          project.coverBasename
        );

      return itemTemplate
        .split(
          '{{PROJECT_HREF}}'
        )
        .join(project.href)
        .split(
          '{{PROJECT_TITLE}}'
        )
        .join(
          escapeHtml(
            project.title
          )
        )
        .split(
          '{{PROJECT_SEARCH_TERMS}}'
        )
        .join(
          escapeHtml(
            searchTerms
          )
        )
        .split(
          '{{PROJECT_COVER_SRC}}'
        )
        .join(cover.src)
        .split(
          '{{PROJECT_COVER_SRCSET}}'
        )
        .join(cover.srcset);
    }
  );

  html = fillTokens(
    html,
    {
      SITE_NAME:
        escapeHtml(siteName),

      SPLASH_VIDEO_SRC:
        escapeHtml(
          splashVideoSource
        ),

      SPLASH_TEXT_CLASS:
        splashTextClass,
    }
  );

  return stripComments(html);
}

/* --------------------------------------------------------------------------
   Main
   -------------------------------------------------------------------------- */

async function main() {
  const config = loadConfig();

  const siteName =
    config.name ||
    'Your Name';

  const projectPath =
    resolveProjectPath(config);

  const imagesPath =
    resolveImagesPath(config);

  const splashVideoSource =
    resolveSplashVideoSource(
      config.splash_screen,
      config.images_path
    );

  const splashTextClass =
    resolveSplashTextClass(
      config.splash_text
    );

  const subfolders =
    findSubfolders(projectPath);

  const projectFolders =
    subfolders.filter(
      (folder) =>
        path
          .basename(folder)
          .toLowerCase() !==
        MISCELLANEOUS_FOLDER_NAME
    );

  const markdownPaths =
    listMarkdownFiles(
      projectPath
    );

  const misplacedMarkdownPaths =
    projectFolders.flatMap(
      listMarkdownFiles
    );

  const {
    markdownByFolder,
    problems:
      markdownFolderProblems,
  } =
    validateMarkdownFolderLinks(
      markdownPaths,
      projectFolders
    );

  for (
    const misplacedPath of
    misplacedMarkdownPaths
  ) {
    markdownFolderProblems.push(
      `${path.relative(
        projectPath,
        misplacedPath
      )} -> [invalid location]: ` +
      'move this Markdown file directly ' +
      'into the project-assemblies folder'
    );
  }

  if (
    markdownFolderProblems.length > 0
  ) {
    printMarkdownFolderProblems(
      markdownFolderProblems
    );

    process.exitCode = 1;
    return;
  }

  const projectReferenceIndex =
    buildProjectReferenceIndex(
      markdownByFolder
    );

  const descriptionLinkProblems = [
    ...projectReferenceIndex.problems,

    ...validateDescriptionProjectLinks(
      projectReferenceIndex.projects,
      projectReferenceIndex.references
    ),
  ];

  if (
    descriptionLinkProblems.length > 0
  ) {
    printMarkdownFolderProblems(
      descriptionLinkProblems
    );

    process.exitCode = 1;
    return;
  }

  /*
   * Nothing above this point writes to disk.
   */
  ensureMiscellaneousInputFolder(
    projectPath
  );

  const foldersWithMedia =
    subfolders.filter(
      folderHasMedia
    );

  const videoCount =
    foldersWithMedia.reduce(
      (total, folder) =>
        total +
        listVideosInFolder(
          folder
        ).length,
      0
    );

  const canProcessVideos =
    videoCount === 0 ||
    isFfmpegAvailable();

  if (
    videoCount > 0 &&
    !canProcessVideos
  ) {
    console.warn(
      `⚠ FFmpeg is not available — ` +
      `${videoCount} video` +
      `${videoCount === 1 ? '' : 's'} found. ` +
      'Current compressed copies will be reused; ' +
      'only missing or outdated videos will be skipped.'
    );
  }

  console.log(
    `Found ${markdownPaths.length} ` +
    `top-level Markdown file` +
    `${markdownPaths.length === 1 ? '' : 's'}, ` +
    `${subfolders.length} subfolder` +
    `${subfolders.length === 1 ? '' : 's'}, ` +
    `${foldersWithMedia.length} with media ` +
    `(${videoCount} video` +
    `${videoCount === 1 ? '' : 's'}).`
  );

  const projectTemplate =
    loadTemplate(
      'project.template.html'
    );

  const indexTemplate =
    loadTemplate(
      'index.template.html'
    );

  const projects = [];

  for (
    const folder of
    foldersWithMedia
  ) {
    const folderName =
      path.basename(folder);

    const isMiscellaneous =
      folderName.toLowerCase() ===
      MISCELLANEOUS_FOLDER_NAME;

    const markdownPath =
      isMiscellaneous
        ? null
        : (
            markdownByFolder.get(
              folder
            ) ||
            null
          );

    let slug =
      slugify(folderName);

    if (markdownPath) {
      const {
        data,
      } =
        parseFrontmatter(
          fs.readFileSync(
            markdownPath,
            'utf8'
          )
        );

      if (data.title) {
        slug =
          slugify(data.title);
      }
    }

    const outputDirectory =
      ensureProjectImagesOutputFolder(
        imagesPath,
        slug
      );

    const result =
      await processProjectFolder(
        folder,
        outputDirectory,
        canProcessVideos
      );

    console.log(
      `  ✓ ${folderName} — ` +
      `${result.processedImages} image` +
      `${result.processedImages === 1 ? '' : 's'} processed, ` +
      `${result.cachedImages} cached; ` +
      `${result.processedVideos} video` +
      `${result.processedVideos === 1 ? '' : 's'} processed, ` +
      `${result.cachedVideos} cached ` +
      `→ ${path.relative(
        ROOT,
        outputDirectory
      )}`
    );

    if (
      result.skippedVideos > 0
    ) {
      console.log(
        `    (${result.skippedVideos} video` +
        `${result.skippedVideos === 1 ? '' : 's'} ` +
        'skipped — FFmpeg unavailable)'
      );
    }

    if (!markdownPath) {
      const reason =
        isMiscellaneous
          ? 'reserved miscellaneous media folder'
          : 'no top-level Markdown file links to this folder';

      console.log(
        `    (${reason} — ` +
        'media processed, no page/tile generated)'
      );

      continue;
    }

    const imageWebPath =
      makeImageResolver(
        config.images_path,
        slug,
        result.widthsByBasename
      );

    const videoWebPath =
      makeVideoResolver(
        config.images_path,
        slug
      );

    const project =
      buildProjectPageData({
        mdPath: markdownPath,
        projectDir: folder,
        slug,
        imageWebPath,
        videoWebPath,
        processedVideoBasenames:
          result.processedVideoBasenames,
      });

    if (!project) {
      continue;
    }

    const pageHtml =
      renderProjectPage(
        project,
        siteName,
        projectTemplate,
        projectReferenceIndex.references
      );

    fs.writeFileSync(
      path.join(
        ROOT,
        project.href
      ),
      pageHtml,
      'utf8'
    );

    console.log(
      `    → ${project.href}`
    );

    projects.push(project);
  }

  const indexHtml =
    renderIndexPage(
      projects,
      siteName,
      indexTemplate,
      splashVideoSource,
      splashTextClass
    );

  fs.writeFileSync(
    path.join(
      ROOT,
      'index.html'
    ),
    indexHtml,
    'utf8'
  );

  console.log(
    `Wrote index.html with ` +
    `${projects.length} tile` +
    `${projects.length === 1 ? '' : 's'}.`
  );
}

main().catch((error) => {
  console.error(
    'Generator failed:',
    error.message
  );

  process.exit(1);
});