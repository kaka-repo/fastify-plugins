import { Blob } from 'buffer'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FormData } from 'undici'
import { Adapter } from '../../lib/adapter/adapter'
import { Storage } from '../../lib/storage/storage'
import { createFastify } from '../create-fastify'
import { request } from '../request'

test('Adapter', async function (t) {
  await t.test('parsed - iterate do nothing', async function (t) {
    const fastify = await createFastify(t, {
      adapter: Adapter,
      storage: Storage
    }, {
      iterator: true
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 200)

    const json = await response.json()

    // raw adapter do nothing
    assert.equal(typeof json.body?.foo, 'undefined')
    assert.equal(typeof json.body?.file, 'undefined')
    assert.equal(typeof json.files?.file, 'undefined')
  })

  await t.test('json - iterate do nothing', async function (t) {
    const fastify = await createFastify(t, {
      adapter: Adapter,
      storage: Storage
    }, {
      iterator: true
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(fastify.listeningOrigin, JSON.stringify({ hello: 'world' }) as any, { 'Content-Type': 'application/json' })
    assert.equal(response.status, 200)

    const json = await response.json()

    // raw adapter do nothing
    assert.equal(typeof json.body?.hello, 'undefined')
    assert.equal(typeof json.body?.file, 'undefined')
    assert.equal(typeof json.files?.file, 'undefined')
  })

  await t.test('json - parseMultipart do nothing', async function (t) {
    const fastify = await createFastify(t, {
      adapter: Adapter,
      storage: Storage
    }, {
      inline: true
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(fastify.listeningOrigin, JSON.stringify({ hello: 'world' }) as any, { 'Content-Type': 'application/json' })
    assert.equal(response.status, 200)

    const json = await response.json()

    // raw adapter do nothing
    assert.equal(json.body?.hello, 'world')
    assert.equal(typeof json.body?.file, 'undefined')
    assert.equal(typeof json.files?.file, 'undefined')
  })

  await t.test('json - addHook do nothing', async function (t) {
    const fastify = await createFastify(t, {
      addHook: true,
      adapter: Adapter,
      storage: Storage
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(fastify.listeningOrigin, JSON.stringify({ hello: 'world' }) as any, { 'Content-Type': 'application/json' })
    assert.equal(response.status, 200)

    const json = await response.json()

    // raw adapter do nothing
    assert.equal(json.body?.hello, 'world')
    assert.equal(typeof json.body?.file, 'undefined')
    assert.equal(typeof json.files?.file, 'undefined')
  })
})
