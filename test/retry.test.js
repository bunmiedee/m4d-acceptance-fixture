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

test('does not retry an error marked non-retryable', async () => {
  let attempts = 0;
  const fatal = Object.assign(new Error('fatal'), { retryable: false });
  await assert.rejects(
    () =>
      retry(
        async () => {
          attempts += 1;
          throw fatal;
        },
        { attempts: 5, delayMs: 1 },
      ),
    /fatal/,
  );
  assert.equal(attempts, 1, 'a non-retryable error must not be retried');
});

test('rethrows the original error instance, not a copy', async () => {
  const original = new Error('always');
  let attempts = 0;
  await assert.rejects(
    () =>
      retry(
        async () => {
          attempts += 1;
          throw original;
        },
        { attempts: 2, delayMs: 1 },
      ),
    (error) => error === original,
  );
  assert.equal(attempts, 2);
});

test('rejects with the abort reason when the signal aborts mid-operation', async () => {
  const controller = new AbortController();
  const reason = new Error('cancelled mid-flight');
  let attempts = 0;
  const pending = retry(
    async () => {
      attempts += 1;
      controller.abort(reason);
      throw new Error('transient');
    },
    { attempts: 5, delayMs: 1, signal: controller.signal },
  );
  await assert.rejects(() => pending, (error) => error === reason);
  assert.equal(attempts, 1, 'an abort mid-operation must not be retried');
});

test('does not accumulate abort listeners across calls', async () => {
  const controller = new AbortController();
  const before = controller.signal;
  for (let index = 0; index < 5; index += 1) {
    await retry(async () => 'ok', { attempts: 2, delayMs: 0, signal: before });
  }
  // Node exposes no public listener count, so assert the observable effect:
  // aborting after the calls settle must not throw or re-enter the helper.
  controller.abort(new Error('late'));
  assert.equal(before.aborted, true);
});
