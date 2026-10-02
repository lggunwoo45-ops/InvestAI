import { fireEvent, render, screen, within } from '@testing-library/react'
import { useMemo, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { DailyBucketSnapshot } from '@/services/candidateSnapshot/dailyBucketSnapshot'
import type { CandidateSnapshotCurrentState, CandidateSnapshotItem } from '@/types/candidateSnapshot'
import { AiAnalysisTerminalLayout } from './AiAnalysisTerminalLayout'
import { CandidateInspectorPanel } from './CandidateInspectorPanel'
import { CandidateTerminalList } from './CandidateTerminalList'
import { buildCandidateTerminalItems } from './candidateTerminalModel'

const rawItems: readonly CandidateSnapshotItem[] = ['ETH', 'SOL'].map((symbol, index) => ({
  instrumentId: `upbit-${symbol.toLowerCase()}`, symbol: `${symbol}/KRW`, displayName: symbol, assetType: 'crypto', marketId: 'upbit', quoteCurrency: 'KRW', order: index + 1,
  basisPrice: 100 + index * 20, basisChange24hPercent: 1, basisVolume24h: 1_000, basisMovementBand: 'Limited', interestStage: 'first', actionStatus: 'watchZone', clarity: 'medium', reasonText: `${symbol} evidence`,
  ruleBasis: [{ key: 'dataQuality', label: 'Data quality', value: 'Live' }], dataQuality: 'live', newsState: 'Unavailable', disclosureCount: 0, latestDisclosureAt: null,
}))

const terminalNow = new Date(2026, 9, 3, 12).toISOString()
const snapshot: DailyBucketSnapshot = { schemaVersion: 1, snapshotId: 'daily-upbit', tradingDate: '2026-10-03', bucketId: 'upbit', basisTimeLabel: '08:00', generatedAt: new Date(2026, 9, 3, 8).toISOString(), basisAt: new Date(2026, 9, 3, 8).toISOString(), expiresAt: new Date(2026, 9, 4, 8).toISOString(), itemLimit: 5, items: rawItems }
const states = new Map<string, CandidateSnapshotCurrentState>(rawItems.map((item) => [item.instrumentId, { instrumentId: item.instrumentId, currentPrice: item.basisPrice + 2, interestStage: item.interestStage, actionStatus: item.actionStatus, clarity: item.clarity, ruleBasis: item.ruleBasis, dataQuality: item.dataQuality }]))

function Harness({ open }: { open: (instrumentId: string, snapshotId: string) => void }) {
  const items = useMemo(() => buildCandidateTerminalItems({ items: rawItems, expiresAt: snapshot.expiresAt, currentStates: states, currentPrices: new Map(), horizon: 'swing', language: 'en', now: terminalNow }), [])
  const [selectedId, setSelectedId] = useState(items[0]?.item.instrumentId ?? null)
  const selected = items.find((entry) => entry.item.instrumentId === selectedId) ?? items[0] ?? null
  return <AiAnalysisTerminalLayout
    header={<div>Header</div>}
    tabs={<div>Tabs</div>}
    context={<div>Context</div>}
    candidateList={<CandidateTerminalList snapshot={snapshot} items={items} selectedInstrumentId={selectedId} language="en" now={terminalNow} canRecalculate beforeTodayBasis={false} contextKey="upbit:daily-upbit" onSelect={setSelectedId} onRecalculate={() => undefined} />}
    inspector={<CandidateInspectorPanel candidate={selected} snapshotId={snapshot.snapshotId} generatedAt={snapshot.generatedAt} language="en" onOpenAnalysis={open} />}
  />
}

describe('AiAnalysisTerminalLayout', () => {
  it('keeps selection in the terminal and sends only the inspector action to My Analysis', () => {
    const open = vi.fn()
    const { container } = render(<Harness open={open} />)
    const inspector = screen.getByRole('complementary', { name: 'Selected candidate inspector' })
    expect(within(inspector).getByRole('heading', { name: 'ETH/KRW' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Select SOL\/KRW;/ }))
    expect(within(inspector).getByRole('heading', { name: 'SOL/KRW' })).toBeTruthy()
    expect(open).not.toHaveBeenCalled()
    fireEvent.click(within(inspector).getByRole('button', { name: /Open in My Analysis/ }))
    expect(open).toHaveBeenCalledWith('upbit-sol', 'daily-upbit')
    expect(container.querySelector('[data-ai-analysis-terminal]')).toBeTruthy()
    expect(container.querySelector('main')).toBeNull()
    const visibleCopy = container.textContent?.toLowerCase() ?? ''
    expect(visibleCopy).not.toMatch(/\b(buy candidate|buy signal|sell signal|entry price|target price|stop loss|take profit|top pick|best pick|guaranteed return|profit expected)\b/)
  })
})
