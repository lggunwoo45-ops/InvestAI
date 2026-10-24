import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultExplorerConfig, explorerSignals, exploreHistory, matchesFrame, signalFrames, timeframes, validExplorerConfig } from './signals.mjs'
const bars = (n = 250, step = 3600000) => Array.from({ length: n }, (_, i) => { const close = 100 + 8 * Math.sin(i / 7); return { timestamp: 1800000000000 + i * step, open: close - .2, high: close + .5, low: close - .5, close, volume: 10 } })
test('30 unique directional signals, nine intervals and strict configuration validation', () => {
  assert.equal(explorerSignals.length, 30); assert.equal(new Set(explorerSignals.map(s => s.id)).size, 30); assert.equal(explorerSignals.filter(s => s.side === 'long').length, 15); assert.equal(Object.keys(timeframes).length, 9)
  for (const patch of [{ timeframe: 'toString' }, { signals: ['bogus'] }, { signals: [] }, { signals: ['rsi-long', 'rsi-long'] }, { horizon: 1.2 }, { target: NaN }, { cost: -1 }, { window: 2 }, { bars: 10000 }]) assert.equal(validExplorerConfig({ ...defaultExplorerConfig, ...patch }), false)
})
test('features and recorded history are prefix invariant and reset after missing bars', () => {
  const rows = bars(), frames = signalFrames(rows, '1h')
  assert.deepEqual(signalFrames(rows.slice(0, 150), '1h'), frames.slice(0, 150))
  assert.ok(frames.slice(60).some(f => f.signals.length))
  const gap = [...rows.slice(0, 100), ...rows.slice(101)], reset = signalFrames(gap, '1h')
  assert.ok(reset.slice(100, 160).every(f => !f.ready && !f.signals.length)); assert.equal(reset[160].ready, true)
})
test('Wilder RSI gives 100 for gains, zero for losses and 50 for flat prices', () => {
  for (const [delta, expected] of [[1, 100], [-.1, 0], [0, 50]]) {
    const rows = bars(70).map((c, i) => ({ ...c, open: 100 + i * delta, close: 100 + i * delta, high: 101 + i * delta, low: 99 + i * delta }))
    assert.equal(signalFrames(rows, '1h').at(-1).rsi, expected)
  }
})
test('window combines only present or prior features, never future signals; historical regime uses that bar', () => {
  const rows = bars(80), frames = rows.map(c => ({ at: c.timestamp, ready: true, signals: [], rsi: 50, ema50: c.close - 1, volumeRatio: 1 }))
  frames[70].signals = ['ema-long']; frames[72].signals = ['volume-long']
  const c = { ...defaultExplorerConfig, signals: ['ema-long', 'volume-long'], window: 3, regime: 'above' }
  assert.equal(matchesFrame(frames, rows, 71, c), false); assert.equal(matchesFrame(frames, rows, 72, c), true)
  assert.equal(matchesFrame(frames, rows, 72, { ...c, window: 1 }), false)
  assert.equal(matchesFrame(frames, rows, 72, { ...c, regime: 'below' }), false)
})
test('next-open entry, both-touch ambiguity, timeout, costs and no overlapping observation windows', () => {
  const rows = bars(100).map(c => ({ ...c, open: 100, close: 100, high: 100.5, low: 99.5 }))
  const frames = rows.map(c => ({ at: c.timestamp, ready: true, signals: ['rsi-long'], rsi: 20, ema50: 100, volumeRatio: 1 }))
  rows[60].close = 50; rows[60].low = 49 // Signal bar price must not be the entry price.
  rows[61].high = 103; rows[61].low = 97
  rows[65].high = 103
  const c = { ...defaultExplorerConfig, window: 1, horizon: 3, target: 2, cost: .2 }
  const result = exploreHistory(rows, c, frames)
  assert.equal(result.records[0].entry, 100); assert.equal(result.records[0].outcome, 'ambiguous'); assert.equal(result.records[0].net, null)
  assert.equal(result.records[1].outcome, 'up'); assert.ok(Math.abs(result.records[1].net - 1.8) < 1e-9)
  assert.ok(result.records.slice(1).every((r, i) => r.enteredAt >= result.records[i].enteredAt + 3 * 3600000))
  assert.equal(result.samples, result.up + result.down + result.timeout); assert.ok(result.timeout > 0)
  const short = exploreHistory(rows, { ...c, side: 'short' }, frames); assert.ok(Math.abs(short.records[1].net + 2.2) < 1e-9)
})
test('timeframe changes retain correct gap and horizon semantics', () => {
  for (const [timeframe, step] of Object.entries(timeframes)) {
    const rows = bars(250, step), c = { ...defaultExplorerConfig, timeframe, signals: ['williams-long'] }
    assert.ok(signalFrames(rows, timeframe).at(-1).ready)
    assert.ok(exploreHistory(rows, c).samples > 0)
  }
})
