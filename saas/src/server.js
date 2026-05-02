import http from 'node:http';
import { createJobStore } from './job-store.js';
import { createJob, getJob } from './jobs.js';
import { runConversionJob } from './conversion-worker.js';

export function createServer({ store = createJobStore(), autoRun = true } = {}) {
  return http.createServer(async (request, response) => {
    try {
      if (request.method === 'POST' && request.url === '/jobs') {
        const body = await readJson(request);
        const job = createJob(store, body);

        if (autoRun) {
          runConversionJob(store, job);
        }

        return sendJson(response, 202, publicJob(job));
      }

      const match = request.url.match(/^\/jobs\/([^/?]+)/);
      if (request.method === 'GET' && match) {
        return sendJson(response, 200, publicJob(getJob(store, match[1])));
      }

      return sendJson(response, 404, { error: 'not found' });
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  });
}

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    creditEstimate: job.creditEstimate,
    creditActual: job.creditActual,
    pages: job.pages,
    errors: job.errors,
    warnings: job.warnings,
    artifacts: job.artifacts
  };
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

if (process.argv[1] && process.argv[1].endsWith('/server.js')) {
  const port = Number(process.env.PORT || 4317);
  createServer().listen(port, () => {
    console.log(`AI Design conversion API listening on http://localhost:${port}`);
  });
}
