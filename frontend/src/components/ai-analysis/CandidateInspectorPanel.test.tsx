import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { buildTechnicalLevelAnalysis } from '@/services/technicalLevels/technicalLevelEngine'
import type { MarketInstrument } from '@/types/market'
import type { Candle } from '@/types/marketDetail'
import type { CandidateTerminalItem } from './candidateTerminalModel'
import { CandidateInspectorPanel } from './CandidateInspectorPanel'

const candidate: CandidateTerminalItem = {
  item: {
    instrumentId: 'upbit-btc', symbol: 'BTC/KRW', displayName: 'Bitcoin', assetType: 'crypto', marketId: 'upbit-krw', quoteCurrency: 'KRW', order: 1,
    basisPrice: 100, basisChange24hPercent: 1, basisVolume24h: 1_000, basisMovementBand: 'Limited', interestStage: 'first', actionStatus: 'watchZone', clarity: 'medium', reasonText: 'Volume and momentum remain under review',
    ruleBasis: [{ key: 'dataQuality', label: 'Data quality', value: 'Live' }], dataQuality: 'live', newsState: 'rss-ready', disclosureCount: 0, latestDisclosureAt: null,
  },
  currentPrice: 104,
  changeSinceBasis: 4,
  freshness: 'changeReview',
  freshnessChanges: [{ field: 'actionStatus', previousValue: 'watchZone', currentValue: 'decisionPending' }],
  practicalDecision: { state: 'watch', title: 'Watch conditions', summary: 'Review the current context.', reason: 'Evidence remains mixed.', nextCheck: 'Check volume persistence.', caution: 'Use the saved basis conservatively.', source: 'snapshot', horizon: 'swing', dataQuality: 'live' },
  reviewScore: { score: 72, level: 'moderate', label: 'Moderate', summary: 'Several review factors are available.', factors: ['Data quality is included.'], cautions: ['Some evidence is missing.'] },
  reviewRanges: [{ kind: 'approachReviewRange', label: 'Approach review range', lowPrice: 95, highPrice: 101, anchorPrice: 100, description: 'A bounded review area.', caution: 'Not an order price.', source: 'snapshot', isRangeApproximation: true }],
}

const technicalInstrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 104, change24hPercent: 1, volume24h: 1_000 }
const technicalCandles: Candle[] = Array.from({ length: 60 }, (_, index) => {
  const close = 100 + Math.sin(index / 3) * 3
  return { timestamp: 1_700_000_000_000 + index * 86_400_000, open: close - 0.2, high: close + 6, low: close - 6, close, volume: 100 + index }
})
const technicalAnalysis = buildTechnicalLevelAnalysis({ instrument: technicalInstrument, candles: technicalCandles, language: 'en', dataQuality: 'live' })

describe('CandidateInspectorPanel', () => {
  it('shows the selected candidate detail and opens My Analysis explicitly', () => {
    const open = vi.fn()
    render(<CandidateInspectorPanel candidate={candidate} snapshotId="daily-upbit" generatedAt="2026-10-03T00:00:00Z" language="en" technicalAnalysis={technicalAnalysis} onOpenAnalysis={open} />)

    const inspector = screen.getByRole('complementary', { name: 'Selected candidate inspector' })
    expect(inspector.textContent).toContain('BTC/KRW')
    expect(inspector.textContent).toContain('104 KRW')
    expect(inspector.textContent).toContain('Change check needed')
    expect(inspector.textContent).toContain('Snapshot order1 / 5')
    expect(inspector.textContent).not.toContain('Snapshot rank')
    expect(inspector.textContent).toContain('Data quality')
    expect(inspector.textContent).toContain('News state: Real RSS connected')
    expect(inspector.textContent).not.toContain('rss-ready')
    expect(inspector.textContent).toContain('Some evidence is missing.')
    expect(inspector.textContent).toContain('Review score is not return probability')
    expect(inspector.textContent).toContain('Review ranges are reference areas, not order prices')
    const reviewRanges = within(inspector).getByRole('region', { name: 'Review ranges' })
    const chartStructure = within(inspector).getByRole('region', { name: 'Chart structure analysis' })
    expect(chartStructure.textContent).toContain('First support')
    expect(chartStructure.getAttribute('data-display-mode')).toBe('simple')
    expect(reviewRanges.compareDocumentPosition(chartStructure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(inspector).getByRole('region', { name: 'Chart overlays' }).textContent).toContain('Planned overlay')
    fireEvent.click(screen.getByRole('button', { name: /Open in My Analysis/ }))
    expect(open).toHaveBeenCalledWith('upbit-btc', 'daily-upbit')
  })

  it('renders a neutral inspector when no candidate is available', () => {
    render(<CandidateInspectorPanel candidate={null} snapshotId={null} generatedAt={null} language="en" onOpenAnalysis={vi.fn()} />)
    const inspector = screen.getByRole('complementary', { name: 'Selected candidate inspector' })
    expect(within(inspector).getByText(/Select an interest candidate/)).toBeTruthy()
    expect(inspector.getAttribute('data-empty')).toBe('true')
  })
})
