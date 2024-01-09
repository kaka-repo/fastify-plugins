import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { run } from 'node:test'
import { tap } from 'node:test/reporters'

function findFiles (): string[] {
  const files = readdirSync(resolve('.'), { recursive: true })
  return files.filter((file) => String(file).endsWith('.test.ts')).map((file) => resolve(String(file)))
}

run({
  concurrency: true,
  timeout: 30_000,
  files: findFiles()
})
  .compose(tap)
  .pipe(process.stdout)
