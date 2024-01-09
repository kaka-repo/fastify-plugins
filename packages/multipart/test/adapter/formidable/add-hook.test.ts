import { Blob } from 'buffer'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FormData } from 'undici'
import { FormidableAdapter } from '../../../lib/adapter/formidable'
import { Storage } from '../../../lib/storage/storage'
import { createFastify } from '../../create-fastify'
import { request } from '../../request'

test('FormidableAdapter - addHook', async function (t) {
  await t.test('single file', async function (t) {
    const fastify = await createFastify(t, {
      addHook: true,
      adapter: FormidableAdapter,
      storage: Storage
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
      addHook: true,
      adapter: FormidableAdapter,
      storage: Storage
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
      addHook: true,
      adapter: FormidableAdapter,
      storage: Storage
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
    assert.deepEqual(json.body.file, ['hello_world1.txt', 'hello_world2.txt', 'hello_world3.txt'])
    assert.deepEqual(json.files.file, [
      { name: 'hello_world1.txt', value: 'hello_world1.txt' },
      { name: 'hello_world2.txt', value: 'hello_world2.txt' },
      { name: 'hello_world3.txt', value: 'hello_world3.txt' }
    ])
  })
})
