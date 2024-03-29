import assert from 'node:assert/strict'
import test from 'node:test'

test('always pass', async function (t) {
  await t.test('pass', function () {
    assert.equal('pass', 'pass')
  })
})
