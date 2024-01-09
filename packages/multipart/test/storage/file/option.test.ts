import { Blob } from 'buffer'
import * as fs from 'fs/promises'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as path from 'path'
import { FormData } from 'undici'
import { BusboyAdapter } from '../../../lib/adapter/busboy'
import { FileStorage } from '../../../lib/storage/file'
import { createFastify } from '../../create-fastify'
import { request } from '../../request'

const uploadDir = path.join(__dirname, 'tmp')

test('FileStorage - addContentTypeParser', async function (t) {
  await t.test('single file', async function (t) {
    t.after(async function () {
      await fs.rm(uploadDir, { recursive: true, force: true })
    })

    const fastify = await createFastify(t, {
      storageOption: { uploadDir },
      addContentTypeParser: true,
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
    {
      assert.ok(json.body.file)
      assert.equal(json.body.file.startsWith(uploadDir), true)
      const buf = await fs.readFile(json.body.file as string)
      assert.equal(buf.toString(), 'helloworld')
    }
    {
      assert.ok(json.files.file)
      assert.equal(json.files.file.value.startsWith(uploadDir), true)
      const buf = await fs.readFile(json.files.file.value as string)
      assert.equal(buf.toString(), 'helloworld')
    }
  })

  await t.test('multiple fields', async function (t) {
    t.after(async function () {
      await fs.rm(uploadDir, { recursive: true, force: true })
    })

    const fastify = await createFastify(t, {
      storageOption: { uploadDir },
      addContentTypeParser: true,
      adapter: BusboyAdapter,
      storage: FileStorage
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('foo', 'baz')
    form.append('foo', 'hello')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 200)

    const json = await response.json()

    assert.deepEqual(json.body.foo, ['bar', 'baz', 'hello'])
    {
      assert.ok(json.body.file)
      assert.equal(json.body.file.startsWith(uploadDir), true)
      const buf = await fs.readFile(json.body.file as string)
      assert.equal(buf.toString(), 'helloworld')
    }
    {
      assert.ok(json.files.file)
      assert.equal(json.files.file.value.startsWith(uploadDir), true)
      const buf = await fs.readFile(json.files.file.value as string)
      assert.equal(buf.toString(), 'helloworld')
    }
  })

  await t.test('multiple files', async function (t) {
    t.after(async function () {
      await fs.rm(uploadDir, { recursive: true, force: true })
    })

    const fastify = await createFastify(t, {
      storageOption: { uploadDir },
      addContentTypeParser: true,
      adapter: BusboyAdapter,
      storage: FileStorage
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world1.txt')
    form.append('file', new Blob(['hello', 'world', 'hello', 'world']), 'hello_world2.txt')
    form.append('file', new Blob(['hello', 'world', 'hello', 'world', 'hello', 'world']), 'hello_world3.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 200)

    const json = await response.json()

    assert.equal(json.body.foo, 'bar')
    {
      assert.ok(json.body.file[0])
      assert.equal(json.body.file[0].startsWith(uploadDir), true)
      const buf1 = await fs.readFile(json.body.file[0] as string)
      assert.equal(buf1.toString(), 'helloworld')
      assert.ok(json.body.file[1])
      assert.equal(json.body.file[1].startsWith(uploadDir), true)
      const buf2 = await fs.readFile(json.body.file[1] as string)
      assert.equal(buf2.toString(), 'helloworldhelloworld')
      assert.ok(json.body.file[2])
      assert.equal(json.body.file[2].startsWith(uploadDir), true)
      const buf3 = await fs.readFile(json.body.file[2] as string)
      assert.equal(buf3.toString(), 'helloworldhelloworldhelloworld')
    }
    {
      assert.ok(json.files.file[0])
      assert.equal(json.files.file[0].value.startsWith(uploadDir), true)
      const buf1 = await fs.readFile(json.files.file[0].value as string)
      assert.equal(buf1.toString(), 'helloworld')
      assert.ok(json.files.file[1])
      assert.equal(json.files.file[1].value.startsWith(uploadDir), true)
      const buf2 = await fs.readFile(json.files.file[1].value as string)
      assert.equal(buf2.toString(), 'helloworldhelloworld')
      assert.ok(json.files.file[2])
      assert.equal(json.files.file[2].value.startsWith(uploadDir), true)
      const buf3 = await fs.readFile(json.files.file[2].value as string)
      assert.equal(buf3.toString(), 'helloworldhelloworldhelloworld')
    }
  })
})
