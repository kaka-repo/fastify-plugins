import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { compose } from 'node:stream'
import { run } from 'node:test'
import { spec as Spec } from 'node:test/reporters'

function findFiles () {
  const files = readdirSync(resolve('test'), { recursive: true })
  return files.filter((file) => String(file).endsWith('.test.ts')).map((file) => resolve('test', String(file)))
}

run({
  concurrency: true,
  timeout: 30_000,
  setup: (test) => {
    const reportor = new Spec()
    compose(test.reporter, reportor).pipe(process.stdout)
  },
  files: findFiles()
}).on('test:fail', (data) => {
  if (data.todo === undefined || data.todo === false) {
    process.exitCode = 1;
  }
});