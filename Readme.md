Andrei Smolik — Portfolio Website

A static portfolio website for Andrei Smolik’s work across public art, architecture, computational design, and digital fabrication.

The site uses plain HTML, CSS, and JavaScript with a small Node.js generator. The generator reads project descriptions from Markdown, processes source images and videos, and produces the homepage and individual project pages.

If you are returning to the project after some time, start with How it fits together. If you only need to add or update a project, go directly to Adding a project.

Quick start

Install dependencies the first time:

npm install

Generate the website:

npm run generate

Preview index.html through a local web server. Do not open it by double-clicking the file, because navigation loaded with fetch() will not work reliably over file://.

With the VS Code Live Server extension, right-click index.html and select Open with Live Server.

How it fits together

The project contains source files that you edit and generated files that the script replaces.

Area

Source — edit these

Generated — do not hand-edit

Project content

Top-level .md files and media folders inside project-assemblies/

project-<slug>.html

Homepage

build/templates/index.template.html

index.html

Project-page structure

build/templates/project.template.html

project-<slug>.html

Images

Original media in project-assemblies/<media-folder>/

images/<slug>/*.webp

Videos

Original media in project-assemblies/<media-folder>/

images/<slug>/*.mp4

Styling

style.css

Not generated

Browser behaviour

include-partials.js and related scripts

Not generated

Shared navigation

nav.html

Not generated

Configuration

site.ini

Not generated

The most important rule is:

Do not edit index.html or project-*.html directly. Those files are regenerated and your changes will be lost.

Make structural changes in build/templates/, visual changes in style.css, and content changes in the Markdown files.

Repository structure

build/
  generate.js                Website and media generator
  templates/
    index.template.html      Homepage template
    project.template.html    Project-page template

images/                      Generated web-ready media; committed
project-assemblies/          Local Markdown and source media; ignored by Git

index.html                   Generated homepage
project-*.html               Generated project pages
include-partials.js          Runtime navigation and page behaviour
nav.html                     Shared navigation markup
style.css                    Website styling
site.ini                     Generator and site configuration
package.json                 Node dependencies and commands

What the generator does

Running npm run generate executes build/generate.js.

1. Preflight validation

Before changing generated files, the generator checks the Markdown-to-folder mappings and marked cross-project links.

Generation stops with a list of exact mismatches if any of these problems exist:

A top-level Markdown file has no media_folder field.

media_folder is blank or is written as a list.

The named media folder does not exist.

The folder match is ambiguous.

More than one Markdown file points to the same media folder.

A matched folder contains no supported media.

A Markdown file is incorrectly placed inside a media folder.

Two project titles produce the same output page filename.

A marked cross-project link is missing, malformed, ambiguous, or points back to the same project.

If any of these checks fails, the generator reports:

No files were changed.

A media folder without a linked Markdown file is allowed. Its media is processed, but it does not produce a page or homepage tile.

2. Media processing

Source images are:

Automatically rotated according to their EXIF orientation.

Resized into responsive widths up to 1800 pixels.

Converted to WebP at quality 82.

Reused from the cache when the generated files are current.

Supported image types are JPEG, PNG, WebP, TIFF, and TIF.

Videos are converted to web-ready H.264 MP4 files, scaled to a maximum width of 1920 pixels. FFmpeg must be installed to create or update video outputs. If FFmpeg is unavailable, current cached copies are retained and only missing or outdated videos are skipped.

Generated media is written to:

images/<project-slug>/

3. Page generation

For every valid Markdown/media-folder pair, the generator:

Builds project-<slug>.html from project.template.html.

Adds a project tile to index.html.

Builds the project search terms from its title, subtitle, and displayed facts.

Adds project cover and title images to the homepage splash rotation.

The project slug comes from title. For example:

The Exchange → the-exchange → project-the-exchange.html

Homepage tiles are ordered by numeric ID from lowest to highest. Projects without a numeric ID follow in title order.

Adding a project

All project Markdown files live directly inside project-assemblies/. They can have descriptive filenames and do not need to be called project.md.

Create a media folder inside project-assemblies/.

Put that project’s original images and videos directly inside the media folder.

Create a named Markdown file directly inside project-assemblies/, not inside the media folder.

Add a media_folder field that points to the folder created in step 1.

Run npm run generate.

Example layout:

project-assemblies/
  digitalFUTURES.md
  the-exchange.md

  digitalFUTURES/
    IMG_3200-2.jpg
    IMG_3200-3.jpg

  the exchange/
    _MG_1457.jpg
    _MG_1478.jpg

Media-folder matching

The media_folder field is required, but matching is intentionally flexible.

The generator:

Ignores capitalization.

Treats spaces, underscores, hyphens, and other non-alphanumeric separators as equivalent.

Prefers a case-insensitive exact folder-name match before normalized matching.

Rejects ambiguous matches instead of guessing.

These values can match the same folder:

media_folder: digitalFUTURES
media_folder: Digital Futures
media_folder: digital-futures
media_folder: digital_futures

If normalization would match more than one folder, generation stops and prints all conflicting names.

Markdown frontmatter

A typical project file looks like this:

---
title: "The Exchange"
subtitle: "Senior High School, Carine"
ID: 3
media_folder: "the exchange"
link_image: "_MG_1457"
title_images:
  - "_MG_1478"
  - "_MG_1508"
excluded images:
  - "_MG_1486"
design:
  - "Daniel Giuffre"
  - "Andrei Smolik"
year: 2023
client: "Department of Education"
architect: "T&Z Architects"
fabricator: "Kilmore Group"
contractor: "PS Structures"
budget: "$220,000"
size: "7.4m × 8m × 2.8m"
---

Inspired by objects undergoing transformation, symbolic of the learning process.

Reserved fields

Field

Required?

Purpose

title

Recommended

Page title, homepage label, and generated slug. The media-folder name is the fallback.

subtitle

No

Subtitle or location shown beside the title.

ID

No

Homepage ordering. Numeric IDs are sorted from lowest to highest.

media_folder

Yes

Links the Markdown file to one media folder.

link_image

Recommended

Image used for the homepage tile. Falls back to the first usable image.

title_images

No

One image creates a full-width title image; two or more create the paired title layout.

excluded images

No

Prevents listed media from appearing in the project gallery. The files are still processed.

excluded_images is also recognized because frontmatter keys are normalized for internal matching.

Project facts

Every other non-empty frontmatter field becomes a project fact in the order written. The generator does not convert one field into another or apply aliases.

For example:

year: 2024

renders as Year, while:

year_completed: 2024

renders as Year completed.

Custom fields and lists are supported:

instructors:
  - "Andrei Smolik"
  - "Teng-Wen Chang"
students:
  - "Student One"
  - "Student Two"

Lines whose first non-space character is # are treated as comments and do not appear on generated pages:

# contractor: "Not displayed"

Description text

Text after the closing --- is the project description. Blank lines create separate paragraphs.

To link description text to another generated project, use:

[[visible link text|target project]]

Example:

This work continues research developed for the [[Curtin pavilion|Timber Plate Pavilion]].

The target can be any one of these identifiers for the destination project:

Markdown filename, with or without .md

Project title

Media-folder name

Generated slug

The generator validates every marked link before writing anything.

Miscellaneous media

Use this reserved folder for website media that does not belong to a project:

project-assemblies/miscellaneous/

Its media is processed normally, but it never creates a project page or tile. A bare splash_screen filename in site.ini refers to the compressed MP4 generated from this folder.

site.ini

Example:

name=Andrei Smolik
email=you@example.com
project_path=project-assemblies
images_path=images

Optional splash settings:

splash_screen=opening-video.mov
splash_text=black

Key

Purpose

name

Site name used by the generator and navigation.

email

Contact email used by the browser navigation script.

project_path

Location of top-level Markdown files and media folders. Must remain inside the site root.

images_path

Location for generated WebP and MP4 files.

splash_screen

Optional splash video filename, relative path, absolute path, or URL.

splash_text

Use black for the black splash-text variation; other values use the default.

Lines beginning with ; or # are comments.

Template system

The templates use three simple marker types without a separate templating library:

{{TOKEN}} — inserts one value.

<!-- IF:NAME --> ... <!-- END:NAME --> — keeps a block when its condition is true.

<!-- EACH:NAME --> ... <!-- END:NAME --> — repeats a block for every item.

Markers are resolved in this order: IF, then EACH, then token substitution.

Avoid placing literal marker examples inside explanatory HTML comments in the templates. HTML comments cannot be nested, so an inner --> closes the outer comment and can leak documentation into the generated page.

Runtime behaviour

include-partials.js handles browser-side behaviour, including:

Loading nav.html into each page.

Unlocking and transitioning away from the homepage splash screen.

Internal page transitions.

Homepage project search.

Scroll-triggered fade-ins.

Synchronizing the measured navigation height with the --nav-height CSS variable.

If the page-transition duration changes, keep the JavaScript delay synchronized with the matching transition duration in style.css.

Animations respect the visitor’s prefers-reduced-motion setting.

Publishing with GitHub Pages

The live website is published directly from this repository. There is no separate upload step.

Configure the repository under Settings → Pages:

Source: Deploy from a branch

Branch: main

Folder: /(root)

To publish an update:

npm run generate
git add .
git commit -m "Update portfolio"
git push

GitHub Pages publishes the generated files after the push completes.

What is excluded from Git

The complete project-assemblies/ directory is intentionally excluded. It contains Markdown source and original high-resolution media that the live website does not need.

The generated images/ directory and generated HTML pages must remain committed because GitHub Pages serves them directly.

Typical exclusions include:

project-assemblies/
node_modules/
.DS_Store
images/**/.image-pipeline-revision

