import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { verifyPatches } from '../lib/dependency-patches.mjs';
const require = createRequire(import.meta.url);
const braces = require('braces');
const { sprintf } = require('sprintf-js');

test('installed dependency security patches match exact reviewed sources', async () => {
  await verifyPatches();
});
test('braces rejects deeply nested patterns and ASTs before stack exhaustion', () => {
  for (const [open, close] of [['{', '}'], ['(', ')']]) {
    const pattern = open.repeat(4000) + 'a,b' + close.repeat(4000);
    for (const operation of ['parse', 'compile', 'expand', 'stringify']) {
      assert.throws(() => braces[operation](pattern), { name: 'SyntaxError', message: /safe depth/ });
    }
  }
  let ast = { type: 'text', value: 'x' };
  for (let i = 0; i < 1000; i++) ast = { type: 'root', nodes: [ast] };
  for (const operation of ['compile', 'expand', 'stringify']) {
    assert.throws(() => braces[operation](ast), { name: 'SyntaxError', message: /safe depth/ });
  }
  assert.deepEqual(braces.expand('assets/{css,js}/{a,b}.txt'),
    ['assets/css/a.txt', 'assets/css/b.txt', 'assets/js/a.txt', 'assets/js/b.txt']);
});
test('numeric precision is bounded while ordinary formatting stays unchanged', () => {
  assert.equal(sprintf('%.2f', 1.234), '1.23');
  assert.equal(sprintf('%.2e', 1.234), '1.23e+0');
  assert.equal(sprintf('%.3g', 1.234), '1.23');
  for (const format of ['f', 'e', 'g']) {
    assert.equal(sprintf('%.999999999999999999999999' + format, 1.25), sprintf('%.100' + format, 1.25));
  }
  assert.doesNotThrow(() => sprintf('%.0g', 1.25));
});
