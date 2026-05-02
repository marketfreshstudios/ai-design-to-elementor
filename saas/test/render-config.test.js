import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from '../../scripts/test-harness.mjs';

test('render blueprint deploys the Node API on the free web service plan', () => {
  const blueprint = readFileSync('render.yaml', 'utf8');

  assert.match(blueprint, /type:\s+web/);
  assert.match(blueprint, /runtime:\s+node/);
  assert.match(blueprint, /plan:\s+free/);
  assert.match(blueprint, /npx playwright install chromium/);
  assert.match(blueprint, /startCommand:\s+npm start/);
  assert.match(blueprint, /healthCheckPath:\s+\/health/);
});
