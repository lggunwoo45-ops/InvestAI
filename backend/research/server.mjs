import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createHistoryReader, intervals } from './history.mjs'
import { createLiquidationCollector } from './liquidations.mjs'
import { createEconomicCalendar } from './economicCalendar.mjs'

export const researchAssets = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'AVAX', 'LINK', 'LTC', 'TRX', 'DOT', 'NEAR', 'APT', 'ARB', 'OP', 'SUI', 'BCH', 'ATOM', 'UNI', 'AAVE', 'INJ', 'TIA']

/** Fixed public endpoints only. No credentials, user URLs, trading or account calls. */
export function createResearchClient({ fetchImpl = fetch, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map()
  async function load(url, ttl = 60_000, body) {
    const key = `${url}|${body ?? ''}`
    const cached = cache.get(key)
    if (cached && now() - cached.at < ttl) return cached
    if (pending.has(key)) return pending.get(key)
    const work = (async () => {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(8000), redirect: 'error', headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { method: 'POST', body } : {}) })
      if (!response.ok) throw new Error('provider_unavailable')
      const text = await response.text()
      if (text.length > 2_000_000) throw new Error('response_too_large')
      const data = JSON.parse(text)
      if ((data?.code !== undefined && Number(data.code) !== 0 && data.code !== '00000') || data?.error || (data?.retCode !== undefined && data.retCode !== 0)) throw new Error('provider_error')
      const date = Date.parse(response.headers?.get('date') ?? '')
      const ageSeconds = Number(response.headers?.get('age') ?? 0)
      const entry = { data, at: now(), ...(Number.isFinite(date) ? { serverTime: date } : {}), ageMs: Number.isFinite(ageSeconds) && ageSeconds >= 0 ? ageSeconds * 1000 : 0 }
      cache.set(key, entry)
      return entry
    })().finally(() => pending.delete(key))
    pending.set(key, work)
    return work
  }
  return {
    async wallet(address) {
      if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('invalid_address')
      // Read-only public info request. Do not cache or log addresses or positions.
      const response = await fetchImpl('https://api.hyperliquid.xyz/info', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'clearinghouseState', user: address }) })
      if (!response.ok) throw new Error('provider_unavailable')
      const value = await response.json()
      if (!Array.isArray(value.assetPositions)) throw new Error('invalid_wallet_response')
      return { source: 'Hyperliquid', fetchedAt: now(), positions: value.assetPositions.slice(0, 100).map(({ position: p }) => ({ coin: p.coin, size: p.szi, entryPrice: p.entryPx, liquidationPrice: p.liquidationPx, unrealizedPnl: p.unrealizedPnl, positionValue: p.positionValue, leverage: p.leverage?.value, marginType: p.leverage?.type })) }
    },
    async snapshot(asset) {
      if (!researchAssets.includes(asset)) throw new Error('invalid_asset')
      const symbol = `${asset}USDT`
      const sources = {
        mark: [`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`, 'Binance USDⓈ-M'],
        fundingInfo: ['https://fapi.binance.com/fapi/v1/fundingInfo', 'Binance USDⓈ-M'],
        interest: [`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`, 'Binance USDⓈ-M'],
        interestHistory: [`https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=30`, 'Binance USDⓈ-M'],
        ratios: [`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=30`, 'Binance USDⓈ-M'],
        taker: [`https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${symbol}&period=1h&limit=30`, 'Binance USDⓈ-M'],
        fundingHistory: [`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=100`, 'Binance USDⓈ-M'],
        candles: [`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1h&limit=1000`, 'Binance USDⓈ-M'],
        spot: [`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, 'Binance Spot'],
        futures: [`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`, 'Binance USDⓈ-M'],
        korea: [`https://api.upbit.com/v1/ticker?markets=KRW-${asset},KRW-USDT`, 'Upbit'],
        sentiment: ['https://api.alternative.me/fng/?limit=30', 'Alternative.me'],
        global: ['https://api.coingecko.com/api/v3/global', 'CoinGecko'],
        bybit: [`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`, 'Bybit'],
        okx: [`https://www.okx.com/api/v5/public/funding-rate?instId=${asset}-USDT-SWAP`, 'OKX'],
        bitget: [`https://api.bitget.com/api/v2/mix/market/current-fund-rate?symbol=${symbol}&productType=USDT-FUTURES`, 'Bitget'],
        hyperliquid: ['https://api.hyperliquid.xyz/info', 'Hyperliquid', JSON.stringify({ type: 'metaAndAssetCtxs' })],
        koreaAll: ['https://api.upbit.com/v1/ticker/all?quote_currencies=KRW', 'Upbit'],
        spotAll: [`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(researchAssets.map(a => `${a}USDT`)))}`, 'Binance Spot'],
      }
      const entries = await Promise.all(Object.entries(sources).map(async ([key, [url, source, body]]) => {
        try {
          const result = await load(url, ['global', 'sentiment'].includes(key) ? 600_000 : 60_000, body)
          return [key, { status: 'available', source, receivedAt: result.at, serverTime: result.serverTime, ageMs: result.ageMs, data: result.data }]
        } catch { return [key, { status: 'unavailable', source, data: null }] }
      }))
      return { version: 1, asset, symbol, fetchedAt: now(), sources: Object.fromEntries(entries) }
    },
  }
}

