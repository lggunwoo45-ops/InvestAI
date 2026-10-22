import { isIP } from 'node:net'
import { MarketError } from './gate.mjs'

function normalizeIp(value) {
  if (typeof value !== 'string' || value.includes('%') || !isIP(value)) return null
  const normalized = value.toLowerCase().replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/, '$1')
  return isIP(normalized) === 6 ? new URL(`http://[${normalized}]`).hostname : normalized
}

/** Opt in only behind Railway's HTTP edge with no public direct/TCP ingress.
 * X-Forwarded-For and arbitrary browser IDs are never quota identities.
 */
export function clientAddress(req, trustRailwayProxy = false) {
  return (trustRailwayProxy && normalizeIp(req.headers['x-real-ip']))
    || normalizeIp(req.socket.remoteAddress) || 'unknown'
}

/** Bounded, process-local admission control. An IP is not a user account. */
export function createUsageGuard({ now = Date.now, trustRailwayProxy = false, requestLimit = 120,
  windowMs = 60_000, maxClients = 1024, maxRest = 32, maxRestPerClient = 8,
  maxStreams = 128, maxStreamsPerClient = 8 } = {}) {
  const clients = new Map(), active = { rest: 0, stream: 0 }
  return req => {
    const time = now(), key = clientAddress(req, trustRailwayProxy)
    for (const [ip, client] of clients) {
      if (time - client.at >= windowMs && !client.rest && !client.stream) clients.delete(ip)
    }
    let client = clients.get(key)
    if (!client) {
      if (clients.size >= maxClients) throw new MarketError(503, 'busy', 5)
      client = { at: time, requests: 0, rest: 0, stream: 0 }; clients.set(key, client)
    }
    if (time - client.at >= windowMs) { client.at = time; client.requests = 0 }
    if (client.requests >= requestLimit) throw new MarketError(429, 'client_limit', Math.max(1, Math.ceil((client.at + windowMs - time) / 1000)))
    client.requests++
    return kind => {
      const globalLimit = kind === 'stream' ? maxStreams : maxRest
      const clientLimit = kind === 'stream' ? maxStreamsPerClient : maxRestPerClient
      if (active[kind] >= globalLimit || client[kind] >= clientLimit) throw new MarketError(503, `${kind}_capacity`, 5)
      active[kind]++; client[kind]++
      let released = false
      return () => { if (!released) { released = true; active[kind]--; client[kind]-- } }
    }
  }
}

/** Counts actual REST starts (including failures), not cache hits or consumers.
 * This is a request ceiling, not a hosting bill cap. It resets on process restart.
 */
export function createUpstreamBudget({ limit = 10_000, windowMs = 3_600_000, now = Date.now } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 100_000) throw new Error('Invalid UPBIT_REST_HOURLY_LIMIT (expected 0..100000)')
  let startedAt = now(), used = 0
  return () => {
    const time = now()
    if (time - startedAt >= windowMs) { startedAt = time; used = 0 }
    if (used >= limit) throw new MarketError(503, 'upstream_budget', Math.max(1, Math.ceil((startedAt + windowMs - time) / 1000)))
    used++
  }
}
