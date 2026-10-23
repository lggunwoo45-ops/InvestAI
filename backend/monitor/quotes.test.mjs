import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuoteReader } from './quotes.mjs'
const now = 1_800_000_000_000
const response = (data, headers = {}) => new Response(JSON.stringify(data), { headers: { date: new Date(now).toUTCString(), ...headers } })
test('uses trade timestamp for Upbit and rejects stale trades even with a new snapshot timestamp', async () => {
  const read = createQuoteReader(async () => response([{ market: 'KRW-BTC', trade_price: 100, trade_timestamp: now - 120_000, timestamp: now }]), () => now)
  await assert.rejects(read({ venue: 'upbit', symbol: 'KRW-BTC' }), /관측 시각/)
})
test('uses provider clock when local PC clock is ahead and checks Binance spot trade time', async () => {
  let url
  const read = createQuoteReader(async value => { url = value; return response([{ price: '100', time: now }]) }, () => now + 300_000)
  const q = await read({ venue: 'binance-spot', symbol: 'BTCUSDT' })
  assert.equal(q.at, now); assert.equal(q.receivedAt, now + 300_000); assert.match(url, /data-api.binance.vision/)
})
test('requires source clock and accounts for cached response Age', async () => {
  const missing = createQuoteReader(async () => new Response(JSON.stringify({ symbol: 'BTCUSDT', markPrice: '100', time: now })))
  await assert.rejects(missing({ venue: 'binance-futures', symbol: 'BTCUSDT' }))
  const aged = createQuoteReader(async () => response({ symbol: 'BTCUSDT', markPrice: '100', time: now }, { age: '120' }))
  await assert.rejects(aged({ venue: 'binance-futures', symbol: 'BTCUSDT' }))
})
test('429 response backs off rather than repeatedly hitting provider', async () => {
  let calls = 0
  const read = createQuoteReader(async () => { calls++; return new Response('', { status: 429 }) }, () => now)
  const instrument = { venue: 'upbit', symbol: 'KRW-BTC' }
  await assert.rejects(read(instrument)); await assert.rejects(read(instrument)); assert.equal(calls, 1)
})
test('a different returned instrument is never used as the requested quote', async () => {
  const read = createQuoteReader(async () => response({ symbol: 'ETHUSDT', markPrice: '100', time: now }))
  await assert.rejects(read({ venue: 'binance-futures', symbol: 'BTCUSDT' }), /거래쌍/)
})
