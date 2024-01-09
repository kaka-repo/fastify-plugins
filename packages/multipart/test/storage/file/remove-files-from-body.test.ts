import { Blob } from 'buffer'
import * as fs from 'fs/promises'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FormData } from 'undici'
import { BusboyAdapter } from '../../../lib/adapter/busboy'
import { FileStorage } from '../../../lib/storage/file'
import { createFastify } from '../../create-fastify'
import { request } from '../../request'

test('FileStorage - removeFilesFromBody', async function (t) {
  await t.test('with addContentTypeParser', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: FileStorage
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 200)

    const json = await response.json()

    assert.equal(json.body.foo, 'bar')
    assert.equal(typeof json.body?.file, 'undefined')
    {
      assert.ok(json.files.file)
      const buf = await fs.readFile(json.files.file.value as string)
      assert.equal(buf.toString(), 'helloworld')
    }
  })

  await t.test('with addHook', async function (t) {
    const fastify = await createFastify(t, {
      addHook: true,
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: FileStorage
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 200)

    const json = await response.json()

    assert.equal(json.body.foo, 'bar')
    assert.equal(typeof json.body?.file, 'undefined')
    {
      assert.ok(json.files.file)
      const buf = await fs.readFile(json.files.file.value as string)
      assert.equal(buf.toString(), 'helloworld')
    }
  })

  t.test('with multipart', async function (t) {
    const fastify = await createFastify(t, {
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: FileStorage
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
    {
      assert.ok(json.files.file)
      const buf = await fs.readFile(json.files.file.value as string)
      assert.equal(buf.toString(), 'helloworld')
    }
  })

  await t.test('with no file provided', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: FileStorage
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
