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

test('stops immediately when the signal is already aborted', async () => {
  const controller = new AbortController();
  controller.abort(new Error('cancelled'));
  let attempts = 0;
  await assert.rejects(
    () =>
      retry(
        async () => {
          attempts += 1;
          return 'ok';
        },
        { attempts: 3, delayMs: 1, signal: controller.signal },
      ),
    /cancelled/,
  );
  assert.equal(attempts, 0, 'an already-aborted signal must not invoke the operation');
});

test('aborts during the delay without sleeping the full delay', async () => {
  const controller = new AbortController();
  let attempts = 0;
  const started = Date.now();
  const pending = retry(
    async () => {
      attempts += 1;
      throw new Error('transient');
    },
    { attempts: 5, delayMs: 5_000, signal: controller.signal },
  );
  setTimeout(() => controller.abort(new Error('cancelled')), 20);
  await assert.rejects(() => pending, /cancelled/);
  assert.equal(attempts, 1, 'the abort must interrupt the delay, not wait it out');
  assert.ok(Date.now() - started < 2_000, 'the delay must be cut short by the abort');
});
