import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { HoldingReview } from '@/services/portfolio/holdingAnalysis'
import type { Position } from '@/services/portfolio/portfolioStorage'
import { HoldingAnalysis } from './HoldingAnalysis'

const position: Position = { id: 'lot-1', exchange: 'upbit', venue: 'upbit-krw', instrumentId: 'upbit-btc', symbol: 'BTC', quoteCurrency: 'KRW', averagePrice: 100, quantity: 2 }
const review: HoldingReview = { positionId: 'lot-1', result: { analyzedAt: 1000, expiresAt: 91000, timedOut: false,
  instrument: { id: 'upbit-btc', symbol: 'BTC', marketId: 'upbit', quoteCurrency: 'KRW', name: 'Bitcoin', lastPrice: 120, volume24h: 100, change24hPercent: 1 },
  decision: { direction: 'sell', action: 'reduce', coverage: 2, price: 120, extended: false, mixed: false, frames: [], plan: { frame: '4H', entry: [105, 110], resistance: [130, 135], stop: 99, sellInvalidation: 145, target: 140, targetBasis: 'observed', supportBasis: 'pivot', rewardRisk: 2 } },
} }
describe('holding explanation', () => {
  it('uses holding-specific guidance and keeps the selected saved lot in the detail link', () => {
    const view = render(<MemoryRouter><HoldingAnalysis position={position} review={review} now={2000} running={false} language="ko" /></MemoryRouter>)
    expect(screen.getByText('추가 매수보다 보유 위험을 먼저 살펴보세요')).toBeTruthy()
    expect(screen.getByText('99 KRW')).toBeTruthy()
    expect(screen.queryByText('145 KRW')).toBeNull()
    expect(screen.getByRole('link').getAttribute('href')).toContain('positionId=lot-1')
    view.rerender(<MemoryRouter><HoldingAnalysis position={position} review={review} now={91001} running={false} language="ko" /></MemoryRouter>)
    expect(screen.getByText(/분석 시세가 오래됐어요/)).toBeTruthy()
    expect(screen.queryByText('99 KRW')).toBeNull()
    expect(screen.queryByText('하락 쪽이 강해요')).toBeNull()
  })
  it('keeps failures visible without presenting them as a wait or sell judgment', () => {
    render(<MemoryRouter><HoldingAnalysis position={position} review={{ positionId: position.id, result: null, issue: 'catalog' }} now={2000} running={false} language="ko" /></MemoryRouter>)
    expect(screen.getByText(/시세 목록을 가져오지 못했어요/)).toBeTruthy()
    expect(screen.getByText(/매수·매도 판단이 아니에요/)).toBeTruthy()
    expect(screen.queryByText('하락 쪽이 강해요')).toBeNull()
  })
})
