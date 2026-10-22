import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { createLocalAiGateway } from './tools/local-ai/gateway.mjs'
import { createMarketHandler } from '../backend/market-data/server.mjs'
import { createStockHandler } from '../backend/stocks/server.mjs'

export default defineConfig({
  base: './',
  plugins: [react(), {
    name: 'local-ai-gateway',
    configureServer(server) { server.middlewares.use(createLocalAiGateway()) },
    configurePreviewServer(server) { server.middlewares.use(createLocalAiGateway()) },
  }, {
    name: 'local-public-market-data',
    configureServer(server) { const handler = createMarketHandler({ local: true }); server.middlewares.use(handler); server.httpServer?.on('close', handler.close) },
    configurePreviewServer(server) { const handler = createMarketHandler({ local: true }); server.middlewares.use(handler); server.httpServer?.on('close', handler.close) },
  }, {
    name: 'local-domestic-stocks',
    configureServer(server) { server.middlewares.use(createStockHandler({ local: true })) },
    configurePreviewServer(server) { server.middlewares.use(createStockHandler({ local: true })) },
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
