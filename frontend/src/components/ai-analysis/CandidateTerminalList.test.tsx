import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { DailyBucketSnapshot } from '@/services/candidateSnapshot/dailyBucketSnapshot'
import type { CandidateSnapshotItem } from '@/types/candidateSnapshot'
import type { CandidateTerminalItem } from './candidateTerminalModel'
import { CandidateTerminalList } from './CandidateTerminalList'

const now = new Date(2026, 8, 28, 12).toISOString()
const expiresAt = new Date(2026, 8, 29, 12).toISOString()

function snapshot(items: readonly CandidateSnapshotItem[] = []): DailyBucketSnapshot {
  return {
    schemaVersion: 1,
    snapshotId: 'daily-upbit-2026-09-28',
    tradingDate: '2026-09-28',
    bucketId: 'upbit',
    basisTimeLabel: '08:00',
    generatedAt: now,
    basisAt: now,
    expiresAt,
    itemLimit: 5,
    items,
  }
}

function terminalItem(order: number): CandidateTerminalItem {
  const symbol = `ASSET${order}/KRW`
  const item: CandidateSnapshotItem = {
    instrumentId: `upbit-asset-${order}`,
    symbol,
    displayName: `Asset ${order}`,
    assetType: 'crypto',
    marketId: 'upbit',
    quoteCurrency: 'KRW',
    order,
    basisPrice: 100,
    basisChange24hPercent: 1,
    basisVolume24h: 1_000,
    basisMovementBand: 'Limited',
    interestStage: 'first',
    actionStatus: 'watchZone',
    clarity: 'medium',
    reasonText: `Evidence ${order}`,
    ruleBasis: [{ key: 'dataQuality', label: 'Data quality', value: 'Live' }],
    dataQuality: 'live',
    newsState: 'Unavailable',
    disclosureCount: 0,
    latestDisclosureAt: null,
  }
  return {
    item,
    currentPrice: 100 + order,
    changeSinceBasis: order,
    freshness: 'basisHeld',
    freshnessChanges: [],
    practicalDecision: {
      state: 'watch',
      title: 'Add to watch',
      summary: 'Continue reviewing the available evidence.',
      reason: item.reasonText,
      nextCheck: 'Review again later.',
      caution: 'Decision-support information, not a trade instruction or profit guarantee.',
      source: 'snapshot',
      horizon: 'swing',
      dataQuality: 'live',
    },
    reviewScore: {
      score: 72,
      level: 'moderate',
      label: 'Moderate',
      summary: 'Several review factors are available.',
      factors: [],
      cautions: [],
    },
    reviewRanges: [{
      kind: 'approachReviewRange',
      label: 'Approach review range',
      lowPrice: 95,
      highPrice: 99,
      anchorPrice: 100,
      description: 'Decision-support range.',
      caution: 'Not an order price.',
      source: 'snapshot',
      isRangeApproximation: true,
    }],
  }
}

const baseProps = {
  selectedInstrumentId: null,
  language: 'en' as const,
  now,
  canRecalculate: true,
  beforeTodayBasis: false,
  contextKey: 'upbit:2026-09-28',
  onSelect: vi.fn(),
  onRecalculate: vi.fn(),
}

