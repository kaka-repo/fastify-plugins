import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  args: process.args,
  options: {
    clean: { type: 'boolean' },
    build: { type: 'string' }
  }
})

function isBuildAsset (name) {
  return String(name).endsWith('.js') ||
  String(name).endsWith('.cjs') ||
  String(name).endsWith('.mjs') ||
  String(name).endsWith('.map') ||
  String(name).endsWith('.d.ts') ||
  String(name).endsWith('.d.cts') ||
  String(name).endsWith('.d.mts')
}

async function clean () {
  for (const file of await fs.readdir(path.resolve('lib'), { recursive: true })) {
    if (isBuildAsset(file)) {
      await fs.rm(path.resolve('lib', file), { force: true })
    }
  }

  for (const file of await fs.readdir(path.resolve('test'), { recursive: true })) {
    if (isBuildAsset(file)) {
      await fs.rm(path.resolve('test', file), { force: true })
    }
  }
}

async function build (mode = 'all') {
  if (mode === 'all' || mode === 'cjs') {
    console.log('build cjs - start')
    spawnSync('tsc', ['-p', 'tsconfig.cjs.json'], { stdio: 'pipe' })
    // for (const file of await fs.readdir(path.resolve('lib'), { recursive: true })) {
    //   if (isBuildAsset(file)) {
    //     await fs.rename(path.resolve('lib', file), path.resolve('lib', file).replace('.js', '.cjs').replace('.d.ts', '.d.cts'))
    //   }
    // }
    console.log('build cjs - end')
  }
  if (mode === 'all' || mode === 'mjs') {
    console.log('build mjs - start')
    spawnSync('tsc', ['-p', 'tsconfig.mjs.json'], { stdio: 'pipe' })
    // for (const file of await fs.readdir(path.resolve('lib'), { recursive: true })) {
    //   if (isBuildAsset(file)) {
    //     await fs.rename(path.resolve('lib', file), path.resolve('lib', file).replace('.js', '.mjs').replace('.d.ts', '.d.mts'))
    //   }
    // }
    spawnSync('tsc-alias', ['-p', 'tsconfig.mjs.json'], { stdio: 'pipe' })
    console.log('build mjs - end')
  }
}

if (values.clean === true) await clean()

if (typeof values.build === 'string') {
  await clean()
  await build(values.build)
}
