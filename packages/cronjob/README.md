# @kakang/fastify-cronjob

[![Continuous Integration](https://github.com/kaka-repo/fastify-plugins/actions/workflows/ci-cronjob.yml/badge.svg)](https://github.com/kaka-repo/fastify-plugins/actions/workflows/ci-cronjob.yml)
[![NPM version](https://img.shields.io/npm/v/@kakang/fastify-cronjob.svg?style=flat)](https://www.npmjs.com/package/@kakang/fastify-cronjob)

This plugin is inspired by [JoSK](https://github.com/veliovgroup/josk)
for managing cronjob in Node.js cluster

## Install

```bash
npm install @kakang/fastify-cronjob --save

yarn add @kakang/fastify-cronjob
```

## Usage

```ts
import fastifyCronJob from '@kakang/fastify-cronjob'
import { MongoDBAdapter } from '@kakang/fastify-cronjob/lib/adapter/mongodb'
import { MongoClient } from 'mongodb'

const client = new MongoClient('mongodb://127.0.0.1:27017')
await client.connect()
const db = client.db('cronjob')

fastify.register(fastifyCronjob, {
  adapter: MongoDBAdapter,
  adapterOptions: {
    application: 'cronjob',
    db
  }
})

fastify.cronjob.addTask({
  name: 'every minutes',
  cron: '0 * * * * *',
  once: false
  executor() {
    // any task here
  }
})

fastify.cronjob.removeTask('every minutes')
```
