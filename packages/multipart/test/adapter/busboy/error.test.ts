import { Blob } from 'buffer'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FormData } from 'undici'
import { BusboyAdapter } from '../../../lib/adapter/busboy'
import { Storage } from '../../../lib/storage/storage'
import { createFastify } from '../../create-fastify'
import { request } from '../../request'

test('BusboyAdapter - error', async function (t) {
  await t.test('fields', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      adapter: BusboyAdapter,
      storage: Storage,
      limits: {
        fields: 0
      }
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 413)

    const json = await response.json()
    assert.equal(json.code, 'FST_MP_FIELDS_LIMIT')
  })

  await t.test('fieldSize', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      adapter: BusboyAdapter,
      storage: Storage,
      limits: {
        fieldSize: 0
      }
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 413)

    const json = await response.json()
    assert.equal(json.code, 'FST_MP_FIELD_SIZE_LIMIT')
  })

  await t.test('files', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      adapter: BusboyAdapter,
      storage: Storage,
      limits: {
        files: 0
      }
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 413)

    const json = await response.json()
    assert.equal(json.code, 'FST_MP_FILES_LIMIT')
  })

  await t.test('fileSize', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      adapter: BusboyAdapter,
      storage: Storage,
      limits: {
        fileSize: 0
      }
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 413)

    const json = await response.json()
    assert.equal(json.code, 'FST_MP_FILE_SIZE_LIMIT')
  })

  await t.test('parts', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      adapter: BusboyAdapter,
      storage: Storage,
      limits: {
        parts: 0
      }
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 413)

    const json = await response.json()
    assert.equal(json.code, 'FST_MP_PARTS_LIMIT')
  })

  await t.test('fileSize - non-block stream', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      adapter: BusboyAdapter,
      storage: Storage,
      limits: {
        fileSize: 0
      }
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')
    // we test if any more file would block the stream
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 413)

    const json = await response.json()
    assert.equal(json.code, 'FST_MP_FILE_SIZE_LIMIT')
  })
})
