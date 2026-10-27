import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { researchSourceState, sourceData, type ResearchSnapshot } from '@/services/research/researchModel'
import { MarketIndicatorCards } from './MarketIndicatorCards'
import { sourceMessage } from './researchSourceInfo'
const now = 2_000_000
const fixture = (): ResearchSnapshot => ({ version: 1, asset: 'BTC', symbol: 'BTCUSDT', fetchedAt: now, sources: { interest: { status: 'available', source: 'Binance', receivedAt: now, data: { time: now, openInterest: '123' } } } })
it('distinguishes transport failure, expired receipts, old provider timestamps and empty records using the calculation gate', () => {
  const value = fixture()
  expect(researchSourceState(value, 'interest', now)).toBe('ready')
  value.sources.interest.status = 'unavailable'
  expect(researchSourceState(value, 'interest', now)).toBe('unavailable')
  value.sources.interest.status = 'available'; value.sources.interest.receivedAt = now - 180_001
  expect(researchSourceState(value, 'interest', now)).toBe('expired')
  value.sources.interest.receivedAt = now; value.sources.interest.data = { time: now - 180_001, openInterest: 123 }
  expect(researchSourceState(value, 'interest', now)).toBe('providerDelayed')
  expect(sourceData(value, 'interest', now)).toBeNull()
  value.sources.interest.data = {}
  expect(researchSourceState(value, 'interest', now)).toBe('empty')
  value.sources.interest.receivedAt = Number.NaN
  expect(researchSourceState(value, 'interest', now)).toBe('timeInvalid')
  expect(researchSourceState(value, 'unknown', now)).toBe('missing')
})
it('does not label an empty funding-adjustment list as a provider outage', () => {
  const value = fixture(); value.sources.fundingInfo = { status: 'available', source: 'Binance', receivedAt: now, data: [] }
  expect(sourceMessage(value, 'fundingInfo', now).label).toBe('개별 조정 정보 없음')
})
it('keeps valid zero values, explains missing metrics individually, and distinguishes delayed publication from retrieval', () => {
  const value = fixture()
  value.sources.sentiment = { status: 'available', source: 'Alternative.me', receivedAt: now, data: { data: [{ value: '0', timestamp: now / 1000 }] } }
  value.sources.global = { status: 'available', source: 'CoinGecko', receivedAt: now, data: { data: { updated_at: 0, market_cap_percentage: { btc: 50 } } } }
  render(<MarketIndicatorCards snapshot={value} candles={[]} now={now + 1_700_000} simple={false} />)
  // The receipt has expired too; no stale numeric values may leak through.
  expect(within(screen.getByRole('article', { name: '미결제약정' })).queryByText('123 BTC')).toBeNull()
  expect(screen.getAllByText('수집 자료 만료').length).toBeGreaterThan(0)
})
it('explains a zero sentiment reading and a fresh response containing an old publication', () => {
  const current = 10_000_000, value = fixture(); value.fetchedAt = current
  value.sources.sentiment = { status: 'available', source: 'Alternative.me', receivedAt: current, data: { data: [{ value: '0', timestamp: current / 1000 }] } }
  value.sources.global = { status: 'available', source: 'CoinGecko', receivedAt: current, data: { data: { updated_at: (current - 3_600_001) / 1000, market_cap_percentage: { btc: 50 } } } }
  render(<MarketIndicatorCards snapshot={value} candles={[]} now={current} simple />)
  expect(within(screen.getByRole('article', { name: '공포·탐욕 지수' })).getByText('0 / 100')).toBeTruthy()
  const btc = within(screen.getByRole('article', { name: 'BTC 도미넌스' }))
  expect(btc.queryByText('50%')).toBeNull()
  expect(btc.getByText('발표값 갱신 대기')).toBeTruthy()
  expect(btc.getByText(/시가총액 발표가 1시간 이상/)).toBeTruthy()
})
