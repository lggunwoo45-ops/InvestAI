import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MarketRadarSnapshot } from '@/types/marketRadar'
import { MarketRadar } from './MarketRadar'

const signal = { id: 'volume-btc', type: 'unusualVolume', scope: 'crypto', title: 'BTC/KRW', summary: 'Relative volume only.', evidenceLabel: 'Volume rank #1', relatedSymbols: ['BTC/KRW'], relatedMarkets: ['crypto'], relatedInstrumentIds: ['upbit-btc'], score: 90, status: 'active', source: 'rule-based', disclaimer: 'Not investment advice.' } as const
const snapshot: MarketRadarSnapshot = { generatedAt: '2026-01-01T00:00:00Z', mode: 'mock', newsSource: 'mock', signals: [signal], hotSectors: [], unusualVolume: [signal], volatilityRadar: [], watchCandidates: [], newsThemes: [], riskNotes: ['Real AI is not connected.'] }

describe('MarketRadar', () => {
  it('renders English labels and opens only supported instruments', () => {
    const open = vi.fn()
    render(<MarketRadar snapshot={snapshot} language="en" onOpenInstrument={open} />)
    expect(screen.getByRole('heading', { name: 'Market Radar' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Open in Market/ }))
    expect(open).toHaveBeenCalledWith('upbit-btc')
  })
  it('renders Korean labels', () => {
    render(<MarketRadar snapshot={snapshot} language="ko" onOpenInstrument={() => undefined} />)
    expect(screen.getByRole('heading', { name: '마켓 레이더' })).toBeTruthy()
    expect(screen.getByText('주목 섹터')).toBeTruthy()
  })
  it('renders safely without a direct instrument and exposes no action', () => {
    const marketLevel = { ...signal, id: 'macro', scope: 'macro', relatedSymbols: [], relatedMarkets: ['macro'], relatedInstrumentIds: [] } as const
    render(<MarketRadar snapshot={{ ...snapshot, signals: [marketLevel], unusualVolume: [marketLevel] }} language="en" onOpenInstrument={() => undefined} />)
    expect(screen.getByText('Market-level signal')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Open in Market/ })).toBeNull()
  })
  it('collapses detailed signals but keeps risk notes present in Simple Mode', () => {
    render(<MarketRadar snapshot={snapshot} language="en" simpleMode onOpenInstrument={() => undefined} />)
    expect(screen.getByText('Show detailed radar')).toBeTruthy()
    expect(screen.getByText('Real AI is not connected.')).toBeTruthy()
  })
})
