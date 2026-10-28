import { expect, it, vi, afterEach } from 'vitest'
import { fetchFundingSettlements, fundingImpact, validFundingHistory, type FundingHistory } from './fundingSettlements'
import type { ResearchHistory } from './researchClient'
const hour = 3600000
const data: FundingHistory = { version: 1, asset: 'BTC', source: 'Binance USDⓈ-M', from: 0, to: 32 * hour, fetchedAt: 33 * hour,
  records: [0, 8, 16, 24, 32].map(t => ({ at: t * hour, rate: .0001, markPrice: 200 })) }
afterEach(() => vi.unstubAllGlobals())
it('uses settlement mark price and filled entry notional, debits longs and credits shorts', () => {
  expect(fundingImpact(data, hour, 20 * hour, 20 * hour, 100, 1)).toEqual({ debitLow: .04, debitHigh: .04, settlements: 2, uncertain: 0 })
  expect(fundingImpact(data, hour, 20 * hour, 20 * hour, 100, -1)?.debitLow).toBeCloseTo(-.04)
  const negative = { ...data, records: data.records.map(r => ({ ...r, rate: -.0001 })) }
  expect(fundingImpact(negative, hour, 20 * hour, 20 * hour, 100, 1)?.debitHigh).toBeCloseTo(-.04)
  expect(fundingImpact(data, hour, 20 * hour, 20 * hour, 110, 1)?.debitHigh).toBeCloseTo(.04 * 100 / 110)
})
it('bounds entry/exit settlements within 15s and all possible intrabar exit times', () => {
  expect(fundingImpact(data, 8 * hour + 5_000, 16 * hour - 5_000, 16 * hour - 5_000, 100, 1)).toEqual({ debitLow: 0, debitHigh: .04, settlements: 2, uncertain: 2 })
  expect(fundingImpact(data, hour, 7 * hour, 17 * hour, 100, -1)).toEqual({ debitLow: -.04, debitHigh: 0, settlements: 2, uncertain: 2 })
  expect(fundingImpact(data, 8 * hour + 15_001, 16 * hour - 15_001, 16 * hour - 15_001, 100, 1)?.settlements).toBe(0)
})
it('does not replace unbracketed, gapped or missing-price trades with zero cost', () => {
  expect(fundingImpact(data, hour, 33 * hour, 33 * hour, 100, 1)).toBeNull()
  expect(fundingImpact(data, 0, hour, hour, 100, 1)).toBeNull()
  expect(fundingImpact({ ...data, records: data.records.filter(r => r.at !== 8 * hour) }, hour, 20 * hour, 20 * hour, 100, 1)).toBeNull()
  const missing = { ...data, records: data.records.map(r => ({ ...r, markPrice: r.at === 8 * hour ? null : 200 })) }
  expect(fundingImpact(missing, hour, 20 * hour, 20 * hour, 100, 1)).toBeNull()
  expect(fundingImpact(missing, hour, 2 * hour, 2 * hour, 100, 1)?.debitHigh).toBe(0)
})
it('validates provenance and ordered bounded data before accepting public records', () => {
  expect(validFundingHistory(data)).toBe(true)
  for (const bad of [{ ...data, source: 'Bybit' }, { ...data, records: [data.records[1], data.records[0]] }, { ...data, records: [{ ...data.records[0], rate: '0' }] }, { ...data, records: [{ ...data.records[0], markPrice: undefined }] }, { ...data, to: data.fetchedAt + 1 }]) expect(validFundingHistory(bad)).toBe(false)
})
it('fetches bounded same-asset records and surfaces failure instead of returning an empty fallback', async () => {
  const history = { asset: 'BTC', asOf: 32 * hour, timeframe: '1h', candles: Array.from({ length: 61 }, () => ({ timestamp: 10 * hour })) } as ResearchHistory
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...data, from: hour, to: 20 * hour, records: data.records.slice(1, 3) })))
  vi.stubGlobal('fetch', fetcher)
  expect((await fetchFundingSettlements(history)).records).toHaveLength(2)
  expect(fetcher.mock.calls[0][0]).toContain('asset=BTC&from=3600000&to=72000000')
  expect(fetcher.mock.calls[0][1].credentials).toBe('omit')
  fetcher.mockResolvedValue(new Response('', { status: 503 }))
  await expect(fetchFundingSettlements(history)).rejects.toThrow('0으로 처리하지 않았습니다')
  fetcher.mockResolvedValue(new Response(JSON.stringify({ ...data, asset: 'ETH' })))
  await expect(fetchFundingSettlements(history)).rejects.toThrow('종목·기간')
})
