import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildDerivativeContext, derivativeMatch } from './derivativeContext.mjs'
import { createDerivativeCollector, openDerivativeStore, validContextQuery, HOUR, DAY } from './derivatives.mjs'
import { defaultExplorerConfig, exploreHistory, matchesFrame, validExplorerConfig } from './signals.mjs'
import { normalizeSignalWatch } from '../monitor/signalWatch.mjs'
const base = Date.parse('2026-10-26T00:00:00Z')
const row = (metric, at, knownAt, value) => ({ metric, at, knownAt, value })

test('as-of join excludes late backfills and keeps the pre-correction value at earlier decisions', () => {
  const rows = [row('funding', base - HOUR, base + HOUR, .001), row('funding', base - HOUR, base + 3 * HOUR, -.002)]
  const result = buildDerivativeContext(rows, base, base + 4 * HOUR, HOUR)
  assert.equal(result[0].funding, null)
  assert.equal(result[1].funding.value, .001); assert.equal(result[2].funding.value, .001)
  assert.equal(result[3].funding.value, -.002)
  assert.deepEqual(buildDerivativeContext(rows, base, base + 2 * HOUR, HOUR), result.slice(0, 3))
  assert.equal(derivativeMatch({ funding: 'positive' }, result[0], base), 'unknown')
  assert.equal(derivativeMatch({ funding: 'positive' }, result[1], base + HOUR), 'match')
  assert.equal(derivativeMatch({ funding: 'positive' }, result[3], base + 3 * HOUR), 'miss')
})
test('OI requires a timely current value and exactly 24-hour earlier value known by decision time', () => {
  const rows = [row('openInterest', base - DAY, base - HOUR, 100), row('openInterest', base, base + HOUR / 2, 110)]
  const result = buildDerivativeContext(rows, base, base + 3 * HOUR, HOUR)
  assert.equal(result[0].openInterest, null)
  assert.ok(Math.abs(result[1].openInterest.change24h - 10) < 1e-8)
  assert.equal(derivativeMatch({ openInterest: 'rising' }, result[1], base + HOUR), 'match')
  assert.equal(derivativeMatch({ openInterest: 'falling' }, result[1], base + HOUR), 'miss')
  assert.equal(result[3].openInterest, null, 'two-hour freshness limit')
  for (const missing of [[], [rows[1]], [rows[0], { ...rows[1], knownAt: base + 2 * HOUR }], [{ ...rows[0], value: 0 }, rows[1]], [{ ...rows[0], at: base - DAY - HOUR }, rows[1]]]) assert.equal(buildDerivativeContext(missing, base + HOUR, base + HOUR, HOUR)[0].openInterest, null)
})
test('zero is observed but does not match a direction; stale, malformed and future values are unknown', () => {
  const p = { at: base, funding: { at: base - HOUR, knownAt: base - 1000, value: 0 }, openInterest: null }
  assert.equal(derivativeMatch({ funding: 'positive' }, p, base), 'miss')
  assert.equal(derivativeMatch({ funding: 'negative' }, p, base), 'miss')
  for (const f of [{ ...p.funding, at: base - 13 * HOUR }, { ...p.funding, knownAt: base + 1 }, { ...p.funding, knownAt: base - 2 * HOUR }, { ...p.funding, value: NaN }]) assert.equal(derivativeMatch({ funding: 'positive' }, { ...p, funding: f }, base), 'unknown')
  assert.equal(derivativeMatch({}, undefined, base), 'match')
  for (const patch of [{ funding: null }, { funding: 'anything' }, { openInterest: 0 }, { openInterest: 'up' }]) assert.equal(validExplorerConfig({ ...defaultExplorerConfig, ...patch }), false)
})
test('filtering uses signal close, fails closed without data, reports coverage before overlap exclusion and retains evidence', () => {
  const candles = Array.from({ length: 80 }, (_, i) => ({ timestamp: base + i * HOUR, open: 100, close: 100, high: 100.1, low: 99.9, volume: 1 }))
  const frames = candles.map(c => ({ at: c.timestamp, ready: true, signals: ['rsi-long'], rsi: 20, ema50: 100, volumeRatio: 1 }))
  const config = { ...defaultExplorerConfig, window: 1, horizon: 1 }, filtered = { ...config, funding: 'positive' }
  const contexts = new Map(candles.slice(60).map((c, i) => { const at = c.timestamp + HOUR; return [at, { at, funding: i % 3 === 0 ? null : { at: c.timestamp, knownAt: at - 1, value: i % 3 === 1 ? .001 : -.001 }, openInterest: null }] }))
  assert.ok(exploreHistory(candles, config, frames).samples > 0)
  assert.equal(exploreHistory(candles, filtered, frames).samples, 0)
  const result = exploreHistory(candles, filtered, frames, contexts)
  assert.deepEqual(result.derivativeCoverage, { candidates: 20, available: 13, unknown: 7, excluded: 6, matched: 7 })
  assert.equal(result.samples, 6); assert.ok(result.records.every(r => r.derivatives.funding.knownAt <= r.enteredAt))
  assert.equal(matchesFrame(frames, candles, 61, filtered, contexts), true)
  contexts.get(candles[61].timestamp + HOUR).funding.knownAt = candles[61].timestamp + HOUR + 1
  assert.equal(matchesFrame(frames, candles, 61, filtered, contexts), false)
  assert.deepEqual(exploreHistory(candles, { ...config, funding: 'any', openInterest: 'any' }, frames), exploreHistory(candles, config, frames))
})
test('stored revision context is bounded, persistent and isolated by asset', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'investai-context-')), clock = () => base + DAY
  const store = openDerivativeStore(dir, clock)
  store.save('BTC', 'funding', [{ at: base, value: .001 }], base + HOUR)
  store.save('BTC', 'funding', [{ at: base, value: -.001 }], base + 2 * HOUR)
  store.close()
  const collector = createDerivativeCollector({ directory: dir, assets: ['BTC', 'ETH'], clock, autoStart: false })
  t.after(async () => { await collector.close(); await rm(dir, { recursive: true, force: true }) })
  const result = collector.context('BTC', '1h', base, base + 2 * HOUR)
  assert.equal(result.firstStoredAt, base + HOUR); assert.equal(result.points[0].funding, null)
  assert.equal(result.points[1].funding.value, .001); assert.equal(result.points[2].funding.value, -.001)
  assert.ok(collector.context('ETH', '1h', base, base + 2 * HOUR).points.every(p => p.funding === null))
  for (const args of [['BTC', '1h', base, base + 2 * DAY], ['BTC', '1h', base + 1, base + HOUR], ['BTC', 'toString', base, base], ['BAD', '1h', base, base], ['BTC', '1m', base - 10000 * 60_000, base]]) assert.equal(validContextQuery(...args, clock(), ['BTC']), false)
})
test('derivative watch conditions are retained while legacy normalization stays identical', () => {
  const input = { requestId: 'signal-test-1', asset: 'BTC', name: 'test', notify: false, config: defaultExplorerConfig }
  const old = normalizeSignalWatch(input)
  assert.equal(old.config.funding, undefined)
  assert.deepEqual(normalizeSignalWatch({ ...input, config: { ...input.config, funding: 'any', openInterest: 'any' } }), old)
  assert.equal(normalizeSignalWatch({ ...input, config: { ...input.config, funding: 'positive' } }).config.funding, 'positive')
})
