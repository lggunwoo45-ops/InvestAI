import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { createLocalAiGateway } from './tools/local-ai/gateway.mjs'

export default defineConfig({
  base: './',
  plugins: [react(), {
    name: 'local-ai-gateway',
    configureServer(server) { server.middlewares.use(createLocalAiGateway()) },
    configurePreviewServer(server) { server.middlewares.use(createLocalAiGateway()) },
  }],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api/dart': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
})
