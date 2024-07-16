import { type FastifyInstance, type FastifyRequest } from 'fastify'
import { type Readable } from 'stream'
import { type FastifyMultipartOption } from '..'
import { kAdapter } from '../symbols'

export interface AdapterIteratorFileResult {
  type: 'file'
  name: string
  value: Readable
  info: {
    filename: string
    encoding?: string
    mimeType?: string
  }
}

export interface AdapterIteratorFieldResult {
  type: 'field'
  name: string
  value: string
  info: {
    encoding?: string
    mimeType?: string
  }
}

export type AdapterIteratorResult = AdapterIteratorFileResult | AdapterIteratorFieldResult

export class Adapter {
  name: string

  static [kAdapter]: any = true

  // we provide method for global prepare or cleanup task
  static async prepare (_fastify: FastifyInstance): Promise<void> {}
  static async cleanup (_fastify: FastifyInstance): Promise<void> {}

  constructor (_request: FastifyRequest, _option: FastifyMultipartOption, ..._args: any[]) {
    this.name = 'Adapter'
  }

  // we provide method for each prepare or cleanup task
  async prepare (_fastify: FastifyInstance): Promise<void> {}
  async cleanup (_fastify: FastifyInstance): Promise<void> {}

  async parse (_request: FastifyRequest): Promise<AdapterParseReturn> {
    const fields = Object.create(null)
    const files = Object.create(null)
    return { fields, files }
  }

  iterate (_request: FastifyRequest): AsyncIterableIterator<AdapterIteratorResult> {
    return {
      async next () {
        return { value: undefined, done: true }
      },
      // not able to test but good to have
      /* c8 ignore next 3 */
      [Symbol.asyncIterator] () {
        return this
      },
    }
  }

  _update (obj: Fields, name: string, value: string): void
  _update (obj: Files, name: string, value: File): void
  _update (obj: any, name: string, value: string | File): void {
    if (Array.isArray(obj[name])) {
      // when multiple value exist
      obj[name].push(value)
    } else if (typeof obj[name] !== 'undefined') {
      // when already assigned
      obj[name] = [obj[name], value]
    } else {
      // when not assigned
      obj[name] = value
    }
  }
}

export interface File {
  name: string
  value: unknown
}

export type Fields = Record<string, string | string[]>
export type Files = Record<string, File | File[]>

export interface AdapterParseOption {
  removeFilesFromBody?: boolean
}
export interface AdapterParseReturn {
  fields: Fields
  files: Files
}
