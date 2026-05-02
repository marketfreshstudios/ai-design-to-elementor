const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export async function runRegisteredTests() {
  let failed = 0;

  for (const item of tests) {
    try {
      await item.fn();
      console.log(`ok - ${item.name}`);
    } catch (error) {
      failed += 1;
      console.error(`not ok - ${item.name}`);
      console.error(error && error.stack ? error.stack : error);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}
