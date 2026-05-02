import assert from 'node:assert/strict';
import { test } from '../../scripts/test-harness.mjs';

import { validateSiteModel } from '../src/site-model.js';

test('validateSiteModel accepts a complete full-site model', () => {
  const result = validateSiteModel({
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
          }
        ]
      }
    ]
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test('validateSiteModel rejects missing pages and malformed colors', () => {
  const result = validateSiteModel({
    title: 'Broken',
    globals: { colors: { primary: 'blue' }, fonts: {} },
    pages: []
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /at least one page/);
  assert.match(result.errors.join('\n'), /globals.colors.primary/);
});
