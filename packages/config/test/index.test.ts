import Fastify from 'fastify'
import assert from 'node:assert/strict'
import { rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { build } from '../lib'

test('envfile', async function (t) {
  const tmpEnv = resolve('.tmp.env')

  t.before(async function () {
    await writeFile(tmpEnv, 'FOO=BAR\nNOT=EXIST')
  })

  t.after(async function () {
    await rm(tmpEnv, { force: true })
  })

  await t.test('', async function () {
    const { env, plugin } = build({
      schema: {
        type: 'object',
        properties: {
          FOO: { type: 'string' }
        }
      },
      data: process.env,
      dotenv: { path: tmpEnv }
    })

    assert.ok(env)
    assert.equal(env.FOO, 'BAR')
    assert.equal(typeof env.NOT, 'undefined')
    assert.equal(typeof plugin, 'function')

    const fastify = Fastify()
    fastify.register(plugin)
    await fastify.ready()

    // @ts-expect-error we need to types by client
    assert.ok(fastify.config)
    // @ts-expect-error we need to types by client
    assert.equal(fastify.config.FOO, 'BAR')
    // @ts-expect-error we need to types by client
    assert.equal(typeof fastify.config.NOT, 'undefined')
  })
})
