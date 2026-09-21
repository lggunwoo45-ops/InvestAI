import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { MarketRadarSignal, MarketRadarSnapshot } from '@/types/marketRadar'
import { SimpleMarketSummary } from './SimpleMarketSummary'

const signal: MarketRadarSignal = { id: 'btc', type: 'watchCandidate', scope: 'crypto', title: 'BTC/KRW', summary: 'Existing evidence.', evidenceLabel: 'Catalog', relatedSymbols: ['BTC/KRW'], relatedMarkets: ['crypto'], relatedInstrumentIds: ['upbit-btc'], score: 70, status: 'watch', source: 'rule-based', disclaimer: 'Review only.' }
const snapshot: MarketRadarSnapshot = { generatedAt: '2026-01-01T00:00:00Z', mode: 'mock', newsSource: 'mock', signals: [signal], hotSectors: [], unusualVolume: [signal], volatilityRadar: [], watchCandidates: [signal], newsThemes: [], riskNotes: ['Stock data has limited coverage.'] }

describe('SimpleMarketSummary', () => {
  it('summarizes only existing radar evidence in English', () => {
    render(<SimpleMarketSummary snapshot={snapshot} language="en" />)
    expect(screen.getByRole('heading', { name: 'Today’s Market Summary' })).toBeTruthy()
    expect(screen.getByText('BTC/KRW')).toBeTruthy()
    expect(screen.getByText('Stock data has limited coverage.')).toBeTruthy()
    expect(screen.getAllByText('Limited data').length).toBeGreaterThan(0)
    expect(screen.getByRole('region', { name: 'Today’s Market Summary' }).textContent?.toLowerCase()).not.toMatch(/strong buy|entry signal|stop loss|target price|guaranteed profit/)
  })

  it('renders Korean summary labels', () => {
    render(<SimpleMarketSummary snapshot={snapshot} language="ko" />)
    expect(screen.getByRole('heading', { name: '오늘의 시장 요약' })).toBeTruthy()
    expect(screen.getByText('시장 분위기')).toBeTruthy()
  })
})
