import { createHmac } from 'node:crypto'
import { normalizeCredentials } from './credentialVault.mjs'
import { validPositionSnapshot } from './positions.mjs'

export const isPrivateVenue = venue => ['binance', 'bybit'].includes(venue)
export class PrivatePositionError extends Error {}
const fail = message => { throw new PrivatePositionError(message) }
const incomplete = () => fail('거래소 응답이 불완전해 이전 포지션을 보존합니다.')
const number = value => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) ? Number(value) : null
const positive = value => { const n = number(value); return n !== null && n > 0 ? n : null }
const optionalPositive = value => {
  if (value === '' || value === null || value === undefined || number(value) === 0) return null
  return positive(value) ?? incomplete()
}
const hmac = (secret, text) => createHmac('sha256', secret).update(text).digest('hex')
const writes = ['enableWithdrawals', 'enableInternalTransfer', 'enableMargin', 'enableFutures', 'permitsUniversalTransfer', 'enableVanillaOptions', 'enableFixApiTrade', 'enableSpotAndMarginTrading', 'enablePortfolioMarginTrading']

export function assertReadOnly(venue, data, apiKey) {
  if (venue === 'binance') {
    // Fail closed for missing known flags and future, enabled permissions.
    if (!data || data.enableReading !== true || writes.some(k => data[k] !== false) || Object.entries(data).some(([k, v]) => /^(enable|permits)/.test(k) && v === true && !['enableReading', 'enableFixReadOnly'].includes(k))) fail('Binance 읽기 전용 권한을 확인하지 못했습니다. 거래·출금·이체 권한을 모두 끈 키가 필요합니다.')
  } else if (!data || data.readOnly !== 1 || data.apiKey !== apiKey || !data.permissions || typeof data.permissions !== 'object' || !Array.isArray(data.permissions.ContractTrade) || !data.permissions.ContractTrade.includes('Position')) {
    fail('Bybit 읽기 전용 키와 계약 포지션 조회 권한을 확인하지 못했습니다.')
  }
}

