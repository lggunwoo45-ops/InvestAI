import test from 'node:test'
import assert from 'node:assert/strict'
import { createHistoryReader } from './history.mjs'
test('20,000 ten-minute bars paginate over 40,000 native bars and share a completed cache', async () => {
  const step = 300000, now = 50000 * step
  let calls = 0
  const history = createHistoryReader({ now: () => now, fetchImpl: async address => {
    calls++; const q = new URL(address).searchParams, last = Math.floor(Number(q.get('endTime') ?? now - 1) / step), count = Number(q.get('limit'))
    assert.equal(q.get('interval'), '5m')
    return { ok: true, json: async () => Array.from({ length: count }, (_, i) => [(last - count + i + 1) * step, 100, 101, 99, 100, 10, (last - count + i + 2) * step - 1]) }
  } })
  const [a, b] = await Promise.all([history('BTC', '10m', 20000), history('BTC', '10m', 20000)])
  assert.equal(calls, 41); assert.equal(a.candles.length, 20000); assert.equal(a.candles[0].timestamp, 10000 * step)
  assert.equal(a.candles.at(-1).volume, 20); assert.deepEqual(a, b)
  await history('BTC', '10m', 20000); assert.equal(calls, 41)
})
test('failed long pagination cannot expose or cache a partial response; provider exhaustion returns actual coverage', async () => {
  let calls = 0, fail = true
  const history = createHistoryReader({ now: () => 50000 * 3600000, fetchImpl: async () => {
    calls++
    if (calls === 1 || !fail) return { ok: true, json: async () => Array.from({ length: fail ? 1000 : 200 }, (_, i) => [i * 3600000, 100, 101, 99, 100, 10, (i + 1) * 3600000 - 1]) }
    throw new Error('offline')
  } })
  await assert.rejects(history('BTC', '1h', 20000), /offline/)
  fail = false
  const result = await history('BTC', '1h', 20000)
  assert.equal(calls, 3); assert.equal(result.candles.length, 200); assert.equal(result.requested, 20000)
})
