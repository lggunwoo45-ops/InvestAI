import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { CandidateSnapshot, CandidateSnapshotCurrentState } from '@/types/candidateSnapshot'
import { CandidateSnapshotPanel } from './CandidateSnapshotPanel'

const snapshot: CandidateSnapshot = { schemaVersion: 1, snapshotId: 'snapshot-1', generatedAt: '2026-09-25T00:00:00Z', expiresAt: '2026-09-26T00:00:00Z', engineVersion: 'v1', catalogSource: 'live', providerLabel: 'Upbit', items: ['BTC', 'ETH'].map((symbol, index) => ({ instrumentId: symbol.toLowerCase(), symbol, displayName: symbol, assetType: 'crypto' as const, marketId: 'upbit', quoteCurrency: 'KRW', order: index + 1, basisPrice: 100 - index * 20, basisChange24hPercent: 1, basisVolume24h: 100, basisMovementBand: 'Limited', interestStage: index ? 'second' as const : 'first' as const, actionStatus: index ? 'conditionalApproach' as const : 'watchZone' as const, clarity: 'medium' as const, reasonText: `${symbol} evidence`, ruleBasis: [{ key: 'dataQuality' as const, label: 'Data quality', value: 'Live' }], dataQuality: 'live' as const, newsState: 'Unavailable', disclosureCount: 0, latestDisclosureAt: null })) }
const states = (btcPrice: number) => new Map<string, CandidateSnapshotCurrentState>(snapshot.items.map((item) => [item.instrumentId, { instrumentId: item.instrumentId, currentPrice: item.instrumentId === 'btc' ? btcPrice : 80, interestStage: item.interestStage, actionStatus: item.actionStatus, clarity: item.clarity, ruleBasis: item.ruleBasis, dataQuality: item.dataQuality }]))

describe('CandidateSnapshotPanel', () => {
  it('shows a snapshot disclaimer, safe stages, and stable order as current data changes', () => {
    const props = { snapshot, language: 'en' as const, now: '2026-09-25T01:00:00Z', canRefresh: true, onRefresh: vi.fn(), onOpenAnalysis: vi.fn() }
    const { rerender } = render(<CandidateSnapshotPanel {...props} currentStates={states(110)} />)
    expect(screen.getByRole('region', { name: 'Interest candidates' }).textContent).toContain('does not update automatically until refreshed')
    expect(screen.getAllByRole('listitem').map((item) => item.textContent?.slice(0, 3))).toEqual(['BTC', 'ETH'])
    rerender(<CandidateSnapshotPanel {...props} currentStates={states(50)} />)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent?.slice(0, 3))).toEqual(['BTC', 'ETH'])
    expect(document.body.textContent).toContain('Observation start')
    expect(document.body.textContent).not.toMatch(/1st interest|2nd interest|3rd interest/i)
  })

  it('refreshes only after the explicit button is clicked and uses safe Korean labels', () => {
    const refresh = vi.fn()
    render(<CandidateSnapshotPanel snapshot={snapshot} currentStates={states(100)} language="ko" now="2026-09-25T01:00:00Z" canRefresh onRefresh={refresh} onOpenAnalysis={vi.fn()} />)
    expect(refresh).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '후보 새로고침' }))
    expect(refresh).toHaveBeenCalledOnce()
    expect(document.body.textContent).toContain('관찰 시작')
    expect(document.body.textContent).not.toMatch(/추천종목|매수|매도|손절가|익절가|목표가|1차|2차|3차/)
  })
})
