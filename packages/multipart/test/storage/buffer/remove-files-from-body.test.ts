import { Blob } from 'buffer'
import { FormData } from 'undici'
import { BusboyAdapter } from '../../../lib/adapter/busboy'
import { BufferStorage } from '../../../lib/storage/buffer'
import { createFastify } from '../../create-fastify'
import { request } from '../../request'

import { test } from '@kakang/unit'

test('BufferStorage - removeFilesFromBody', async function (t) {
  t.test('with addContentTypeParser', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: BufferStorage,
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(typeof json.body?.file, 'undefined')
    t.deepEqual(json.files.file, { name: 'hello_world.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) } })
  })

  t.test('with addHook', async function (t) {
    const fastify = await createFastify(t, {
      addHook: true,
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: BufferStorage,
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(typeof json.body?.file, 'undefined')
    t.deepEqual(json.files.file, { name: 'hello_world.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) } })
  })

  t.test('with multipart', async function (t) {
    const fastify = await createFastify(t, {
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: BufferStorage,
    }, {
      inline: true,
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(typeof json.body?.file, 'undefined')
    t.deepEqual(json.files.file, { name: 'hello_world.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) } })
  })

  t.test('with no file provided', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: BufferStorage,
    })

    const form = new FormData()
    form.append('foo', 'bar')

    const response = await request(fastify.listeningOrigin, form)
    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(typeof json.body?.file, 'undefined')
    t.equal(typeof json.files?.file, 'undefined')
  })
})
