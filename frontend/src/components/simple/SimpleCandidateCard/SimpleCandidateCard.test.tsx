import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { SimpleCandidate } from '@/types/simpleMode'
import { SimpleCandidateCard } from './SimpleCandidateCard'

const candidate: SimpleCandidate = { id: 'simple-btc', instrumentId: 'upbit-btc', symbol: 'BTC/KRW', name: 'Bitcoin', assetType: 'crypto', region: 'KRW', score: 72, horizon: 'short', dataQuality: 'live', dataQualityNote: 'Public market data', simpleReason: 'Recent movement needs review.', goodPoints: ['Trading activity is relatively active.'], riskPoints: ['Check whether the move continues.'], sourceCandidateId: 'btc', planningReference: { available: true, reason: 'Fixed percentage', observationArea: { label: 'Observation area', value: 'About 1.5% to 5% below current price', note: 'Planning reference only' }, riskCheckArea: { label: 'Risk check area', value: 'About 7% below current price', note: 'Planning reference only' }, upsideCheckArea: { label: 'Upside check area', value: 'About 3% to 6% above current price', note: 'Planning reference only' }, notes: ['Fixed-percentage distances, not calculated support/resistance.'] } }

describe('SimpleCandidateCard', () => {
  it('shows attention rather than rank or numeric Watch Score', () => {
    render(<MemoryRouter><SimpleCandidateCard candidate={candidate} language="en" onOpenMarket={vi.fn()} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'BTC/KRW' })).toBeTruthy()
    expect(screen.getByText('High attention')).toBeTruthy()
    expect(screen.queryByText('#1')).toBeNull()
    expect(screen.queryByText('Watch Score')).toBeNull()
    expect(screen.getByRole('link', { name: 'View details' }).getAttribute('href')).toBe('/ai-analysis')
  })
  it('renders percentage-only planning copy without absolute currency values', () => {
    render(<MemoryRouter><SimpleCandidateCard candidate={candidate} language="en" onOpenMarket={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText('About 1.5% to 5% below current price')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/₩|\$[0-9]|[0-9] (KRW|USD|USDT)/)
    const fieldLabels = [...document.querySelectorAll('dt, h4, button')].map((element) => element.textContent).join(' ')
    expect(fieldLabels).not.toMatch(/Entry Price|Stop Loss|Take Profit|Target Price|Buy Signal|Sell Signal/)
  })
  it('shows an honest stock planning-disabled boundary', () => {
    const stock = { ...candidate, id: 'simple-stock', assetType: 'stock' as const, symbol: '005930', dataQuality: 'mock' as const, planningReference: { available: false, reason: 'Price planning is disabled because real stock data is not connected yet.', observationArea: null, riskCheckArea: null, upsideCheckArea: null, notes: [] } }
    render(<MemoryRouter><SimpleCandidateCard candidate={stock} language="en" onOpenMarket={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText('Stock price planning disabled')).toBeTruthy()
    expect(screen.queryByText('Observation area')).toBeNull()
  })
  it('uses safe Korean structural labels', () => {
    render(<MemoryRouter><SimpleCandidateCard candidate={candidate} language="ko" onOpenMarket={vi.fn()} /></MemoryRouter>)
    const fieldLabels = [...document.querySelectorAll('dt, h4, button')].map((element) => element.textContent).join(' ')
    expect(fieldLabels).toContain('왜 보이나요?')
    expect(fieldLabels).not.toMatch(/매수가|손절가|익절가|목표가|추천 매수/)
  })
})
