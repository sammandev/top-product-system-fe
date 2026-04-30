// @vitest-environment node

import { describe, expect, it } from 'vitest'
import config from './vite.config'

describe('vite dev config', () => {
  it('pre-scans source modules so lazy routes do not trigger dependency re-optimization reloads', () => {
    expect(config.optimizeDeps?.entries).toEqual([
      'index.html',
      'src/**/*.{vue,ts}',
      '!src/**/*.d.ts',
      '!src/**/*.spec.ts',
      '!src/**/*.test.ts',
      '!src/**/__tests__/**',
      '!src/test/**',
    ])
    expect(config.optimizeDeps?.include).toBeUndefined()
  })
})
