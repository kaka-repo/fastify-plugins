# @kakang/fastify-static

[![Continuous Integration](https://github.com/kaka-ng/fastify-plugins/actions/workflows/ci-static.yml/badge.svg)](https://github.com/kaka-ng/fastify-plugins/actions/workflows/ci-static.yml)
[![NPM version](https://img.shields.io/npm/v/@kakang/fastify-static.svg?style=flat)](https://www.npmjs.com/package/@kakang/fastify-static)

This plugin provide serving file through different engine.

You can checkout `@fastify/static` if you prefer offcial plugin.

## Install

```bash
npm install @kakang/fastify-static --save

yarn add @kakang/fastify-static
```

## Usage

```ts
import FastifyStatic from '@kakang/fastify-static'

fastify.register(FastifyStatic, {
  root: "/",
  serve: "/"
})
```
