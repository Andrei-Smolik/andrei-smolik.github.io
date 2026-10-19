# Andrei Smolik — Portfolio

A static portfolio for public art, architecture, computational design, and digital fabrication. Plain HTML, CSS, and browser JavaScript are generated from local Markdown and media; there is no client framework or bundler.

## Commands

```sh
npm install
npm run generate
npm run check
```

- `generate`: validate content, process changed media, and regenerate HTML/navigation.
- `check`: JavaScript syntax checks, unit/integration tests, and scroll regression tests.
- `test`: the complete automated test suite.
- `test:scroll`: native scroll ownership, footer, and scroll-button regressions only.

Serve the root over HTTP to preview it (the current local preview uses port 4173). Opening HTML through `file://` does not support the navigation/configuration fetches reliably. Node.js with the built-in test runner and the installed Sharp dependency is required. FFmpeg is required only to create/update compressed videos.

## Source and generated files

| Area | Source | Generated output |
| --- | --- | --- |
| Project collection | `site.ini` → `project_path` (currently `projects-assemblies/`) | `project-<slug>.html`, homepage tiles |
| Standalone pages | Root `<name>-assemblies/` folders | `<name>.html` |
| Shared media | Root `miscellaneous/` | `images/miscellaneous/` |
| Page structure | `build/templates/*.template.html` | Homepage, project, About, navigation HTML |
| Styling | `style.css` | Used directly |
| Browser behaviour | `include-partials.js` | Used directly |
| Configuration | `site.ini` | Used by the generator and browser |

Never hand-edit generated HTML. Change templates/generator code, then run `npm run generate`.

Assembly folders are read-only to the generator. In particular, never modify `project-assemblies/` or `projects-assemblies/` programmatically. The owner maintains their Markdown and original media. Keep source folders backed up separately: the project collection is ignored by Git and is not restored by cloning the published repository.

## Architecture

```text
build/
  generate.js                 Build orchestration, media pipeline, page rendering
  lib/
    config.js                 INI parsing and safe filesystem boundaries
    frontmatter.js            Markdown metadata parsing and normalization
    navigation.js             Navbar ordering and markup
  templates/
    index.template.html
    project.template.html
    nav.template.html
  tests/                      Node unit tests and isolated generator fixtures
  test-column-bounce.js       Native-scroll regression checks
include-partials.js           Browser interactions and startup
style.css                     Responsive layout, appearance, transitions
site.ini                      Content paths, version, navigation, splash settings
```

The generator can be imported by tests without running a build. Browser functions also expose a CommonJS test interface; normal pages still load the same plain script, without an additional runtime dependency.

## Generation workflow

1. Resolve configuration paths and discover Markdown/media.
2. Validate folder mappings, standalone page title images, project-link references, output filename collisions, and navbar ordering.
3. Reject image-output paths outside the site or overlapping any source folder.
4. Generate navigation, calculate a content-based cache version, process media, and render pages.

Preflight failures leave generated files untouched. A later media-processing failure can still leave partial build output; correct the reported media and rerun generation before publishing.

Project Markdown lives directly in the configured collection directory. Original images/videos live in its immediate project subfolders. Each Markdown file must provide one nonempty `media_folder` value. Matching prefers a case-insensitive exact name, then normalized names; ambiguous matches and multiple Markdown files pointing to the same folder are rejected. A folder with media but no Markdown may be processed without creating a page/tile.

Homepage tiles sort by numeric `ID`, followed by unnumbered projects in title order. IDs retain their existing optional ordering behaviour.

## Project Markdown

```md
---
title: "The Exchange"
subtitle: "Senior High School, Carine"
ID: 3
media_folder: "the exchange"
link_image: "_MG_1457"
title_images:
  - "_MG_1478"
excluded images:
  - "_MG_1486"
design:
  - "Andrei Smolik"
  - "Daniel Giuffre"
year_completed: 2023
client: "Department of Education"
---

Description paragraphs are separated by blank lines.
```

This is a small frontmatter parser, not a complete YAML implementation. It supports quoted/unquoted scalar values, numbers, indented lists, and comment lines beginning with `#`.

- `title`: page title and slug; the media-folder name is the fallback.
- `subtitle`: subheading; `year` or, if absent, `year_completed` supplies its year.
- `media_folder`: required project-media folder mapping.
- `link_image`: tile image basename; falls back to the first usable image.
- `title_images`: opening image basename(s), without extensions.
- `excluded images` / `excluded_images`: media excluded from the displayed gallery.
- Other nonempty fields become project facts in their original order. Lists are joined with commas.

Descriptions support cross-project links:

```text
[[visible text|target project]]
```

The target can be a project's Markdown filename, title, media-folder name, or slug. Missing, malformed, ambiguous, and self-referencing links fail validation.

