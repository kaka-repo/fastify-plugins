import { type FastifyPluginAsync, type FastifyRequest } from 'fastify'
import FastifyPlugin from 'fastify-plugin'
import { blob } from 'node:stream/consumers'
import { type Adapter, type AdapterIteratorResult, type Files } from './adapter/adapter'
import { FST_MP_CONFLICT_CONFIG, FST_MP_INVALID_OPTION } from './error'
import { type Storage } from './storage/storage'
import { kAdapter, kIsMultipart, kIsMultipartParsed, kStorage } from './symbols'

declare module 'fastify' {
  interface FastifyRequest {
    files: Files | null
    [kAdapter]: Adapter
    [kStorage]: Storage
    [kIsMultipart]: boolean
    [kIsMultipartParsed]: boolean
    parseMultipart: <Payload = any>(this: FastifyRequest) => Promise<Payload>
    multipart: (this: FastifyRequest) => AsyncIterableIterator<AdapterIteratorResult>
    formData: (this: FastifyRequest) => Promise<FormData>
  }
}

export interface FastifyMultipartLimit {
  fields?: number
  fieldSize?: number
  fieldNameSize?: number
  files?: number
  fileSize?: number
  parts?: number
  headerPairs?: number
}

export interface FastifyMultipartOption {
  // we must provide adapter used for parsing request
  adapter: typeof Adapter
  // we must provide storage used for handle files
  storage: typeof Storage
  // TODO: we may infer the types here
  storageOption?: Record<string, unknown>

  // common option
  addContentTypeParser?: boolean
  addHook?: boolean
  removeFilesFromBody?: boolean

  // shared limit option
  limits?: FastifyMultipartLimit
}

