import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@phil/vite-plugin-federation'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'remoteApp',
      filename: 'remoteEntry.js',
      exposes: {
        './Button': './src/components/Button'
      }
    })
  ],
  server: {
    port: 5001
  },
  build: {
    assetsDir: 'assets'
  }
})
