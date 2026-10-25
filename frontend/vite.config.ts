import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { createLocalAiGateway } from './tools/local-ai/gateway.mjs'
import { createMarketHandler } from '../backend/market-data/server.mjs'
import { createResearchHandler } from '../backend/research/server.mjs'
import { createMonitorHandler } from '../backend/monitor/server.mjs'
import { createCloudHandler } from '../backend/cloud/server.mjs'

export default defineConfig({
  base: './',
  plugins: [react(), {
    name: 'member-cloud',
    configureServer(server) { const handler = createCloudHandler(); server.middlewares.use(handler); server.httpServer?.on('close', () => { void handler.close() }) },
    configurePreviewServer(server) { const handler = createCloudHandler(); server.middlewares.use(handler); server.httpServer?.on('close', () => { void handler.close() }) },
  }, {
    name: 'local-scenario-monitor',
    configureServer(server) { const handler = createMonitorHandler({ directory: process.env.INVESTAI_LOCAL_MONITOR_DIRECTORY }); server.middlewares.use(handler); server.httpServer?.on('close', () => { void handler.close() }) },
    configurePreviewServer(server) { const handler = createMonitorHandler({ directory: process.env.INVESTAI_LOCAL_MONITOR_DIRECTORY }); server.middlewares.use(handler); server.httpServer?.on('close', () => { void handler.close() }) },
  }, {
    name: 'local-market-research',
    configureServer(server) { server.middlewares.use(createResearchHandler({ local: true })) },
    configurePreviewServer(server) { server.middlewares.use(createResearchHandler({ local: true })) },
  }, {
    name: 'local-ai-gateway',
    configureServer(server) { server.middlewares.use(createLocalAiGateway()) },
    configurePreviewServer(server) { server.middlewares.use(createLocalAiGateway()) },
  }, {
    name: 'local-public-market-data',
    configureServer(server) { const handler = createMarketHandler({ local: true }); server.middlewares.use(handler); server.httpServer?.on('close', handler.close) },
    configurePreviewServer(server) { const handler = createMarketHandler({ local: true }); server.middlewares.use(handler); server.httpServer?.on('close', handler.close) },
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
