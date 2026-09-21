import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { SimpleCandidate } from '@/types/simpleMode'
import { SimpleCandidateCard } from './SimpleCandidateCard'

const candidate: SimpleCandidate = { id: 'simple-btc', instrumentId: 'upbit-btc', symbol: 'BTC/KRW', name: 'Bitcoin', assetType: 'crypto', region: 'KRW', score: 72, horizon: 'short', dataQuality: 'live', dataQualityNote: 'Public market data', simpleReason: 'Transparent market evidence.', goodPoints: ['Relative activity'], riskPoints: ['Momentum can reverse.'], sourceCandidateId: 'btc', planningReference: { available: true, reason: 'Current price', firstObservationPrice: { label: '1st Observation Price', value: '₩98,500', note: 'Planning reference only' }, secondObservationPrice: null, thirdObservationPrice: null, riskReferencePrice: null, profitTakingReferenceRange: null, notes: ['Not an instruction.'] } }

describe('SimpleCandidateCard', () => {
  it('renders beginner candidate information and expert navigation', () => {
    render(<MemoryRouter><SimpleCandidateCard candidate={candidate} rank={1} language="en" reviewStatus="unreviewed" onOpenMarket={vi.fn()} onSetStatus={vi.fn()} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'BTC/KRW' })).toBeTruthy()
    expect(screen.getByText('1st Observation Price')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'View details' }).getAttribute('href')).toBe('/ai-analysis')
  })
  it('shows an honest stock planning-disabled boundary', () => {
    const stock = { ...candidate, id: 'simple-stock', assetType: 'stock' as const, symbol: '005930', dataQuality: 'mock' as const, planningReference: { available: false, reason: 'Price planning is disabled for this stock candidate because real stock data is not connected yet.', firstObservationPrice: null, secondObservationPrice: null, thirdObservationPrice: null, riskReferencePrice: null, profitTakingReferenceRange: null, notes: [] } }
    render(<MemoryRouter><SimpleCandidateCard candidate={stock} rank={1} language="en" reviewStatus="unreviewed" onOpenMarket={vi.fn()} onSetStatus={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText('Stock price planning disabled')).toBeTruthy()
    expect(screen.queryByText('1st Observation Price')).toBeNull()
  })
})
