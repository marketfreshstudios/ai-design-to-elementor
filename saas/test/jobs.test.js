import assert from 'node:assert/strict';
import { test } from '../../scripts/test-harness.mjs';

import { createJobStore } from '../src/job-store.js';
import { createJob, getJob } from '../src/jobs.js';

test('createJob stores a queued job and estimates credit usage per page', () => {
  const store = createJobStore();
  const job = createJob(store, {
    licenseKey: 'lic_test',
    callbackUrl: 'https://wp.example.com/wp-json/ai-design/v1/import',
    pages: [
      { title: 'Home', sourceUrl: 'https://design.example.com' },
      { title: 'Contact', sourceUrl: 'https://design.example.com/contact' }
    ]
  });

  assert.equal(job.status, 'queued');
  assert.equal(job.creditEstimate, 4);
  assert.equal(job.pages.length, 2);
  assert.ok(job.callbackToken.length >= 32);

  const fetched = getJob(store, job.id);
  assert.equal(fetched.id, job.id);
});

test('createJob rejects jobs without a license, callback URL, or pages', () => {
  const store = createJobStore();

  assert.throws(() => createJob(store, { pages: [] }), /licenseKey/);
  assert.throws(() => createJob(store, { licenseKey: 'lic_test', pages: [] }), /callbackUrl/);
  assert.throws(
    () => createJob(store, { licenseKey: 'lic_test', callbackUrl: 'https://wp.example.com', pages: [] }),
    /at least one page/
  );
});
