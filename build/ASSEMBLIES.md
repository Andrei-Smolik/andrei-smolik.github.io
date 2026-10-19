# Assembly pages

Run `npm run generate` after editing content. Assembly source folders are read-only to the generator.

The configured `project_path` retains the existing project collection, ID validation, and grid. Its navigation label is the folder's first hyphen-separated word (currently Projects). Set `links=projects,about` in `site.ini` to order navigation links. Names are comma-separated and case-insensitive; `contact` may also be included. Unlisted assembly links follow alphabetically, with unlisted Contact last. Without `links`, assembly links are alphabetical and Contact is last. Unknown or duplicate names stop generation before output is written.

Other root folders named `<name>-assemblies` (letters/digits in the name, starting with a letter) generate `<name>.html` and a navigation link named `<Name>`. Each must contain exactly one Markdown file. Media may live directly in that folder; when it has no media, the generator uses the root `miscellaneous/` folder. `index`, `nav`, and `contact` are reserved names.

Required frontmatter: `title` and a nonempty `title_images` list. Image entries are filenames without extensions, as on project pages. Missing title images stop generation before output is written. Optional fields and body text use the same renderer and responsive layout as projects. Standalone pages do not require a project ID or media_folder and do not appear in the portfolio grid.

Local assembly media goes to `images/page-<name>/`; the About portrait lives in `about-assemblies/` and generates into `images/page-about/`. Shared source media (including the splash video) lives in root `miscellaneous/` and is generated into `images/miscellaneous/`. Shared media is not automatically added to a standalone page's gallery. Navigation comes from `build/templates/nav.template.html`. Edit templates or the generator, not generated HTML.
