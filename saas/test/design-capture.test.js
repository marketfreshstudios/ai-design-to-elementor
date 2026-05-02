import assert from 'node:assert/strict';
import { test } from '../../scripts/test-harness.mjs';

import { extractDesignFromHtml, renderPublicDesignUrl } from '../src/design-capture.js';

test('extractDesignFromHtml turns page hero content into an editable hero section', () => {
  const result = extractDesignFromHtml('https://example.com', `
    <!doctype html>
    <html>
      <head>
        <title>Lifestyle Design Homes</title>
        <style>
          body { font-family: Inter, sans-serif; color: #172033; }
          .hero { background: #f4efe7; }
        </style>
      </head>
      <body>
        <nav><a href="/about">About</a><a href="/contact">Contact</a></nav>
        <main>
          <section class="hero">
            <p>Custom Homes and Renovations</p>
            <h1>Design-led homes built around your life</h1>
            <p>We create refined interiors, additions, and new homes for modern living.</p>
            <a href="/contact">Book a consultation</a>
          </section>
        </main>
      </body>
    </html>
  `);

  assert.equal(result.sections[0].type, 'hero');
  assert.equal(result.sections[0].eyebrow, 'Custom Homes and Renovations');
  assert.equal(result.sections[0].heading, 'Design-led homes built around your life');
  assert.equal(result.sections[0].body, 'We create refined interiors, additions, and new homes for modern living.');
  assert.deepEqual(result.sections[0].cta, { label: 'Book a consultation', url: '/contact' });
  assert.equal(result.assets.length, 0);
});

test('extractDesignFromHtml captures hero image assets when present', () => {
  const result = extractDesignFromHtml('https://example.com/design/', `
    <main>
      <section>
        <h1>Warm modern interiors</h1>
        <p>Layered materials and calm spaces.</p>
        <img src="/images/living-room.jpg" alt="Living room with vaulted ceiling">
      </section>
    </main>
  `);

  assert.equal(result.sections[0].image.url, 'https://example.com/images/living-room.jpg');
  assert.equal(result.sections[0].image.alt, 'Living room with vaulted ceiling');
  assert.deepEqual(result.assets, [
    { type: 'image', url: 'https://example.com/images/living-room.jpg', alt: 'Living room with vaulted ceiling' }
  ]);
});

test('renderPublicDesignUrl uses provided page content renderer before falling back to hostname copy', async () => {
  const result = await renderPublicDesignUrl('https://example.com/mockup', async () => ({
    html: '<main><h1>Real captured headline</h1><p>Captured body copy.</p></main>',
    screenshot: null
  }));

  assert.equal(result.sections[0].heading, 'Real captured headline');
  assert.equal(result.sections[0].body, 'Captured body copy.');
});
