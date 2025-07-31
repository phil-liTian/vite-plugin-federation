
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['./packages/example/**/**.spec.[tj]s'],
    setupFiles: ['./packages/example/vitestSetup-dev.ts'],
    globalSetup: ['./packages/example/vitestGlobalSetup.ts'],
    globals: true
  },
  esbuild: {
    target: 'node18'
  }
})