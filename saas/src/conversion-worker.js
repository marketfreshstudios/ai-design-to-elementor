import http from 'node:http';
import https from 'node:https';
import { mapSiteModelToElementorKit } from './elementor-mapper.js';
import { renderPublicDesignUrl } from './design-capture.js';
import { slugify, validateSiteModel } from './site-model.js';
import { updateJob } from './jobs.js';

export async function runConversionJob(store, job, renderer = renderPublicDesignUrl, deliverer = deliverToWordPress) {
  updateJob(store, job.id, { status: 'running' });

  try {
    const pages = [];
    const captureWarnings = [];
    for (const page of job.pages) {
      const extracted = await renderer(page.sourceUrl);
      captureWarnings.push(...(extracted.warnings || []));
      pages.push({
        title: page.title,
        slug: page.slug || slugify(page.title),
        sourceUrl: page.sourceUrl,
        sections: extracted.sections
      });
    }

    const siteModel = {
      title: pages[0] ? pages[0].title : 'Generated Site',
      globals: {
        colors: { primary: '#111827', accent: '#2563eb' },
        fonts: { heading: 'Inter', body: 'Arial' }
      },
      header: { logoText: pages[0] ? pages[0].title : 'Generated Site', navItems: pages.map((page) => ({ label: page.title, url: `/${page.slug}/` })) },
      footer: { text: 'Generated with AI Design to Elementor' },
      pages
    };

    const validation = validateSiteModel(siteModel);
    if (!validation.ok) {
      throw new Error(validation.errors.join('; '));
    }

    const artifacts = mapSiteModelToElementorKit(siteModel);
    await deliverer(job.callbackUrl, artifacts, { 'x-ai-design-token': job.callbackToken });

    return updateJob(store, job.id, {
      status: 'completed',
      creditActual: job.creditEstimate,
      artifacts,
      warnings: [...captureWarnings, ...artifacts.pages.flatMap((page) => page.warnings)]
    });
  } catch (error) {
    return updateJob(store, job.id, {
      status: 'failed',
      errors: [error.message]
    });
  }
}

export async function deliverToWordPress(callbackUrl, payload, headers = {}) {
  const url = new URL(callbackUrl);
  const transport = url.protocol === 'https:' ? https : http;
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const request = transport.request(
      url,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
          ...headers
        }
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf8');
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ ok: true, statusCode: response.statusCode, body: responseBody });
          } else {
            reject(new Error(`WordPress callback failed with HTTP ${response.statusCode}: ${responseBody}`));
          }
        });
      }
    );

    request.on('error', reject);
    request.write(body);
    request.end();
  });
}
