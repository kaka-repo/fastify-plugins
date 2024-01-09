import { Blob } from 'buffer'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FormData } from 'undici'
import { FormidableAdapter } from '../../../lib/adapter/formidable'
import { Storage } from '../../../lib/storage/storage'
import { createFastify } from '../../create-fastify'
import { request } from '../../request'

test('FormidableAdapter - multipart', async function (t) {
  await t.test('single file', async function (t) {
    const fastify = await createFastify(t, {
      adapter: FormidableAdapter,
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

    assert.equal(json.body.foo, 'bar')
    assert.equal(json.body.file, 'hello_world.txt')
    assert.deepEqual(json.files.file, { name: 'hello_world.txt', value: 'hello_world.txt' })
  })

  await t.test('multiple fields', async function (t) {
    const fastify = await createFastify(t, {
      adapter: FormidableAdapter,
      storage: Storage
    }, {
      iterator: true
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
    assert.equal(json.body.file, 'hello_world.txt')
    assert.deepEqual(json.files.file, { name: 'hello_world.txt', value: 'hello_world.txt' })
  })

  await t.test('multiple files', async function (t) {
    const fastify = await createFastify(t, {
      adapter: FormidableAdapter,
      storage: Storage
    }, {
      iterator: true
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
    // NOTE: the order is unstable in Windows
    assert.equal(json.body.file.includes('hello_world1.txt'), true)
    assert.equal(json.body.file.includes('hello_world2.txt'), true)
    assert.equal(json.body.file.includes('hello_world3.txt'), true)
    {
      const file = json.files.file.find(({ name }: any) => name === 'hello_world1.txt')
      assert.equal(file?.name, 'hello_world1.txt')
      assert.equal(file?.value, 'hello_world1.txt')
    }
    {
      const file = json.files.file.find(({ name }: any) => name === 'hello_world2.txt')
      assert.equal(file?.name, 'hello_world2.txt')
      assert.equal(file?.value, 'hello_world2.txt')
    }
    {
      const file = json.files.file.find(({ name }: any) => name === 'hello_world3.txt')
      assert.equal(file?.name, 'hello_world3.txt')
      assert.equal(file?.value, 'hello_world3.txt')
    }
  })
})