## About and other assembly pages

Root folders named `<name>-assemblies` generate a single page using the project template and add a navbar link. Each contains exactly one Markdown file with a title and valid `title_images`. The About portrait lives in `about-assemblies/`.

Standalone pages do not require a project ID or media-folder field and do not appear as portfolio tiles. Local media goes to `images/page-<name>/`. If an assembly has no local media, the generator uses root `miscellaneous/` without adding every shared asset to that page's gallery.

See [assembly details](build/ASSEMBLIES.md) for naming and validation rules.

## Configuration

```ini
name=Andrei Smolik
email=you@example.com
version=0.5.3
project_path=projects-assemblies
images_path=images
links=projects,about
splash_screen=opening-video.mov
splash_text=black
```

- `links` specifies navbar order, comma-separated and case-insensitive. Unspecified assembly links follow alphabetically; unspecified Contact is last. Unknown/duplicate names stop the build.
- `project_path` and `images_path` must remain within the site. Output cannot overlap source directories.
- A bare `splash_screen` filename refers to the MP4 generated from root `miscellaneous/`. Paths and URLs are also supported.
- `splash_text=black` selects the black splash-text variation.
- Lines starting with `;` or `#` are comments.

## Media pipeline

Images are EXIF-rotated, converted to WebP (quality 82), and resized to responsive widths up to 1800 pixels without enlargement. Intrinsic width/height attributes reserve layout space before loading. Supported formats: JPEG, PNG, WebP, TIFF/TIF.

Videos are converted to H.264 MP4, maximum width 1920 pixels, with fast-start metadata. If FFmpeg is unavailable, current cached files are retained; missing/outdated outputs are skipped. Browser videos are muted, inline, looping, and control-free; browser/device autoplay restrictions can still apply.

Current generated media is reused based on source/output timestamps and the image-pipeline revision marker.

## Runtime and layout

- Desktop project pages (1000px and wider) have independent native text/media scrollports. Mobile uses the image-first stacked layout.
- Native browser momentum and overscroll are retained. Do not reintroduce wheel interception or synthetic spring transforms. Navbar/footer remain outside elastic movement.
- The splash temporarily consumes its opening scroll gesture, then removes its blocking listeners.
- Text overflow has a bottom fade, hover scrollbar, mouse drag, and a down/up arrow. The media arrow scrolls only media on desktop.
- Search filtering hides whole tile items; pointer closing does not transfer sticky focus to the magnifier. Keyboard closing returns focus.
- Current navbar links are disabled and faded. Search appears only on the portfolio.
- First-screen content shares one entrance fade. Later content uses IntersectionObserver. Reduced-motion overrides are in CSS.
- The exit transition delay in JavaScript must remain synchronized with the matching 0.7s CSS transition.

Navbar spacing controls live in `style.css`: `--nav-content-gap`, `--nav-outer-gap`, and `--nav-name-links-gap`.

## Testing

Automated tests cover parsing, navigation order, escaping/templates, responsive image data, search focus/filtering, selected links, dragging, autoplay fallback, and scrolling/chrome ownership. Integration tests run complete builds and preflight failures in temporary fixtures, never in the real source folders. They also check EXIF orientation, cached output, and source preservation.

Before handing off changes, regenerate and check desktop/mobile in a browser, especially:

- Splash opening by click and scroll.
- Search open/close, Escape, and empty results.
- Text/media scrolling at both ends, their arrows, and mouse text dragging.
- Navbar/footer alignment, current links, image-first mobile order, and About.
- Page entrance/exit transitions and browser console errors.

Automated wheel tests cannot establish the subjective feel of a physical trackpad; compare native bounce in Safari manually when changing scrolling.

## Preview and publishing

Changes stay local unless deployment is explicitly requested. Open a new tab in the existing Safari window for each completed preview, so previous tabs remain available for comparison.

GitHub Pages serves generated HTML/media from the repository's `main` branch, root folder. Only push to `main` when explicitly authorized; preserve requested releases with versioned commits/tags. Do not stage all files blindly: local source assets and unrelated user changes may be present.

## Troubleshooting

- **Validation fails:** use the exact Markdown/folder/link reported. Do not work around it by editing generated HTML.
- **Changed content is missing:** check the correct source path, run generation, and verify it completed.
- **Navigation is missing:** use an HTTP preview, not `file://`.
- **A corrupt image stops processing:** the owner should re-export that source as a supported format, then regenerate.
- **Templates/CSS appear stale:** regenerate to update the content-based asset cache version and reload the preview.
- **A build fails after media processing starts:** fix the failure and rerun fully before publishing.

Website code, content, images, and artwork are copyright © Andrei Smolik unless otherwise stated.
