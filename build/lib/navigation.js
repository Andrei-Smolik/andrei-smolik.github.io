// Navigation ordering is shared by all generated pages.
function orderNavigationPages(projectLabel, singlePages, links) {
  const navigationPages = [
    { label: projectLabel, href: 'index.html#projects', className: ' site-nav__link--portfolio' },
    ...singlePages.map(page => ({ label: page.slug, href: `${page.slug}.html`, className: '' })),
  ];
  navigationPages.sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
  navigationPages.push({ label: 'contact', href: '#', className: '', contact: true });
  const requestedLinks = (links || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  const availableLinks = new Map(navigationPages.map(page => [page.label.toLowerCase(), page]));
  const seenLinks = new Set();
  for (const label of requestedLinks) {
    if (!availableLinks.has(label)) {
      throw new Error(`site.ini links: unknown link "${label}". Available: ${[...availableLinks.keys()].join(', ')}.`);
    }
    if (seenLinks.has(label)) {
      throw new Error(`site.ini links: duplicate link "${label}".`);
    }
    seenLinks.add(label);
  }
  return [
    ...requestedLinks.map(label => availableLinks.get(label)),
    ...navigationPages.filter(page => !seenLinks.has(page.label.toLowerCase())),
  ];
}

function renderNavigation(template, pages, escapeHtml) {
  const links = pages.map(page => {
    const label = page.label[0].toUpperCase() + page.label.slice(1);
    const contactAttribute = page.contact ? ' data-contact-mailto' : '';
    return `      <a href="${escapeHtml(page.href)}" class="site-nav__link${page.className}"${contactAttribute}>${escapeHtml(label)}</a>`;
  });
  return template.replace('{{ASSEMBLY_LINKS}}', links.join('\n'));
}

module.exports = { orderNavigationPages, renderNavigation };
