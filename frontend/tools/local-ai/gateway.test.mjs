import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createLocalAiGateway } from './gateway.mjs'

const token = 'x'.repeat(32)
function invoke({ url = '/api/local-ai/estimate', method = 'POST', headers = {}, remoteAddress = '127.0.0.1', body = '{}', env = { AI_LOCAL_UI_ENABLED: 'true', AI_ACCESS_TOKEN: token } } = {}) {
  const req = Object.assign(new EventEmitter(), { url, method, headers: { host: '127.0.0.1:4173', origin: 'http://127.0.0.1:4173', 'content-type': 'application/json', ...headers }, socket: { remoteAddress } })
  const res = Object.assign(new EventEmitter(), { writableEnded: false, headersSent: false,
    writeHead(status, headers) { this.status = status; this.headers = headers; this.headersSent = true },
    end(body) { this.body = body; this.writableEnded = true }, destroy() { this.destroyed = true },
  })
  const calls = []
  const requestImpl = (options, callback) => {
    const upstream = Object.assign(new EventEmitter(), { setTimeout() {}, destroy() {}, end(data) {
      calls.push({ options, data: data.toString() })
      const incoming = Object.assign(new EventEmitter(), { statusCode: 200 })
      callback(incoming); incoming.emit('data', Buffer.from('{"reservedUsd":0.01}')); incoming.emit('end')
    } })
    return upstream
  }
  createLocalAiGateway({ env, requestImpl })(req, res, () => { res.next = true })
  req.emit('data', Buffer.from(body)); req.emit('end')
  return { res, calls }
}
test('gateway rejects disabled, remote, cross-origin, wrong methods and arbitrary paths before upstream', () => {
  for (const options of [{ env: {} }, { remoteAddress: '192.168.0.1' }, { headers: { host: 'evil.example:4173' } }, { headers: { origin: 'https://evil.example' } }, { headers: { origin: undefined } }, { headers: { 'content-type': 'text/plain' } }, { method: 'GET' }, { url: '/api/local-ai/analyze?url=https://evil.example' }, { url: '/api/local-ai/analyze', body: '{"consent":true}' }, { body: 'x'.repeat(8193) }]) {
    const { res, calls } = invoke(options)
    assert.ok(res.status >= 400); assert.equal(calls.length, 0)
  }
})
test('gateway injects server credential only on a fixed local upstream and strips browser origin', () => {
  const { res, calls } = invoke()
  assert.equal(res.status, 200)
  assert.equal(calls[0].options.hostname, '127.0.0.1')
  assert.equal(calls[0].options.port, 8789)
  assert.equal(calls[0].options.path, '/api/ai/estimate')
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${token}`)
  assert.equal(calls[0].options.headers.Origin, undefined)
  assert.equal(res.headers['Cache-Control'], 'no-store')
  assert.ok(!String(res.body).includes(token))
})
