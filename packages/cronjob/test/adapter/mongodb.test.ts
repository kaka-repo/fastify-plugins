import { parseExpression } from 'cron-parser'
import Fastify, { FastifyInstance } from 'fastify'
import { MongoClient } from 'mongodb'
import { after, before, test, TestContext } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { fastifyCronJob } from '../../lib'
import { MongoDBAdapter, type MongoDBAdapterOptions } from '../../lib/adapter/mongodb'
import { MONGODB_URL } from '../config'

const minTickMS = 32
const maxTickMS = 256
const RANDOM_GAP = (maxTickMS - minTickMS) + (1024 * 1.5)

function createDeferredPromise (): { promise: Promise<void>, resolve: () => void, reject: () => void } {
  const promise: any = {}
  promise.promise = new Promise(function (resolve, reject) {
    promise.resolve = resolve
    promise.reject = reject
  })
  return promise
}

let client: MongoClient
let fastify: FastifyInstance

before(async function (t) {
  client = new MongoClient(MONGODB_URL)
  const db = client.db('cicd')
  fastify = Fastify()
  const adapterOption: MongoDBAdapterOptions = {
    db,
    resetOnInit: true
  }
  await fastify.register(fastifyCronJob, {
    application: t.name,
    adapter: MongoDBAdapter,
    adapterOption,
    minTickMS,
    maxTickMS,
    maxExecutionMS: 8000,
  })
})

after(async function () {
  await fastify.close()
  await setTimeout(500)
  await client.close()
})

test('properly registered', function (t: TestContext) {
  t.plan(4)
  t.assert.ok(fastify.cronjob)
  t.assert.equal(typeof fastify.cronjob.setTimeout, 'function')
  t.assert.equal(typeof fastify.cronjob.setInterval, 'function')
  t.assert.equal(typeof fastify.cronjob.setImmediate, 'function')
})

test('timeout', async function (t: TestContext) {
  // [setup, ...runat]
  const tasks: Record<number, number[]> = {}
  function setupTimeout (delay: number) {
    const promise = createDeferredPromise()
    const uid = `timeout-${delay}`
    tasks[delay] = [Date.now()]
    fastify.cronjob.setTimeout(() => {
      tasks[delay].push(Date.now())
      promise.resolve()
    }, delay, uid)

    return t.test(`${delay}ms`, async function (t: TestContext) {
      await promise.promise

      // check
      const timestamps = tasks[delay]
      const expected = (timestamps[0] + delay)
      const diff = timestamps[1] - expected
      const from = expected - RANDOM_GAP
      const to = expected + RANDOM_GAP
      t.assert.equal(timestamps.length, 2, 'executed one time')
      // within expected range
      t.assert.equal(timestamps[1] >= from, true, 'within random gap lower bound')
      t.assert.equal(timestamps[1] <= to, true, 'within random gap upper bound')
      // within expected diff
      t.assert.equal(diff < RANDOM_GAP, true, 'within random gap')
    })
  }

  await Promise.all([
    setupTimeout(384),
    setupTimeout(512),
    setupTimeout(640),
    setupTimeout(768),
    setupTimeout(778),
    setupTimeout(788),
    setupTimeout(789),
    setupTimeout(800),
    setupTimeout(801),
    setupTimeout(802),
  ])
})

test('interval', async function (t: TestContext) {
  // [setup, ...runat]
  const tasks: Record<number, number[]> = {}
  function setupInterval (delay: number) {
    const promise = createDeferredPromise()
    const uid = `interval-${delay}`
    tasks[delay] = [Date.now()]
    fastify.cronjob.setInterval(() => {
      tasks[delay].push(Date.now())
      if (tasks[delay].length === 3) {
        promise.resolve()
        fastify.cronjob.clearInterval(uid)
      }
    }, delay, uid)

    return t.test(`${delay}ms`, async function (t: TestContext) {
      await promise.promise

      // check
      const timestamps = tasks[delay]
      t.assert.equal(timestamps.length, 3, 'executed two time')
      for (let i = 1; i < timestamps.length; i++) {
        const expected = (timestamps[i - 1] + delay)
        const diff = timestamps[i] - expected
        const from = expected - RANDOM_GAP
        const to = expected + RANDOM_GAP
        // within expected range
        t.assert.equal(timestamps[i] >= from, true, 'within random gap lower bound')
        t.assert.equal(timestamps[i] <= to, true, 'within random gap upper bound')
        // within expected diff
        t.assert.equal(diff < RANDOM_GAP, true, 'within random gap')
      }
    })
  }

  await Promise.all([
    setupInterval(384),
    setupInterval(512),
    setupInterval(640),
    setupInterval(768),
    setupInterval(778),
    setupInterval(788),
    setupInterval(789),
    setupInterval(800),
    setupInterval(801),
    setupInterval(802),
  ])
})

