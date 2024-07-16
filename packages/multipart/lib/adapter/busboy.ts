import Busboy from 'busboy'
import { type FastifyRequest } from 'fastify'
import { type FastifyMultipartOption } from '..'
import { FST_MP_FIELDS_LIMIT, FST_MP_FIELD_SIZE_LIMIT, FST_MP_FILES_LIMIT, FST_MP_FILE_SIZE_LIMIT, FST_MP_PARTS_LIMIT } from '../error'
import { type Storage } from '../storage/storage'
import { kIsMultipartParsed, kStorage } from '../symbols'
import { Adapter, type AdapterIteratorResult, type AdapterParseReturn } from './adapter'

export class BusboyAdapter extends Adapter {
  readonly #busboy: Busboy.Busboy
  readonly #storage: Storage
  readonly #removeFromBody: boolean

  constructor (request: FastifyRequest, option: FastifyMultipartOption) {
    super(request, option)
    this.name = 'BusboyAdapter'
    this.#busboy = Busboy({
      headers: request.raw.headers,
      limits: option.limits,
    })
    this.#removeFromBody = option.removeFilesFromBody ?? false
    this.#storage = request[kStorage]
  }

  async parse (request: FastifyRequest): Promise<AdapterParseReturn> {
    // super used create no prototype result
    const result = await super.parse(request)
    for await (const { type, name, value, info } of this.iterate(request)) {
      switch (type) {
        case 'field': {
          this._update(result.fields, name, value)
          break
        }
        case 'file': {
          const file = await this.#storage.save(name, value, info)
          this._update(result.files, file.name, file.value)
          if (!this.#removeFromBody) {
            this._update(result.fields, file.name, file.value.value as string)
          }
          break
        }
      }
    }
    return result
  }

  iterate (request: FastifyRequest): AsyncIterableIterator<AdapterIteratorResult> {
    const stack: any[] = []
    let ended = false
    let error: null | Error = null
    const busboy = this.#busboy

    function onDone (): void {
      if (!ended) {
        request[kIsMultipartParsed] = true
        ended = true
      }
    }

    busboy.on('field', function (name, value, info) {
      if (info.valueTruncated) {
        error = FST_MP_FIELD_SIZE_LIMIT(name)
      } else {
        stack.push({ type: 'field', name, value, info })
      }
    })
    busboy.on('fieldsLimit', function () {
      error = FST_MP_FIELDS_LIMIT()
    })
    busboy.on('file', function (name, value, info) {
      if (error !== null) {
        // we auto skip when error exists
        value.resume()
      } else {
        // we need to listen on stream
        value.on('limit', function () {
          error = FST_MP_FILE_SIZE_LIMIT(name)
        })
        // safety
        /* c8 ignore next 3 */
        value.on('error', function (err) {
          error = err
        })
        // we do not consume stream here
        // which allow the user to do so
        stack.push({ type: 'file', name, value, info })
      }
    })
    busboy.on('filesLimit', function () {
      error = FST_MP_FILES_LIMIT()
    })
    busboy.on('partsLimit', function () {
      error = FST_MP_PARTS_LIMIT()
    })
    busboy.on('close', onDone)
    busboy.on('finish', onDone)
    request.raw.pipe(busboy)

    // we need to wait the process to consume the data
    // otherwise, it would provide undefined value immediately
    // and cause infinite loop
    async function consumeNext (): Promise<boolean> {
      return await new Promise(function (resolve) {
        if (ended || error !== null || stack.length > 0) {
          resolve(true)
        } else {
          // MUST not use process.nextTick or queueMicrotask here
          // it would block the event loop
          setImmediate(function () {
            consumeNext().then(resolve, () => {})
          })
        }
      })
    }

    return {
      async next () {
        await consumeNext()
        if (error !== null) {
          // when ever we face error
          // we need to throw and stop the iterator
          throw error
        } else {
          // when done is true, the value passed to return function
          // so, we need to compute done before stack.shift()
          const done = (ended && stack.length === 0)
          return {
            value: stack.shift(),
            done,
          }
        }
      },
      // not able to test but good to have
      /* c8 ignore next 8 */
      async return () {
        // proper cleanup process
        onDone()
        return {
          value: undefined,
          done: true,
        }
      },
      // not able to test but good to have
      /* c8 ignore next 8 */
      async throw () {
        // error cleanup process
        onDone()
        return {
          value: undefined,
          done: true,
        }
      },
      [Symbol.asyncIterator] () {
        return this
      },
    }
  }
}