export function createResearchHandler({ local = false, origins = [], client = createResearchClient(), now = Date.now, historyReader = createHistoryReader(), liquidations = createLiquidationCollector({ assets: researchAssets }), calendar = createEconomicCalendar() } = {}) {
  const allowed = new Set(origins)
  let at = now(), requests = 0, active = 0, eventRequests = 0, calendarActive = 0
  const handler = async (req, res, next = () => { res.writeHead(404); res.end() }) => {
    if (!req.url?.startsWith('/api/research/')) return next()
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' }
    const send = (status, body) => { if (!res.destroyed && !res.writableEnded) { res.writeHead(status, { ...headers, Date: new Date(now()).toUTCString() }); res.end(JSON.stringify(body)) } }
    const host = req.headers.host, origin = req.headers.origin
    const loopback = /^(localhost|127\.0\.0\.1):\d{1,5}$/.test(host ?? '') && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
    if (local && !loopback) return send(403, { error: 'local_only' })
    if (origin && !(local ? loopback && origin === `http://${host}` : allowed.has(origin))) return send(403, { error: 'origin_rejected' })
    if (origin) headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Expose-Headers'] = 'Date'
    const url = new URL(req.url, 'http://research.local')
    const wallet = url.pathname === '/api/research/wallet'
    const history = url.pathname === '/api/research/history'
    if (req.method === 'OPTIONS' && wallet && origin) { headers['Access-Control-Allow-Methods'] = 'POST'; headers['Access-Control-Allow-Headers'] = 'Content-Type'; return send(200, {}) }
    if (req.method !== 'GET' && !(wallet && req.method === 'POST')) return send(405, { error: 'read_only' })
    if (url.pathname === '/api/research/health') return send(200, { service: 'investai-research', version: 1 })
    const asset = url.searchParams.get('asset')
    if (now() - at >= 60_000) { at = now(); requests = 0; eventRequests = 0 }
    const liquidationRoute = url.pathname === '/api/research/liquidations', calendarRoute = url.pathname === '/api/research/calendar'
    if (liquidationRoute || calendarRoute) {
      if (calendarRoute ? url.searchParams.size !== 0 : url.searchParams.size !== 1 || !researchAssets.includes(asset)) return send(400, { error: 'invalid_query' })
      // Public cached observations have their own budget; polling cannot starve history/wallet requests.
      if (++eventRequests > 900 || (calendarRoute && calendarActive >= 16)) { headers['Retry-After'] = '60'; return send(429, { error: 'research_busy' }) }
      if (calendarRoute) calendarActive++
      try { return send(200, calendarRoute ? await calendar.snapshot() : liquidations.snapshot(asset)) }
      catch { return send(503, { error: 'research_unavailable' }) }
      finally { if (calendarRoute) calendarActive-- }
    }
    if (!wallet && !history && url.pathname !== '/api/research/snapshot') return send(404, { error: 'not_found' })
    if (history ? url.searchParams.size !== 3 || !researchAssets.includes(asset) || !Object.hasOwn(intervals, url.searchParams.get('timeframe')) || !['1000', '3000', '5000'].includes(url.searchParams.get('count')) : wallet ? req.method !== 'POST' || url.searchParams.size !== 0 : url.searchParams.size !== 1 || !researchAssets.includes(asset)) return send(400, { error: 'invalid_query' })
    if (++requests > 30 || active >= 3) { headers['Retry-After'] = '60'; return send(429, { error: 'research_busy' }) }
    active++
    try {
      if (history) return send(200, await historyReader(asset, url.searchParams.get('timeframe'), Number(url.searchParams.get('count'))))
      if (wallet) {
        if (!req.headers['content-type']?.startsWith('application/json')) return send(400, { error: 'invalid_body' })
        let body = ''
        for await (const chunk of req) { body += chunk; if (body.length > 512) return send(413, { error: 'body_too_large' }) }
        let payload
        try { payload = JSON.parse(body) } catch { return send(400, { error: 'invalid_body' }) }
        if (Object.keys(payload ?? {}).length !== 1 || typeof payload?.address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(payload.address)) return send(400, { error: 'invalid_address' })
        return send(200, await client.wallet(payload.address))
      }
      send(200, await client.snapshot(asset))
    } catch { send(503, { error: 'research_unavailable' }) } finally { active-- }
  }
  handler.close = () => { liquidations.close(); calendar.close() }
  return handler
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const handler = createResearchHandler({ origins: (process.env.UPBIT_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean) })
  const server = createServer(handler)
  server.on('close', handler.close)
  server.headersTimeout = 10_000; server.requestTimeout = 15_000; server.maxConnections = 128
  server.listen(Number(process.env.PORT ?? 8791), process.env.HOST ?? '127.0.0.1')
}
