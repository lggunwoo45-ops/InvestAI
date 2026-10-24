import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createPrivatePositionReader, assertReadOnly } from './privatePositions.mjs'

const at = 1800000000000
const credentials = { apiKey: 'fixture_key_123456789', apiSecret: 'fixture_secret_123456789' }
const flags = () => ({ enableReading: true, enableFixReadOnly: true, enableWithdrawals: false, enableInternalTransfer: false, enableMargin: false, enableFutures: false, permitsUniversalTransfer: false, enableVanillaOptions: false, enableFixApiTrade: false, enableSpotAndMarginTrading: false, enablePortfolioMarginTrading: false })
const rawBinance = () => ({ symbol: 'BTCUSDT', positionAmt: '2', positionSide: 'LONG', entryPrice: '100', markPrice: '90', unRealizedProfit: '-20', liquidationPrice: '80' })
const rawBybit = () => ({ symbol: 'BTCUSDT', size: '2', side: 'Sell', positionIdx: 2, avgPrice: '100', markPrice: '90', unrealisedPnl: '20', liqPrice: '', leverage: '' })
const response = (data, headers = {}) => new Response(JSON.stringify(data), { headers: { date: new Date(at).toUTCString(), ...headers } })
function fixtures(venue, customize = () => undefined) {
  const calls = []
  const fetcher = async (url, options) => {
    const parsed = new URL(url); calls.push({ url: parsed, options })
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store')
    assert.ok(['https://api.binance.com', 'https://fapi.binance.com', 'https://api.bybit.com'].includes(parsed.origin))
    let data
    if (venue === 'binance') {
      data = {
        '/fapi/v1/time': { serverTime: at },
        '/sapi/v1/account/apiRestrictions': flags(),
        '/fapi/v1/exchangeInfo': { symbols: [{ symbol: 'BTCUSDT', contractType: 'PERPETUAL', quoteAsset: 'USDT', marginAsset: 'USDT', baseAsset: 'BTC' }] },
        '/fapi/v1/symbolConfig': [{ symbol: 'BTCUSDT', leverage: 10, marginType: 'ISOLATED' }],
        '/fapi/v3/positionRisk': [rawBinance(), { ...rawBinance(), positionAmt: '-1', positionSide: 'SHORT' }],
      }[parsed.pathname]
    } else {
      data = { retCode: 0, time: at, result: {
        '/v5/market/time': {},
        '/v5/user/query-api': { apiKey: credentials.apiKey, readOnly: 1, permissions: { ContractTrade: ['Position'] }, userID: 123 },
        '/v5/market/instruments-info': { category: 'linear', nextPageCursor: '', list: [{ symbol: 'BTCUSDT', contractType: 'LinearPerpetual', quoteCoin: 'USDT', settleCoin: 'USDT', baseCoin: 'BTC' }] },
        '/v5/position/list': { category: 'linear', nextPageCursor: '', list: [rawBybit()] },
      }[parsed.pathname] }
    }
    const override = customize(parsed, data, options)
    if (override instanceof Response) return override
    return response(data)
  }
  return { calls, fetcher }
}
test('Binance signs exact queries against server time, verifies permission before positions and preserves both hedge sides', async () => {
  const f = fixtures('binance'), read = createPrivatePositionReader(f.fetcher, () => at + 300000)
  const result = await read('binance', credentials)
  assert.equal(result.receivedAt, at + 300000); assert.equal(result.sourceAt, null)
  assert.deepEqual(result.positions.map(p => p.key), ['BTC:long', 'BTC:short'])
  assert.equal(result.positions[0].quote, 'USDT'); assert.equal(result.positions[0].marginType, 'isolated'); assert.equal(result.positions[0].leverage, 10)
  for (const { url, options } of f.calls.filter(c => c.url.searchParams.has('signature'))) {
    const signature = url.searchParams.get('signature'); url.searchParams.delete('signature')
    assert.equal(url.searchParams.get('timestamp'), String(at))
    assert.equal(signature, createHmac('sha256', credentials.apiSecret).update(url.searchParams.toString()).digest('hex'))
    assert.equal(options.headers['X-MBX-APIKEY'], credentials.apiKey)
  }
  const permissionIndex = f.calls.findIndex(c => c.url.pathname.includes('apiRestrictions'))
  assert.ok(permissionIndex >= 0 && permissionIndex < f.calls.findIndex(c => c.url.pathname.includes('positionRisk')))
  assert.equal(JSON.stringify(result).includes(credentials.apiKey), false)
})
test('Bybit signs headers, reads every cursor, uses mark price and never fabricates missing leverage or liquidation', async () => {
  const f = fixtures('bybit', (url, data) => {
    if (url.pathname === '/v5/position/list') {
      if (!url.searchParams.has('cursor')) data.result.nextPageCursor = 'page=2&after/BTC'
      else data.result.list = [{ ...rawBybit(), side: 'Buy', positionIdx: 1 }]
    }
  })
  const result = await createPrivatePositionReader(f.fetcher, () => at)('bybit', credentials)
  assert.deepEqual(result.positions.map(p => p.side), ['short', 'long']); assert.equal(result.positions[0].currentPrice, 90)
  assert.equal(result.positions[0].liquidationPrice, null); assert.equal(result.positions[0].leverage, null); assert.equal(result.positions[0].marginType, 'unknown')
  for (const { url, options } of f.calls.filter(c => c.options.headers['X-BAPI-SIGN'])) {
    const h = options.headers
    assert.equal(h['X-BAPI-SIGN'], createHmac('sha256', credentials.apiSecret).update(String(at) + credentials.apiKey + '5000' + url.searchParams.toString()).digest('hex'))
    assert.equal(h['X-BAPI-API-KEY'], credentials.apiKey)
  }
  assert.equal(JSON.stringify(result).includes('userID'), false)
})
test('trade-capable, missing and changed permissions fail closed and are rechecked on every poll', async () => {
  for (const key of ['enableFutures', 'enableWithdrawals', 'enableInternalTransfer', 'permitsUniversalTransfer', 'enablePortfolioMarginTrading', 'enableSpotAndMarginTrading', 'enableNewTrade']) assert.throws(() => assertReadOnly('binance', { ...flags(), [key]: true }, credentials.apiKey), /읽기 전용/)
  const missing = flags(); delete missing.enableFutures; assert.throws(() => assertReadOnly('binance', missing, credentials.apiKey))
  let writable = false
  const f = fixtures('bybit', (url, data) => { if (url.pathname === '/v5/user/query-api' && writable) data.result.readOnly = 0 })
  const read = createPrivatePositionReader(f.fetcher, () => at)
  await read('bybit', credentials); const count = f.calls.filter(c => c.url.pathname === '/v5/position/list').length; writable = true
  await assert.rejects(() => read('bybit', credentials), /읽기 전용/)
  assert.equal(f.calls.filter(c => c.url.pathname === '/v5/position/list').length, count)
})
test('incomplete pages, inconsistent hedge directions, duplicate or unknown symbols never become closed positions', async () => {
  for (const change of [
    (url, data) => { if (url.pathname === '/v5/position/list') data.result.nextPageCursor = 'repeated' },
    (url, data) => { if (url.pathname === '/v5/position/list') data.result.list[0].positionIdx = 1 },
    (url, data) => { if (url.pathname === '/v5/position/list') data.result.list[0].symbol = 'UNKNOWN' },
    (url, data) => { if (url.pathname === '/v5/position/list') data.result.list[0].markPrice = 'NaN' },
  ]) {
    const f = fixtures('bybit', change)
    await assert.rejects(() => createPrivatePositionReader(f.fetcher, () => at)('bybit', credentials), /불완전/)
  }
  const f = fixtures('binance', (url, data) => { if (url.pathname === '/fapi/v3/positionRisk') data[0].positionAmt = '-2' })
  await assert.rejects(() => createPrivatePositionReader(f.fetcher, () => at)('binance', credentials), /불완전/)
})
test('rate limits, stale responses, oversized bodies, aborts and transport messages cannot leak credentials', async () => {
  let calls = 0
  const read = createPrivatePositionReader(async () => { calls++; return new Response('', { status: 429 }) }, () => at)
  await assert.rejects(() => read('binance', credentials), /요청 제한/); await assert.rejects(() => read('binance', credentials), /요청 제한/); assert.equal(calls, 1)
  const old = fixtures('binance', (url, data) => url.pathname === '/fapi/v3/positionRisk' ? response(data, { age: '100' }) : undefined)
  await assert.rejects(() => createPrivatePositionReader(old.fetcher, () => at)('binance', credentials), /시각/)
  const huge = fixtures('bybit', url => url.pathname === '/v5/user/query-api' ? response({ payload: 'x'.repeat(512001) }) : undefined)
  await assert.rejects(() => createPrivatePositionReader(huge.fetcher, () => at)('bybit', credentials), /불완전/)
  const bad = createPrivatePositionReader(async () => { throw new Error(credentials.apiKey + credentials.apiSecret) }, () => at)
  await assert.rejects(() => bad('bybit', credentials), e => !e.message.includes(credentials.apiKey) && !e.message.includes(credentials.apiSecret))
  const aborted = new AbortController(); aborted.abort()
  const f = fixtures('bybit')
  await assert.rejects(() => createPrivatePositionReader(f.fetcher, () => at)('bybit', credentials, aborted.signal))
})
