import test from 'node:test'
import assert from 'node:assert/strict'
import { createSignalWatch, normalizeSignalWatch, observeSignalWatch, expireSignalTrial, stopSignalWatch, validSignalWatch } from './signalWatch.mjs'
import { defaultExplorerConfig } from '../research/signals.mjs'
const step = 3600000, at = 1800000000000
const configuration = () => normalizeSignalWatch({ requestId: 'forward-test-1', name: '새 사례만 검증', asset: 'BTC', notify: false, purpose: 'validation', trialDays: 7, config: { ...defaultExplorerConfig, signals: ['three-long'], window: 1, horizon: 3, target: 2, cost: .3 } })
const bars = n => Array.from({ length: n }, (_, i) => ({ timestamp: at + i * step, open: 100 + i * .01, close: 100.005 + i * .01, high: 100.01 + i * .01, low: 100 + i * .01, volume: 100 }))
const history = candles => ({ asset: 'BTC', timeframe: '1h', candles, asOf: candles.at(-1).timestamp + step + 1000 })
test('frozen trials establish a baseline, observe only new nonoverlapping cases, and preserve their rules on reload', () => {
  let r = createSignalWatch(configuration(), at + 80 * step)
  observeSignalWatch(r, history(bars(80)), r.createdAt)
  assert.equal(r.events.length, 0)
  for (let n = 81; n <= 85; n++) observeSignalWatch(r, history(bars(n)), at + n * step + 1000)
  assert.deepEqual(r.events.map(e => e.at), [at + 80 * step, at + 83 * step])
  assert.equal(r.events[0].outcome, 'timeout'); assert.equal(r.events[0].delivery.status, 'off')
  assert.ok(r.events[0].net < 0); assert.ok(validSignalWatch(r))
  r = JSON.parse(JSON.stringify(r)); assert.ok(validSignalWatch(r))
  r.config.trialDays = 30; assert.equal(validSignalWatch(r), false)
  r.config.trialDays = 7; r.config.config.cost = .1; assert.equal(validSignalWatch(r), false)
})
test('trial expiry and manual stop preserve records without inventing unfinished returns', () => {
  const r = createSignalWatch(configuration(), at + 80 * step)
  observeSignalWatch(r, history(bars(80)), r.createdAt)
  observeSignalWatch(r, history(bars(81)), at + 81 * step + 1000)
  expireSignalTrial(r, r.createdAt + 7 * 86400000)
  assert.equal(r.active, false); assert.equal(r.endReason, 'period'); assert.equal(r.events[0].outcome, 'unresolved'); assert.equal(r.events[0].net, null)
  assert.ok(validSignalWatch(r))
  const manual = createSignalWatch(configuration(), at); stopSignalWatch(manual, at + 1)
  assert.equal(manual.endReason, 'manual')
  assert.throws(() => normalizeSignalWatch({ ...configuration(), notify: true }))
  assert.throws(() => normalizeSignalWatch({ ...configuration(), trialDays: 5 }))
  assert.throws(() => normalizeSignalWatch({ ...configuration(), config: { ...configuration().config, timeframe: '1d', horizon: 7 } }), /관찰 기간/)
})
