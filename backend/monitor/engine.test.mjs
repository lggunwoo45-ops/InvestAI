import test from 'node:test'
import assert from 'node:assert/strict'
import { createRule, observe, cancelRule, normalizeRule, GAP_MS } from './engine.mjs'

const at = 1_800_000_000_000
export const fixture = (overrides = {}) => ({ requestId: 'request-1', instrument: { venue: 'binance-futures', asset: 'BTC', quote: 'USDT' }, source: { kind: 'review', id: 'review-1', revision: 'review-1', at, price: 100, note: 'original review', signals: ['aboveMean'] }, side: 'long', entry: [99, 101], target: 110, stop: 90, horizonHours: 1, costPercent: 0.2, notify: false, ...overrides })
const q = (price, t) => ({ price, at: t, receivedAt: t })
test('validates instruments, direction, boundaries and preserves venue/quote identity', () => {
  const config = normalizeRule(fixture({ instrument: { venue: 'upbit', asset: 'BTC', quote: 'KRW' } }))
  assert.equal(config.instrument.symbol, 'KRW-BTC')
  assert.throws(() => normalizeRule(fixture({ instrument: { venue: 'https://evil', asset: 'BTC', quote: 'USDT' } })))
  assert.throws(() => normalizeRule(fixture({ stop: 102 })))
  assert.throws(() => normalizeRule(fixture({ entry: [102, 101] })))
  assert.throws(() => normalizeRule(fixture({ costPercent: NaN })))
  assert.throws(() => normalizeRule(fixture({ side: 'short', instrument: { venue: 'upbit', asset: 'BTC', quote: 'KRW' } })))
})
test('first quote establishes baseline; later in-range quote enters; target uses observed price and costs', () => {
  const original = fixture(), r = createRule(original, at)
  original.source.note = 'changed'
  observe(r, q(100, at), at); assert.equal(r.phase, 'waiting')
  observe(r, q(100, at + 15_000), at + 15_000); assert.equal(r.phase, 'tracking')
  observe(r, q(112, at + 30_000), at + 30_000)
  assert.equal(r.result.kind, 'target'); assert.ok(Math.abs(r.result.netPercent - 11.8) < 1e-8)
  assert.equal(r.config.source.note, 'original review'); assert.equal(r.events.length, 2)
  observe(r, q(80, at + 45_000), at + 45_000); assert.equal(r.events.length, 2)
})
test('short stop and target use the correct direction', () => {
  const r = createRule(fixture({ side: 'short', target: 90, stop: 110 }), at)
  observe(r, q(100, at), at); observe(r, q(100, at + 1), at + 1); observe(r, q(112, at + 2), at + 2)
  assert.equal(r.result.kind, 'stop'); assert.ok(Math.abs(r.result.netPercent + 12.2) < 1e-8)
})
test('repeated and out-of-order provider timestamps never re-enter or overwrite price', () => {
  const r = createRule(fixture(), at)
  observe(r, q(120, at), at)
  observe(r, { price: 100, at, receivedAt: at + 20_000 }, at + 20_000)
  observe(r, { price: 100, at: at - 1, receivedAt: at + 30_000 }, at + 30_000)
  assert.equal(r.phase, 'waiting'); assert.equal(r.last.price, 120)
})
test('waiting recovery resets baseline, tracking gaps and clock reversal are unresolved without P&L', () => {
  const r = createRule(fixture(), at)
  observe(r, q(120, at), at)
  observe(r, q(100, at + GAP_MS + 1), at + GAP_MS + 1)
  assert.equal(r.phase, 'waiting'); assert.equal(r.gaps, 1)
  observe(r, q(100, at + GAP_MS + 2), at + GAP_MS + 2)
  observe(r, null, at + GAP_MS * 2 + 3, 'offline')
  assert.equal(r.result.kind, 'unresolved'); assert.equal(r.result.netPercent, null)
  const reversed = createRule(fixture(), at)
  observe(reversed, q(100, at), at); observe(reversed, q(100, at + 10_000), at + 10_000)
  observe(reversed, q(112, at), at); assert.equal(reversed.result.kind, 'unresolved')
})
test('timeout uses endpoint instead of crediting a target after the horizon', () => {
  const r = createRule(fixture({ horizonHours: 0.01 }), at)
  observe(r, q(100, at), at); observe(r, q(100, at + 1000), at + 1000)
  observe(r, q(120, at + 38_000), at + 38_000)
  assert.equal(r.result.kind, 'timeout')
})
test('waiting expiry and user cancellation never create a simulated fill', () => {
  const r = createRule(fixture(), at)
  observe(r, null, at + 3_600_001)
  assert.equal(r.result.kind, 'expired'); assert.equal(r.result.netPercent, null)
  const c = createRule(fixture(), at); cancelRule(c, at + 1); cancelRule(c, at + 2)
  assert.equal(c.events.length, 1); assert.equal(c.result.kind, 'cancelled')
})
