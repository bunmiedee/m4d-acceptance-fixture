/**
 * Retry helpers.
 *
 * `retry` is intentionally unimplemented: the acceptance scenario requires a
 * test that fails before the helper exists and passes after it is written.
 */
export async function retry() {
  throw new Error('retry is not implemented');
}
