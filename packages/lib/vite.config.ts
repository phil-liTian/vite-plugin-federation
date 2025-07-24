import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: ['./src/index.ts'],
      formats: ['es', 'cjs']
    },
    target: 'node14',
    minify: false,
    rollupOptions: {
      external: ['fs', 'path', 'crypto', 'magic-string'],
      output: {
        minifyInternalExports: false
      }
    }
  }
})
