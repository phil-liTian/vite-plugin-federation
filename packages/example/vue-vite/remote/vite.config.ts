/*
 * @Author: phil
 * @Date: 2025-08-01 10:18:55
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import federation from '@phil/vite-plugin-federation'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'remoteApp',
      filename: 'remoteEntry.js',
      exposes: {
        './Button': './src/components/Button.vue'
      }
    })
  ]
})
