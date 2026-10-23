const MAX_BYTES = 64_000
export async function boundedJson(response) {
  if (!response.body) throw new Error('시세 응답이 비어 있습니다.')
  const reader = response.body.getReader(), chunks = []; let size = 0
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > MAX_BYTES) throw new Error('응답 크기를 초과했습니다.'); chunks.push(value) }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } finally { await reader.cancel().catch(() => {}) }
}
export function createQuoteReader(fetcher = fetch, clock = Date.now) {
  const cooldown = new Map()
  return async instrument => {
    const { venue, symbol } = instrument
    if ((cooldown.get(venue) ?? 0) > clock()) throw new Error('거래소 요청 제한으로 잠시 대기 중입니다.')
    const url = venue === 'upbit' ? `https://api.upbit.com/v1/ticker?markets=${encodeURIComponent(symbol)}` : venue === 'binance-spot' ? `https://data-api.binance.vision/api/v3/trades?symbol=${encodeURIComponent(symbol)}&limit=1` : `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`
    const response = await fetcher(url, { signal: AbortSignal.timeout(8000), redirect: 'error', headers: { accept: 'application/json' } })
    if (!response.ok) {
      if ([418, 429].includes(response.status)) cooldown.set(venue, clock() + Math.max(60, Math.min(3600, Number(response.headers.get('retry-after')) || 60)) * 1000)
      throw new Error(`거래소 시세 응답 오류 (${response.status})`)
    }
    const data = await boundedJson(response), row = venue === 'binance-futures' ? data : data[0]
    if (venue === 'upbit' && row?.market !== symbol || venue === 'binance-futures' && row?.symbol !== symbol) throw new Error('요청한 거래쌍과 시세가 일치하지 않습니다.')
    const price = Number(venue === 'upbit' ? row?.trade_price : venue === 'binance-spot' ? row?.price : row?.markPrice)
    const at = Number(venue === 'upbit' ? row?.trade_timestamp : row?.time)
    const serverAt = Date.parse(response.headers.get('date') ?? '') + Math.max(0, Number(response.headers.get('age')) || 0) * 1000
    if (!Number.isFinite(serverAt) || !Number.isFinite(at) || at <= 0 || serverAt - at > 90_000 || at - serverAt > 5000 || !Number.isFinite(price) || price <= 0) throw new Error('거래소 관측 시각 또는 가격이 유효하지 않습니다.')
    return { price, at, receivedAt: clock() }
  }
}
