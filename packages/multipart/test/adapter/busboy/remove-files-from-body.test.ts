import { Blob } from 'buffer'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FormData } from 'undici'
import { BusboyAdapter } from '../../../lib/adapter/busboy'
import { Storage } from '../../../lib/storage/storage'
import { createFastify } from '../../create-fastify'
import { request } from '../../request'

test('BusboyAdapter - removeFilesFromBody', async function (t) {
  await t.test('with addContentTypeParser', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: Storage
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 200)

    const json = await response.json()

    assert.equal(json.body.foo, 'bar')
    assert.equal(typeof json.body?.file, 'undefined')
    assert.deepEqual(json.files.file, { name: 'hello_world.txt', value: 'hello_world.txt' })
  })

  await t.test('with addHook', async function (t) {
    const fastify = await createFastify(t, {
      addHook: true,
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: Storage
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 200)

    const json = await response.json()

    assert.equal(json.body.foo, 'bar')
    assert.equal(typeof json.body?.file, 'undefined')
    assert.deepEqual(json.files.file, { name: 'hello_world.txt', value: 'hello_world.txt' })
  })

  await t.test('with multipart', async function (t) {
    const fastify = await createFastify(t, {
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: Storage
    }, {
      inline: true
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 200)

    const json = await response.json()

    assert.equal(json.body.foo, 'bar')
    assert.equal(typeof json.body?.file, 'undefined')
    assert.deepEqual(json.files.file, { name: 'hello_world.txt', value: 'hello_world.txt' })
  })

  await t.test('with no file provided', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: Storage
    })

    const form = new FormData()
    form.append('foo', 'bar')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 200)

    const json = await response.json()

    assert.equal(json.body.foo, 'bar')
    assert.equal(typeof json.body?.file, 'undefined')
    assert.equal(typeof json.files?.file, 'undefined')
  })
})
