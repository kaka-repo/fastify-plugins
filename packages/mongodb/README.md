# @kakang/fastify-mongodb

[![Continuous Integration](https://github.com/kaka-repo/fastify-plugins/actions/workflows/ci-multipart.yml/badge.svg)](https://github.com/kaka-repo/fastify-plugins/actions/workflows/ci-multipart.yml)
[![NPM version](https://img.shields.io/npm/v/@kakang/fastify-mongodb.svg?style=flat)](https://www.npmjs.com/package/@kakang/fastify-mongodb)

This plugin helps you to register mongodb client to `fastify`,
and it also provide some utilities to ease the usage of `mongodb`.

You can checkout `@fastify/mongodb` if you prefer offcial plugin.

## Install

```bash
npm install @kakang/fastify-mongodb mongodb --save

yarn add @kakang/fastify-mongodb mongodb
```

## Usage

```ts
import fastifyMongoDB from '@kakang/fastify-mongodb'

fastify.register(fastifyMongoDB, {
  url: 'mongodb://127.0.0.1:27017',
  database: 'foobar',
  options: {} // MongoClient options
})

fastify.post('/', async function(request, reply) {
  // insertion
  await fastify.mongodb.db.collection('foo').insertOne(request.body)

  // auto managed transaction
  const result = await fastify.mongodb.withTransaction(async (session) => {
    const result = await fastify.mongodb.db.collection('foo').insertOne(request.body, { session })
    return result
  })
})
```

### Options

#### options.url

The URL of `mongodb` server.

#### options.database

The database name you would like to use.

#### options.options

Options passed to `MongoClient`.
