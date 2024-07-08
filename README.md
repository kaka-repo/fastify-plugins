# @kakang Fastify Plugin

This is the mono-repository contains the `fastify` plugins used in
my personal or work projects. You may found some of them useful.

Here is the list of the plugins,

- [`@kakang/fastify-config`](./packages/config/README.md)
  Using `env-schema` to read environment file, then provides
  environments in sync and plugin to register for `fastify.config`.
- [`@kakang/fastify-cronjob`](./packages/cronjob/README.md)
  Inspired by `josk` to provide de-centralized cronjob runner.
- [`@kakang/fastify-mongodb`](./packages/mongodb/README.md)
  Similar to `@fastify/mongodb` but provide some handy utilities.
- [`@kakang/fastify-multipart`](./packages/multipart/README.md)
  Generic interface for `fastify` multipart handling, it can use
  one of the famous tools (e.g. `busboy`, `formidable`) or create
  your own. The backing storage is not limited to file writing.
