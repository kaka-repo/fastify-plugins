import Fastify, { FastifyInstance } from 'fastify'
import { MongoClient } from 'mongodb'
import { after, before, test, TestContext } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { fastifyCronJob, MongoAdapter } from '../lib'
import { MONGODB_URL } from './config'

let client: MongoClient
let fastify: FastifyInstance
before(async () => {
  client = new MongoClient(MONGODB_URL)
  fastify = Fastify()

  const db = client.db('cicd')

  await fastify.register(fastifyCronJob, {
    adapter: new MongoAdapter({
      db,
      collectionName: 'sys.timer'
    })
  })

  await fastify.ready()
})

after(async () => {
  await fastify.close()
  await setTimeout(500)
  await client.close()
})

test('cron', async function (t: TestContext) {
  const cronTick: Date[] = []
  const cron = await fastify.cronjob.setCronJob(() => {
    cronTick.push(new Date())
  }, '*/2 * * * * *', '*/2 * * * * *')
  await setTimeout(5000)
  fastify.cronjob.clearTimeout(cron)

  t.assert.ok(cronTick.length >= 1 && cronTick.length <= 3)
})

test('loop', async function (t: TestContext) {
  const loopTick: Date[] = []
  const loop = await fastify.cronjob.setLoopTask(async () => {
    loopTick.push(new Date())
    await setTimeout(1000)
  }, '1s')
  await setTimeout(5000)
  fastify.cronjob.clearTimeout(loop)

  t.assert.ok(loopTick.length >= 1 && loopTick.length <= 3)
})
