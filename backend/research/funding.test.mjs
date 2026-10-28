import test from 'node:test'
import assert from 'node:assert/strict'
import { createFundingReader } from './funding.mjs'
const hour = 3_600_000, clock = 20000 * hour
const row = i => ({ symbol: 'BTCUSDT', fundingTime: (i + 1) * hour, fundingRate: '0.0001', markPrice: '100' })
const response = rows => new Response(JSON.stringify(rows))
test('paginates inclusive times without overlap, shares pending requests, caches only completed reads', async () => {
  const all = Array.from({ length: 2001 }, (_, i) => row(i)); let calls = 0
  const reader = createFundingReader({ assets: ['BTC'], now: () => clock, fetchImpl: async (address, options) => {
    calls++; const url = new URL(address), from = Number(url.searchParams.get('startTime')), to = Number(url.searchParams.get('endTime'))
    assert.equal(url.origin, 'https://fapi.binance.com'); assert.equal(url.pathname, '/fapi/v1/fundingRate'); assert.equal(options.redirect, 'error')
    return response(all.filter(r => r.fundingTime >= from && r.fundingTime <= to).slice(0, 1000))
  } })
  const [a, b] = await Promise.all([reader('BTC', 0, clock), reader('BTC', 0, clock)])
  assert.equal(calls, 3); assert.equal(a.records.length, 2001); assert.equal(a, b)
  await reader('BTC', 0, clock); assert.equal(calls, 3)
  for (const args of [['BAD', 0, clock], ['BTC', 0, clock + 1], ['BTC', 1.5, clock], ['BTC', clock, 0]]) await assert.rejects(reader(...args), /invalid_funding_query/)
})
test('fails closed on partial pages, duplicates, invalid times/rates/prices and other venues or rate types', async () => {
  for (const rows of [[row(0), row(0)], [{ ...row(0), fundingTime: -1 }], [{ ...row(0), symbol: 'ETHUSDT' }], [{ ...row(0), fundingRate: '' }], [{ ...row(0), fundingRate: 'NaN' }], [{ ...row(0), markPrice: 'bad' }], [{ ...row(0), rateType: 'Special' }]]) {
    const reader = createFundingReader({ assets: ['BTC'], now: () => clock, fetchImpl: async () => response(rows) })
    await assert.rejects(reader('BTC', 0, clock), /invalid_funding_response/)
  }
  let calls = 0
  const reader = createFundingReader({ assets: ['BTC'], now: () => clock, fetchImpl: async () => ++calls % 2 ? response(Array.from({ length: 1000 }, (_, i) => row(i))) : new Response('', { status: 503 }) })
  await assert.rejects(reader('BTC', 0, clock), /funding_unavailable/)
  await assert.rejects(reader('BTC', 0, clock), /funding_unavailable/)
  assert.equal(calls, 4)
})
test('keeps missing mark prices distinguishable from zero and refuses truncated 12-page histories', async () => {
  const reader = createFundingReader({ assets: ['BTC'], now: () => clock, fetchImpl: async () => response([{ ...row(0), markPrice: '' }]) })
  assert.equal((await reader('BTC', 0, clock)).records[0].markPrice, null)
  let page = 0
  const long = createFundingReader({ assets: ['BTC'], now: () => clock, fetchImpl: async () => { const start = page++ * 1000; return response(Array.from({ length: 1000 }, (_, i) => row(start + i))) } })
  await assert.rejects(long('BTC', 0, clock), /funding_range_too_large/)
  assert.equal(page, 12)
})
test('limits provider request budget and response size', async () => {
  let calls = 0
  const reader = createFundingReader({ assets: ['BTC'], now: () => clock, fetchImpl: async () => { calls++; return response([]) } })
  for (let i = 0; i < 60; i++) await reader('BTC', i, clock)
  await assert.rejects(reader('BTC', 60, clock), /funding_busy/); assert.equal(calls, 60)
  const huge = createFundingReader({ assets: ['BTC'], now: () => clock, fetchImpl: async () => new Response(' '.repeat(400001)) })
  await assert.rejects(huge('BTC', 0, clock), /invalid_funding_response/)
})
