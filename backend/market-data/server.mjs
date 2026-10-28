import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createRest } from './rest.mjs'
import { createStreams } from './stream.mjs'
import { MarketError } from './gate.mjs'
import { createNewsHandler } from '../news/news.mjs'
import { createResearchHandler } from '../research/server.mjs'
import { createCloudHandler } from '../cloud/server.mjs'

export function createMarketHandler({ origins = [], local = false, rest = createRest(), streams = createStreams() } = {}) {
  const allowed = new Set(origins), clients = new Map()
  let activeStreams = 0
  const handler = async (req, res, next = () => { res.writeHead(404); res.end() }) => {
    if (!req.url?.startsWith('/api/upbit/')) return next()
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' }
    const send = (status, body, extra = {}) => { if (res.destroyed || res.writableEnded) return; res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8', ...extra }); res.end(JSON.stringify(body)) }
    const origin = req.headers.origin, host = req.headers.host
    const loopback = /^(localhost|127\.0\.0\.1):\d{1,5}$/.test(host ?? '') && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
    if (local && !loopback) return send(403, { error: 'local_only' })
    if (origin && !(local ? loopback && origin === `http://${host}` : allowed.has(origin))) return send(403, { error: 'origin_rejected' })
    if (origin) headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Expose-Headers'] = 'Server-Timing, X-Upbit-Age-Ms, X-Upbit-Server-Time, Retry-After'
    if (req.method !== 'GET') return send(405, { error: 'read_only' }, { Allow: 'GET' })
    // Hosting probes must not compete with users for the market-data quota.
    if (req.url === '/api/upbit/health') return send(200, { service: 'investai-upbit', version: 1 })
    const ip = req.socket.remoteAddress, now = Date.now()
    for (const [key, value] of clients) if (now - value.at > 60_000 && !value.streams) clients.delete(key)
    let client = clients.get(ip)
    if (!client) { if (clients.size >= 1024) return send(503, { error: 'busy' }); client = { at: now, requests: 0, streams: 0 }; clients.set(ip, client) }
    if (now - client.at >= 60_000) { client.at = now; client.requests = 0 }
    if (++client.requests > 120) return send(429, { error: 'client_limit' }, { 'Retry-After': '60' })
    try {
      const url = new URL(req.url, 'http://market.local')
      if (url.pathname === '/api/upbit/stream') {
        if ([...url.searchParams.keys()].some(key => key !== 'market')) throw new MarketError(400, 'invalid_query')
        if (activeStreams >= 128 || client.streams >= 8) throw new MarketError(503, 'stream_capacity', 5)
        const buffered = []; let ready = false
        const write = (event, data) => {
          if (!ready) { buffered.push([event, data]); return }
          if (res.destroyed || res.writableEnded) return
          // Slow readers reconnect instead of accumulating an unbounded quote backlog.
          if (!res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)) res.destroy()
        }
        const stop = streams.subscribe(url.searchParams.get('market'), {
          status: (status, attempt) => write('status', { status, attempt }),
          data: (message, receivedAt) => write('quote', { message, ageMs: Math.max(0, Date.now() - receivedAt) }),
        })
        activeStreams++; client.streams++
        const heartbeat = setInterval(() => { if (!res.write(': heartbeat\n\n')) res.destroy() }, 15_000)
        res.on('close', () => { activeStreams--; client.streams--; clearInterval(heartbeat); stop() })
        res.writeHead(200, { ...headers, 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' })
        res.flushHeaders(); ready = true
        for (const [event, data] of buffered) write(event, data)
        return
      }
      const controller = new AbortController()
      const cancel = () => controller.abort()
      res.on('close', cancel)
      try {
        const result = await rest(req.url, controller.signal)
        send(200, result.data, { ...(result.upstreamTime !== null ? { 'X-Upbit-Server-Time': String(result.upstreamTime) } : {}), 'X-Upbit-Age-Ms': String(Math.max(0, Date.now() - result.receivedAt)), 'Server-Timing': `queue;dur=${result.queueMs.toFixed(1)}, upbit;dur=${result.networkMs.toFixed(1)}, cache;desc="${result.cache}"` })
      } finally { res.off('close', cancel) }
    } catch (error) { send(error instanceof MarketError ? error.status : 503, { error: error instanceof MarketError ? error.message : 'upstream_unavailable' }, error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}) }
  }
  handler.close = () => streams.close()
  return handler
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const origins = (process.env.UPBIT_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)
  const handler = createMarketHandler({ origins })
  const news = createNewsHandler({ origins })
  const research = createResearchHandler({ origins })
  research.start()
  const cloud = createCloudHandler({ origins, derivativeContextReader: research.derivativeContextReader })
  const server = createServer((req, res) => handler(req, res, () => news(req, res, () => research(req, res, () => cloud(req, res)))))
  server.headersTimeout = 10_000; server.requestTimeout = 15_000; server.maxConnections = 256
  server.listen(Number(process.env.PORT ?? 8790), process.env.HOST ?? '127.0.0.1', () => console.log('InvestAI public market data server ready'))
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { handler.close(); server.closeAllConnections(); server.close(); void cloud.close().then(() => research.close()) })
}
