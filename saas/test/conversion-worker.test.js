import assert from 'node:assert/strict';
import { test } from '../../scripts/test-harness.mjs';

import { createJobStore } from '../src/job-store.js';
import { createJob } from '../src/jobs.js';
import { runConversionJob } from '../src/conversion-worker.js';

test('runConversionJob maps pages and posts generated artifacts to the WordPress callback', async () => {
  let received = null;
  const store = createJobStore();
  const job = createJob(store, {
    licenseKey: 'lic_test',
    callbackUrl: 'https://wp.example.com/wp-json/ai-design/v1/import',
    pages: [{ title: 'Home', sourceUrl: 'https://design.example.com' }]
  });

  const completed = await runConversionJob(
    store,
    job,
    async () => ({
      sections: [{ type: 'hero', heading: 'Imported Hero', body: 'Body copy.' }]
    }),
    async (url, payload, headers) => {
      received = { url, payload, headers };
      return { ok: true };
    }
  );

  assert.equal(completed.status, 'completed');
  assert.equal(completed.artifacts.pages[0].title, 'Home');
  assert.equal(received.url, 'https://wp.example.com/wp-json/ai-design/v1/import');
  assert.equal(received.headers['x-ai-design-token'].length, 64);
  assert.equal(received.payload.type, 'elementor-site-kit');
  assert.equal(received.payload.pages[0].elementorData.content[0].elements[0].settings.title, 'Imported Hero');
});

test('runConversionJob exposes renderer warnings on the completed job', async () => {
  const store = createJobStore();
  const job = createJob(store, {
    licenseKey: 'lic_test',
    callbackUrl: 'https://wp.example.com/wp-json/ai-design/v1/import',
    pages: [{ title: 'Home', sourceUrl: 'https://design.example.com' }]
  });

  const completed = await runConversionJob(
    store,
    job,
    async () => ({
      sections: [{ type: 'hero', heading: 'Fallback Hero', body: 'Body copy.' }],
      warnings: ['Playwright failed; used static HTML fallback.']
    }),
    async () => ({ ok: true })
  );

  assert.deepEqual(completed.warnings, ['Playwright failed; used static HTML fallback.']);
});
