import Fastify from 'fastify'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fastifyCronJob } from '../lib'

test('missing Adapter', async function (t) {
  try {
    const fastify = Fastify()
    fastify.register(fastifyCronJob)
    await fastify.ready()
    assert.ok(false, 'should not success')
  } catch (err: any) {
    assert.ok(err)
    assert.equal(err.code, 'FST_CJ_INVALID_OPTION')
  }
})
