import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { authorized, configuration, createAnalysis, estimate, SafeError } from './analysis.mjs'

export function createHandler({ env = process.env, fetchImpl, ledgerPath = fileURLToPath(new URL('./budget.json', import.meta.url)) } = {}) {
  const config = configuration(env)
  const analyze = createAnalysis({ config, fetchImpl, ledgerPath })
  return async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      res.end(JSON.stringify(body))
    }
    try {
      if (req.url === '/api/ai/health' && req.method === 'GET') return send(200, { enabled: Boolean(config) })
      if (!['/api/ai/analyze', '/api/ai/estimate'].includes(req.url)) return send(404, { error: 'not_found' })
      if (req.method !== 'POST') return send(405, { error: 'method_not_allowed' })
      if (!config) return send(503, { error: 'ai_disabled' })
      // Local CLI foundation: browser origins are deliberately unsupported.
      if (req.headers.origin || !authorized(req.headers.authorization, config.token)) return send(403, { error: 'forbidden' })
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] ?? '')) return send(415, { error: 'json_required' })
      let size = 0; const chunks = []
      for await (const chunk of req) {
        size += chunk.length
        if (size > 8192) return send(413, { error: 'body_too_large' })
        chunks.push(chunk)
      }
      let input
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return send(400, { error: 'invalid_json' }) }
      return send(200, req.url === '/api/ai/estimate' ? estimate(config, input) : await analyze(input))
    } catch (error) { return send(error instanceof SafeError ? error.status : 503, { error: error instanceof SafeError ? error.message : 'unavailable' }) }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createServer(createHandler())
  server.requestTimeout = 10000
  server.headersTimeout = 10000
  server.maxConnections = 16
  server.listen(8789, '127.0.0.1', () => console.log('AI foundation listening on loopback port 8789'))
}
