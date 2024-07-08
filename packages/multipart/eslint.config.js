'use strict'

module.exports = [
  {
    ignores: ['**/*.d.ts']
  },
  {
    ...require('eslint-config-love'),
    files: ['**/*.mjs', '**/*.ts']
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      "@typescript-eslint/no-floating-promises": "off"
    }
  }
]
