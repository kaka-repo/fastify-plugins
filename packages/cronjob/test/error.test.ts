import { test } from '@kakang/unit'
import Fastify from 'fastify'
import { fastifyCronJob } from '../lib'

test('missing Adapter', async function (t) {
  const ok: typeof t.ok = t.ok
  try {
    const fastify = Fastify()
    fastify.register(fastifyCronJob)
    await fastify.ready()
    ok(false, 'should not success')
  } catch (err: any) {
    ok(err)
    t.equal(err.code, 'FST_CJ_INVALID_OPTION')
  }
})
