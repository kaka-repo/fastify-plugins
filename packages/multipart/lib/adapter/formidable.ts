import { type FastifyRequest } from 'fastify'
import Formidable from 'formidable'
import type IncomingForm from 'formidable/Formidable'
import * as fs from 'fs'
import { type FastifyMultipartOption } from '..'
import { FST_MP_FIELDS_LIMIT, FST_MP_FIELD_SIZE_LIMIT, FST_MP_FILES_LIMIT, FST_MP_FILE_SIZE_LIMIT, FST_MP_UNEXPECTED } from '../error'
import { type Storage } from '../storage/storage'
import { kIsMultipartParsed, kStorage } from '../symbols'
import { Adapter, type AdapterIteratorResult, type AdapterParseReturn } from './adapter'

export class FormidableAdapter extends Adapter {
  readonly #formidable: IncomingForm
  readonly #storage: Storage
  readonly #removeFromBody: boolean

  constructor (request: FastifyRequest, option: FastifyMultipartOption) {
    super(request, option)
    this.name = 'FormidableAdapter'
    this.#formidable = Formidable({
      maxFields: option.limits?.fields ?? option.limits?.parts,
      maxFieldsSize: option.limits?.fieldSize,
      maxFiles: option.limits?.files ?? option.limits?.parts,
      maxFileSize: option.limits?.fileSize,
      maxTotalFileSize: (option.limits?.fieldSize ?? 200 * 1024 * 1024) * (option.limits?.files ?? option.limits?.parts ?? 20),
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
    const formidable = this.#formidable

    function onDone (): void {
      request[kIsMultipartParsed] = true
      ended = true
    }

    formidable.on('field', function (name, value) {
      stack.push({ type: 'field', name, value, info: {} })
    })
    formidable.on('file', function (name, file) {
      if (error === null) {
        stack.push({
          type: 'file',
          name,
          // since formidable auto download the stream to tmp
          // we read it from the tmp
          value: fs.createReadStream(file.filepath),
          info: {
            filename: file.originalFilename,
            mimeType: file.mimetype,
          },
        })
      }
    })
    formidable.on('error', function (err) {
      switch (err.code) {
        case 1006: {
          // 1006 = max fields size
          error = FST_MP_FIELD_SIZE_LIMIT('unknown')
          break
        }
        case 1007: {
          // 1007 = max fields
          error = FST_MP_FIELDS_LIMIT()
          break
        }
        // TODO: branch test missing
        /* c8 ignore next */
        case 1009:
        case 1016: {
          // 1009 = max total file size
          // 1016 = max file size
          error = FST_MP_FILE_SIZE_LIMIT('unknown')
          break
        }
        case 1015: {
          // 1015 = max files
          error = FST_MP_FILES_LIMIT()
          break
        }
        // safety
        /* c8 ignore next 6 */
        default: {
          // unknown error
          error = FST_MP_UNEXPECTED()
          error.cause = err
          break
        }
      }
    })
    formidable.on('end', onDone)
    formidable.parse(request.raw).catch(() => {})

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
