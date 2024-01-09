import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Adapter } from '../lib/adapter/adapter'
import { Storage } from '../lib/storage/storage'
import { createFastify } from './create-fastify'

test('missing Adapter', async function (t) {
  try {
    await createFastify(t)
    assert.ok(false, 'should not success')
  } catch (err: any) {
    assert.ok(err)
    assert.equal(err.code, 'FST_MP_INVALID_OPTION')
  }
})

test('missing Storage', async function (t) {
  try {
    // @ts-expect-error check for error
    await createFastify(t, { adapter: Adapter })
    assert.ok(false, 'should not success')
  } catch (err: any) {
    assert.ok(err)
    assert.equal(err.code, 'FST_MP_INVALID_OPTION')
  }
})

test('conflict config', async function (t) {
  try {
    await createFastify(t, { adapter: Adapter, storage: Storage, addContentTypeParser: true, addHook: true })
    assert.ok(false, 'should not success')
  } catch (err: any) {
    assert.ok(err)
    assert.equal(err.code, 'FST_MP_CONFLICT_CONFIG')
  }
})
