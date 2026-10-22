const ORIGIN = 'https://openapi.koreainvestment.com:9443'
export class StockError extends Error {
  constructor(code, status = 503, retryAfter = 30) { super(code); this.status = status; this.retryAfter = retryAfter }
}
export function stockSymbol(value) {
  if (typeof value !== 'string' || !/^\d{6}$/.test(value)) throw new StockError('invalid_symbol', 400, 0)
  return value
}
const numeric = value => typeof value === 'string' && value.trim() !== '' ? Number(value) : typeof value === 'number' ? value : NaN
export function normalizeQuote(output, symbol, fetchedAt) {
  const price = numeric(output?.stck_prpr), changePercent = numeric(output?.prdy_ctrt), volume = numeric(output?.acml_vol)
  if (![price, changePercent, volume].every(Number.isFinite) || price <= 0 || volume < 0) throw new StockError('invalid_quote')
  return { symbol, price, changePercent, volume, fetchedAt }
}
export function normalizeHistory(rows, today) {
  if (!Array.isArray(rows)) throw new StockError('invalid_history')
  const candles = new Map()
  for (const row of rows.slice(0, 100)) {
    const date = row.stck_bsop_date
    if (typeof date !== 'string' || !/^\d{8}$/.test(date) || date > today) continue
    const timestamp = Date.parse(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00Z`)
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10).replaceAll('-', '') !== date) continue
    const [open, high, low, close, volume] = ['stck_oprc', 'stck_hgpr', 'stck_lwpr', 'stck_clpr', 'acml_vol'].map(key => numeric(row[key]))
    if (![open, high, low, close, volume].every(Number.isFinite) || low <= 0 || high < Math.max(open, close, low) || low > Math.min(open, close) || volume < 0) continue
    candles.set(timestamp, { timestamp, open, high, low, close, volume })
  }
  const result = [...candles.values()].sort((a, b) => a.timestamp - b.timestamp)
  if (!result.length) throw new StockError('invalid_history')
  return result
}
export function koreaDate(now) { return new Date(now + 9 * 3_600_000).toISOString().slice(0, 10).replaceAll('-', '') }

/** Personal, read-only KRX snapshots. Never accepts an upstream URL or order route. */
export function createKisClient({ appKey = process.env.KIS_APP_KEY, appSecret = process.env.KIS_APP_SECRET, fetchImpl = fetch, now = Date.now, spacing = 1100 } = {}) {
  const configured = Boolean(appKey?.trim() && appSecret?.trim())
  const cache = new Map(), pending = new Map()
  let token = null, tokenPending = null, tokenRetryAt = 0, tail = Promise.resolve(), queued = 0, nextAt = 0, cooldown = 0
  const json = async (url, options) => {
    try {
      const response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(6000) })
      if (!response.ok) throw new StockError(response.status === 429 ? 'provider_limit' : 'provider_unavailable')
      // Bound payload size even when upstream omits Content-Length.
      if (Number(response.headers.get('content-length')) > 1_000_000) throw new StockError('invalid_response')
      const reader = response.body?.getReader()
      if (!reader) throw new StockError('invalid_response')
      const chunks = []; let size = 0
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break
          size += value.length; if (size > 1_000_000) throw new StockError('invalid_response')
          chunks.push(value)
        }
      } finally { await reader.cancel().catch(() => {}) }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch (error) { throw error instanceof StockError ? error : new StockError('provider_unavailable') }
  }
  const accessToken = () => {
    if (token && token.expires > now() + 60_000) return Promise.resolve(token.value)
    if (tokenPending) return tokenPending
    if (now() < tokenRetryAt) return Promise.reject(new StockError('authentication_wait', 503, Math.ceil((tokenRetryAt - now()) / 1000)))
    tokenRetryAt = now() + 60_000
    tokenPending = json(`${ORIGIN}/oauth2/tokenP`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grant_type: 'client_credentials', appkey: appKey, appsecret: appSecret }) })
      .then(body => {
        const expires = numeric(body.expires_in)
        if (typeof body.access_token !== 'string' || !body.access_token || !Number.isFinite(expires) || expires <= 60) throw new StockError('authentication_failed', 503, 60)
        token = { value: body.access_token, expires: now() + Math.min(expires, 86_400) * 1000 }; return token.value
      }).finally(() => { tokenPending = null })
    return tokenPending
  }
  const request = (path, trId, params) => {
    if (queued >= 16) return Promise.reject(new StockError('busy', 503, 10))
    queued++
    const result = tail.catch(() => {}).then(async () => {
      if (now() < cooldown) throw new StockError('provider_wait', 503, Math.ceil((cooldown - now()) / 1000))
      const wait = Math.max(0, nextAt - now()); if (wait) await new Promise(resolve => setTimeout(resolve, wait))
      const bearer = await accessToken()
      nextAt = now() + spacing
      const body = await json(`${ORIGIN}${path}?${new URLSearchParams(params)}`, { headers: { authorization: `Bearer ${bearer}`, appkey: appKey, appsecret: appSecret, tr_id: trId, custtype: 'P' } })
      if (body.rt_cd !== '0') throw new StockError('provider_rejected')
      return body
    }).catch(error => { cooldown = now() + 30_000; throw error }).finally(() => { queued-- })
    tail = result.catch(() => {}); return result
  }
  const cached = (key, ttl, loader) => {
    const hit = cache.get(key)
    if (hit && now() - hit.at < ttl) return Promise.resolve(hit.data)
    if (pending.has(key)) return pending.get(key)
    const work = loader().then(data => {
      cache.delete(key); cache.set(key, { at: now(), data })
      while (cache.size > 256) cache.delete(cache.keys().next().value)
      return data
    }).finally(() => pending.delete(key))
    pending.set(key, work); return work
  }
  return {
    configured,
    async snapshot(value) {
      const symbol = stockSymbol(value)
      if (!configured) throw new StockError('stock_setup_required', 503, 300)
      const today = koreaDate(now())
      const common = { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: symbol }
      const quote = await cached(`quote:${symbol}`, 30_000, async () => {
        const body = await request('/uapi/domestic-stock/v1/quotations/inquire-price', 'FHKST01010100', common)
        return normalizeQuote(body.output, symbol, now())
      })
      let candles = [], historyError = null
      try {
        candles = await cached(`history:${symbol}:${today}`, 300_000, async () => {
          const body = await request('/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice', 'FHKST03010100', { ...common, FID_INPUT_DATE_1: koreaDate(now() - 220 * 86_400_000), FID_INPUT_DATE_2: today, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '0' })
          return normalizeHistory(body.output2, today)
        })
      } catch (error) { historyError = error instanceof StockError ? error.message : 'history_unavailable' }
      return { provider: 'KIS', market: 'KRX', currency: 'KRW', quote, candles, historyError }
    },
  }
}
