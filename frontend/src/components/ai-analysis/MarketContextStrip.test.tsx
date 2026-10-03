import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
    const changeFilter = vi.fn()
    render(<MarketContextStrip bucketId="upbit" bucketLabel="Upbit" bitcoinAnchor={bitcoinAnchor} displayedCount={4} heldCount={1} excludedCount={2} heldReasonCounts={{ reviewScoreTooLow: 1 }} excludedReasonCounts={{ dataQualityInsufficient: 2 }} displayFilter="standard" onDisplayFilterChange={changeFilter} dataState="live" newsState="rss-ready" language="en" />)
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
    const quality = within(strip).getByRole('region', { name: 'Candidate quality summary' })
    expect(quality.textContent).toContain('4Displayed/1Held for review/2Excluded')
    expect(quality.textContent).toContain('Only candidates that pass the current review basis are shown. The list is not filled with weak candidates.')
    expect(quality.textContent).toContain('Counts describe the current quality scan. The saved daily list stays fixed until refreshed.')
    const filter = within(strip).getByRole('region', { name: 'Display filter' })
    expect(within(filter).getByRole('button', { name: 'Standard' }).getAttribute('aria-pressed')).toBe('true')
    expect(filter.textContent).toContain('Review score too low 1')
    expect(filter.textContent).toContain('Data quality insufficient 2')
    fireEvent.click(within(filter).getByRole('button', { name: 'Wider view' }))
    expect(changeFilter).toHaveBeenCalledWith('wider')
    expect(within(strip).getByRole('region', { name: 'Key checks' }).textContent).toContain('News: RSS available')
  })

  it('shows stock provenance without rendering a Bitcoin anchor', () => {
    const view = render(<MarketContextStrip bucketId="kospi" bucketLabel="KOSPI" bitcoinAnchor={null} displayedCount={0} excludedCount={5} excludedReasonCounts={{ dataQualityInsufficient: 5 }} dataState="mock" newsState="mock" language="en" />)
    const strip = screen.getByRole('region', { name: 'Market context' })
    expect(strip.getAttribute('data-asset-context')).toBe('stock')
    expect(within(strip).queryByRole('region', { name: 'Bitcoin market anchor' })).toBeNull()
    expect(within(strip).getByRole('region', { name: 'Candidate quality summary' }).textContent).toContain('Only candidates that pass the current review basis are shown.')
    expect(within(strip).queryByRole('status')).toBeNull()
    expect(strip.textContent).toContain('Data: Mock / limited · News: Mock source')
    expect(within(strip).getByRole('region', { name: 'Display filter' }).textContent).toContain('Data quality insufficient')
    expect(strip.textContent).toContain('DART: instrument-level review in My Analysis')

    view.rerender(<MarketContextStrip bucketId="usStocks" bucketLabel="US stocks" bitcoinAnchor={null} displayedCount={3} excludedCount={1} dataState="mock" newsState={null} language="en" />)
    expect(screen.getByRole('region', { name: 'Market context' }).textContent).not.toContain('DART: instrument-level review in My Analysis')
    expect(screen.queryByRole('region', { name: 'Bitcoin market anchor' })).toBeNull()
  })

  it('uses the required Korean quality summary, filter, and neutral reason labels', () => {
    render(<MarketContextStrip bucketId="kosdaq" bucketLabel="코스닥" bitcoinAnchor={null} displayedCount={3} heldCount={1} excludedCount={2} heldReasonCounts={{ reviewBasisInsufficient: 1 }} excludedReasonCounts={{ currentPriceUnavailable: 1, currentBasisUnavailable: 1 }} displayFilter="wider" dataState="mock" newsState="mock" language="ko" />)

    const summary = screen.getByRole('region', { name: '후보 품질 요약' })
    expect(summary.textContent).toContain('3표시 후보/1보류 후보/2제외 후보')
    expect(summary.textContent).toContain('현재 데이터 기준으로 검토 가능한 후보만 표시합니다. 무리해서 5개를 채우지 않습니다.')
    const filter = screen.getByRole('region', { name: '표시 기준' })
    expect(within(filter).getByRole('button', { name: '넓게 보기' }).getAttribute('aria-pressed')).toBe('true')
    expect(filter.textContent).toContain('보류 후보판단 근거 부족 1')
    expect(filter.textContent).toContain('제외 후보현재 가격 확인 불가 1')
    expect(filter.textContent).toContain('제외 후보현재 기준 비교 불가 1')
    expect(filter.textContent).not.toMatch(/매수|매도|손절가|익절가|목표가/)
  })
})
