import { test } from '@kakang/unit'
import Fastify from 'fastify'
import { rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from '../lib'

test('envfile', async function (t) {
  const tmpEnv = resolve('.tmp.env')

  t.before(async function () {
    await writeFile(tmpEnv, 'FOO=BAR\nNOT=EXIST')
  })

  t.after(async function () {
    await rm(tmpEnv, { force: true })
  })

  t.test('', async function (t) {
    const ok: typeof t.ok = t.ok

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

    ok(env)
    t.equal(env.FOO, 'BAR')
    t.equal(typeof env.NOT, 'undefined')
    t.equal(typeof plugin, 'function')

    const fastify = Fastify()
    fastify.register(plugin)
    await fastify.ready()

    // @ts-expect-error we need to types by client
    ok(fastify.config)
    // @ts-expect-error we need to types by client
    t.equal(fastify.config.FOO, 'BAR')
    // @ts-expect-error we need to types by client
    t.equal(typeof fastify.config.NOT, 'undefined')
  })
})
