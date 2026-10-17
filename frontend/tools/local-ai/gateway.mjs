import { request } from 'node:http'

// This middleware is attached only to local Vite dev/preview servers, never
// bundled into the public site. Its upstream and credential source are fixed.
export function createLocalAiGateway({ env = process.env, requestImpl = request } = {}) {
  return (req, res, next) => {
    if (!req.url?.startsWith('/api/local-ai/')) return next()
    const send = (status, error) => {
      if (res.headersSent) return res.destroy()
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({ error }))
    }
    const paths = { '/api/local-ai/health': '/api/ai/health', '/api/local-ai/estimate': '/api/ai/estimate', '/api/local-ai/analyze': '/api/ai/analyze' }
    const path = paths[req.url]
    if (!path) return send(404, 'not_found')
    const host = req.headers.host
    if (!/^(127\.0\.0\.1|localhost):\d{1,5}$/.test(host ?? '') ||
        !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return send(403, 'local_only')
    const isHealth = req.url.endsWith('/health')
    if (req.method !== (isHealth ? 'GET' : 'POST')) return send(405, 'method_not_allowed')
    if (req.headers.origin && req.headers.origin !== `http://${host}`) return send(403, 'origin_rejected')
    if (!isHealth && (req.headers.origin !== `http://${host}` || req.headers['content-type'] !== 'application/json' || req.headers['sec-fetch-site'] === 'cross-site')) return send(403, 'origin_rejected')
    if (env.AI_LOCAL_UI_ENABLED !== 'true' || !/^[A-Za-z0-9_-]{32,128}$/.test(env.AI_ACCESS_TOKEN ?? '')) return send(503, 'local_ai_disabled')
    let size = 0; const chunks = []
    req.on('data', chunk => {
      size += chunk.length
      if (size <= 8192) chunks.push(chunk)
      else if (!res.writableEnded) send(413, 'body_too_large')
    })
    req.on('error', () => { if (!res.writableEnded) send(400, 'invalid_request') })
    req.on('end', () => {
      if (res.writableEnded) return
      if (req.url.endsWith('/analyze')) {
        let body
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return send(400, 'invalid_input') }
        if (body?.consent !== true || !Number.isFinite(body.maxCostUsd) || body.maxCostUsd <= 0) return send(400, 'invalid_input')
      }
      const upstream = requestImpl({ hostname: '127.0.0.1', port: 8789, path, method: req.method,
        headers: { Authorization: `Bearer ${env.AI_ACCESS_TOKEN}`, 'Content-Type': 'application/json' } }, incoming => {
        let length = 0; const result = []
        incoming.on('data', chunk => {
          length += chunk.length
          if (length > 32768) { upstream.destroy(); send(502, 'invalid_response') } else result.push(chunk)
        })
        incoming.on('error', () => send(502, 'backend_unavailable'))
        incoming.on('end', () => {
          if (res.writableEnded) return
          res.writeHead(incoming.statusCode ?? 502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
          res.end(Buffer.concat(result))
        })
      })
      upstream.setTimeout(20000, () => upstream.destroy())
      upstream.on('error', () => { if (!res.writableEnded) send(503, 'backend_unavailable') })
      res.on('close', () => upstream.destroy())
      upstream.end(Buffer.concat(chunks))
    })
  }
}
