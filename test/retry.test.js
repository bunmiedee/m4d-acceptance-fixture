import assert from 'node:assert/strict';
import test from 'node:test';
import { retry } from '../src/retry.js';

test('retries a failing operation until it succeeds', async () => {
  let attempts = 0;
  const result = await retry(
    async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('transient');
      return 'ok';
    },
    { attempts: 5, delayMs: 1 },
  );
  assert.equal(result, 'ok');
  assert.equal(attempts, 3);
});

test('gives up after the attempt budget and rethrows the last error', async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      retry(
        async () => {
          attempts += 1;
          throw new Error('always');
        },
        { attempts: 2, delayMs: 1 },
      ),
    /always/,
  );
  assert.equal(attempts, 2);
});
