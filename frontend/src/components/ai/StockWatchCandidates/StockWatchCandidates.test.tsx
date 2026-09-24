import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildStockWatchCandidates } from '@/services/ai/stockWatchCandidateEngine'
import type { MarketInstrument } from '@/types/market'
import { StockWatchCandidates } from './StockWatchCandidates'

const instrument: MarketInstrument = { id: 'krx-005930', marketId: 'korea-stock', symbol: '005930', name: 'Samsung Electronics', marketType: 'kospi', providerType: 'mock-krx', quoteCurrency: 'KRW', lastPrice: 70_000, change24hPercent: 2, volume24h: 10_000_000 }
const candidates = buildStockWatchCandidates({ instruments: [instrument], region: 'korea', newsResult: null, language: 'en' })

describe('StockWatchCandidates', () => {
  beforeEach(() => window.localStorage.clear())
  it('renders Korea candidates with mock quality and local feedback', () => {
    render(<StockWatchCandidates candidates={candidates} region="korea" language="en" horizon="short" supportedInstrumentIds={new Set([instrument.id])} onOpenInstrument={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Korea Stock Interest Candidates' })).toBeTruthy()
    expect(screen.getAllByText('Mock / preview data').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Mark as Watching' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Local note 005930' }), { target: { value: 'Review later' } })
    expect(window.localStorage.getItem('market-copilot.cryptoCandidateFeedback.v1')).toContain('krx-005930')
  })
  it('renders US and Korean labels', () => {
    render(<StockWatchCandidates candidates={[]} region="us" language="ko" horizon="swing" supportedInstrumentIds={new Set()} onOpenInstrument={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '미국 주식 관심 후보' })).toBeTruthy()
    expect(screen.getByText(/주식 관심 후보는 아직 준비 중입니다/)).toBeTruthy()
  })
  it('only exposes Open in Market for a supported instrument', () => {
    const open = vi.fn()
    const view = render(<StockWatchCandidates candidates={candidates} region="korea" language="en" horizon="short" supportedInstrumentIds={new Set()} onOpenInstrument={open} />)
    expect(screen.queryByRole('button', { name: /Open in Market/ })).toBeNull()
    view.rerender(<StockWatchCandidates candidates={candidates} region="korea" language="en" horizon="short" supportedInstrumentIds={new Set([instrument.id])} onOpenInstrument={open} />)
    fireEvent.click(screen.getByRole('button', { name: /Open in Market/ }))
    expect(open).toHaveBeenCalledWith(instrument.id)
  })
})