/** Fixed GET endpoints only. No orders, balances, transfer or withdrawal methods exist here. */
export function createPrivatePositionReader(fetcher = fetch, clock = Date.now) {
  const cooldown = new Map(), catalogs = new Map()
  return async (venue, input, externalSignal) => {
    if (!isPrivateVenue(venue)) fail('지원하지 않는 계정 연결입니다.')
    const credentials = normalizeCredentials(input)
    if ((cooldown.get(venue) ?? 0) > clock()) fail('거래소 요청 제한으로 잠시 조회를 보류합니다.')
    const signal = externalSignal ? AbortSignal.any([externalSignal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
    const origin = venue === 'binance' ? 'https://fapi.binance.com' : 'https://api.bybit.com'
    let offset = 0, synchronized = false
    async function get(path, params = {}, signed = false, permission = false, publicCatalog = false) {
      signal.throwIfAborted()
      const query = new URLSearchParams(params), headers = { accept: 'application/json' }
      if (signed) {
        const timestamp = String(Math.floor(clock() + offset))
        if (venue === 'binance') {
          query.set('recvWindow', '5000'); query.set('timestamp', timestamp)
          query.set('signature', hmac(credentials.apiSecret, query.toString()))
          headers['X-MBX-APIKEY'] = credentials.apiKey
        } else {
          headers['X-BAPI-API-KEY'] = credentials.apiKey
          headers['X-BAPI-TIMESTAMP'] = timestamp; headers['X-BAPI-RECV-WINDOW'] = '5000'
          headers['X-BAPI-SIGN'] = hmac(credentials.apiSecret, timestamp + credentials.apiKey + '5000' + query.toString())
        }
      }
      const url = `${permission && venue === 'binance' ? 'https://api.binance.com' : origin}${path}${query.size ? `?${query}` : ''}`
      const response = await fetcher(url, { method: 'GET', headers, redirect: 'error', cache: 'no-store', signal })
      if ([418, 429].includes(response.status)) { cooldown.set(venue, clock() + Math.min(3600, Math.max(60, Number(response.headers.get('retry-after')) || 60)) * 1000); fail('거래소 요청 제한으로 잠시 조회를 보류합니다.') }
      if (!response.ok) fail('계정 조회를 거절당했습니다. 키의 유효기간·조회 권한·허용 IP와 거래소 이용 가능 지역을 확인해주세요. 거래 권한은 켜지 마세요.')
      const reader = response.body?.getReader(); if (!reader) incomplete()
      const chunks = []; let bytes = 0
      try { for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > (publicCatalog ? 4_000_000 : 512_000)) incomplete(); chunks.push(value) } } finally { await reader.cancel().catch(() => {}) }
      let data; try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { incomplete() }
      const age = number(response.headers.get('age') ?? '0'), serverAt = Date.parse(response.headers.get('date') ?? '')
      if (age === null || age < 0 || age > 5 || !Number.isFinite(serverAt) || synchronized && !publicCatalog && Math.abs(serverAt - clock() - offset) > 20000) fail('거래소 응답 시각을 확인하지 못해 판정을 보류합니다.')
      if (venue === 'bybit') {
        if (data?.retCode === 10006) { cooldown.set(venue, clock() + 60000); fail('거래소 요청 제한으로 잠시 조회를 보류합니다.') }
        if (data?.retCode !== 0) fail('Bybit 계정 조회를 거절당했습니다. 키·읽기 권한·허용 IP를 확인해주세요.')
        if (!positive(data.time) || Math.abs(data.time - serverAt) > 20000) incomplete()
      } else if (data?.code && data.code < 0) fail('Binance 계정 조회를 거절당했습니다. 키·읽기 권한·허용 IP를 확인해주세요.')
      return data
    }
    async function catalog() {
      const cached = catalogs.get(venue)
      if (cached && clock() - cached.at < 600000) return cached.items
      let rows = []
      if (venue === 'binance') {
        const data = await get('/fapi/v1/exchangeInfo', {}, false, false, true)
        if (!Array.isArray(data.symbols)) incomplete()
        rows = data.symbols
      } else {
        let cursor = ''; const seen = new Set()
        do {
          const data = await get('/v5/market/instruments-info', { category: 'linear', limit: '1000', ...(cursor ? { cursor } : {}) }, false, false, true)
          if (data.result?.category !== 'linear' || !Array.isArray(data.result.list)) incomplete()
          rows.push(...data.result.list); cursor = data.result.nextPageCursor ?? ''
          if (typeof cursor !== 'string' || seen.has(cursor) || seen.size >= 10 || rows.length > 10000) incomplete()
          seen.add(cursor)
        } while (cursor)
      }
      const items = new Map()
      for (const r of rows) {
        if (typeof r?.symbol !== 'string' || items.has(r.symbol)) incomplete()
        const supported = venue === 'binance' ? r.contractType === 'PERPETUAL' && r.quoteAsset === 'USDT' && r.marginAsset === 'USDT' : r.contractType === 'LinearPerpetual' && r.quoteCoin === 'USDT' && r.settleCoin === 'USDT'
        const asset = venue === 'binance' ? r.baseAsset : r.baseCoin
        if (supported && (typeof asset !== 'string' || !/^[A-Za-z0-9._:-]{1,40}$/.test(asset))) incomplete()
        items.set(r.symbol, supported ? asset : null)
      }
      if (!items.size) incomplete()
      catalogs.set(venue, { at: clock(), items }); return items
    }
    try {
      const time = await get(venue === 'binance' ? '/fapi/v1/time' : '/v5/market/time')
      const serverTime = positive(venue === 'binance' ? time.serverTime : time.time)
      if (!serverTime) incomplete()
      offset = serverTime - clock(); synchronized = true
      const permission = await get(venue === 'binance' ? '/sapi/v1/account/apiRestrictions' : '/v5/user/query-api', {}, true, true)
      assertReadOnly(venue, venue === 'binance' ? permission : permission.result, credentials.apiKey)
      const symbols = await catalog(), positions = []
      function append(row, size, extra) {
        if (!symbols.has(row.symbol)) { catalogs.delete(venue); incomplete() }
        const asset = symbols.get(row.symbol)
        if (!asset) return // Explicitly scoped to USDT perpetuals, never label this as the whole account.
        const side = size > 0 ? 'long' : 'short'
        positions.push({ key: `${asset}:${side}`, asset, side, size, quote: 'USDT', ...extra })
      }
      if (venue === 'binance') {
        const configs = await get('/fapi/v1/symbolConfig', {}, true)
        if (!Array.isArray(configs) || configs.some(p => typeof p?.symbol !== 'string') || new Set(configs.map(p => p.symbol)).size !== configs.length) incomplete()
        const rows = await get('/fapi/v3/positionRisk', {}, true)
        if (!Array.isArray(rows) || rows.length > 3000) incomplete()
        for (const p of rows) {
          const size = number(p?.positionAmt); if (size === null) incomplete(); if (!size) continue
          if (!['BOTH', 'LONG', 'SHORT'].includes(p.positionSide) || p.positionSide === 'LONG' && size < 0 || p.positionSide === 'SHORT' && size > 0) incomplete()
          const config = configs.find(c => c.symbol === p.symbol)
          append(p, size, { entryPrice: positive(p.entryPrice), currentPrice: positive(p.markPrice), unrealizedPnl: number(p.unRealizedProfit), liquidationPrice: optionalPositive(p.liquidationPrice), leverage: optionalPositive(config?.leverage), marginType: config?.marginType === 'ISOLATED' ? 'isolated' : config?.marginType === 'CROSSED' ? 'cross' : 'unknown' })
        }
      } else {
        let cursor = ''; const seen = new Set(), rowKeys = new Set()
        do {
          const data = await get('/v5/position/list', { category: 'linear', settleCoin: 'USDT', limit: '200', ...(cursor ? { cursor } : {}) }, true)
          if (data.result?.category !== 'linear' || !Array.isArray(data.result.list)) incomplete()
          for (const p of data.result.list) {
            const size = number(p?.size); if (size === null || size < 0) incomplete(); if (!size) continue
            if (!['Buy', 'Sell'].includes(p.side) || ![0, 1, 2].includes(p.positionIdx) || p.positionIdx === 1 && p.side !== 'Buy' || p.positionIdx === 2 && p.side !== 'Sell') incomplete()
            const key = `${p.symbol}:${p.positionIdx}`; if (rowKeys.has(key)) incomplete(); rowKeys.add(key)
            append(p, size * (p.side === 'Buy' ? 1 : -1), { entryPrice: positive(p.avgPrice), currentPrice: positive(p.markPrice), unrealizedPnl: number(p.unrealisedPnl), liquidationPrice: optionalPositive(p.liqPrice), leverage: optionalPositive(p.leverage), marginType: 'unknown' })
          }
          cursor = data.result.nextPageCursor ?? ''
          if (typeof cursor !== 'string' || seen.has(cursor) || seen.size >= 10) incomplete()
          seen.add(cursor)
        } while (cursor)
      }
      signal.throwIfAborted()
      const result = { receivedAt: clock(), sourceAt: null, positions }
      if (!validPositionSnapshot(result)) incomplete()
      return result
    } catch (error) {
      // Never return transport errors, signed URLs, headers or provider-supplied messages.
      if (error instanceof PrivatePositionError) throw error
      fail('비공개 포지션 조회를 완료하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.')
    }
  }
}
