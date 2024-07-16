import { test } from '@kakang/unit'
import { parseExpression } from 'cron-parser'
import Fastify from 'fastify'
import { MongoClient } from 'mongodb'
import { fastifyCronJob } from '../../lib'
import { MongoDBAdapter, type MongoDBAdapterOptions } from '../../lib/adapter/mongodb'

const MONGODB_URI = 'mongodb://127.0.0.1:27017/?replicaSet=rs0'
const minTickMS = 32
const maxTickMS = 256
const RANDOM_GAP = (maxTickMS - minTickMS) + 3072

function createDeferredPromise (): { promise: Promise<void>, resolve: () => void, reject: () => void } {
  const promise: any = {}
  promise.promise = new Promise(function (resolve, reject) {
    promise.resolve = resolve
    promise.reject = reject
  })
  return promise
}

function isJob (uid: unknown, expected: string): boolean {
  return String(uid).includes(expected)
}

test('MongoDBAdapter', async function (t) {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()

  const db = client.db('foobar')
  const fastify = Fastify()

  const adapterOption: MongoDBAdapterOptions = {
    db,
  }
  await fastify.register(fastifyCronJob, {
    application: t.name,
    adapter: MongoDBAdapter,
    adapterOption,
    minTickMS,
    maxTickMS,
    maxExecutionMS: 8000,
  })

  fastify.cronjob.on('executed', function (task) {
    ticks[task.uid]++
    if (timestamps[task.uid].length < 2) {
      timestamps[task.uid].push(task.timestamp as number)
    } else {
      timestamps[task.uid][1] = task.timestamp as number
    }

    const now = Date.now()

    if (
      (
        isJob(task.uid, 'interval') ||
        isJob(task.uid, 'timeout') ||
        isJob(task.uid, 'immediate')
      ) && timestamps[task.uid].length === 2
    ) {
      const expected = timestamps[task.uid][0]
      const _from = expected - RANDOM_GAP
      const _to = expected + RANDOM_GAP
      const diff = now - expected

      if (isJob(task.uid, 'interval')) {
        if (ticks[task.uid] >= 2) {
          fastify.cronjob.clearInterval(task.uid as string)
          t.equal(ticks[task.uid], 2)
          dones[task.uid]()
        } else {
          timestamps[task.uid][0] = now + task.delay
          t.equal(ticks[task.uid], 1)
        }
      } else if (isJob(task.uid, 'cron')) {
        if (ticks[task.uid] >= 2) {
          fastify.cronjob.clearInterval(task.uid as string)
          t.equal(ticks[task.uid] >= 2, true)
          dones[task.uid]()
        } else {
          timestamps[task.uid][0] = now + task.delay
          t.equal(ticks[task.uid], 1)
        }
      } else if (isJob(task.uid, 'loop')) {
        fastify.cronjob.clearInterval(task.uid as string)
        t.equal(ticks[task.uid] >= 1, true)
        dones[task.uid]()
      } else {
        fastify.cronjob.clearInterval(task.uid as string)
        t.equal(ticks[task.uid], 1)
        dones[task.uid]()
      }

      if (!isJob(task.uid, 'loop') && !isJob(task.uid, 'cron')) {
        t.equal(_from < now && now < _to, true)
        t.equal(diff < RANDOM_GAP, true)
      }
    }
  })

  const dones: Record<string, () => void> = {}
  const timestamps: Record<string, number[]> = {}
  const ticks: Record<string, number> = {}

  const checkInterval = async function (interval: number): Promise<void> {
    const promise = createDeferredPromise()
    const uid = await fastify.cronjob.setInterval(async () => {}, interval, '' + interval)
    dones[uid] = promise.resolve
    timestamps[uid] = [Date.now() + interval]
    ticks[uid] = 0
    await promise.promise
  }

  const checkTimeout = async function (interval: number): Promise<void> {
    const promise = createDeferredPromise()
    const uid = await fastify.cronjob.setTimeout(async () => {}, interval, '' + interval)
    dones[uid] = promise.resolve
    timestamps[uid] = [Date.now() + interval]
    ticks[uid] = 0
    await promise.promise
  }

  const checkCronJob = async function (cron: string): Promise<void> {
    const next = parseExpression(cron).next().toDate()
    const promise = createDeferredPromise()
    const uid = await fastify.cronjob.setCronJob(async () => {}, cron, cron)
    dones[uid] = promise.resolve
    timestamps[uid] = [+next]
    ticks[uid] = 0
    await promise.promise
  }

  const checkLoopTask = async function (name: number): Promise<void> {
    const promise = createDeferredPromise()
    const uid = await fastify.cronjob.setLoopTask(async () => {}, '' + name)
    dones[uid] = promise.resolve
    timestamps[uid] = [Date.now()]
    ticks[uid] = 0
    await promise.promise
  }

  t.after(async function () {
    await fastify.close()
    await db.dropDatabase()
    await client.close(true)
  })

  t.test('fastify.cronjob', function (t, done) {
    const ok: typeof t.ok = t.ok
    ok(fastify.cronjob)
    t.equal(typeof fastify.cronjob.setTimeout, 'function')
    t.equal(typeof fastify.cronjob.setInterval, 'function')
    t.equal(typeof fastify.cronjob.setImmediate, 'function')
    done()
  })

  t.test('interval', async function () {
    const promises = [
      checkInterval(384),
      checkInterval(512),
      checkInterval(640),
      checkInterval(768),
      checkInterval(778),
      checkInterval(788),
      checkInterval(789),
      checkInterval(800),
      checkInterval(801),
      checkInterval(802),
    ]
    await Promise.allSettled(promises)
  })

  t.test('timeout', async function () {
    const promises = [
      checkTimeout(384),
      checkTimeout(512),
      checkTimeout(640),
      checkTimeout(768),
      checkTimeout(778),
      checkTimeout(788),
      checkTimeout(789),
      checkTimeout(800),
      checkTimeout(801),
      checkTimeout(802),
    ]
    await Promise.allSettled(promises)
  })

  t.test('cronjob', async function () {
    const promises = [
      checkCronJob('* * * * * *'),
      checkCronJob('*/2 * * * * *'),
      checkCronJob('*/3 * * * * *'),
      checkCronJob('*/4 * * * * *'),
      checkCronJob('*/5 * * * * *'),
    ]
    await Promise.allSettled(promises)
  })

  t.test('looptask', async function () {
    const promises = [
      checkLoopTask(384),
    ]
    await Promise.allSettled(promises)
  })
})
