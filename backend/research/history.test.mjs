import test from 'node:test'
import assert from 'node:assert/strict'
import { createHistoryReader, normalizeBars, tenMinuteBars } from './history.mjs'
const row = (at, step = 300000) => [at, '100', '102', '99', '101', '10', at + step - 1]
test('rejects open, invalid, unaligned bars and builds only complete aligned 10m pairs', () => {
  const candles = normalizeBars([row(0), row(300000), row(600000), row(1200000), row(1500000), row(1500000), row(1800000), row(1), [2100000, '', 102, 99, 101, 10, 2399999]], 300000, 1800000)
  assert.equal(candles.length, 5)
  const merged = tenMinuteBars(candles); assert.equal(merged.length, 2); assert.equal(merged[1].timestamp, 1200000); assert.equal(merged[0].volume, 20)
})
test('paginates backwards, deduplicates concurrent readers and caches only complete responses', async () => {
  let calls = 0
  const clock = 4000 * 3600000, all = Array.from({ length: 4000 }, (_, i) => row(i * 3600000, 3600000))
  const history = createHistoryReader({ now: () => clock, fetchImpl: async address => {
    calls++; const url = new URL(address), end = Number(url.searchParams.get('endTime') ?? clock), limit = Number(url.searchParams.get('limit'))
    assert.equal(url.origin, 'https://fapi.binance.com'); assert.equal(url.searchParams.get('interval'), '1h')
    return { ok: true, json: async () => all.filter(r => r[0] <= end).slice(-limit) }
  } })
  const [a, b] = await Promise.all([history('BTC', '1h', 3000), history('BTC', '1h', 3000)])
  assert.equal(calls, 4); assert.equal(a.candles.length, 3000); assert.deepEqual(a, b)
  assert.equal(a.candles[0].timestamp, 1000 * 3600000)
  await history('BTC', '1h', 3000); assert.equal(calls, 4)
  await assert.rejects(history('BTC', '2h', 1000), /invalid_history/)
})
