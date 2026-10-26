import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type ViteDevServer } from 'vite'
import { createLocalAiGateway } from './tools/local-ai/gateway.mjs'
import { createMarketHandler } from '../backend/market-data/server.mjs'
import { createResearchHandler } from '../backend/research/server.mjs'
import { createMonitorHandler } from '../backend/monitor/server.mjs'
import { createCloudHandler } from '../backend/cloud/server.mjs'

function connectResearch(server: Pick<ViteDevServer, 'middlewares' | 'httpServer'>) {
  const research = createResearchHandler({ local: true })
  const derivativeContextReader = research.derivativeContextReader
  const cloud = createCloudHandler({ derivativeContextReader })
  const monitor = createMonitorHandler({ directory: process.env.INVESTAI_LOCAL_MONITOR_DIRECTORY, derivativeContextReader })
  server.middlewares.use(cloud); server.middlewares.use(monitor); server.middlewares.use(research)
  server.httpServer?.once('close', () => { void Promise.all([cloud.close(), monitor.close()]).then(() => research.close()) })
}

export default defineConfig({
  base: './',
  plugins: [react(), {
    name: 'research-and-monitor',
    configureServer: connectResearch,
    configurePreviewServer: connectResearch,
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
