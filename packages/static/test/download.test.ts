import Fastify from 'fastify'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test, TestContext } from 'node:test'
import { FastifyStatic } from '../lib'

const fixtures = join(__dirname, 'fixtures')

test('download with root', async (t: TestContext) => {
  t.plan(3)
  const fastify = Fastify()

  const root = join(fixtures, 'example-spa')
  fastify.register(FastifyStatic, {
    root,
    serve: false
  })

  fastify.get('/', async function (_request, reply) {
    await reply.download('index.html', 'foo.html')
  })

  const content = await readFile(join(root, 'index.html'), { encoding: 'utf8' })

  const response = await fastify.inject('/')
  t.assert.equal(response.statusCode, 200)
  t.assert.equal(response.body, content)
  t.assert.equal(response.headers['content-disposition'], 'attachment; filename="foo.html"')
})

test('download with root[]', async (t: TestContext) => {
  t.plan(6)
  const fastify = Fastify()

  const root = [join(fixtures, 'example-spa'), join(fixtures, 'example-spa-copy')]
  fastify.register(FastifyStatic, {
    root: [join(fixtures, 'example-spa'), join(fixtures, 'example-spa-copy')]
  })

  fastify.get('/', async function (_request, reply) {
    await reply.download('index.html', 'foo.html')
  })
  fastify.get('/copy.js', async function (_request, reply) {
    await reply.download('public/copy.js', 'clone.js')
  })

  {
    // serve according to root order
    const content = await readFile(join(root[0], 'index.html'), { encoding: 'utf8' })
    const response = await fastify.inject('/')
    t.assert.equal(response.statusCode, 200)
    t.assert.equal(response.body, content)
    t.assert.equal(response.headers['content-disposition'], 'attachment; filename="foo.html"')
  }
  {
    // provides files in other root
    const content = await readFile(join(root[1], 'public', 'copy.js'), { encoding: 'utf8' })
    const response = await fastify.inject('/copy.js')
    t.assert.equal(response.statusCode, 200)
    t.assert.equal(response.body, content)
    t.assert.equal(response.headers['content-disposition'], 'attachment; filename="clone.js"')
  }
})
