'use strict'

const neostandard = require('neostandard')

module.exports = [
  {
    ignores: ['**/*.d.ts'],
  },
  ...neostandard({ ts: true }),
]
