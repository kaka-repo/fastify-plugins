import { send, SendOptions, SendResult } from '@kakang/abstract-send'
import { createWriteStream } from 'node:fs'
import { IncomingMessage } from 'node:http'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { Engine } from './engine'

export class FileSystemEngine extends Engine {
  async upload (path: string, readable: Readable): Promise<void> {
    const writable = createWriteStream(path)
    await pipeline(readable, writable)
  }

  async download (message: IncomingMessage, path: string, options?: SendOptions): Promise<SendResult> {
    return send(message, path, options)
  }
}
