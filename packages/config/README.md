# @kakang/fastify-config

[![Continuous Integration](https://github.com/kaka-repo/fastify-plugins/actions/workflows/ci-config.yml/badge.svg)](https://github.com/kaka-repo/fastify-plugins/actions/workflows/ci-config.yml)
[![NPM version](https://img.shields.io/npm/v/@kakang/fastify-config.svg?style=flat)](https://www.npmjs.com/package/@kakang/fastify-config)

This plugin use `env-schema` to read the .env file and provides
the value through variables and fastify plugin.

## Install

```bash
npm install @kakang/fastify-config --save

yarn add @kakang/fastify-config
```

## Usage

```ts
import { build } from '@kakang/fastify-config'

// you need to explicit type it yourself
declare modules 'fastify' {
  interface FastifyInstance {
    config: {
      FOO: string
    }
  }
}

const { env, plugin } = build({
  schema: {
    type: 'object',
    properties: {
      FOO: { type: 'string' }
    }
  },
  data: process.env
  dotenv: true
})

fastify.register(plugin)

fastify.config // here is the env value
```
