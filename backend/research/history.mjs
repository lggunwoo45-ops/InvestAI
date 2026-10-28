export const intervals = { '1m': 60000, '3m': 180000, '5m': 300000, '10m': 600000, '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000, '1d': 86400000 }

export function normalizeBars(rows, interval, now) {
  const seen = new Map()
  for (const r of rows) {
    if (!Array.isArray(r)) continue
    const [timestamp, open, high, low, close, volume, end] = r.slice(0, 7).map(Number)
    if (![timestamp, open, high, low, close, volume, end].every(Number.isFinite) || r.slice(0, 7).some(v => v == null || v === '') || timestamp < 0 || timestamp % interval !== 0 || end !== timestamp + interval - 1 || end >= now || Math.min(open, high, low, close) <= 0 || volume < 0 || low > Math.min(open, close) || high < Math.max(open, close)) continue
    seen.set(timestamp, { timestamp, open, high, low, close, volume })
  }
  return [...seen.values()].sort((a, b) => a.timestamp - b.timestamp)
}
export function tenMinuteBars(bars) {
  const byTime = new Map(bars.map(c => [c.timestamp, c]))
  return bars.flatMap(a => {
    if (a.timestamp % 600000 !== 0) return []
    const b = byTime.get(a.timestamp + 300000)
    return b ? [{ timestamp: a.timestamp, open: a.open, high: Math.max(a.high, b.high), low: Math.min(a.low, b.low), close: b.close, volume: a.volume + b.volume }] : []
  })
}
export function createHistoryReader({ fetchImpl = fetch, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map()
  let budgetAt = now(), requests = 0
  return async function history(asset, timeframe, count) {
    if (!Object.hasOwn(intervals, timeframe) || ![1000, 3000, 5000, 20000].includes(count)) throw new Error('invalid_history_query')
    const key = `${asset}:${timeframe}:${count}`, cached = cache.get(key)
    if (cached && now() - cached.fetchedAt < 30000) return cached
    if (pending.has(key)) return pending.get(key)
    const work = (async () => {
      const raw = [], native = timeframe === '10m' ? '5m' : timeframe, needed = count * (timeframe === '10m' ? 2 : 1) + 2
      let endTime, providerNow = now(), complete = false
      const deadline = AbortSignal.timeout(80_000)
      for (let page = 0; raw.length < needed && page < 42; page++) {
        if (now() - budgetAt >= 60_000) { budgetAt = now(); requests = 0 }
        if (++requests > 120) throw new Error('history_busy')
        const limit = Math.min(1000, needed - raw.length)
        const query = new URLSearchParams({ symbol: `${asset}USDT`, interval: native, limit: String(limit), ...(endTime === undefined ? {} : { endTime: String(endTime) }) })
        const response = await fetchImpl(`https://fapi.binance.com/fapi/v1/klines?${query}`, { signal: AbortSignal.any([deadline, AbortSignal.timeout(8000)]), redirect: 'error', headers: { Accept: 'application/json' } })
        if (!response.ok) throw new Error('history_unavailable')
        const date = Date.parse(response.headers?.get('date') ?? '')
        const age = Number(response.headers?.get('age') ?? 0)
        if (Number.isFinite(date) && Number.isFinite(age) && age >= 0) providerNow = date + age * 1000
        const rows = await response.json()
        if (!Array.isArray(rows) || rows.length > limit) throw new Error('invalid_history_response')
        if (!rows.length) { complete = true; break }
        const earliest = Number(rows[0]?.[0])
        if (!Number.isFinite(earliest) || (endTime !== undefined && earliest > endTime)) throw new Error('invalid_history_cursor')
        raw.push(...rows); endTime = earliest - 1
        if (rows.length < limit) { complete = true; break }
      }
      if (!complete && raw.length < needed) throw new Error('incomplete_history')
      const normalized = normalizeBars(raw, intervals[native], providerNow)
      const candles = (timeframe === '10m' ? tenMinuteBars(normalized) : normalized).slice(-count)
      const result = { version: 1, asset, timeframe, requested: count, fetchedAt: now(), asOf: providerNow, source: 'Binance USDⓈ-M', candles }
      if (cache.size >= 16) cache.delete(cache.keys().next().value)
      cache.set(key, result)
      return result
    })().finally(() => pending.delete(key))
    pending.set(key, work)
    return work
  }
}
