import { type FastifyPluginAsync } from 'fastify'
import FastifyPlugin from 'fastify-plugin'
import { MongoClient, type Db, type MongoClientOptions, type TransactionOptions, type WithTransactionCallback } from 'mongodb'

declare module 'fastify' {
  interface FastifyInstance {
    mongodb: {
      client: MongoClient
      db: Db
      withTransaction: <T = void> (fn: WithTransactionCallback<T>, options?: TransactionOptions) => ReturnType<typeof fn>
    }
  }
}

export interface fastifyMongoDBOption {
  url: string
  database: string
  options?: MongoClientOptions
}

const plugin: FastifyPluginAsync<fastifyMongoDBOption> = async function (fastify, option) {
  if (typeof option.url !== 'string') throw Error(`option.url is expected to be "string", but recieved "${typeof option.url}"`)
  if (typeof option.database !== 'string') throw Error(`option.database is expected to be "string", but recieved "${typeof option.database}"`)

  const client = new MongoClient(option.url, {
    // we need to reduce the timeout to prevent
    // wait time longer than avvio timeout
    serverSelectionTimeoutMS: 7500,
    ...option.options,
  })

  // verify connection
  await client.connect()

  const db = client.db(option.database)

  async function withTransaction <T = unknown> (fn: WithTransactionCallback<T>, options?: TransactionOptions): ReturnType<typeof fn> {
    options ??= {}
    // ensure the read operation is fast enough
    options.readConcern ??= 'local'
    // ensure the write operation is consistence
    options.writeConcern ??= { w: 'majority' }
    // prevent long staling operation
    options.maxTimeMS ??= 500
    const session = mongodb.client.startSession()
    const result = await session.withTransaction<T>(fn, options)
    await session.endSession()
    return result
  }

  const mongodb = {
    client,
    db,
    withTransaction,
  }

  fastify.decorate('mongodb', mongodb)

  fastify.addHook('onClose', async function () {
    await client.close(true)
  })
}

export const fastifyMongoDB = FastifyPlugin(plugin, {
  fastify: '4.x',
  name: '@kakang/fastify-mongodb',
  decorators: {
    fastify: [],
    request: [],
    reply: [],
  },
  dependencies: [],
  encapsulate: false,
})
