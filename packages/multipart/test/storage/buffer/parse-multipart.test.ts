import { test } from '@kakang/unit'
import { Blob } from 'buffer'
import { FormData } from 'undici'
import { BusboyAdapter } from '../../../lib/adapter/busboy'
import { BufferStorage } from '../../../lib/storage/buffer'
import { createFastify } from '../../create-fastify'
import { request } from '../../request'

test('BufferStorage - parseMultipart', async function (t) {
  t.test('single file', async function (t) {
    const fastify = await createFastify(t, {
      adapter: BusboyAdapter,
      storage: BufferStorage
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
    t.deepEqual(json.body.file, { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) })
    t.deepEqual(json.files.file, { name: 'hello_world.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) } })
  })

  t.test('multiple fields', async function (t) {
    const fastify = await createFastify(t, {
      adapter: BusboyAdapter,
      storage: BufferStorage
    }, {
      inline: true
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('foo', 'baz')
    form.append('foo', 'hello')
    form.append('file', new Blob(['hello', 'world']), 'hello_world.txt')

    const response = await request(fastify.listeningOrigin, form)
    t.equal(response.status, 200)

    const json = await response.json()

    t.deepEqual(json.body.foo, ['bar', 'baz', 'hello'])
    t.deepEqual(json.body.file, { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) })
    t.deepEqual(json.files.file, { name: 'hello_world.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) } })
  })

  t.test('multiple files', async function (t) {
    const fastify = await createFastify(t, {
      adapter: BusboyAdapter,
      storage: BufferStorage
    }, {
      inline: true
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', new Blob(['hello', 'world']), 'hello_world1.txt')
    form.append('file', new Blob(['hello', 'world', 'hello', 'world']), 'hello_world2.txt')
    form.append('file', new Blob(['hello', 'world', 'hello', 'world', 'hello', 'world']), 'hello_world3.txt')

    const response = await request(fastify.listeningOrigin, form)
    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.deepEqual(json.body.file, [
      { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) },
      { type: 'Buffer', data: Array.from(Buffer.from('helloworldhelloworld').map(Number)) },
      { type: 'Buffer', data: Array.from(Buffer.from('helloworldhelloworldhelloworld').map(Number)) }
    ])
    t.deepEqual(json.files.file, [
      { name: 'hello_world1.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworld').map(Number)) } },
      { name: 'hello_world2.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworldhelloworld').map(Number)) } },
      { name: 'hello_world3.txt', value: { type: 'Buffer', data: Array.from(Buffer.from('helloworldhelloworldhelloworld').map(Number)) } }
    ])
  })
})
