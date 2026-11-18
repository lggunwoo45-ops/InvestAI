import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openAccounts } from './accounts.mjs'
import { createPriceAlerts } from './prices.mjs'
import { telegramChannel } from '../monitor/notifications.mjs'

test('spot and futures price reminders preserve identity, ownership, retry idempotency and restart gaps', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mc-price-alerts-')), accounts = openAccounts(dir)
  const a = (await accounts.register({ username: 'alert-user-a', password: 'TestPass!123' })).user.id
  const b = (await accounts.register({ username: 'alert-user-b', password: 'TestPass!123' })).user.id
  let now = 1800000000000, value = 100, unavailable = false
  const reads = [], sends = [], telegram = { channel: () => ({ configured: true, send: async (r,e) => sends.push([r,e]) }) }
  const options = { clock: () => now, telegram, quoteReader: async i => { reads.push(i); if (unavailable) throw new Error('offline'); return { price: value, at: now, receivedAt: now } } }
  let prices = createPriceAlerts(accounts, options)
  try {
    const config = { instrument: { venue: 'upbit', asset: 'BTC', quote: 'KRW' }, above: 110, below: 90, notify: true, requestId: 'original' }
    const original = prices.register(a, config)[0]
    assert.equal(prices.register(a, config).length, 1)
    assert.throws(() => prices.register(a, { ...config, above: 115 }), /같은 요청/)
    assert.throws(() => prices.register(a, { ...config, instrument: { ...config.instrument, symbol: 'BTCUSDT' } }), /일치/)
    prices.register(a, { ...config, instrument: { venue: 'upbit', asset: 'BTC', quote: 'USDT' }, requestId: 'upbit-usdt' })
    prices.register(a, { asset: 'BTC', above: 110, below: 90, notify: true }) // legacy futures API
    prices.register(b, { ...config, notify: false })
    assert.equal(prices.list(a).filter(r => r.active).length, 3)
    assert.equal(prices.list(b).length, 1)
    assert.throws(() => prices.stop(b, original.id), /찾지 못/)
    assert.throws(() => prices.notification(b, { id: original.id, notify: true }), /찾지 못/)
    await prices.tick()
    assert.deepEqual(reads.map(i => i.symbol).sort(), ['BTCUSDT', 'KRW-BTC', 'USDT-BTC'])
    assert.ok(prices.list(a).every(r => r.events.length === 0))
    now += 15000; value = 111; await prices.tick(); await prices.dispatch()
    assert.equal(sends.length, 3)
    assert.ok(sends.every(([,e]) => e.kind === 'price-above' && e.threshold === 110))
    assert.equal(prices.list(b)[0].events[0].delivery, 'off')
    const replacement = prices.register(a, { ...config, requestId: 'replacement' })[0]
    assert.equal(prices.list(a).find(r => r.id === original.id).active, false)
    assert.equal(prices.list(a).filter(r => r.active).length, 3)
    prices.notification(a, { id: replacement.id, notify: false })
    assert.equal(prices.list(a).find(r => r.id === replacement.id).notify, false)
    unavailable = true; now += 15000; await prices.tick()
    unavailable = false; value = 80; now += 15000; await prices.tick()
    assert.equal(prices.list(a).find(r => r.id === replacement.id).events.length, 0)
    await prices.close(); prices = createPriceAlerts(accounts, options)
    value = 120; now += 15000; await prices.tick()
    assert.equal(prices.list(a).find(r => r.id === replacement.id).events.length, 0)
    assert.equal(prices.list(a).find(r => !r.requestId).instrument.venue, 'binance-futures')
  } finally { await prices.close(); accounts.close(); await rm(dir, { recursive: true, force: true }) }
})

test('a price crossing is never described as a confirmed strategy signal in Telegram', async () => {
  let body
  const channel = telegramChannel({ INVESTAI_TELEGRAM_ENABLED: 'true', INVESTAI_TELEGRAM_BOT_TOKEN: '123:test', INVESTAI_TELEGRAM_CHAT_ID: '123' }, async (_url, request) => { body = JSON.parse(request.body); return new Response(JSON.stringify({ ok: true })) })
  await channel.send({ config: { instrument: { venue: 'upbit', symbol: 'KRW-BTC', quote: 'KRW' }, side: '위쪽 가격 통과' } }, { kind: 'price-above', threshold: 110, price: 111, at: 1800000000000, id: 'test-event' })
  assert.match(body.text, /Market Copilot · 설정 가격 위로 통과/)
  assert.match(body.text, /설정 가격: 110 KRW/)
  assert.doesNotMatch(body.text, /선택한 신호 조합 충족/)
})
