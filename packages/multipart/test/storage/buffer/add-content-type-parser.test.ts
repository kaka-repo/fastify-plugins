import { Blob } from 'buffer'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FormData } from 'undici'
import { BusboyAdapter } from '../../../lib/adapter/busboy'
import { BufferStorage } from '../../../lib/storage/buffer'
import { createFastify } from '../../create-fastify'
import { request } from '../../request'

test('BufferStorage - addContentTypeParser', async function (t) {
  await t.test('single file', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      adapter: BusboyAdapter,
      storage: BufferStorage
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    assert.equal(response.status, 200)

    const json = await response.json()

    assert.equal(json.body.foo, 'bar')
    assert.deepEqual(json.body.file, { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) })
    assert.deepEqual(json.files.file, { name: 'hello_world.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) } })
  })

  await t.test('multiple fields', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      adapter: BusboyAdapter,
      storage: BufferStorage
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
    assert.deepEqual(json.body.file, { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) })
    assert.deepEqual(json.files.file, { name: 'hello_world.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) } })
  })

  await t.test('multiple files', async function (t) {
    const fastify = await createFastify(t, {
      addContentTypeParser: true,
      adapter: BusboyAdapter,
      storage: BufferStorage
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
    assert.deepEqual(json.body.file, [
      { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) },
      { type: 'Buffer', data: Array.from(Buffer.from('helloworldhelloworld').map(Number)) },
      { type: 'Buffer', data: Array.from(Buffer.from('helloworldhelloworldhelloworld').map(Number)) }
    ])
    assert.deepEqual(json.files.file, [
      { name: 'hello_world1.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) } },
      { name: 'hello_world2.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworldhelloworld').map(Number)) } },
      { name: 'hello_world3.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworldhelloworldhelloworld').map(Number)) } }
    ])
  })
})
