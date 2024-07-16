import envSchema, { type EnvSchemaData, type EnvSchemaOpt } from 'env-schema'
import { type FastifyPluginCallback } from 'fastify'
import FastifyPlugin from 'fastify-plugin'

export function build <T = EnvSchemaData> (options: EnvSchemaOpt<T>): { env: T, plugin: FastifyPluginCallback } {
  const env = envSchema<T>(options)

  const plugin: FastifyPluginCallback = function (fastify, _, done) {
    fastify.decorate('config', env as unknown)
    done()
  }
  FastifyPlugin(plugin, {
    fastify: '4.x',
    name: '@kakang/fastify-config',
    decorators: {
      fastify: [],
      request: [],
      reply: [],
    },
    dependencies: [],
    encapsulate: false,
  })

  return {
    env,
    plugin,
  }
}
