import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createDartProxyHandler } from './proxy.mjs'

async function invoke({ url = '/api/dart/disclosures?stockCode=005930&corpCode=00126380', method = 'GET', apiKey = '', fetchImpl } = {}) {
  let body = ''
  const headers = new Map()
  const req = { method, url, headers: { origin: 'http://localhost:5173' } }
  const res = { statusCode: 200, setHeader(name, value) { headers.set(name.toLowerCase(), value) }, end(value = '') { body += value } }
  await createDartProxyHandler({ apiKey, fetchImpl, now: () => new Date('2026-09-24T00:00:00.000Z') })(req, res)
  return { statusCode: res.statusCode, headers, payload: JSON.parse(body) }
}

describe('local DART proxy', () => {
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
