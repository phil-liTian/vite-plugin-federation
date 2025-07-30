/*
 * @Author: phil
 * @Date: 2025-07-16 17:15:16
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@phil/vite-plugin-federation'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'react-host',
      shared: ['react'],
      remotes: {
        remoteApp: 'http://localhost:4173/assets/remoteEntry.js'
      }
    })
  ]
})
