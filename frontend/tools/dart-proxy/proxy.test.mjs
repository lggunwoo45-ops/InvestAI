import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createDartProxyHandler } from './proxy.mjs'

async function invoke({ url = '/api/dart/disclosures?stockCode=005930&corpCode=00126380', method = 'GET', origin = 'http://localhost:5173', apiKey = '', fetchImpl } = {}) {
  let body = ''
  const headers = new Map()
  const req = { method, url, headers: origin ? { origin } : {} }
  const res = { statusCode: 200, setHeader(name, value) { headers.set(name.toLowerCase(), value) }, end(value = '') { body += value } }
  await createDartProxyHandler({ apiKey, fetchImpl, now: () => new Date('2026-09-24T00:00:00.000Z') })(req, res)
  return { statusCode: res.statusCode, headers, body, payload: body ? JSON.parse(body) : null }
}

describe('local DART proxy', () => {
  it('reports configured health without calling DART or exposing the key', async () => {
    let called = false
    const response = await invoke({ url: '/api/dart/health?ignored=true', apiKey: 'test-only-key', fetchImpl: async () => { called = true } })
    assert.deepEqual(response.payload, { status: 'ready', apiKeyConfigured: true, message: 'DART API key is configured.' })
    assert.equal(JSON.stringify(response.payload).includes('test-only-key'), false)
    assert.equal(called, false)
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173')
    assert.equal(response.headers.get('vary'), 'Origin')
  })

  it('answers an allowed localhost health preflight without calling OpenDART', async () => {
    let called = false
    const response = await invoke({ url: '/api/dart/health', method: 'OPTIONS', apiKey: 'test-only-key', fetchImpl: async () => { called = true } })
    assert.equal(response.statusCode, 204)
    assert.equal(response.body, '')
    assert.equal(response.payload, null)
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173')
    assert.equal(response.headers.get('access-control-allow-methods'), 'GET, OPTIONS')
    assert.equal(response.headers.get('access-control-allow-headers'), 'Accept, Content-Type')
    assert.equal(called, false)
    assert.equal(JSON.stringify([...response.headers]).includes('test-only-key'), false)
  })

  it('blocks unapproved origins without CORS approval or OpenDART access', async () => {
    let called = false
    const response = await invoke({ url: '/api/dart/health', origin: 'https://untrusted.example', apiKey: 'test-only-key', fetchImpl: async () => { called = true } })
    assert.equal(response.statusCode, 403)
    assert.equal(response.payload.message, 'Origin is not allowed.')
    assert.equal(response.headers.has('access-control-allow-origin'), false)
    assert.equal(called, false)
    assert.equal(JSON.stringify(response.payload).includes('test-only-key'), false)
  })

  it('rejects unsafe health methods without calling OpenDART', async () => {
    let called = false
    const response = await invoke({ url: '/api/dart/health', method: 'POST', apiKey: 'test-only-key', fetchImpl: async () => { called = true } })
    assert.equal(response.statusCode, 405)
    assert.equal(response.headers.get('allow'), 'GET, OPTIONS')
    assert.equal(called, false)
  })

  it('reports disabled health when the server-side key is not configured', async () => {
    let called = false
    const response = await invoke({ url: '/api/dart/health', fetchImpl: async () => { called = true } })
    assert.deepEqual(response.payload, { status: 'disabled', apiKeyConfigured: false, message: 'DART API key is not configured.' })
    assert.equal(called, false)
  })

  it('returns a disabled state without a key and never fetches', async () => {
    let called = false
    const response = await invoke({ fetchImpl: async () => { called = true } })
    assert.equal(response.payload.status, 'disabled')
    assert.equal(response.payload.sourceMode, 'disabled')
    assert.deepEqual(response.payload.disclosures, [])
    assert.equal(called, false)
  })

  it('returns mapping unavailable when the corporation code is absent', async () => {
    const response = await invoke({ url: '/api/dart/disclosures?stockCode=005930', apiKey: 'test-only-key', fetchImpl: async () => { throw new Error('must not fetch') } })
    assert.equal(response.payload.status, 'mapping_unavailable')
  })

  it('normalizes list data without exposing the API key', async () => {
    let upstreamUrl = ''
    const response = await invoke({ apiKey: 'test-only-key', fetchImpl: async (url) => {
      upstreamUrl = url.toString()
      return new Response(JSON.stringify({ status: '000', list: [{ corp_code: '00126380', corp_name: '삼성전자', stock_code: '005930', report_nm: '분기보고서 (2026.09)', rcept_no: '20260924000123', rcept_dt: '20260924' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } })
    assert.equal(response.payload.status, 'ready')
    assert.equal(response.payload.disclosures[0].disclosureType, 'periodic')
    assert.equal(response.payload.disclosures[0].detailUrl, 'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260924000123')
    assert.equal(upstreamUrl.includes('crtfc_key=test-only-key'), true)
    assert.equal(JSON.stringify(response.payload).includes('test-only-key'), false)
  })

  it('fails safely for unsupported query parameters and upstream errors', async () => {
    const invalid = await invoke({ url: '/api/dart/disclosures?corpCode=00126380&url=https://example.com', apiKey: 'test-only-key' })
    assert.equal(invalid.statusCode, 400)
    const failed = await invoke({ apiKey: 'test-only-key', fetchImpl: async () => { throw new Error('secret upstream detail') } })
    assert.equal(failed.statusCode, 502)
    assert.equal(failed.payload.status, 'error')
    assert.equal(JSON.stringify(failed.payload).includes('secret upstream detail'), false)
  })
})
