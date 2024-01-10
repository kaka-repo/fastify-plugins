import { type FastifyPluginAsync } from 'fastify'
import FastifyPlugin from 'fastify-plugin'
import { type Adapter, type AdapterOptions, type CreateTask, type Task } from './adapter/adapter'
import { FST_CJ_INVALID_OPTION } from './error'
import { kAdapter } from './symbols'

declare module 'fastify' {
  interface FastifyInstance {
    cronjob: {
      addTask: (task: CreateTask) => Promise<void>
      removeTask: (name: string) => Promise<void>
    }
  }
}

export interface FastifyCronJobOption {
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

  const cronjob = {
    async addTask (task: CreateTask) {
      await adapter.addTask(task)
    },
    async removeTask (name: string) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete adapter.tasks[name]
      await adapter.updateTask({ tid: name } as unknown as Task, 0, true)
    }
  }

  fastify.decorate('cronjob', cronjob)

  fastify.addHook('onClose', async function () {
    adapter.destroy()
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
