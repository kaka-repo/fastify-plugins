import Fastify from 'fastify'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test, TestContext } from 'node:test'
import { FastifyStatic } from '../lib'

const fixtures = join(__dirname, 'fixtures')

// serve with single root
test('serve with root', async (t: TestContext) => {
  t.plan(2)
  const fastify = Fastify()

  const root = join(fixtures, 'example-spa')
  fastify.register(FastifyStatic, {
    root
  })

  const content = await readFile(join(root, 'index.html'), { encoding: 'utf8' })

  const response = await fastify.inject('/index.html')
  t.assert.equal(response.statusCode, 200)
  t.assert.equal(response.body, content)
})

// serving multiple root with same prefix
test('serve with root[]', async (t: TestContext) => {
  t.plan(4)
  const fastify = Fastify()

  const root = [join(fixtures, 'example-spa'), join(fixtures, 'example-spa-copy')]
  fastify.register(FastifyStatic, {
    root: [join(fixtures, 'example-spa'), join(fixtures, 'example-spa-copy')]
  })

  {
    // serve according to root order
    const content = await readFile(join(root[0], 'index.html'), { encoding: 'utf8' })
    const response = await fastify.inject('/index.html')
    t.assert.equal(response.statusCode, 200)
    t.assert.equal(response.body, content)
  }
  {
    // provides files in other root
    const content = await readFile(join(root[1], 'public', 'copy.js'), { encoding: 'utf8' })
    const response = await fastify.inject('/public/copy.js')
    t.assert.equal(response.statusCode, 200)
    t.assert.equal(response.body, content)
  }
})

// serving SPA
test('serve with custom not found', async (t: TestContext) => {
  t.plan(2)
  const fastify = Fastify()

  const root = join(fixtures, 'example-spa')
  fastify.register(FastifyStatic, {
    root,
    async handleNotFound (_request, reply) {
      await reply.sendFile('index.html')
    },
  })

  const content = await readFile(join(root, 'index.html'), { encoding: 'utf8' })

  const response = await fastify.inject('/signin/')
  t.assert.equal(response.statusCode, 200)
  t.assert.equal(response.body, content)
})
