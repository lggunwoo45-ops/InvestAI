import { createServer } from 'node:http'
import { createNewsProxyHandler } from './proxy.mjs'

const host = 'localhost'
const port = 8787
const handler = createNewsProxyHandler()
const server = createServer((req, res) => {
  handler(req, res).catch(() => {
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
    }
    res.end(JSON.stringify({ source: null, sourceLabel: 'Unknown source', status: 'unavailable', fetchedAt: new Date().toISOString(), cacheStatus: 'none', fallbackUsed: false, articles: [], errors: [{ code: 'INTERNAL_ERROR', message: 'The local news proxy failed safely.' }] }))
  })
})

server.listen(port, host, () => {
  process.stdout.write(`Market Copilot local news proxy: http://${host}:${port}\n`)
  process.stdout.write('Allowlisted endpoint: /api/news/rss?source=fed-press\n')
})

server.on('error', (error) => {
  process.stderr.write(`Local news proxy could not start: ${error.message}\n`)
  process.exitCode = 1
})