const plugin: FastifyPluginAsync<FastifyMultipartOption> = async function (fastify, option) {
  // we check if adapter provide special symbol
  if (option.adapter?.[kAdapter] !== true) {
    throw FST_MP_INVALID_OPTION('option.adapter', 'Adapter', option.adapter)
  }

  // we check if storage provide special symbol
  if (option.storage?.[kStorage] !== true) {
    throw FST_MP_INVALID_OPTION('option.storage', 'Storage', option.storage)
  }

  if (option.addContentTypeParser === true && option.addHook === true) {
    throw FST_MP_CONFLICT_CONFIG()
  }

  fastify.decorateRequest(kAdapter, null)
  fastify.decorateRequest(kStorage, null)
  fastify.decorateRequest(kIsMultipart, false)
  fastify.decorateRequest(kIsMultipartParsed, false)
  fastify.decorateRequest('files', null)
  fastify.decorateRequest('parseMultipart', async function (this: FastifyRequest) {
    const request = this

    // skip if not multipart
    if (!request[kIsMultipart]) return
    // skip if already parsed
    if (request[kIsMultipartParsed]) {
      request.log.warn('multipart already parsed, you probably need to check your code why it is parsed twice.')
      return request.body
    }

    // we prepare the environment before parsing data
    const storage = new Storage(option.storageOption)
    await storage.prepare(fastify)
    request[kStorage] = storage

    const adapter = new Adapter(request, option)
    await adapter.prepare(fastify)
    request[kAdapter] = adapter

    const { fields, files } = await adapter.parse(request)

    request.body = fields
    request.files = files

    return request.body
  })
  fastify.decorateRequest('multipart', function (this: FastifyRequest): AsyncIterableIterator<AdapterIteratorResult> {
    const request = this

    // skip if not multipart
    if (!request[kIsMultipart]) {
      return {
        async next () {
          return { value: undefined, done: true }
        },
        [Symbol.asyncIterator] () {
          return this
        },
      }
    }
    // skip if already parsed
    if (request[kIsMultipartParsed]) {
      request.log.warn('multipart already parsed, you probably need to check your code why it is parsed twice.')
      return {
        async next () {
          return { value: undefined, done: true }
        },
        [Symbol.asyncIterator] () {
          return this
        },
      }
    }

    // we prepare the environment before parsing data
    let isInit = false
    let iterator: AsyncIterableIterator<AdapterIteratorResult> = null as any
    const storage = new Storage(option.storageOption)
    request[kStorage] = storage

    const adapter = new Adapter(request, option)
    request[kAdapter] = adapter

    return {
      async next () {
        if (!isInit) {
          // we initial in first tick
          await storage.prepare(fastify)
          await adapter.prepare(fastify)
          iterator = request[kAdapter].iterate(request)
          isInit = true
        }
        return await iterator.next()
      },
      // not able to test but good to have
      /* c8 ignore next 7 */
      async return () {
        await iterator?.return?.()
        return {
          value: undefined,
          done: true,
        }
      },
      // not able to test but good to have
      /* c8 ignore next 7 */
      async throw (err) {
        await iterator?.throw?.(err)
        return {
          value: undefined,
          done: true,
        }
      },
      [Symbol.asyncIterator] () {
        return this
      },
    }
  })
  fastify.decorateRequest('formData', async function (this: FastifyRequest): Promise<FormData> {
    const request = this
    const formData = new FormData()

    // skip if not multipart
    if (!request[kIsMultipart]) {
      return formData
    }
    // skip if already parsed
    if (request[kIsMultipartParsed]) {
      request.log.warn('multipart already parsed, you probably need to check your code why it is parsed twice.')
      return formData
    }

    for await (const { type, name, value, info } of request.multipart()) {
      switch (type) {
        case 'field': {
          formData.append(name, value)
          break
        }
        case 'file': {
          formData.append(name, await blob(value), info.filename)
          break
        }
      }
    }

    return formData
  })

  const { adapter: Adapter, storage: Storage } = option
  await Adapter.prepare(fastify)
  await Storage.prepare(fastify)

  if (option.addContentTypeParser === true) {
    fastify.addContentTypeParser('multipart/form-data', async function (request: FastifyRequest, _payload: any) {
      request[kIsMultipart] = true
      // we prepare the environment before parsing data
      const storage = new Storage(option.storageOption)
      await storage.prepare(fastify)
      request[kStorage] = storage

      const adapter = new Adapter(request, option)
      await adapter.prepare(fastify)
      request[kAdapter] = adapter

      const { fields, files } = await adapter.parse(request)

      request.files = files

      return fields
    })
  } else {
    fastify.addContentTypeParser('multipart/form-data', function (request, _, done) {
      request[kIsMultipart] = true
      done(null)
    })
  }

  if (option.addHook === true) {
    fastify.addHook('preValidation', async function (request: FastifyRequest) {
      // skip if not multipart
      if (!request[kIsMultipart]) return
      // skip if already parsed
      if (request[kIsMultipartParsed]) {
        request.log.warn('multipart already parsed, you probably need to check your code why it is parsed twice.')
        return
      }

      // we prepare the environment before parsing data
      const storage = new Storage(option.storageOption)
      await storage.prepare(fastify)
      request[kStorage] = storage

      const adapter = new Adapter(request, option)
      await adapter.prepare(fastify)
      request[kAdapter] = adapter

      const { fields, files } = await adapter.parse(request)

      request.body = fields
      request.files = files
    })
  }

  // we provide cleanup here
  fastify.addHook('onResponse', async function (request) {
    if (request[kIsMultipartParsed]) {
      // we should not terminate when either cleanup task failed
      // so, we use Promise.allSettled here
      await Promise.allSettled([
        request[kAdapter].cleanup(fastify),
        request[kStorage].cleanup(fastify),
      ])
    }
  })

  fastify.addHook('onClose', async function () {
    // we should not terminate when either cleanup task failed
    // so, we use Promise.allSettled here
    await Promise.allSettled([
      Adapter.cleanup(fastify),
      Storage.cleanup(fastify),
    ])
  })
}

export const FastifyMultipart = FastifyPlugin(plugin, {
  fastify: '4.x',
  name: '@kakang/fastify-multipart',
  dependencies: [],
})
export default FastifyMultipart
