# m4d-acceptance-fixture

A tiny, dependency-free repository used as the target of the SwarmV2 M4D
provider-backed collaboration acceptance.

`src/retry.js` exports an unimplemented `retry`. `test/retry.test.js` describes
the required behaviour and fails until `retry` is implemented. The acceptance
scenario is: make the test fail, implement the helper, make it pass.

Run the tests with:

```
npm test
```
