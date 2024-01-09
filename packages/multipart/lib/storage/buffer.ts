import { type Readable } from 'stream'
import { buffer } from 'stream/consumers'
import { Storage, type StorageSaveReturn } from './storage'

export class BufferStorage extends Storage {
  constructor () {
    super()
    this.name = 'BufferStorage'
  }

  async save (name: string, value: Readable, info: { filename: string }): Promise<StorageSaveReturn> {
    const buf = await buffer(value)
    return { name, value: { name: info.filename, value: buf } }
  }
}
