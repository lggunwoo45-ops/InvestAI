import { Gate, MarketError } from './gate.mjs'

export const validMarket = value => /^(KRW|BTC|USDT)-[A-Z0-9]{1,20}$/.test(value ?? '')
export function parseRequest(path) {
  const url = new URL(path, 'http://market.local')
  const route = url.pathname.replace(/^\/api\/upbit/, '')
  if (route === '/ticker/all') {
    if ([...url.searchParams.keys()].some(key => key !== 'quote_currencies')) throw new MarketError(400, 'invalid_query')
    const quotes = (url.searchParams.get('quote_currencies') ?? '').split(',')
    if (!quotes.length || quotes.length > 3 || quotes.some(q => !['KRW', 'BTC', 'USDT'].includes(q))) throw new MarketError(400, 'invalid_quotes')
    return { group: 'ticker', path: `/ticker/all?quote_currencies=${[...new Set(quotes)].sort().join(',')}` }
  }
  if (!/^\/candles\/(days|minutes\/(1|5|15|60|240))$/.test(route)) throw new MarketError(404, 'not_found')
  if ([...url.searchParams.keys()].some(key => !['market', 'count'].includes(key))) throw new MarketError(400, 'invalid_query')
  const market = url.searchParams.get('market'), count = Number(url.searchParams.get('count'))
  if (!validMarket(market) || !Number.isInteger(count) || count < 1 || count > 200) throw new MarketError(400, 'invalid_candles')
  return { group: 'candle', path: `${route}?market=${market}&count=${count}` }
}

async function readJson(response) {
  const reader = response.body.getReader(); const chunks = []; let length = 0
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break
      length += value.length
      if (length > 2_000_000) throw new MarketError(502, 'response_too_large')
      chunks.push(value)
    }
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!Array.isArray(result)) throw new MarketError(502, 'invalid_response')
    return result
  } finally { await reader.cancel().catch(() => {}) }
}

export function createRest({ fetchImpl = fetch, interval = 125, ttl = 2000 } = {}) {
  const gates = { ticker: new Gate(interval), candle: new Gate(interval) }
  const cache = new Map(), pending = new Map()
  let blockedUntil = 0
  return function load(path, signal) {
    if (signal?.aborted) return Promise.reject(signal.reason)
    const request = parseRequest(path), key = request.path
    if (Date.now() < blockedUntil) return Promise.reject(new MarketError(503, 'upstream_cooldown', Math.ceil((blockedUntil - Date.now()) / 1000)))
    const cached = cache.get(key)
    if (cached && Date.now() - cached.receivedAt < ttl) return Promise.resolve({ ...cached, cache: 'HIT', queueMs: 0, networkMs: 0 })
    let entry = pending.get(key)
    if (!entry) {
      if (pending.size >= 64) return Promise.reject(new MarketError(503, 'busy', 1))
      const controller = new AbortController(), queuedAt = performance.now()
      entry = { controller, users: 0, settled: false }
      const owned = entry
      entry.promise = gates[request.group].run(async () => {
        const started = performance.now()
        if (Date.now() < blockedUntil) throw new MarketError(503, 'upstream_cooldown', Math.ceil((blockedUntil - Date.now()) / 1000))
        const response = await fetchImpl(`https://api.upbit.com/v1${request.path}`, {
          headers: { Accept: 'application/json' }, redirect: 'error',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
        })
        if (!response.ok) {
          await response.body?.cancel()
          if ([429, 418].includes(response.status)) {
            const header = response.headers.get('retry-after')
            const retryMs = Math.max(response.status === 418 ? 60_000 : 1000, Number(header) * 1000 || (Date.parse(header) - Date.now()) || 0)
            blockedUntil = Date.now() + retryMs
            for (const gate of Object.values(gates)) gate.defer(retryMs)
            throw new MarketError(503, 'upstream_cooldown', Math.ceil(retryMs / 1000))
          }
          throw new MarketError(response.status === 404 || response.status === 400 ? response.status : 502, 'upstream_error')
        }
        const remaining = response.headers.get('remaining-req') ?? ''
        if (/sec=0(?:;|$)/.test(remaining)) gates[request.group].defer(/group=origin/.test(remaining) ? 10_500 : 1000)
        const data = await readJson(response)
        controller.signal.throwIfAborted()
        const upstreamTime = Date.parse(response.headers.get('date'))
        const result = { data, receivedAt: Date.now(), upstreamTime: Number.isFinite(upstreamTime) ? upstreamTime : null, cache: 'MISS', queueMs: started - queuedAt, networkMs: performance.now() - started }
        cache.delete(key); cache.set(key, result)
        while (cache.size > 256) cache.delete(cache.keys().next().value)
        return result
      }, controller.signal).finally(() => { owned.settled = true; if (pending.get(key) === owned) pending.delete(key) })
      pending.set(key, entry)
    }
    const owned = entry; owned.users++
    return new Promise((resolve, reject) => {
      let released = false
      const release = () => {
        if (released) return; released = true
        signal?.removeEventListener('abort', abort)
        if (--owned.users === 0 && !owned.settled) { if (pending.get(key) === owned) pending.delete(key); owned.controller.abort() }
      }
      const abort = () => { release(); reject(signal.reason) }
      signal?.addEventListener('abort', abort, { once: true })
      owned.promise.then(result => { if (!released) { release(); resolve(result) } }, error => { if (!released) { release(); reject(error) } })
    })
  }
}
