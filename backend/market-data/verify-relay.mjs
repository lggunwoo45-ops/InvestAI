import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function validateTarget(base, origin, market) {
  const url = new URL(base)
  const loopback = ['localhost', '127.0.0.1'].includes(url.hostname)
  if (!(url.protocol === 'https:' || (loopback && url.protocol === 'http:'))
    || url.pathname !== '/api/upbit' || url.username || url.password || url.search || url.hash) {
    throw new Error('Relay URL must be HTTPS (or HTTP loopback), ending in /api/upbit with no credentials, query or fragment')
  }
  const source = new URL(origin)
  if (source.origin !== origin || !['http:', 'https:'].includes(source.protocol)) throw new Error('Use an exact browser origin, without a path')
  if (!/^(KRW|BTC|USDT)-[A-Z0-9]+$/.test(market)) throw new Error('Invalid market')
  return url.href
}

// Exercise the public browser contract, including CORS and an actual fresh ticker.
// A health response alone cannot prove that Upbit or a streaming proxy works.
export async function verifyRelay({
  base, origin = 'https://lggunwoo45-ops.github.io', market = 'KRW-BTC',
  fetchImpl = fetch, timeoutMs = 15_000,
} = {}) {
  base = validateTarget(base, origin, market)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('Relay verification timed out')), timeoutMs)
  const started = performance.now()
  const elapsed = () => Math.round(performance.now() - started)
  const observations = []
  let exchangeClock
  const request = async path => {
    const response = await fetchImpl(base + path, {
      headers: { Origin: origin }, credentials: 'omit', redirect: 'error', signal: controller.signal,
    })
    try {
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
      if (response.headers.get('access-control-allow-origin') !== origin) throw new Error(`${path}: browser origin is not allowed`)
      return response
    } catch (error) { await response.body?.cancel(); throw error }
  }
  try {
    const healthResponse = await request('/health')
    const health = await healthResponse.json()
    if (health.service !== 'investai-upbit' || health.version !== 1) throw new Error('Unexpected relay health response')
    observations.push({ path: '/health', elapsedMs: elapsed() })
    const catalog = '/ticker/all?quote_currencies=KRW,BTC,USDT'
    const paths = ['days', 'minutes/60', 'minutes/240'].map(frame => `/candles/${frame}?market=${market}&count=120`)
    const history = async path => {
      const response = await request(path)
      const data = await response.json()
      const exposed = response.headers.get('access-control-expose-headers')?.toLowerCase().split(',').map(value => value.trim()) ?? []
      if (!['server-timing', 'x-upbit-age-ms', 'x-upbit-server-time'].every(name => exposed.includes(name))) throw new Error(`${path}: timing/freshness headers are not exposed`)
      const age = response.headers.get('x-upbit-age-ms')
      if (age === null || !Number.isFinite(Number(age)) || Number(age) < 0 || Number(age) > 5000) throw new Error(`${path}: missing or stale receipt age`)
      if (!Array.isArray(data) || !data.length) throw new Error(`${path}: empty or invalid data`)
      if (path !== catalog && data.some(item => item.market !== market || !Number.isFinite(item.trade_price) || item.trade_price <= 0)) throw new Error(`${path}: invalid candle data`)
      if (path === catalog && !data.some(item => item.market === market && Number.isFinite(item.trade_price) && item.trade_price > 0)) throw new Error('Selected market missing from catalog')
      if (path === catalog) {
        const serverTime = response.headers.get('x-upbit-server-time')
        if (!serverTime || !Number.isFinite(Number(serverTime)) || Number(serverTime) <= 0) throw new Error('Missing Upbit server clock')
        exchangeClock = { at: performance.now(), time: Number(serverTime) + Number(age) }
      }
      const timing = response.headers.get('server-timing')
      if (!timing?.includes('cache;desc=')) throw new Error(`${path}: missing cache measurement`)
      observations.push({ path, elapsedMs: elapsed(), rows: data.length, timing })
    }
    const ticker = async () => {
      const response = await request(`/stream?market=${market}`)
      const reader = response.body?.getReader()
      try {
        if (!response.headers.get('content-type')?.startsWith('text/event-stream') || !reader) throw new Error('Relay did not open an event stream')
        let buffer = ''
        const decoder = new TextDecoder()
        while (true) {
          const { value, done } = await reader.read()
          if (done) throw new Error('Relay stream ended before a fresh ticker')
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
          if (buffer.length > 256_000) throw new Error('Oversized relay event')
          let end
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const event = buffer.slice(0, end); buffer = buffer.slice(end + 2)
            const lines = event.split('\n')
            if (!lines.includes('event: quote')) continue
            const data = JSON.parse(lines.filter(line => line.startsWith('data: ')).map(line => line.slice(6)).join('\n'))
            const message = data.message
            if (message?.type !== 'ticker' || message.code !== market) continue
            // Use Upbit's HTTP clock, not a possibly skewed PC/runner wall clock.
            const exchangeNow = exchangeClock.time + performance.now() - exchangeClock.at
            if (!Number.isFinite(data.ageMs) || data.ageMs < 0 || data.ageMs > 5000
              || ![message.timestamp, message.trade_timestamp].every(time => Number.isFinite(time) && exchangeNow - time <= 90_000 && time - exchangeNow <= 30_000)
              || !Number.isFinite(message.trade_price) || message.trade_price <= 0) continue
            observations.push({ market, firstLiveTickerMs: elapsed(), replayAgeMs: data.ageMs })
            return
          }
        }
      } finally { await reader?.cancel() }
    }
    await history(catalog)
    const results = await Promise.allSettled([...paths.map(history), ticker()].map(promise => promise.catch(error => {
      controller.abort(error)
      throw error
    })))
    const failure = results.find(result => result.status === 'rejected')
    if (failure) throw controller.signal.reason ?? failure.reason
    return { elapsedMs: elapsed(), observations, allHistoriesUncached: observations.filter(row => row.timing).every(row => row.timing.includes('cache;desc="MISS"')) }
  } finally { clearTimeout(timer); controller.abort() }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await verifyRelay({
      base: process.argv[2] ?? process.env.UPBIT_RELAY_URL,
      origin: process.argv[3] ?? process.env.UPBIT_SITE_ORIGIN,
      market: process.argv[4] ?? 'KRW-BTC',
    })
    for (const observation of result.observations) console.log(JSON.stringify(observation))
    console.log(JSON.stringify({ verified: true, elapsedMs: result.elapsedMs, allHistoriesUncached: result.allHistoriesUncached }))
  } catch (error) {
    console.error(`Relay verification failed: ${error.message}`)
    process.exitCode = 1
  }
}
