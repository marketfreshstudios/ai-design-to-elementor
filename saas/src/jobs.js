import { createId, createToken } from './ids.js';
import { normalizeJobPages } from './site-model.js';

const CREDITS_PER_PAGE = 2;

export function createJob(store, input) {
  assertJobInput(input);

  const pages = normalizeJobPages(input.pages);
  const job = {
    id: createId('job'),
    status: 'queued',
    licenseKey: input.licenseKey,
    callbackUrl: input.callbackUrl,
    callbackToken: createToken(),
    pages,
    creditEstimate: pages.length * CREDITS_PER_PAGE,
    creditActual: null,
    errors: [],
    warnings: [],
    artifacts: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return store.save(job);
}

export function getJob(store, id) {
  const job = store.get(id);
  if (!job) {
    throw new Error(`job ${id} was not found`);
  }
  return job;
}

export function updateJob(store, id, patch) {
  const existing = getJob(store, id);
  return store.save({ ...existing, ...patch, updatedAt: new Date().toISOString() });
}

function assertJobInput(input) {
  if (!input || !input.licenseKey) {
    throw new Error('licenseKey is required');
  }
  if (!input.callbackUrl) {
    throw new Error('callbackUrl is required');
  }
  if (!Array.isArray(input.pages) || input.pages.length === 0) {
    throw new Error('at least one page is required');
  }
  input.pages.forEach((page, index) => {
    if (!page.title) {
      throw new Error(`pages.${index}.title is required`);
    }
    if (!page.sourceUrl) {
      throw new Error(`pages.${index}.sourceUrl is required`);
    }
  });
}
