import { SendOptions } from '@kakang/abstract-send/lib/options'
import { FastifyStaticOption } from '.'

export function validateRootOption (root?: unknown) {
  if (typeof root !== 'string' && !Array.isArray(root)) throw Error('option "root" should be either string or string[]')
  if (Array.isArray(root) && root.some((path) => typeof path !== 'string')) throw Error('option "root" should be either string or string[]')
}

export function normalizeRoots (root?: unknown): string[] {
  validateRootOption(root)
  return Array.isArray(root) ? root : [root as string]
}

export function normalizeServe (serve?: unknown): string | false {
  if (typeof serve === 'string') {
    // we treat it as prefix
    if (serve[serve.length - 1] === '/') return serve
    if (serve[serve.length - 1] === '*') return serve.slice(0, -1)
    return serve + '/'
  } else {
    return serve === false ? false : '/'
  }
}

export function normalizeSendOption (options?: Partial<FastifyStaticOption>): SendOptions {
  return {
    acceptRanges: options?.acceptRanges,
    cacheControl: options?.cacheControl,
    dotfiles: options?.dotfiles,
    etag: options?.etag,
    extensions: options?.extensions,
    immutable: options?.immutable,
    index: options?.index,
    lastModified: options?.lastModified,
    maxAge: options?.maxAge,
    maxage: options?.maxage,
    engine: options?.engine
  }
}
