import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { BitcoinMarketAnchor } from '@/services/marketAnchor/bitcoinMarketAnchor'
import { MarketContextStrip } from './MarketContextStrip'

const bitcoinAnchor: BitcoinMarketAnchor = {
  status: 'ready',
  instrumentId: 'upbit-btc',
  symbol: 'BTC/KRW',
  marketBucket: 'upbit',
  currentPrice: 100_000,
  change24hPercent: 1.5,
  volume24h: 1_000_000,
  practicalDecision: {
    state: 'watch',
    title: 'Add to watch',
    summary: 'Continue reviewing the available evidence.',
    reason: 'Market context.',
    nextCheck: 'Review again later.',
    caution: 'Decision-support information, not a trade instruction or profit guarantee.',
    source: 'analysis',
    horizon: 'swing',
    dataQuality: 'live',
  },
  reviewScore: {
    score: 78,
    level: 'strong',
    label: 'Strong',
    summary: 'Multiple current review factors are aligned.',
    factors: [],
    cautions: [],
  },
  summary: 'Bitcoin context is available.',
  caution: 'If BTC is unstable, alt candidate review should be treated more conservatively.',
  dataQuality: 'live',
}

describe('MarketContextStrip', () => {
  it('shows the separate Bitcoin anchor and crypto candidate context', () => {
    render(<MarketContextStrip bucketId="upbit" bucketLabel="Upbit" bitcoinAnchor={bitcoinAnchor} displayedCount={4} excludedCount={2} reasonCounts={{ belowThreshold: 2 }} dataState="live" newsState="rss-ready" language="en" />)
    const strip = screen.getByRole('region', { name: 'Market context' })
    expect(strip.getAttribute('data-asset-context')).toBe('crypto')
    const anchor = within(strip).getByRole('region', { name: 'Bitcoin market anchor' })
    expect(anchor.textContent).toContain('BTC/KRW')
    expect(anchor.textContent).toContain('100,000 KRW')
    expect(anchor.textContent).toContain('Add to watch')
    expect(anchor.textContent).toContain('78/100')
    expect(anchor.textContent).toContain('Bitcoin context is available.')
    expect(anchor.textContent).toContain('If BTC is unstable')
    expect(anchor.textContent).toContain('Not a trade instruction.')
    expect(within(strip).getByRole('region', { name: 'Market bucket summary' }).textContent).toContain('4displayed/2excluded')
    expect(within(strip).getByRole('region', { name: 'Candidate quality' }).textContent).toContain('Review score below the display threshold')
    expect(within(strip).getByRole('region', { name: 'Key checks' }).textContent).toContain('News: RSS available')
  })

  it('shows stock provenance without rendering a Bitcoin anchor', () => {
    const view = render(<MarketContextStrip bucketId="kospi" bucketLabel="KOSPI" bitcoinAnchor={null} displayedCount={0} excludedCount={5} reasonCounts={{ insufficientData: 5 }} dataState="mock" newsState="mock" language="en" />)
    const strip = screen.getByRole('region', { name: 'Market context' })
    expect(strip.getAttribute('data-asset-context')).toBe('stock')
    expect(within(strip).queryByRole('region', { name: 'Bitcoin market anchor' })).toBeNull()
    expect(within(strip).getByRole('region', { name: 'Market bucket summary' }).textContent).toContain('There are no displayable interest candidates')
    expect(within(strip).queryByRole('status')).toBeNull()
    expect(strip.textContent).toContain('Data: Mock / limited · News: Mock source')
    expect(within(strip).getByRole('region', { name: 'Candidate quality' }).textContent).toContain('Data quality insufficient')
    expect(strip.textContent).toContain('DART: instrument-level review in My Analysis')

    view.rerender(<MarketContextStrip bucketId="usStocks" bucketLabel="US stocks" bitcoinAnchor={null} displayedCount={3} excludedCount={1} reasonCounts={{}} dataState="mock" newsState={null} language="en" />)
    expect(screen.getByRole('region', { name: 'Market context' }).textContent).not.toContain('DART: instrument-level review in My Analysis')
    expect(screen.queryByRole('region', { name: 'Bitcoin market anchor' })).toBeNull()
  })
})
