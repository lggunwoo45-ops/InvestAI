import { createKisClient, StockError } from './kis.mjs'

export function createStockHandler({ local = false, origins = [], publicEnabled = process.env.KIS_PUBLIC_ENABLED === 'true', client = createKisClient(), now = Date.now } = {}) {
  const allowed = new Set(origins)
  let windowAt = 0, requests = 0, active = 0
  return async (req, res, next = () => { res.writeHead(404); res.end() }) => {
    if (!req.url?.startsWith('/api/stocks/')) return next()
    const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' }
    const send = (status, body, extra = {}) => { if (!res.destroyed && !res.writableEnded) { res.writeHead(status, { ...headers, ...extra }); res.end(JSON.stringify(body)) } }
    const host = req.headers.host, origin = req.headers.origin
    const loopback = /^(localhost|127\.0\.0\.1):\d{1,5}$/.test(host ?? '') && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
    if (local && !loopback) return send(403, { error: 'local_only' })
    if (origin && !(local ? loopback && origin === `http://${host}` : allowed.has(origin))) return send(403, { error: 'origin_rejected' })
    if (origin) headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Expose-Headers'] = 'Retry-After'
    if (req.method !== 'GET') return send(405, { error: 'read_only' }, { Allow: 'GET' })
    if (!local && !publicEnabled) return send(503, { error: 'stock_public_disabled' }, { 'Retry-After': '300' })
    if (now() - windowAt >= 60_000) { windowAt = now(); requests = 0 }
    if (++requests > 120 || active >= 4) return send(429, { error: 'stock_busy' }, { 'Retry-After': '60' })
    try {
      const url = new URL(req.url, 'http://stocks.local')
      if (url.pathname !== '/api/stocks/snapshot') return send(404, { error: 'not_found' })
      if ([...url.searchParams.keys()].some(key => key !== 'symbol') || url.searchParams.getAll('symbol').length !== 1) throw new StockError('invalid_query', 400, 0)
      active++
      try { send(200, await client.snapshot(url.searchParams.get('symbol'))) } finally { active-- }
    } catch (error) {
      const known = error instanceof StockError
      send(known ? error.status : 503, { error: known ? error.message : 'stock_unavailable' }, { 'Retry-After': String(known ? error.retryAfter : 30) })
    }
  }
}
