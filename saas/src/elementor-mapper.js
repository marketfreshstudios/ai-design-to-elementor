import { createElementorId } from './ids.js';

export function mapSiteModelToElementorKit(model) {
  return {
    type: 'elementor-site-kit',
    version: '0.1.0',
    title: model.title,
    siteSettings: mapSiteSettings(model.globals || {}),
    templates: {
      header: mapHeaderTemplate(model.header),
      footer: mapFooterTemplate(model.footer)
    },
    pages: model.pages.map(mapPage)
  };
}

function mapSiteSettings(globals) {
  return {
    globalColors: globals.colors || {},
    globalFonts: globals.fonts || {}
  };
}

function mapHeaderTemplate(header = {}) {
  const navText = (header.navItems || []).map((item) => item.label).join(' / ');
  return {
    title: 'Site Header',
    type: 'header',
    elementorData: elementorDocument([
      container(
        {
          html_tag: 'header',
          content_width: 'boxed',
          flex_direction: 'row',
          justify_content: 'space-between',
          align_items: 'center',
          padding: linkedSpacing(24, 24, 24, 24)
        },
        [
          widget('heading', { title: header.logoText || 'Site', header_size: 'h3' }),
          widget('text-editor', { editor: navText || 'Home' })
        ]
      )
    ])
  };
}

function mapFooterTemplate(footer = {}) {
  return {
    title: 'Site Footer',
    type: 'footer',
    elementorData: elementorDocument([
      container(
        {
          html_tag: 'footer',
          content_width: 'boxed',
          padding: linkedSpacing(32, 24, 32, 24)
        },
        [widget('text-editor', { editor: footer.text || '' })]
      )
    ])
  };
}

function mapPage(page) {
  const warnings = [];
  const content = page.sections.map((section) => mapSection(section, warnings, page));

  return {
    title: page.title,
    slug: page.slug,
    sourceUrl: page.sourceUrl,
    warnings,
    elementorData: elementorDocument(content)
  };
}

function mapSection(section, warnings, page = {}) {
  if (section.type === 'hero') {
    if (section.image && section.image.url) {
      return mapSplitHero(section, page);
    }

    const children = [];

    if (section.eyebrow) {
      children.push(widget('text-editor', { editor: section.eyebrow }));
    }

    children.push(widget('heading', { title: section.heading || '', header_size: 'h1' }));
    children.push(widget('text-editor', { editor: section.body || '' }));

    if (section.cta && section.cta.label) {
      children.push(widget('button', { text: section.cta.label, link: { url: section.cta.url || '#' } }));
    }

    if (section.image && section.image.url) {
      children.push(widget('image', { image: { url: section.image.url, alt: section.image.alt || '' } }));
    }

    return container(
      {
        html_tag: 'section',
        content_width: 'boxed',
        min_height: { unit: 'vh', size: 70, sizes: [] },
        justify_content: 'center',
        padding: linkedSpacing(80, 24, 80, 24)
      },
      children
    );
  }

  if (section.type === 'features') {
    const children = [
      widget('heading', { title: section.heading || '', header_size: 'h2' }),
      ...((section.items || []).map((item) =>
        container(
          {
            html_tag: 'article',
            padding: linkedSpacing(20, 20, 20, 20)
          },
          [
            widget('heading', { title: item.title || '', header_size: 'h3' }),
            widget('text-editor', { editor: item.body || '' })
          ],
          true
        )
      ))
    ];

    return container(
      {
        html_tag: 'section',
        content_width: 'boxed',
        padding: linkedSpacing(64, 24, 64, 24)
      },
      children
    );
  }

  warnings.push(`Section type "${section.type || 'unknown'}" used custom HTML fallback.`);
  return container(
    {
      html_tag: 'section',
      content_width: 'boxed',
      padding: linkedSpacing(48, 24, 48, 24)
    },
    [widget('html', { html: section.html || '<div></div>' })]
  );
}

function mapSplitHero(section, page) {
  const textChildren = [];

  if (section.eyebrow) {
    textChildren.push(widget('text-editor', {
      editor: section.eyebrow,
      typography_typography: 'custom',
      typography_font_size: { unit: 'px', size: 14, sizes: [] },
      typography_font_weight: '600',
      text_color: '#b68b59'
    }));
  }

  textChildren.push(widget('heading', {
    title: section.heading || '',
    header_size: 'h1',
    typography_typography: 'custom',
    typography_font_size: { unit: 'px', size: 64, sizes: [] },
    typography_font_weight: '600',
    typography_line_height: { unit: 'em', size: 1.02, sizes: [] },
    title_color: '#132017'
  }));

  textChildren.push(widget('text-editor', {
    editor: section.body || '',
    text_color: '#3f4a42',
    typography_typography: 'custom',
    typography_font_size: { unit: 'px', size: 18, sizes: [] },
    typography_line_height: { unit: 'em', size: 1.6, sizes: [] }
  }));

  if (section.cta && section.cta.label) {
    textChildren.push(widget('button', {
      text: section.cta.label,
      link: { url: section.cta.url || '#' },
      background_color: '#132017',
      button_text_color: '#ffffff',
      border_radius: linkedSpacing(999, 999, 999, 999),
      text_padding: linkedSpacing(16, 26, 16, 26)
    }));
  }

  return container(
    {
      html_tag: 'section',
      content_width: 'boxed',
      min_height: { unit: 'vh', size: 78, sizes: [] },
      flex_direction: 'row',
      align_items: 'center',
      justify_content: 'space-between',
      gap: { unit: 'px', size: 48, sizes: [] },
      background_background: 'classic',
      background_color: '#f6f1ea',
      padding: linkedSpacing(88, 24, 88, 24)
    },
    [
      container(
        {
          html_tag: 'div',
          width: { unit: '%', size: 52, sizes: [] },
          justify_content: 'center',
          gap: { unit: 'px', size: 20, sizes: [] }
        },
        textChildren,
        true
      ),
      container(
        {
          html_tag: 'figure',
          width: { unit: '%', size: 44, sizes: [] },
          border_radius: linkedSpacing(8, 8, 8, 8),
          overflow: 'hidden'
        },
        [
          widget('image', {
            image: { url: section.image.url, alt: section.image.alt || page.title || '' },
            image_size: 'full',
            width: { unit: '%', size: 100, sizes: [] }
          })
        ],
        true
      )
    ]
  );
}

function elementorDocument(content) {
  return {
    version: '0.4',
    title: '',
    type: 'page',
    page_settings: [],
    content
  };
}

function container(settings, elements, isInner = false) {
  return {
    id: createElementorId(),
    elType: 'container',
    isInner,
    settings,
    elements
  };
}

function widget(widgetType, settings) {
  return {
    id: createElementorId(),
    elType: 'widget',
    widgetType,
    isInner: false,
    settings,
    elements: []
  };
}

function linkedSpacing(top, right, bottom, left) {
  return {
    unit: 'px',
    top: String(top),
    right: String(right),
    bottom: String(bottom),
    left: String(left),
    isLinked: false
  };
}
