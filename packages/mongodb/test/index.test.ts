import Fastify from 'fastify'
import assert from 'node:assert/strict'
import test from 'node:test'
import { fastifyMongodb } from '../lib/index'

test('option', async function (t) {
  await t.test('missing url', async function (t) {
    const fastify = Fastify()

    fastify.register(fastifyMongodb)

    assert.rejects(async () => {
      await fastify.ready()
    }, Error)
  })

  await t.test('missing database', async function (t) {
    const fastify = Fastify()

    // @ts-expect-error - we check for missing option
    fastify.register(fastifyMongodb, { url: 'mongodb://127.0.0.1:27017' })

    assert.rejects(async () => {
      await fastify.ready()
    }, Error)
  })
})
