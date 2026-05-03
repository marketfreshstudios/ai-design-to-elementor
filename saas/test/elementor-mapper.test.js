import assert from 'node:assert/strict';
import { test } from '../../scripts/test-harness.mjs';

import { mapSiteModelToElementorKit } from '../src/elementor-mapper.js';

test('mapSiteModelToElementorKit creates Elementor pages, header, footer, and globals', () => {
  const kit = mapSiteModelToElementorKit({
    title: 'Acme Studio',
    globals: {
      colors: { primary: '#123456', accent: '#ffcc00' },
      fonts: { heading: 'Inter', body: 'Arial' }
    },
    header: { logoText: 'Acme', navItems: [{ label: 'Home', url: '/' }] },
    footer: { text: 'Copyright Acme' },
    pages: [
      {
        title: 'Home',
        slug: 'home',
        sourceUrl: 'https://example.com',
        sections: [
          {
            type: 'hero',
            heading: 'Launch faster',
            body: 'AI generated Elementor pages.',
            cta: { label: 'Start', url: '/contact' }
          },
          {
            type: 'features',
            heading: 'What you get',
            items: [
              { title: 'Editable', body: 'Uses Elementor widgets.' },
              { title: 'Fast', body: 'Imports as pages.' }
            ]
          }
        ]
      }
    ]
  });

  assert.equal(kit.type, 'elementor-site-kit');
  assert.equal(kit.pages.length, 1);
  assert.equal(kit.templates.header.title, 'Site Header');
  assert.equal(kit.templates.footer.title, 'Site Footer');
  assert.equal(kit.siteSettings.globalColors.primary, '#123456');

  const page = kit.pages[0];
  assert.equal(page.elementorData.content[0].elType, 'container');
  assert.equal(page.elementorData.content[0].elements[0].widgetType, 'heading');
  assert.equal(page.elementorData.content[0].elements[2].widgetType, 'button');
  assert.equal(page.warnings.length, 0);
});

test('mapSiteModelToElementorKit uses html fallback and warns for unknown section types', () => {
  const kit = mapSiteModelToElementorKit({
    title: 'Fallback Site',
    globals: { colors: {}, fonts: {} },
    pages: [
      {
        title: 'Home',
        slug: 'home',
        sourceUrl: 'https://example.com',
        sections: [{ type: 'canvas', html: '<div class="wild">Custom</div>' }]
      }
    ]
  });

  const fallbackWidget = kit.pages[0].elementorData.content[0].elements[0];
  assert.equal(fallbackWidget.widgetType, 'html');
  assert.match(kit.pages[0].warnings[0], /custom HTML fallback/);
});

test('mapSiteModelToElementorKit maps captured hero eyebrow and image widgets', () => {
  const kit = mapSiteModelToElementorKit({
    title: 'Design Site',
    globals: { colors: {}, fonts: {} },
    pages: [
      {
        title: 'Home',
        slug: 'home',
        sourceUrl: 'https://example.com',
        sections: [
          {
            type: 'hero',
            eyebrow: 'Custom Homes',
            heading: 'Warm modern interiors',
            body: 'Layered materials and calm spaces.',
            image: { url: 'https://example.com/living-room.jpg', alt: 'Living room' }
          }
        ]
      }
    ]
  });

  const heroColumns = kit.pages[0].elementorData.content[0].elements;
  const textWidgets = heroColumns[0].elements;
  const imageWidget = heroColumns[1].elements[0];
  assert.equal(textWidgets[0].widgetType, 'text-editor');
  assert.equal(textWidgets[0].settings.editor, 'Custom Homes');
  assert.equal(imageWidget.widgetType, 'image');
  assert.equal(imageWidget.settings.image.url, 'https://example.com/living-room.jpg');
  assert.equal(imageWidget.settings.image.alt, 'Living room');
});

test('mapSiteModelToElementorKit uses a split visual hero layout when an image is captured', () => {
  const kit = mapSiteModelToElementorKit({
    title: 'Design Site',
    globals: { colors: { primary: '#132017', accent: '#b68b59' }, fonts: {} },
    pages: [
      {
        title: 'Home',
        slug: 'home',
        sourceUrl: 'https://example.com',
        sections: [
          {
            type: 'hero',
            heading: 'Where Intuition Meets Precision.',
            body: 'We build spaces that breathe.',
            cta: { label: 'Explore Our Work', url: '#work' },
            image: { url: 'https://example.com/hero.png', alt: 'Custom home exterior' }
          }
        ]
      }
    ]
  });

  const hero = kit.pages[0].elementorData.content[0];
  assert.equal(hero.settings.flex_direction, 'row');
  assert.equal(hero.settings.gap.size, 48);
  assert.equal(hero.settings.background_background, 'classic');
  assert.equal(hero.elements.length, 2);
  assert.equal(hero.elements[0].elType, 'container');
  assert.equal(hero.elements[1].settings.width.size, 44);
  assert.equal(hero.elements[1].elements[0].widgetType, 'image');
  assert.equal(hero.elements[1].elements[0].settings.image_size, 'full');
});
