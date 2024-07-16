import * as crypto from 'crypto'
import { type FastifyInstance } from 'fastify'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { type Readable } from 'stream'
import { finished } from 'stream/promises'
import { type FastifyMultipartOption } from '..'
import { Storage, type StorageSaveReturn } from './storage'

export interface FileStorageOption {
  uploadDir: string
}

export class FileStorage extends Storage {
  #uploadDir: string

  constructor (option?: FastifyMultipartOption['storageOption']) {
    super()
    this.name = 'FileStorage'
    this.#uploadDir = option?.uploadDir as string ?? os.tmpdir()
  }

  async prepare (_fastify: FastifyInstance): Promise<void> {
    await fs.promises.mkdir(this.#uploadDir, { recursive: true })
  }

  async save (name: string, value: Readable, info: { filename: string }): Promise<StorageSaveReturn> {
    const filename = `${crypto.randomUUID()}${path.extname(info.filename)}`
    const filepath = path.join(this.#uploadDir, filename)
    const stream = fs.createWriteStream(filepath)
    value.pipe(stream)
    await finished(stream)
    return { name, value: { name: filename, value: filepath } }
  }
}
