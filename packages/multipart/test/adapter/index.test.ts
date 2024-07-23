import { test } from '@kakang/unit'
import { Blob } from 'buffer'
import { FormData } from 'undici'
import { Adapter } from '../../lib/adapter/adapter'
import { Storage } from '../../lib/storage/storage'
import { createFastify } from '../create-fastify'
import { request } from '../request'

test('Adapter', async function (t) {
  t.test('parsed - iterate do nothing', async function (t) {
    const fastify = await createFastify(t, {
      adapter: Adapter,
      storage: Storage,
    }, {
      iterator: true,
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    t.equal(response.status, 200)

    const json = await response.json()

    // raw adapter do nothing
    t.equal(typeof json.body?.foo, 'undefined')
    t.equal(typeof json.body?.file, 'undefined')
    t.equal(typeof json.files?.file, 'undefined')
  })

  t.test('json - iterate do nothing', async function (t) {
    const fastify = await createFastify(t, {
      adapter: Adapter,
      storage: Storage,
    }, {
      iterator: true,
    })

    const response = await request(fastify.listeningOrigin, JSON.stringify({ hello: 'world' }) as any, { 'Content-Type': 'application/json' })
    t.equal(response.status, 200)

    const json = await response.json()

    // raw adapter do nothing
    t.equal(typeof json.body?.hello, 'undefined')
    t.equal(typeof json.body?.file, 'undefined')
    t.equal(typeof json.files?.file, 'undefined')
  })

  t.test('json - parseMultipart do nothing', async function (t) {
    const fastify = await createFastify(t, {
      adapter: Adapter,
      storage: Storage,
    }, {
      inline: true,
    })

    const response = await request(fastify.listeningOrigin, JSON.stringify({ hello: 'world' }) as any, { 'Content-Type': 'application/json' })
    t.equal(response.status, 200)

    const json = await response.json()

    // raw adapter do nothing
    t.equal(json.body?.hello, 'world')
    t.equal(typeof json.body?.file, 'undefined')
    t.equal(typeof json.files?.file, 'undefined')
  })

  t.test('json - addHook do nothing', async function (t) {
    const fastify = await createFastify(t, {
      addHook: true,
      adapter: Adapter,
      storage: Storage,
    })

    const response = await request(fastify.listeningOrigin, JSON.stringify({ hello: 'world' }) as any, { 'Content-Type': 'application/json' })
    t.equal(response.status, 200)

    const json = await response.json()

    // raw adapter do nothing
    t.equal(json.body?.hello, 'world')
    t.equal(typeof json.body?.file, 'undefined')
    t.equal(typeof json.files?.file, 'undefined')
  })

  t.test('json - formData do nothing', async function (t) {
    const fastify = await createFastify(t, {
      adapter: Adapter,
      storage: Storage,
    }, {
      formData: true,
    })

    const response = await request(fastify.listeningOrigin, JSON.stringify({ hello: 'world' }) as any, { 'Content-Type': 'application/json' })
    t.equal(response.status, 200)

    const json = await response.json()

    // raw adapter do nothing
    t.equal(typeof json.body?.hello, 'undefined')
    t.equal(typeof json.body?.file, 'undefined')
    t.equal(typeof json.files?.file, 'undefined')
  })
})
