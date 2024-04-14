import { test } from '@kakang/unit'
import { Adapter } from '../lib/adapter/adapter'
import { Storage } from '../lib/storage/storage'
import { createFastify } from './create-fastify'

test('missing Adapter', async function (t) {
  const ok: typeof t.ok = t.ok
  try {
    await createFastify(t)
    ok(false, 'should not success')
  } catch (err: any) {
    ok(err)
    t.equal(err.code, 'FST_MP_INVALID_OPTION')
  }
})

test('missing Storage', async function (t) {
  const ok: typeof t.ok = t.ok
  try {
    // @ts-expect-error check for error
    await createFastify(t, { adapter: Adapter })
    ok(false, 'should not success')
  } catch (err: any) {
    ok(err)
    t.equal(err.code, 'FST_MP_INVALID_OPTION')
  }
})

test('conflict config', async function (t) {
  const ok: typeof t.ok = t.ok
  try {
    await createFastify(t, { adapter: Adapter, storage: Storage, addContentTypeParser: true, addHook: true })
    ok(false, 'should not success')
  } catch (err: any) {
    ok(err)
    t.equal(err.code, 'FST_MP_CONFLICT_CONFIG')
  }
})