Because project-assemblies/ is local-only, cloning the repository on another computer provides the published website but not all source material required to regenerate it. Keep project-assemblies/ backed up separately.

Troubleshooting

Generation stops with an exact Markdown/folder mismatch

Read every item in the warning. The generator reports all preflight problems together and does not change generated files. Correct the media_folder fields or folder names, then run the generator again.

Input file contains unsupported image format

The named file may have the wrong extension, be incomplete, or contain unsupported/corrupt data. Open it in an image editor and export it again as a genuine JPEG or PNG, then rerun generation.

A portrait image is rotated 90 degrees

The current image pipeline applies EXIF orientation before WebP conversion. Run the generator again so older cached outputs are rebuilt under the current image-pipeline revision.

A project description or page does not update

Check that generation reached that project. A media-processing error earlier in the run can stop the script before later project pages are rewritten.

Search the generated page directly:

grep -n "distinctive text from the description" project-project-slug.html

Also confirm that:

The Markdown file is directly inside project-assemblies/.

Its media_folder points to the intended folder.

You ran the command from the website root.

You are viewing the correct generated file and repository copy.

Navigation does not appear locally

Serve the site over HTTP with Live Server or another local server. Shared navigation loaded through fetch() does not work reliably through file://.

Template or configuration changes do not appear

Run npm run generate again. Editing a template or site.ini does not directly update existing generated HTML.

Generated output seems unaffected by an edit

Confirm you edited the source file rather than a generated page. Structural page changes belong in build/templates/; generated pages will be overwritten.

Copyright

Website code and all project content, images, and artwork are copyright © Andrei Smolik unless otherwise stated.