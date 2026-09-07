/**
 * script.js
 *
 * Renders the main index grid from data/projects.json. That manifest is
 * meant to be written by your build script (generate.js) once it exists —
 * this file doesn't care how it's produced, only that it matches the
 * shape below. Add a project → regenerate the manifest → this page
 * updates itself. Nothing in this file should ever need editing per
 * project.
 *
 * Expected shape of data/projects.json — this mirrors the frontmatter
 * fields in each project's .md file (id, title, subtitle, year_completed),
 * plus a couple of fields the generator derives rather than copies:
 * [
 *   {
 *     "id": 1,                        // from frontmatter `ID` — the real catalogue number
 *     "slug": "kebab-case-id",        // matches the /project-assemblies/<folder>/ name
 *     "title": "The Exchange",        // from frontmatter `title`
 *     "subtitle": "Senior High School, Carine", // from frontmatter `subtitle`
 *     "year_completed": 2023,         // from frontmatter `year_completed`
 *     "cover": "path/to/image.webp",  // DERIVED: project-assemblies/<folder>/Reduced Images/<link_image>.webp
 *     "href": "project.html?id=kebab-case-id"   // DERIVED from slug
 *   },
 *   ...
 * ]
 */

const MANIFEST_PATH = 'data/projects.json';

function catalogueNumber(id) {
  return String(id).padStart(3, '0');
}

function projectCardTemplate(project) {
  const { id, title, subtitle, year_completed, cover, href, slug } = project;

  return `
    <a class="project-card" href="${href}" aria-label="Open ${title}">
      <span class="project-card__index">No. ${catalogueNumber(id)}</span>
      <img
        class="project-card__image"
        src="${cover}"
        alt=""
        loading="lazy"
        decoding="async"
        data-slug="${slug}"
      />
      <span class="project-card__placard">
        <span class="project-card__title">${title}</span>
        <span class="project-card__meta">${subtitle ? `${subtitle} — ${year_completed}` : year_completed}</span>
      </span>
    </a>
  `;
}

function renderState(container, message) {
  container.innerHTML = `<p class="project-grid__state">${message}</p>`;
}

async function renderProjectGrid() {
  const container = document.getElementById('project-grid');
  const countEl = document.getElementById('project-count');
  if (!container) return;

  renderState(container, 'Loading works…');

  try {
    const res = await fetch(MANIFEST_PATH);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const projects = await res.json();

    if (!Array.isArray(projects) || projects.length === 0) {
      renderState(container, 'No works published yet.');
      if (countEl) countEl.textContent = '';
      return;
    }

    // Most recent first. Swap for an explicit "order" field in the
    // manifest if you'd rather control sequence by hand.
    const sorted = [...projects].sort((a, b) => b.year_completed - a.year_completed);

    container.innerHTML = sorted
      .map((project) => projectCardTemplate(project))
      .join('');

    if (countEl) {
      countEl.textContent = `${sorted.length} work${sorted.length === 1 ? '' : 's'}`;
    }
  } catch (err) {
    console.error('Failed to load project manifest:', err);
    renderState(
      container,
      'Could not load works right now. Check that data/projects.json exists.'
    );
  }
}

renderProjectGrid();

// Footer copyright year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();