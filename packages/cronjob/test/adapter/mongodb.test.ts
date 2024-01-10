import { fastifyMongoDB } from '@kakang/fastify-mongodb'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setTimeout as sleep } from 'node:timers/promises'
import { fastifyCronJob } from '../../lib'
import { MongoDBAdapter, type MongoDBAdapterOptions } from '../../lib/adapter/mongodb'

const MONGODB_URI = 'mongodb://127.0.0.1:27017/?replicaSet=rs0'

test('MongoDBAdapter', async function (t) {
  await t.test('register', async function (t) {
    const fastify = Fastify()

    t.after(async function () {
      await fastify.mongodb.db.dropDatabase()
      await fastify.close()
    })

    await fastify.register(fastifyMongoDB, {
      url: MONGODB_URI,
      database: 'foobar'
    })
    const adapterOption: MongoDBAdapterOptions = {
      application: t.name,
      db: fastify.mongodb.db
    }
    await fastify.register(fastifyCronJob, {
      adapter: MongoDBAdapter,
      adapterOption
    })

    assert.ok(fastify.cronjob)
    assert.ok(fastify.cronjob.addTask)
    assert.ok(fastify.cronjob.removeTask)
  })

  await t.test('addTask - */5 * * * * *', async function (t) {
    const fastify = Fastify()

    t.after(async function () {
      await fastify.mongodb.db.dropDatabase()
      await fastify.close()
    })

    await fastify.register(fastifyMongoDB, {
      url: MONGODB_URI,
      database: 'foobar'
    })
    const adapterOption: MongoDBAdapterOptions = {
      application: t.name,
      db: fastify.mongodb.db
    }
    await fastify.register(fastifyCronJob, {
      adapter: MongoDBAdapter,
      adapterOption
    })

    let times = 0

    await fastify.cronjob.addTask({
      name: 'every 5 second',
      cron: '*/5 * * * * *',
      executor () {
        times++
      }
    })

    // NOTE: it is not really possible to do in every second
    await sleep(5000)
    assert.equal(times, 1)
    await sleep(5000)
    assert.equal(times, 2)
  })

  await t.test('addTask(once) - */5 * * * * *', async function (t) {
    const fastify = Fastify()

    t.after(async function () {
      await fastify.mongodb.db.dropDatabase()
      await fastify.close()
    })

    await fastify.register(fastifyMongoDB, {
      url: MONGODB_URI,
      database: 'foobar'
    })
    const adapterOption: MongoDBAdapterOptions = {
      application: t.name,
      db: fastify.mongodb.db
    }
    await fastify.register(fastifyCronJob, {
      adapter: MongoDBAdapter,
      adapterOption
    })

    let times = 0

    await fastify.cronjob.addTask({
      name: 'nearest second',
      cron: '* * * * * *',
      // it would be the nearest second
      once: true,
      executor () {
        times++
      }
    })

    // NOTE: it is not really possible to do in every second
    await sleep(3000)
    assert.equal(times, 1)
    await sleep(3000)
    assert.equal(times, 1)
  })

  await t.test('removeTask - */5 * * * * *', async function (t) {
    const fastify = Fastify()

    t.after(async function () {
      await fastify.mongodb.db.dropDatabase()
      await fastify.close()
    })

    await fastify.register(fastifyMongoDB, {
      url: MONGODB_URI,
      database: 'foobar'
    })
    const adapterOption: MongoDBAdapterOptions = {
      application: t.name,
      db: fastify.mongodb.db
    }
    await fastify.register(fastifyCronJob, {
      adapter: MongoDBAdapter,
      adapterOption
    })

    let times = 0

    await fastify.cronjob.addTask({
      name: 'every 5 second',
      cron: '*/5 * * * * *',
      executor () {
        times++
      }
    })

    // NOTE: it is not really possible to do in every second
    await sleep(5000)
    assert.equal(times, 1)

    await fastify.cronjob.removeTask('every 5 second')

    await sleep(5000)
    assert.equal(times, 1)
  })
})
