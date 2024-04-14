import { test } from '@kakang/unit'

test('always pass', async function (t) {
  t.test('pass', function (t) {
    t.equal('pass', 'pass')
  })
})
