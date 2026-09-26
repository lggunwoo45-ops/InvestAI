import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { CandidateSnapshot, CandidateSnapshotCurrentState } from '@/types/candidateSnapshot'
import { CandidateSnapshotPanel } from './CandidateSnapshotPanel'

const snapshot: CandidateSnapshot = { schemaVersion: 1, snapshotId: 'snapshot-1', generatedAt: '2026-09-25T00:00:00Z', expiresAt: '2026-09-26T00:00:00Z', engineVersion: 'v1', catalogSource: 'live', providerLabel: 'Upbit', items: ['BTC', 'ETH'].map((symbol, index) => ({ instrumentId: symbol.toLowerCase(), symbol, displayName: symbol, assetType: 'crypto' as const, marketId: 'upbit', quoteCurrency: 'KRW', order: index + 1, basisPrice: 100 - index * 20, basisChange24hPercent: 1, basisVolume24h: 100, basisMovementBand: 'Limited', interestStage: index ? 'second' as const : 'first' as const, actionStatus: index ? 'conditionalApproach' as const : 'watchZone' as const, clarity: 'medium' as const, reasonText: `${symbol} evidence`, ruleBasis: [{ key: 'dataQuality' as const, label: 'Data quality', value: 'Live' }], dataQuality: 'live' as const, newsState: 'Unavailable', disclosureCount: 0, latestDisclosureAt: null })) }
const states = (btcPrice: number) => new Map<string, CandidateSnapshotCurrentState>(snapshot.items.map((item) => [item.instrumentId, { instrumentId: item.instrumentId, currentPrice: item.instrumentId === 'btc' ? btcPrice : 80, interestStage: item.interestStage, actionStatus: item.actionStatus, clarity: item.clarity, ruleBasis: item.ruleBasis, dataQuality: item.dataQuality }]))
const renderedSymbols = () => Array.from(screen.getByRole('region', { name: 'Candidate snapshot record' }).querySelectorAll('ol > li')).map((item) => item.textContent?.slice(0, 3))

describe('CandidateSnapshotPanel', () => {
  it('shows a visible snapshot disclaimer, safe stages, and stable order as current data changes', () => {
    const props = { snapshot, language: 'en' as const, now: '2026-09-25T01:00:00Z', canRefresh: true, onRefresh: vi.fn(), onOpenAnalysis: vi.fn() }
    const { rerender } = render(<CandidateSnapshotPanel {...props} currentStates={states(110)} />)
    const panel = screen.getByRole('region', { name: 'Candidate snapshot record' })
    expect(screen.getByRole('heading', { name: 'Candidate snapshot record' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Interest candidate list' })).toBeTruthy()
    expect(panel.textContent).toContain('This list is a snapshot record from')
    expect(panel.textContent).toContain('It is not a current investment recommendation. It does not update automatically until refreshed.')
    expect(renderedSymbols()).toEqual(['BTC', 'ETH'])
    rerender(<CandidateSnapshotPanel {...props} currentStates={states(50)} />)
    expect(renderedSymbols()).toEqual(['BTC', 'ETH'])
    expect(document.body.textContent).toContain('Observation start')
    expect(document.body.textContent).not.toMatch(/1st interest|2nd interest|3rd interest/i)
  })

  it('keeps saved order when freshness changes or the snapshot expires', () => {
    const changedStates = states(120)
    const openAnalysis = vi.fn()
    changedStates.set('eth', { ...changedStates.get('eth')!, interestStage: 'third', actionStatus: 'chaseCaution', ruleBasis: [{ key: 'dataQuality', label: 'Data quality', value: 'Limited' }], dataQuality: 'limited' })
    const props = { snapshot, currentStates: changedStates, language: 'en' as const, canRefresh: true, onRefresh: vi.fn(), onOpenAnalysis: openAnalysis }
    const { rerender } = render(<CandidateSnapshotPanel {...props} now="2026-09-25T01:00:00Z" />)
    expect(renderedSymbols()).toEqual(['BTC', 'ETH'])
    rerender(<CandidateSnapshotPanel {...props} now="2026-09-27T01:00:00Z" />)
    expect(renderedSymbols()).toEqual(['BTC', 'ETH'])
    expect(screen.getByRole('region', { name: 'Candidate snapshot record' }).getAttribute('data-expired')).toBe('true')
    expect(screen.getByText('Refresh candidates to create a current snapshot record.')).toBeTruthy()
    expect(screen.getByText('This record reflects the earlier basis and should not be read as a current judgment.')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: /Open analysis/ })[0])
    expect(openAnalysis).toHaveBeenCalledWith('btc', 'snapshot-1')
  })

  it('uses a neutral change tone and accepts a new saved order only after explicit refresh', () => {
    const refresh = vi.fn()
    const props = { snapshot, currentStates: states(110), language: 'en' as const, now: '2026-09-25T01:00:00Z', canRefresh: true, onRefresh: refresh, onOpenAnalysis: vi.fn() }
    const { rerender } = render(<CandidateSnapshotPanel {...props} />)
    expect(screen.getByText('+10 KRW').getAttribute('data-tone')).toBe('neutral')
    rerender(<CandidateSnapshotPanel {...props} currentStates={states(40)} />)
    expect(renderedSymbols()).toEqual(['BTC', 'ETH'])
    fireEvent.click(screen.getByRole('button', { name: 'Refresh candidates' }))
    expect(refresh).toHaveBeenCalledOnce()
    const refreshed = { ...snapshot, snapshotId: 'snapshot-2', items: [snapshot.items[1], snapshot.items[0]].map((item, index) => ({ ...item, order: index + 1 })) }
    rerender(<CandidateSnapshotPanel {...props} snapshot={refreshed} currentStates={states(40)} />)
    expect(renderedSymbols()).toEqual(['ETH', 'BTC'])
  })

  it('refreshes only after the explicit button is clicked and uses safe Korean labels', () => {
    const refresh = vi.fn()
    render(<CandidateSnapshotPanel snapshot={snapshot} currentStates={states(100)} language="ko" now="2026-09-25T01:00:00Z" canRefresh onRefresh={refresh} onOpenAnalysis={vi.fn()} />)
    expect(refresh).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '후보 새로고침' }))
    expect(refresh).toHaveBeenCalledOnce()
    expect(screen.getByRole('region', { name: '후보 기준 기록' }).textContent).toContain('시점의 기준 기록이며, 현재 시점의 투자 권유가 아닙니다. 후보 새로고침 전까지 자동으로 갱신되지 않습니다.')
    expect(screen.getByRole('heading', { name: '관심 후보 목록' })).toBeTruthy()
    expect(document.body.textContent).toContain('관찰 시작')
    expect(document.body.textContent).not.toMatch(/추천종목|매수|매도|손절가|익절가|목표가|1차|2차|3차/)
  })
})
