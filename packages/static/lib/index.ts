import { send, SendOptions } from '@kakang/abstract-send'
import { FastifyReply, FastifyRequest, type FastifyPluginAsync } from 'fastify'
import FastifyPlugin from 'fastify-plugin'
import { normalizeRoots, normalizeSendOption, normalizeServe } from './option'

declare module 'fastify' {
  interface FastifyReply {
    sendFile: (this: FastifyReply, path: string, options?: Partial<FastifyStaticOption>) => Promise<void>
    download: (this: FastifyReply, path: string, filename: string, options?: Partial<FastifyStaticOption>) => Promise<void>
  }
}

// send options
export interface FastifyStaticOption extends Omit<SendOptions, 'root' | 'start' | 'end'> {
  root: string | string[]
  // allows to provide fallback
  handleNotFound?: (request: FastifyRequest, reply: FastifyReply) => void | Promise<void>

  // serve
  serve?: boolean | string
}

const plugin: FastifyPluginAsync<FastifyStaticOption> = async function (fastify, options) {
  const globalRoots = normalizeRoots(options.root)
  const globalSendOptions: Omit<SendOptions, 'root'> = normalizeSendOption(options)
  const globalHandleNotFound = options.handleNotFound
  const serveURL = normalizeServe(options.serve)

  fastify.decorateReply('sendFile', async function sendFile (path: string, options?: Partial<FastifyStaticOption>) {
    const roots = options?.root != null ? normalizeRoots(options.root) : globalRoots
    const sendOptions = { ...globalSendOptions, ...normalizeSendOption(options) }
    const handleNotFound = typeof options?.handleNotFound === 'function' ? options?.handleNotFound : globalHandleNotFound

    for (let i = 0; i < roots.length; i++) {
      const root = roots[i]
      const { statusCode, headers, stream, type } = await send(this.request.raw, path, { ...sendOptions, root })
      switch (type) {
        case 'file':
        case 'directory': {
          this.status(statusCode)
          this.headers(headers)
          await this.send(stream)
          break
        }
        case 'error': {
          if (statusCode === 404) {
            // try next root path
            if (i < roots.length - 1) continue
            // allows custom not found
            // mostly used in spa
            if (typeof handleNotFound === 'function') {
              await handleNotFound(this.request, this)
            } else {
              this.callNotFound()
            }
          } else {
            this.status(statusCode)
            this.headers(headers)
            await this.send(stream)
          }
          break
        }
      }
    }
  })

  fastify.decorateReply('download', async function download (path: string, filename: string, options?: Partial<FastifyStaticOption>) {
    const roots = options?.root != null ? normalizeRoots(options.root) : globalRoots
    const sendOptions = { ...globalSendOptions, ...normalizeSendOption(options) }
    const handleNotFound = typeof options?.handleNotFound === 'function' ? options?.handleNotFound : globalHandleNotFound

    for (let i = 0; i < roots.length; i++) {
      const root = roots[i]
      const { statusCode, headers, stream, type } = await send(this.request.raw, path, { ...sendOptions, root })
      switch (type) {
        case 'file':
        case 'directory': {
          this.status(statusCode)
          this.headers({
            ...headers,
            'content-disposition': `attachment; filename="${encodeURIComponent(filename)}"`
          })
          await this.send(stream)
          break
        }
        case 'error': {
          if (statusCode === 404) {
            // try next root path
            if (i < roots.length - 1) continue
            // allows custom not found
            // mostly used in spa
            if (typeof handleNotFound === 'function') {
              await handleNotFound(this.request, this)
            } else {
              this.callNotFound()
            }
          } else {
            this.status(statusCode)
            this.headers(headers)
            await this.send(stream)
          }
          break
        }
      }
    }
  })

  if (typeof serveURL === 'string') {
    fastify.route({
      url: serveURL + '*',
      method: ['GET', 'HEAD'],
      handler: (request, reply) => {
        const index = request.url.indexOf(serveURL)
        return reply.sendFile(request.url.slice(index + serveURL.length))
      }
    })
  }
}

export const FastifyStatic = FastifyPlugin(plugin, {
  fastify: '4.x',
  name: '@kakang/fastify-static',
  decorators: {
    fastify: [],
    request: [],
    reply: [],
  },
  dependencies: [],
  encapsulate: false,
})
