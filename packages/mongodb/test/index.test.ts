import Fastify from 'fastify'
import assert from 'node:assert/strict'
import test from 'node:test'
import { fastifyMongoDB } from '../lib/index'

const MONGODB_URI = 'mongodb://127.0.0.1:27017/?replicaSet=rs0'

test('option', async function (t) {
  await t.test('missing url', async function (t) {
    const fastify = Fastify()

    fastify.register(fastifyMongoDB)

    assert.rejects(async () => {
      await fastify.ready()
    }, Error)
  })

  await t.test('missing database', async function (t) {
    const fastify = Fastify()

    // @ts-expect-error - we check for missing option
    fastify.register(fastifyMongoDB, { url: 'mongodb://127.0.0.1:27017' })

    assert.rejects(async () => {
      await fastify.ready()
    }, Error)
  })
})

test('register', async function (t) {
  const fastify = Fastify()

  t.after(async function () {
    await fastify.close()
  })

  fastify.register(fastifyMongoDB, {
    url: MONGODB_URI,
    database: 'foobar'
  })

  await fastify.ready()

  assert.ok(fastify.mongodb)
  assert.ok(fastify.mongodb.client)
  assert.ok(fastify.mongodb.db)
  assert.equal(typeof fastify.mongodb.withTransaction, 'function')
})

test('register', async function (t) {
  const fastify = Fastify()

  t.after(async function () {
    await fastify.close()
  })

  fastify.register(fastifyMongoDB, {
    url: MONGODB_URI,
    database: 'foobar'
  })

  await fastify.ready()

  assert.ok(fastify.mongodb)
  assert.ok(fastify.mongodb.client)
  assert.ok(fastify.mongodb.db)
  assert.equal(typeof fastify.mongodb.withTransaction, 'function')
})

test('functional', async function (t) {
  const fastify = Fastify()

  t.after(async function () {
    await fastify.close()
  })

  fastify.register(fastifyMongoDB, {
    url: MONGODB_URI,
    database: 'foobar'
  })

  await fastify.ready()

  const result = await fastify.mongodb.db.collection('hello').insertMany([{ foo: 'bar' }])
  assert.equal(result.insertedCount, 1)
})

test('functional', async function (t) {
  const fastify = Fastify()

  t.after(async function () {
    await fastify.close()
  })

  fastify.register(fastifyMongoDB, {
    url: MONGODB_URI,
    database: 'foobar'
  })

  await fastify.ready()

  {
    const result = await fastify.mongodb.db.collection('hello').insertMany([{ foo: 'bar' }])
    assert.equal(result.insertedCount, 1)
  }

  {
    const result = await fastify.mongodb.withTransaction(async (session) => {
      const result = await fastify.mongodb.db.collection('hello').insertMany([{ foo: 'bar' }], { session })
      return result
    })
    assert.equal(result.insertedCount, 1)
  }
})
