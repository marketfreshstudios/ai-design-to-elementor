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
