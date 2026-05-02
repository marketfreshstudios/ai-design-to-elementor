import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from '../../scripts/test-harness.mjs';

test('render blueprint deploys the Node API on the free web service plan', () => {
  const blueprint = readFileSync('render.yaml', 'utf8');

  assert.match(blueprint, /type:\s+web/);
  assert.match(blueprint, /runtime:\s+node/);
  assert.match(blueprint, /plan:\s+free/);
  assert.match(blueprint, /PLAYWRIGHT_BROWSERS_PATH/);
  assert.match(blueprint, /\.cache\/ms-playwright/);
  assert.match(blueprint, /npx playwright install chromium/);
  assert.match(blueprint, /startCommand:\s+npm start/);
  assert.match(blueprint, /healthCheckPath:\s+\/health/);
});

test('server health endpoint exposes the API version for deploy verification', async () => {
  const { createServer } = await import('../src/server.js');
  const responses = [];
  const server = createServer({ autoRun: false });
  const request = { method: 'GET', url: '/health' };
  const response = {
    writeHead(statusCode, headers) {
      responses.push({ statusCode, headers });
    },
    end(body) {
      responses.push({ body: JSON.parse(body) });
    }
  };

  await server.emit('request', request, response);

  assert.equal(responses[0].statusCode, 200);
  assert.equal(responses[1].body.version, '0.2.1');
});
