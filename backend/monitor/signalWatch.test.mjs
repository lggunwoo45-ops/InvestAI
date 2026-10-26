import test from 'node:test'
import assert from 'node:assert/strict'
import { createSignalWatch, normalizeSignalWatch, observeSignalWatch, stopSignalWatch, validSignalWatch } from './signalWatch.mjs'
import { defaultExplorerConfig } from '../research/signals.mjs'
const step = 3600000, at = 1800000000000
const config = () => normalizeSignalWatch({ requestId: 'signal-test-1', name: '돌파 테스트', asset: 'BTC', notify: true, config: { ...defaultExplorerConfig, signals: ['volume-long'], window: 1, horizon: 3 }, purpose: 'opportunity' })
const rows = (n = 80) => Array.from({ length: n }, (_, i) => ({ timestamp: at + i * step, open: 100, high: 100.5, low: 99.5, close: 100, volume: 10 }))
const observation = candles => ({ asset: 'BTC', timeframe: '1h', candles, asOf: candles.at(-1).timestamp + step + 1000 })
test('first read establishes baseline, new edge records once, then next open and result use the frozen config', () => {
  const r = createSignalWatch(config(), at), candles = rows()
  observeSignalWatch(r, observation(candles), at); assert.equal(r.events.length, 0)
  candles.push({ timestamp: at + 80 * step, open: 100, close: 101, high: 101.5, low: 99.5, volume: 30 })
  observeSignalWatch(r, observation(candles), at + 81 * step); assert.equal(r.events.length, 1); assert.equal(r.events[0].entry, null)
  observeSignalWatch(r, observation(candles), at + 81 * step); assert.equal(r.events.length, 1)
  candles.push({ timestamp: at + 81 * step, open: 101, close: 104, high: 104, low: 100.9, volume: 30 })
  observeSignalWatch(r, observation(candles), at + 82 * step)
  assert.equal(r.events.length, 1); assert.equal(r.events[0].outcome, 'up'); assert.equal(r.events[0].entry, 101); assert.ok(Math.abs(r.events[0].net - 1.8) < 1e-9); assert.ok(validSignalWatch(r))
})
test('missing bars, stale histories and both-touch results never fabricate returns', () => {
  const r = createSignalWatch(config(), at), candles = rows()
  observeSignalWatch(r, observation(candles), at)
  candles.push({ timestamp: at + 80 * step, open: 100, close: 101, high: 101, low: 100, volume: 30 })
  observeSignalWatch(r, observation(candles), at + 81 * step)
  const stale = { ...observation(candles), asOf: at + 90 * step }; observeSignalWatch(r, stale, at + 90 * step); assert.match(r.issue, /최신/)
  candles.push({ timestamp: at + 82 * step, open: 101, close: 105, high: 105, low: 100, volume: 10 })
  observeSignalWatch(r, observation(candles), at + 83 * step); assert.equal(r.events[0].outcome, 'unresolved'); assert.equal(r.events[0].net, null)
  stopSignalWatch(r, at + 84 * step); assert.equal(r.active, false)
})
test('opposing-position mode requires all selected signals to oppose the supplied holding direction', () => {
  assert.throws(() => normalizeSignalWatch({ ...config(), purpose: 'opposition', holdingSide: 'long' }), /반대/)
  assert.equal(normalizeSignalWatch({ ...config(), purpose: 'opposition', holdingSide: 'short' }).holdingSide, 'short')
  const r = createSignalWatch(config(), at); r.config.config.cost = 5; assert.equal(validSignalWatch(r), false)
})

const filteredConfig = () => normalizeSignalWatch({ ...config(), config: { ...config().config, funding: 'positive', openInterest: 'rising' } })
const context = (decision, value = .0001) => ({ at: decision, funding: { at: decision - step, knownAt: decision - 1, value }, openInterest: { at: decision - step, knownAt: decision - 1, value: 110, previousAt: decision - 25 * step, previousKnownAt: decision - step, previousValue: 100, change24h: 10 } })
const contexts = (candles, value = .0001) => new Map(candles.map(c => [c.timestamp + step, context(c.timestamp + step, value)]))
const append = (candles, i, close = 101) => candles.push({ timestamp: at + i * step, open: 100, high: close + .1, low: 99.9, close, volume: 40 })

test('filtered watches keep immutable evidence, defer unknown data, rebaseline recovery and track outcomes independently', () => {
  const rule = createSignalWatch(filteredConfig(), at), candles = rows()
  observeSignalWatch(rule, observation(candles), at, contexts(candles))
  append(candles, 80); observeSignalWatch(rule, observation(candles), at, contexts(candles, -.0001))
  assert.equal(rule.events.length, 0); assert.equal(rule.derivativeState, 'miss')
  append(candles, 81); const known = contexts(candles)
  observeSignalWatch(rule, observation(candles), at, known)
  assert.equal(rule.events.length, 1); assert.equal(rule.derivativeState, 'match')
  const evidence = structuredClone(rule.events[0].derivatives)
  known.get(candles.at(-1).timestamp + step).funding.value = -.001
  observeSignalWatch(rule, observation(candles), at, known)
  assert.deepEqual(rule.events[0].derivatives, evidence)
  append(candles, 82, 104); observeSignalWatch(rule, observation(candles), at)
  assert.equal(rule.events[0].outcome, 'up'); assert.equal(rule.derivativeState, 'unknown'); assert.match(rule.issue, /보류/)
  observeSignalWatch(rule, observation(candles), at, contexts(candles))
  assert.equal(rule.derivativeState, 'unknown') // no retrospective retry of the same bar
  append(candles, 83); observeSignalWatch(rule, observation(candles), at, contexts(candles))
  assert.equal(rule.events.length, 1); assert.equal(rule.issue, null)
  append(candles, 84); observeSignalWatch(rule, observation(candles), at, contexts(candles, -.0001))
  append(candles, 85); observeSignalWatch(rule, observation(candles), at, contexts(candles))
  assert.equal(rule.events.length, 2); assert.ok(validSignalWatch(rule))
  rule.events[0].derivatives.funding.knownAt = evidence.at + 1
  assert.equal(validSignalWatch(rule), false)
})

test('late data, stale OI and a restarted unknown state cannot manufacture a new edge', () => {
  let rule = createSignalWatch(filteredConfig(), at), candles = rows()
  observeSignalWatch(rule, observation(candles), at)
  assert.ok(validSignalWatch(rule)); rule = JSON.parse(JSON.stringify(rule))
  append(candles, 80); const late = contexts(candles)
  late.get(candles.at(-1).timestamp + step).funding.knownAt += 2
  observeSignalWatch(rule, observation(candles), at, late)
  assert.equal(rule.derivativeState, 'unknown')
  append(candles, 81); const stale = contexts(candles)
  stale.get(candles.at(-1).timestamp + step).openInterest.at -= 3 * step
  observeSignalWatch(rule, observation(candles), at, stale)
  assert.equal(rule.events.length, 0)
  // Multiple missed bars on recovery all establish a baseline, even if the latest matches.
  append(candles, 82); append(candles, 83)
  observeSignalWatch(rule, observation(candles), at, contexts(candles))
  assert.equal(rule.events.length, 0); assert.equal(rule.matched, true)
  observeSignalWatch(rule, observation(candles), at, contexts(candles))
  assert.equal(rule.events.length, 0)
})
