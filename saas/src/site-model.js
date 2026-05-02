const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function validateSiteModel(model) {
  const errors = [];

  if (!model || typeof model !== 'object') {
    return { ok: false, errors: ['site model must be an object'] };
  }

  if (!model.title || typeof model.title !== 'string') {
    errors.push('title is required');
  }

  if (!Array.isArray(model.pages) || model.pages.length === 0) {
    errors.push('site model must include at least one page');
  }

  const colors = model.globals && model.globals.colors ? model.globals.colors : {};
  for (const [name, value] of Object.entries(colors)) {
    if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
      errors.push(`globals.colors.${name} must be a hex color`);
    }
  }

  if (Array.isArray(model.pages)) {
    model.pages.forEach((page, index) => {
      if (!page.title) {
        errors.push(`pages.${index}.title is required`);
      }
      if (!page.slug) {
        errors.push(`pages.${index}.slug is required`);
      }
      if (!page.sourceUrl) {
        errors.push(`pages.${index}.sourceUrl is required`);
      }
      if (!Array.isArray(page.sections) || page.sections.length === 0) {
        errors.push(`pages.${index}.sections must include at least one section`);
      }
    });
  }

  return { ok: errors.length === 0, errors };
}

export function normalizeJobPages(pages) {
  return pages.map((page) => ({
    title: String(page.title || '').trim(),
    slug: slugify(page.slug || page.title || 'page'),
    sourceUrl: String(page.sourceUrl || '').trim()
  }));
}

export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'page';
}
