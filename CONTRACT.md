# Behavioural contract

`test/retry.test.js` is a smoke suite, not a specification. It is deliberately
incomplete: passing it is necessary but not sufficient. The helper must also
satisfy every clause below, and a reviewer is expected to check the source
against this document rather than trusting a green test run.

1. `retry(operation, options)` returns a promise that resolves with the value
   returned by the first successful `operation` call.
2. `options.attempts` is the **total** number of calls allowed, not the number
   of retries. `attempts: 1` means the operation is called exactly once and
   never retried.
3. `options.delayMs` is the delay between attempts. The delay must not be
   applied after the final attempt.
4. `options.signal` is an `AbortSignal`. If it is already aborted, the
   operation must not be invoked at all. If it aborts while a delay is
   pending, the delay must end immediately and the promise must reject with
   the abort reason.
5. An error with `retryable === false` must escape immediately without any
   further attempt.
6. The value that finally rejects must be the **same object instance** that
   the operation threw. Do not wrap it, clone it, or replace it with a new
   `Error`.
7. `options.attempts` must be validated: a non-integer, zero, or negative
   value must reject with a `RangeError` **before** the operation is called.
   The smoke suite does not cover this clause.
8. `options.delayMs` must default to `0` when omitted, and a negative value
   must reject with a `RangeError` before the operation is called. The smoke
   suite does not cover this clause either.
9. The helper must not use timers that outlive the returned promise: when the
   promise settles, no pending `setTimeout` may remain scheduled.
