import { randomUUID } from 'crypto'
import { type FastifyPluginAsync, type FastifyRequest } from 'fastify'
import FastifyPlugin from 'fastify-plugin'
import { type Provider } from './provider/provider'

function defaultStateGenerator (request: FastifyRequest): string {
  // it is more simple to use UUID
  const state = randomUUID()
  return state
}

export type StateGenerator = (request: FastifyRequest) => string | Promise<string>

export interface FastifyOAuthOption {
  name: string
  provider: Provider
  startRedirectPath?: string
  startRedirectPathOption?: {
    scope?: string[]
    state?: StateGenerator
    redirect_uri: string
  }
}

// we store the oauth directory outside the plugin
// so it will be shared between multiple registration
const oauth2: Record<string, Provider> = {}

const plugin: FastifyPluginAsync<FastifyOAuthOption> = async function (fastify, option) {
  if (!fastify.hasRequestDecorator('oauth2')) {
    fastify.decorateRequest('oauth2', oauth2)
  }

  oauth2[option.name] = option.provider

  if (typeof option.startRedirectPath === 'string') {
    if (typeof option.startRedirectPathOption === 'undefined') throw Error('missing startRedirectPathOption')
    let { state: stateGenerator, ...startRedirectPathOption } = option.startRedirectPathOption
    stateGenerator ??= defaultStateGenerator

    fastify.get(option.startRedirectPath, async function (request, reply) {
      const state = await (stateGenerator as StateGenerator)(request)
      const authorizeURL = option.provider.authorizeURL(request, {
        ...startRedirectPathOption,
        state,
      })
      return await reply.redirect(authorizeURL)
    })
  }
}

export const FastifyOAuth2 = FastifyPlugin(plugin, {
  fastify: '5.x',
  name: '@kakang/fastify-oauth2',
  dependencies: [],
})
export default FastifyOAuth2
