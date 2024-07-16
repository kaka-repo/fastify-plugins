import { test } from '@kakang/unit'
import Fastify from 'fastify'
import { fastifyMongoDB } from '../lib/index'

const MONGODB_URI = 'mongodb://127.0.0.1:27017/?replicaSet=rs0'

test('option', async function (t) {
  t.test('missing url', async function (t) {
    const fastify = Fastify()

    fastify.register(fastifyMongoDB)

    t.rejects(async () => {
      await fastify.ready()
    }, Error)
  })

  t.test('missing database', async function (t) {
    const fastify = Fastify()

    // @ts-expect-error - we check for missing option
    fastify.register(fastifyMongoDB, { url: 'mongodb://127.0.0.1:27017' })

    t.rejects(async () => {
      await fastify.ready()
    }, Error)
  })
})

test('register', async function (t) {
  const ok: typeof t.ok = t.ok

  const fastify = Fastify()

  t.after(async function () {
    await fastify.close()
  })

  fastify.register(fastifyMongoDB, {
    url: MONGODB_URI,
    database: 'foobar',
  })

  await fastify.ready()

  ok(fastify.mongodb)
  ok(fastify.mongodb.client)
  ok(fastify.mongodb.db)
  t.equal(typeof fastify.mongodb.withTransaction, 'function')
})

test('register', async function (t) {
  const ok: typeof t.ok = t.ok
  const fastify = Fastify()

  t.after(async function () {
    await fastify.close()
  })

  fastify.register(fastifyMongoDB, {
    url: MONGODB_URI,
    database: 'foobar',
  })

  await fastify.ready()

  ok(fastify.mongodb)
  ok(fastify.mongodb.client)
  ok(fastify.mongodb.db)
  t.equal(typeof fastify.mongodb.withTransaction, 'function')
})

test('functional', async function (t) {
  const fastify = Fastify()

  t.after(async function () {
    await fastify.close()
  })

  fastify.register(fastifyMongoDB, {
    url: MONGODB_URI,
    database: 'foobar',
  })

  await fastify.ready()

  const result = await fastify.mongodb.db.collection('hello').insertMany([{ foo: 'bar' }])
  t.equal(result.insertedCount, 1)
})

test('functional', async function (t) {
  const fastify = Fastify()

  t.after(async function () {
    await fastify.close()
  })

  fastify.register(fastifyMongoDB, {
    url: MONGODB_URI,
    database: 'foobar',
  })

  await fastify.ready()

  {
    const result = await fastify.mongodb.db.collection('hello').insertMany([{ foo: 'bar' }])
    t.equal(result.insertedCount, 1)
  }

  {
    const result = await fastify.mongodb.withTransaction(async (session) => {
      const result = await fastify.mongodb.db.collection('hello').insertMany([{ foo: 'bar' }], { session })
      return result
    })
    t.equal(result.insertedCount, 1)
  }
})
