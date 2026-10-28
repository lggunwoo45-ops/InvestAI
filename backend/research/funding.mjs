const DAY = 86_400_000
export function validFundingQuery(asset, from, to, now, assets) {
  return assets.includes(asset) && Number.isSafeInteger(from) && Number.isSafeInteger(to) && from >= 0 && to > from && to <= now && to - from <= 5001 * DAY
}

/** Only settled public Binance USD-M records. Never substitute a predicted/other-venue rate. */
export function createFundingReader({ assets, fetchImpl = fetch, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map()
  let budgetAt = now(), requests = 0
  return async function funding(asset, from, to) {
    if (!validFundingQuery(asset, from, to, now(), assets)) throw new Error('invalid_funding_query')
    const key = `${asset}:${from}:${to}`, cached = cache.get(key)
    if (cached && now() - cached.fetchedAt < 300_000) return cached
    if (pending.has(key)) return pending.get(key)
    if (pending.size >= 3) throw new Error('funding_busy')
    const work = (async () => {
      const records = [], symbol = `${asset}USDT`, deadline = AbortSignal.timeout(80_000)
      let cursor = from, complete = false
      for (let page = 0; page < 12; page++) {
        if (now() - budgetAt >= 300_000) { budgetAt = now(); requests = 0 }
        if (++requests > 60) throw new Error('funding_busy')
        const query = new URLSearchParams({ symbol, startTime: String(cursor), endTime: String(to), limit: '1000' })
        const response = await fetchImpl(`https://fapi.binance.com/fapi/v1/fundingRate?${query}`, { signal: AbortSignal.any([deadline, AbortSignal.timeout(8000)]), redirect: 'error', headers: { Accept: 'application/json' } })
        if (!response.ok) throw new Error('funding_unavailable')
        // Bound streamed responses before parsing; no unbounded provider payload in memory.
        let body = '', size = 0
        const decoder = new TextDecoder()
        for await (const chunk of response.body) {
          size += chunk.byteLength
          if (size > 400_000) throw new Error('invalid_funding_response')
          body += decoder.decode(chunk, { stream: true })
        }
        const rows = JSON.parse(body + decoder.decode())
        if (!Array.isArray(rows) || rows.length > 1000) throw new Error('invalid_funding_response')
        for (const row of rows) {
          const at = row?.fundingTime, rate = Number(row?.fundingRate)
          const markPrice = row?.markPrice == null || row.markPrice === '' ? null : Number(row.markPrice)
          if (row?.symbol !== symbol || (row.rateType != null && row.rateType !== 'Regular') || !Number.isSafeInteger(at) || at < cursor || at > to || (records.length && at <= records.at(-1).at) || row.fundingRate == null || row.fundingRate === '' || !Number.isFinite(rate) || Math.abs(rate) > 1 || (markPrice !== null && (!Number.isFinite(markPrice) || markPrice <= 0))) throw new Error('invalid_funding_response')
          records.push({ at, rate, markPrice })
        }
        if (rows.length < 1000 || records.at(-1)?.at === to) { complete = true; break }
        cursor = records.at(-1).at + 1 // inclusive provider endpoints
      }
      if (!complete) throw new Error('funding_range_too_large')
      const result = { version: 1, asset, source: 'Binance USDⓈ-M', from, to, fetchedAt: now(), records }
      if (cache.size >= 16) cache.delete(cache.keys().next().value)
      cache.set(key, result)
      return result
    })().finally(() => pending.delete(key))
    pending.set(key, work)
    return work
  }
}