describe('CandidateTerminalList', () => {
  it('renders a fixed compact list and delegates row selection', () => {
    const items = [terminalItem(1), terminalItem(2), terminalItem(3)]
    const select = vi.fn()
    render(<CandidateTerminalList {...baseProps} snapshot={snapshot(items.map((entry) => entry.item))} items={items} selectedInstrumentId="upbit-asset-2" onSelect={select} />)

    const panel = screen.getByRole('region', { name: 'Today’s 08:00 snapshot record' })
    const rows = within(panel).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows.map((row) => within(row).getByRole('button', { name: /^Select / }).getAttribute('aria-label'))).toEqual([
      'Select ASSET1/KRW; Price: 101 KRW; Change since basis: +1 KRW; Review score: 72/100; Current read: Add to watch; Review range: 95–99 KRW',
      'Select ASSET2/KRW; Price: 102 KRW; Change since basis: +2 KRW; Review score: 72/100; Current read: Add to watch; Review range: 95–99 KRW',
      'Select ASSET3/KRW; Price: 103 KRW; Change since basis: +3 KRW; Review score: 72/100; Current read: Add to watch; Review range: 95–99 KRW',
    ])
    expect(screen.getByRole('button', { name: /^Select ASSET2\/KRW;/ }).getAttribute('aria-pressed')).toBe('true')
    expect(panel.textContent).toContain('Saved candidates and order stay fixed until advanced recalculation.')
    expect(panel.textContent).toContain('Review score describes available review evidence, not return probability. Review ranges are reference areas, not order prices.')

    fireEvent.click(screen.getByRole('button', { name: /^Select ASSET3\/KRW;/ }))
    expect(select).toHaveBeenCalledWith('upbit-asset-3')
    expect(within(panel).queryByRole('button', { name: /Open analysis/ })).toBeNull()
  })

  it('requires two clicks to recalculate and clears confirmation when the context changes', () => {
    const recalculate = vi.fn()
    const item = terminalItem(1)
    const view = render(<CandidateTerminalList {...baseProps} snapshot={snapshot([item.item])} items={[item]} onRecalculate={recalculate} />)
    const button = screen.getByRole('button', { name: 'Advanced: Recalculate today’s candidates' })

    fireEvent.click(button)
    expect(recalculate).not.toHaveBeenCalled()
    expect(screen.getByText(/Press again to continue/)).toBeTruthy()

    view.rerender(<CandidateTerminalList {...baseProps} snapshot={snapshot([item.item])} items={[item]} contextKey="binance:2026-09-28" onRecalculate={recalculate} />)
    expect(screen.queryByText(/Press again to continue/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Advanced: Recalculate today’s candidates' }))
    expect(recalculate).not.toHaveBeenCalled()
    expect(screen.getByText(/Press again to continue/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Advanced: Recalculate today’s candidates' }))
    expect(recalculate).toHaveBeenCalledOnce()
    expect(screen.queryByText(/Press again to continue/)).toBeNull()

  })

  it('shows neutral zero, pending, and one-to-four candidate states', () => {
    const emptySnapshot = snapshot()
    const view = render(<CandidateTerminalList {...baseProps} snapshot={emptySnapshot} items={[]} />)
    expect(screen.getByRole('status').textContent).toContain('There are no displayable interest candidates')
    expect(screen.getByRole('list').children).toHaveLength(0)

    view.rerender(<CandidateTerminalList {...baseProps} snapshot={null} items={[]} beforeTodayBasis />)
    expect(screen.getByRole('status').textContent).toContain('preparing')

    for (const count of [1, 2, 3, 4]) {
      const items = Array.from({ length: count }, (_, index) => terminalItem(index + 1))
      view.rerender(<CandidateTerminalList {...baseProps} snapshot={snapshot(items.map((entry) => entry.item))} items={items} />)
      expect(screen.getAllByRole('listitem')).toHaveLength(count)
      expect(screen.getByRole('status').textContent).toContain('Only candidates that pass the current review basis are shown.')
    }
  })

  it('labels previous and expired records without presenting them as current', () => {
    const item = terminalItem(1)
    const previous = {
      ...snapshot([item.item]),
      tradingDate: '2026-09-27',
      generatedAt: new Date(2026, 8, 27, 8).toISOString(),
      basisAt: new Date(2026, 8, 27, 8).toISOString(),
      expiresAt: new Date(2026, 8, 28, 8).toISOString(),
    }
    render(<CandidateTerminalList {...baseProps} snapshot={previous} items={[item]} />)

    const panel = screen.getByRole('region', { name: 'Previous daily snapshot record' })
    expect(within(panel).getByRole('heading', { level: 2, name: 'Interest candidates from this record' })).toBeTruthy()
    expect(panel.textContent).toContain('This is a previous daily record. Current data may differ.')
    expect(panel.textContent).toContain('This saved record has expired and should be read as historical context.')
    expect(panel.textContent).not.toContain('Saved candidates and order stay fixed until advanced recalculation.')
  })
})
