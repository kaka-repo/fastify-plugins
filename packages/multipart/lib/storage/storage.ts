import { type FastifyInstance } from 'fastify'
import { type Readable } from 'stream'
import { finished } from 'stream/promises'
import { type FastifyMultipartOption } from '..'
import { type File } from '../adapter/adapter'
import { kStorage } from '../symbols'

export interface StorageSaveReturn {
  name: string
  value: File
}

export class Storage {
  name: string

  static [kStorage]: any = true

  constructor (_option?: FastifyMultipartOption['storageOption'], ..._args: any[]) {
    this.name = 'Storage'
  }

  // we provide method for global prepare or cleanup task
  static async prepare (_fastify: FastifyInstance): Promise<void> {}
  static async cleanup (_fastify: FastifyInstance): Promise<void> {}

  // we provide method for each prepare or cleanup task
  async prepare (_fastify: FastifyInstance): Promise<void> {}
  async cleanup (_fastify: FastifyInstance): Promise<void> {}

  // save file
  async save (name: string, value: Readable, info: { filename: string }): Promise<StorageSaveReturn> {
    // by default - discard
    value.resume()
    await finished(value)
    return { name, value: { name: info.filename, value: info.filename } }
  }
}
