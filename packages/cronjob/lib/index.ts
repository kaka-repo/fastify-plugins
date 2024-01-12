import { type FastifyInstance, type FastifyPluginAsync } from 'fastify'
import FastifyPlugin from 'fastify-plugin'
import { type Adapter, type AdapterOptions, type CreateTask, type Task } from './adapter/adapter'
import { FST_CJ_INVALID_OPTION } from './error'
import { kAdapter } from './symbols'

interface CronJob {
  addTask: <Context = FastifyInstance>(task: CreateTask<Context>) => Promise<void>
  removeTask: (name: string) => Promise<void>
}

declare module 'fastify' {
  interface FastifyInstance {
    cronjob: CronJob
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

  const cronjob: CronJob = {
    async addTask <Context = FastifyInstance>(task: CreateTask<Context>) {
      task.context ??= fastify as any
      await adapter.addTask(task as CreateTask<unknown>)
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
