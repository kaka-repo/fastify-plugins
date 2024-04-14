import { test } from '@kakang/unit'
import { Blob } from 'buffer'
import * as fs from 'fs/promises'
import { FormData } from 'undici'
import { BusboyAdapter } from '../../../lib/adapter/busboy'
import { FileStorage } from '../../../lib/storage/file'
import { createFastify } from '../../create-fastify'
import { request } from '../../request'

test('FileStorage - removeFilesFromBody', async function (t) {
  t.test('with addContentTypeParser', async function (t) {
    const ok: typeof t.ok = t.ok
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
    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(typeof json.body?.file, 'undefined')
    {
      ok(json.files.file)
      const buf = await fs.readFile(json.files.file.value as string)
      t.equal(buf.toString(), 'helloworld')
    }
  })

  t.test('with addHook', async function (t) {
    const ok: typeof t.ok = t.ok
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
    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(typeof json.body?.file, 'undefined')
    {
      ok(json.files.file)
      const buf = await fs.readFile(json.files.file.value as string)
      t.equal(buf.toString(), 'helloworld')
    }
  })

  t.test('with multipart', async function (t) {
    const ok: typeof t.ok = t.ok
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
    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(typeof json.body?.file, 'undefined')
    {
      ok(json.files.file)
      const buf = await fs.readFile(json.files.file.value as string)
      t.equal(buf.toString(), 'helloworld')
    }
  })

  t.test('with no file provided', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      removeFilesFromBody: true,
      adapter: BusboyAdapter,
      storage: FileStorage
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
