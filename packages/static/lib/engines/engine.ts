import { SendOptions, SendResult } from '@kakang/abstract-send'
import { IncomingMessage } from 'http'
import { Readable } from 'stream'

// engine is used to upload and download files from store
// we implement the detail of send.engine inside the plugin engine.
export abstract class Engine {
  abstract upload (path: string, readable: Readable): Promise<void>

  abstract download (message: IncomingMessage, path: string, options?: SendOptions): Promise<SendResult>
}
