import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { PassThrough } from 'node:stream'
import { run } from 'node:test'
import { tap } from 'node:test/reporters'

function findFiles (): string[] {
  const files = readdirSync(resolve('test'), { recursive: true })
  return files.filter((file) => String(file).endsWith('.test.ts')).map((file) => resolve('test', String(file)))
}

run({
  concurrency: true,
  timeout: 30_000,
  files: findFiles()
})
  .compose(tap)
  // we need the to inspect and set exit code
  // whenever test failure
  .pipe(new PassThrough({
    transform (chunk, _, callback) {
      if (String(chunk).includes('not ok')) {
        process.exitCode = 1
      }
      callback(null, chunk)
    }
  }))
  .pipe(process.stdout)