test('immediate', async function (t: TestContext) {
  // [setup, ...runat]
  const tasks: Record<string, number[]> = {}
  function setupImmediate (name: string) {
    const promise = createDeferredPromise()
    const uid = `immediate-${name}`
    tasks[name] = [Date.now()]
    fastify.cronjob.setImmediate(() => {
      tasks[name].push(Date.now())
      promise.resolve()
    }, uid)

    return t.test(`${name}`, async function (t: TestContext) {
      await promise.promise

      // check
      const timestamps = tasks[name]
      const diff = timestamps[1] - timestamps[0]
      const from = timestamps[0] - RANDOM_GAP
      const to = timestamps[0] + RANDOM_GAP
      t.assert.equal(timestamps.length, 2, 'executed one time')
      // within expected range
      t.assert.equal(timestamps[1] >= from, true, 'within random gap lower bound')
      t.assert.equal(timestamps[1] <= to, true, 'within random gap upper bound')
      // within expected diff
      t.assert.equal(diff < RANDOM_GAP, true, 'within random gap')
    })
  }

  await Promise.all([
    setupImmediate('foo'),
    setupImmediate('bar'),
    setupImmediate('baz'),
    setupImmediate('hello'),
    setupImmediate('world'),
  ])
})

test('cronjob', async function (t: TestContext) {
  // [setup, ...runat]
  const tasks: Record<string, number[]> = {}
  const expecteds: Record<string, number[]> = {}
  function setupCronJob (name: string, gap: number) {
    const promise = createDeferredPromise()
    const uid = `timeout-cron-${name}`
    tasks[name] = [Date.now()]
    expecteds[name] = [+parseExpression(name).next().toDate()]
    fastify.cronjob.setCronJob(() => {
      tasks[name].push(Date.now())
      expecteds[name].push(+parseExpression(name).next().toDate())
      if (tasks[name].length === 3) {
        promise.resolve()
        fastify.cronjob.clearTimeout(uid)
      }
    }, name, uid)

    return t.test(`${name}`, async function (t: TestContext) {
      await promise.promise

      // check
      const timestamps = tasks[name]
      t.assert.equal(timestamps.length, 3, 'executed two time')
      for (let i = 1; i < timestamps.length; i++) {
        const expected = expecteds[name][i - 1]
        const diff = timestamps[i] - expected
        const from = expected - RANDOM_GAP
        const to = expected + RANDOM_GAP
        // within expected range
        t.assert.equal(timestamps[i] >= from, true, 'within random gap lower bound')
        t.assert.equal(timestamps[i] <= to, true, 'within random gap upper bound')
        // within expected diff
        t.assert.equal(diff < RANDOM_GAP, true, 'within random gap')
      }
    })
  }

  await Promise.all([
    setupCronJob('* * * * * *', 1000),
    setupCronJob('*/2 * * * * *', 2000),
    setupCronJob('*/3 * * * * *', 3000),
    setupCronJob('*/4 * * * * *', 4000),
    setupCronJob('*/5 * * * * *', 5000),
  ])
})

test('loop', async function (t: TestContext) {
  // [setup, ...runat]
  const tasks: Record<string, number[]> = {}
  function setupLoopTask (name: string, gap: number) {
    const promise = createDeferredPromise()
    const uid = `immediate-loop-${name}`
    tasks[name] = [Date.now()]
    fastify.cronjob.setLoopTask(async () => {
      tasks[name].push(Date.now())
      if (tasks[name].length === 4) {
        promise.resolve()
        fastify.cronjob.clearTimeout(uid)
      }
      await setTimeout(gap)
      tasks[name].push(Date.now())
    }, name, uid)

    return t.test(`${name}`, async function (t: TestContext) {
      await promise.promise

      // check
      const timestamps = tasks[name]
      t.assert.equal(timestamps.length, 4, 'executed two time')
      for (let i = 1; i < timestamps.length; i += 2) {
        const expected = timestamps[i - 1]
        const diff = timestamps[i] - expected
        const from = expected - RANDOM_GAP
        const to = expected + RANDOM_GAP
        // within expected diff
        t.assert.equal(diff < RANDOM_GAP, true, 'within random gap')
        // within expected range
        t.assert.equal(timestamps[i] >= from, true, 'within random gap lower bound')
        t.assert.equal(timestamps[i] <= to, true, 'within random gap upper bound')
      }
    })
  }

  await Promise.all([
    setupLoopTask('1s', 1000),
    setupLoopTask('2s', 2000),
    setupLoopTask('3s', 3000),
    setupLoopTask('4s', 4000),
    setupLoopTask('5s', 5000),
  ])
})
