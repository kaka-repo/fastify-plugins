import { type FastifyPluginAsync } from 'fastify'
import FastifyPlugin from 'fastify-plugin'
import { type Adapter, type AdapterOptions } from './adapter/adapter'
import { CronJob, type CronJobOptions } from './cronjob'
import { FST_CJ_INVALID_OPTION } from './error'
import { kAdapter } from './symbols'

declare module 'fastify' {
  interface FastifyInstance {
    cronjob: CronJob<FastifyInstance>
  }
}

export interface FastifyCronJobOption extends Omit<CronJobOptions, 'adapter'> {
  adapter: typeof Adapter
  adapterOption: AdapterOptions
}

const plugin: FastifyPluginAsync<FastifyCronJobOption> = async function (fastify, option) {
  // we check if adapter provide special symbol
  if (option.adapter?.[kAdapter] !== true) {
    throw FST_CJ_INVALID_OPTION('option.adapter', 'Adapter', option.adapter)
  }

  const { adapter: Adapter } = option
  const adapter = new Adapter(option.adapterOption)

  await adapter.prepare()

  const cronjob = new CronJob<any>({
    context: fastify,
    ...option,
    adapter
  })

  fastify.decorate('cronjob', cronjob)

  fastify.addHook('onClose', async function () {
    await cronjob.destroy()
  })
}

export const fastifyCronJob = FastifyPlugin(plugin, {
  fastify: '4.x',
  name: '@kakang/fastify-cronjob',
  decorators: {
    fastify: [],
    request: [],
    reply: []
  },
  dependencies: [],
  encapsulate: false
})
