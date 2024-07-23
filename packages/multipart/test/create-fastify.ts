import { type test } from '@kakang/unit'
import Fastify, { type FastifyInstance } from 'fastify'
import { Readable } from 'stream'
import FastifyMultipart, { type FastifyMultipartOption } from '../lib'
import { type Files } from '../lib/adapter/adapter'
import { kAdapter, kStorage } from '../lib/symbols'

type TestContext = Parameters<NonNullable<Parameters<typeof test>[0]>>[0]

// reduce keep alive to prevent `undici` keep the socket open
export const fastifyOptions = { keepAliveTimeout: 100 }

export async function createFastify (t: TestContext, options?: FastifyMultipartOption, parseMode?: { inline?: boolean | any, iterator?: boolean | any, formData?: boolean | any }): Promise<FastifyInstance> {
  parseMode ??= {}
  const inline = parseMode.inline ?? false
  const iterator = parseMode.iterator ?? false
  const formData = parseMode.formData ?? false
  const fastify = Fastify(fastifyOptions)

  await fastify.register(FastifyMultipart, options)

  fastify.post<{ Body: { foo: string, file: string } }>('/', async function (request, reply) {
    if (inline === true || typeof inline === 'object') {
      await request.parseMultipart()
    }
    if (iterator === true || typeof iterator === 'object') {
      const body = Object.create(null)
      const files = Object.create(null)
      for await (const { type, name, value, info } of request.multipart()) {
        switch (type) {
          case 'field': {
            request[kAdapter]._update(body, name, value)
            break
          }
          case 'file': {
            const file = await request[kStorage].save(name, value, info)
            request[kAdapter]._update(files as Files, file.name, file.value)
            if (options?.removeFilesFromBody !== true) {
              request[kAdapter]._update(body, file.name, file.value.value as string)
            }
            break
          }
        }
      }

      request.body = body
      request.files = files
    }
    if (formData === true || typeof formData === 'object') {
      const body = Object.create(null)
      const files = Object.create(null)
      const form = await request.formData()
      for (const [name, value] of form) {
        if (typeof value === 'string') {
          request[kAdapter]._update(body, name, value)
        } else {
          const file = await request[kStorage].save(name, Readable.fromWeb(value.stream()), { filename: value.name })
          request[kAdapter]._update(files as Files, file.name, file.value)
          if (options?.removeFilesFromBody !== true) {
            request[kAdapter]._update(body, file.name, file.value.value as string)
          }
        }
      }

      request.body = body
      request.files = files
    }
    return await reply.code(200).send({
      body: request.body,
      files: request.files,
    })
  })

  await fastify.listen({ port: 0, host: '127.0.0.1' })

  t.after(async function () {
    await fastify.close()
  })

  return await fastify
}
