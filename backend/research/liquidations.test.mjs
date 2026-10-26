import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLiquidationCollector } from './liquidations.mjs'

function fixture(options = {}) {
  let at = 1_800_000_000_000
  const sockets = [], delayed = new Map(), repeating = new Map()
  class Socket {
    handlers = {}; sent = []; closed = false
    constructor(url) { assert.equal(url, 'wss://stream.bybit.com/v5/public/linear'); sockets.push(this) }
    addEventListener(name, fn) { this.handlers[name] = fn }
    send(text) { this.sent.push(JSON.parse(text)) }
    emit(name, payload) { this.handlers[name]?.(payload) }
    message(payload) { this.emit('message', { data: JSON.stringify(payload) }) }
    close() { this.closed = true; this.emit('close') }
  }
  const timers = { setTimeout(fn, ms) { const id = {}; delayed.set(id, { fn, ms }); return id }, clearTimeout(id) { delayed.delete(id) }, setInterval(fn, ms) { const id = {}; repeating.set(id, { fn, ms }); return id }, clearInterval(id) { repeating.delete(id) } }
  const collector = createLiquidationCollector({ assets: ['BTC', 'ETH'], WebSocketImpl: Socket, now: () => at, timers, ...options })
  const connected = () => { collector.snapshot('BTC'); const socket = sockets.at(-1); socket.emit('open'); socket.message({ op: 'subscribe', success: true }); return socket }
  const publish = (socket, data, ts = at) => socket.message({ topic: 'allLiquidation.BTCUSDT', type: 'snapshot', ts, data })
  const row = (side = 'Buy', time = at) => ({ T: time, s: 'BTCUSDT', S: side, v: '2', p: '100' })
  return { collector, sockets, delayed, repeating, connected, publish, row, advance(ms) { at += ms }, now: () => at }
}
test('lazy shared subscription and position-side mapping, preserving identical rows within a batch', () => {
  const f = fixture(); assert.equal(f.sockets.length, 0)
  assert.equal(f.collector.snapshot('BTC').status, 'connecting')
  const socket = f.connected()
  assert.deepEqual(socket.sent[0].args, ['allLiquidation.BTCUSDT', 'allLiquidation.ETHUSDT'])
  f.publish(socket, [f.row(), f.row(), f.row('Sell')])
  f.publish(socket, [f.row(), f.row(), f.row('Sell')]) // Exact batch replay is ignored.
  const result = f.collector.snapshot('BTC')
  assert.equal(result.status, 'live'); assert.equal(result.windows[0].long, 400); assert.equal(result.windows[0].short, 200)
  assert.equal(result.windows[0].count, 3); assert.equal(result.windows[0].complete, false)
  assert.equal(result.events[0].bankruptcyPrice, 100)
  f.collector.snapshot('ETH'); assert.equal(f.sockets.length, 1)
  assert.throws(() => f.collector.snapshot('FAKE'), /invalid_asset/)
  f.collector.close(); assert.equal(socket.closed, true); assert.equal(f.repeating.size, 0)
})
test('window completeness requires continuous healthy coverage; reconnect preserves only partial observations', () => {
  const f = fixture(), socket = f.connected()
  f.advance(61_000); socket.message({ op: 'ping', ret_msg: 'pong' }); f.publish(socket, [f.row()])
  assert.equal(f.collector.snapshot('BTC').windows[0].complete, true)
  socket.emit('close')
  assert.equal(f.collector.snapshot('BTC').status, 'disconnected'); assert.equal(f.collector.snapshot('BTC').windows[0].complete, false)
  assert.equal(f.collector.snapshot('BTC').windows[0].count, 1)
  const retry = [...f.delayed.values()][0]; assert.equal(retry.ms, 1000); retry.fn()
  const next = f.connected(); next.message({ op: 'subscribe', success: true })
  assert.equal(f.collector.snapshot('BTC').reconnects, 1); assert.equal(f.collector.snapshot('BTC').windows[0].complete, false)
  f.advance(61_000); assert.equal(f.collector.snapshot('BTC').status, 'disconnected')
  ;[...f.repeating.values()][0].fn(); assert.equal(next.closed, true)
  f.collector.close()
})
test('rejects wrong symbol, side, stale/future/nonfinite data; retained events expire and capacity loss marks incomplete', () => {
  const f = fixture({ maxEvents: 2 }), socket = f.connected()
  f.advance(61_000); socket.message({ op: 'pong' })
  f.publish(socket, [{ ...f.row(), s: 'ETHUSDT' }, f.row('Unknown'), f.row('Buy', f.now() - 900_001), f.row('Buy', f.now() + 6000), { ...f.row(), p: 'Infinity' }, { ...f.row(), v: '-1' }])
  assert.equal(f.collector.snapshot('BTC').events.length, 0)
  f.publish(socket, [f.row(), f.row('Sell'), f.row('Sell')], f.now() + 1)
  const result = f.collector.snapshot('BTC'); assert.equal(result.events.length, 2); assert.equal(result.windows[0].complete, false)
  f.advance(901_000); socket.message({ op: 'pong' }); assert.equal(f.collector.snapshot('BTC').events.length, 0)
  f.collector.close()
})
test('failed subscription, missing acknowledgement and malformed frames never report live', () => {
  const f = fixture(); f.collector.snapshot('BTC'); const socket = f.sockets[0]
  socket.emit('open'); socket.message({ op: 'subscribe', success: false })
  assert.equal(f.collector.snapshot('BTC').startedAt, null)
  f.collector.close(); assert.equal(f.delayed.size, 0)
  const g = fixture(); g.collector.snapshot('BTC'); [...g.delayed.values()][0].fn()
  assert.equal(g.sockets[0].closed, true); g.collector.close()
  const h = fixture(), active = h.connected(); active.emit('message', { data: '{' })
  assert.equal(h.collector.snapshot('BTC').status, 'disconnected'); h.collector.close()
})
