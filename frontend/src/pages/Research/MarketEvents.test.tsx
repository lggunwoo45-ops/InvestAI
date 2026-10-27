import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { EconomicCalendarPanel, LiquidationPanel } from './MarketEvents'
import { fetchEconomicCalendar, fetchLiquidations, type EconomicCalendar, type Liquidations } from '@/services/research/marketEvents'

let mode = 'simple'
vi.mock('@/app/displayMode/useDisplayMode', () => ({ useDisplayMode: () => ({ displayMode: mode }) }))
vi.mock('@/services/research/marketEvents', async importOriginal => ({ ...await importOriginal<typeof import('@/services/research/marketEvents')>(), fetchLiquidations: vi.fn(), fetchEconomicCalendar: vi.fn() }))
const at = Date.parse('2026-10-26T00:00:00Z')
const liquidations = (overrides: Partial<Liquidations> = {}): Liquidations => ({ version: 1, asset: 'BTC', fetchedAt: at, status: 'live', startedAt: at - 20_000, continuousSince: at - 20_000, lastMessageAt: at, reconnects: 0, windows: [1, 5, 15].map(minutes => ({ minutes, count: 1, long: 200, short: 0, complete: false })), events: [{ id: '1', asset: 'BTC', at: at - 1000, side: 'long', size: 2, bankruptcyPrice: 100, notional: 200 }], ...overrides })
const calendar = (): EconomicCalendar => ({ version: 1, fetchedAt: at, windowStart: at - 86400000, windowEnd: at + 90 * 86400000, sources: [{ id: 'bls', name: 'BLS', url: '', status: 'available', fetchedAt: at, eventCount: 1 }, { id: 'fed', name: 'FOMC', url: '', status: 'available', fetchedAt: at, eventCount: 1 }], events: [
  { id: 'f1', source: 'fed', title: '미국 FOMC 회의', originalTitle: 'FOMC meeting', at: null, date: '2026-10-27', endDate: '2026-10-28', kind: 'meeting', timeZone: 'America/New_York' },
  { id: 'b1', source: 'bls', title: '미국 고용보고서', originalTitle: 'Employment Situation', at: Date.parse('2026-11-06T13:30:00Z'), date: null, endDate: null, kind: 'release', timeZone: 'America/New_York' },
] })
beforeEach(() => { mode = 'simple'; vi.spyOn(Date, 'now').mockReturnValue(at); vi.mocked(fetchLiquidations).mockResolvedValue(liquidations()); vi.mocked(fetchEconomicCalendar).mockResolvedValue(calendar()) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); vi.useRealTimers() })

it('simple mode explains observed notional and incomplete coverage without a raw table', async () => {
  render(<LiquidationPanel asset="BTC" />)
  expect(await screen.findByText('상승에 건 거래 · 롱')).toBeTruthy()
  expect(screen.getByText(/일부 구간만 관측/)).toBeTruthy()
  expect(screen.getAllByText(/실제 체결금액과 다를/).length).toBeGreaterThan(0)
  expect(screen.queryByRole('table')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '최근 15분' }))
  expect(screen.getByText('최근 15분 동안 관측한 BTC 청산')).toBeTruthy()
})
it('connecting state does not present an invented zero and expert mode exposes actual record fields', async () => {
  vi.mocked(fetchLiquidations).mockResolvedValueOnce(liquidations({ status: 'connecting', startedAt: null, continuousSince: null, lastMessageAt: null }))
  const view = render(<LiquidationPanel asset="BTC" />)
  await waitFor(() => expect(fetchLiquidations).toHaveBeenCalled())
  expect(screen.queryByText('0 USDT')).toBeNull()
  view.unmount(); mode = 'expert'
  render(<LiquidationPanel asset="BTC" />)
  expect(await screen.findByRole('table')).toBeTruthy(); expect(screen.getByRole('columnheader', { name: '파산가격 (USDT)' })).toBeTruthy()
})
it('poll failure immediately removes live status and retains clearly historical observations', async () => {
  vi.useFakeTimers(); render(<LiquidationPanel asset="BTC" />)
  await act(async () => {})
  expect(screen.getByText('관측 중')).toBeTruthy()
  vi.mocked(fetchLiquidations).mockRejectedValueOnce(new Error('연결 실패'))
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(screen.queryByText('관측 중')).toBeNull(); expect(screen.getByText(/과거 관측 기록/)).toBeTruthy()
})
it('simple calendar renders date-only meetings and DST-adjusted KST times; expert filters by institution', async () => {
  const view = render(<EconomicCalendarPanel />)
  expect(await screen.findByText('미국 FOMC 회의')).toBeTruthy()
  expect(screen.getByText(/미국 동부 회의일/)).toBeTruthy(); expect(screen.getByText(/발표 시각은 공식 일정에 제공되지/)).toBeTruthy()
  expect(screen.getByText(/22:30 · 한국 시간/)).toBeTruthy(); expect(screen.queryByRole('table')).toBeNull()
  view.unmount(); mode = 'expert'; render(<EconomicCalendarPanel />)
  await screen.findByRole('table'); fireEvent.change(screen.getByLabelText('발표 기관'), { target: { value: 'fed' } })
  expect(screen.queryByText('미국 고용보고서')).toBeNull(); expect(screen.getByText('미국 FOMC 회의')).toBeTruthy()
})
it('partial source failures remain visible alongside usable events', async () => {
  const value = calendar(); value.sources[0]!.status = 'unavailable'; value.events = value.events.filter(e => e.source === 'fed')
  vi.mocked(fetchEconomicCalendar).mockResolvedValue(value)
  render(<EconomicCalendarPanel />)
  expect(await screen.findByText(/일부 일정의 최신 상태/)).toBeTruthy(); expect(screen.getByText('미국 FOMC 회의')).toBeTruthy()
})
it('labels saved calendar provenance, actual collection time and coverage in both modes', async () => {
  const value = calendar()
  Object.assign(value.sources[0]!, { via: 'nyfed', coverageEnd: Date.parse('2027-01-01T05:00:00Z') - 1, fetchedAt: at - 13 * 3_600_000, status: 'stale' })
  vi.mocked(fetchEconomicCalendar).mockResolvedValue(value)
  const view = render(<EconomicCalendarPanel />)
  expect(await screen.findByText(/BLS 주요 7종/)).toBeTruthy()
  expect(screen.getByText(/2026년 12월 31일/)).toBeTruthy()
  expect(screen.getByText(/수집 · 이전 자료/)).toBeTruthy()
  expect(screen.getByRole('link', { name: 'BLS · 뉴욕 연준 경유' }).getAttribute('href')).toBe('https://www.newyorkfed.org/research/calendars/nationalecon_cal.html')
  view.unmount(); mode = 'expert'; render(<EconomicCalendarPanel />)
  await screen.findByRole('table')
  expect(screen.getByText(/BLS 주요 7종/)).toBeTruthy()
})
