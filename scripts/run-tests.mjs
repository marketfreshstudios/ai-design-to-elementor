import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { runRegisteredTests } from './test-harness.mjs';

function collectTests(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...collectTests(fullPath));
    } else if (entry.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

for (const file of collectTests(resolve('.'))) {
  await import(pathToFileURL(file));
}

await runRegisteredTests();
