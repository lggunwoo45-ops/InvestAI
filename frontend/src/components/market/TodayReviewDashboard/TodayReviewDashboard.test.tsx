import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'
import { buildTodayReviewSummary } from '@/services/watchlist/todayReviewSummary'
import { itemFromInstrument } from '@/services/watchlist/watchlistStorage'
import type { MarketInstrument } from '@/types/market'
import { TodayReviewDashboard } from './TodayReviewDashboard'

const instruments: MarketInstrument[] = Array.from({ length: 7 }, (_, index) => ({ id: `test-${index}`, symbol: `TEST${index}`, name: `Fixture ${index}`, marketId: 'upbit', marketType: 'upbit-krw', quoteCurrency: 'KRW', lastPrice: 100 + index, change24hPercent: 1, volume24h: 1 }))
const model = buildTodayReviewSummary(instruments.map(instrument => itemFromInstrument(instrument, '2026-10-11T00:00:00Z')))
const rows = new Map(instruments.map(instrument => [instrument.id, instrument]))

describe('TodayReviewDashboard', () => {
  beforeEach(() => localStorage.clear())
  it('renders counts and only five highlights, and opens the actual row instrument', () => {
    const onOpen = vi.fn()
    renderWithProviders(<TodayReviewDashboard model={model} language="en" instruments={rows} onOpen={onOpen} onScopeChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Watchlist 7 Saved instruments' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Review queue 7 Instruments needing review' })).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    const first = screen.getAllByRole('listitem')[0]!
    expect(first.textContent).toContain('Fixture 0')
    expect(first.textContent).toContain('Data check needed')
    fireEvent.click(within(first).getByRole('button', { name: 'Open TEST0 · Today review' }))
    expect(onOpen).toHaveBeenCalledWith(instruments[0])
    expect(screen.getByRole('button', { name: /Review highlights/ }).getAttribute('aria-expanded')).toBe('false')
  })
  it('routes all cards to simple watchlist or review scopes', () => {
    const onScopeChange = vi.fn()
    renderWithProviders(<TodayReviewDashboard model={model} language="ko" instruments={rows} onOpen={vi.fn()} onScopeChange={onScopeChange} />)
    fireEvent.click(screen.getByRole('button', { name: '관심종목 7 저장된 종목' }))
    expect(onScopeChange).toHaveBeenLastCalledWith('watchlist')
    for (const name of ['다시 볼 종목 7 확인이 필요한 종목', '판단 변화 0 이전 확인과 다른 판단', '접근 검토 가능 0 현재 검토 가능한 상태', '이미 움직임 큼 0 움직임 확대 확인', '데이터 확인 가능 0 부족했던 데이터 개선']) {
      fireEvent.click(screen.getByRole('button', { name }))
      expect(onScopeChange).toHaveBeenLastCalledWith('review')
    }
    expect(document.body.textContent).not.toMatch(/매수|매도|매수가|진입가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i)
  })
  it('starts compact when empty and shows the empty state', () => {
    renderWithProviders(<TodayReviewDashboard model={buildTodayReviewSummary([])} language="en" instruments={new Map()} onOpen={vi.fn()} onScopeChange={vi.fn()} />)
    expect(screen.getByText('No instruments need review today.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Review highlights/ }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('list')).toBeNull()
  })
  it('does not fabricate a quote or open unavailable instruments', () => {
    const onOpen = vi.fn()
    renderWithProviders(<TodayReviewDashboard model={model} language="en" instruments={new Map()} onOpen={onOpen} onScopeChange={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Open TEST0 · Today review' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(onOpen).not.toHaveBeenCalled()
    expect(screen.getAllByRole('listitem')[0]?.textContent).not.toContain('₩')
    expect(document.body.textContent).not.toMatch(/buy signal|sell signal|entry price|stop loss|take profit|target price/i)
  })
})
