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
    expect(document.body.textContent).toContain('Current read: Add to watch')
    expect(document.body.textContent).toContain('Reason')
    expect(document.body.textContent).toContain('Next check')
    expect(document.body.textContent).toContain('Approach review range')
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

  it('shows current price as reference data without requiring the item to remain in the live candidate ranking', () => {
    render(<CandidateSnapshotPanel snapshot={snapshot} currentStates={new Map()} currentPrices={new Map([['btc', 105], ['eth', 79]])} language="en" now="2026-09-25T01:00:00Z" canRefresh onRefresh={vi.fn()} onOpenAnalysis={vi.fn()} />)
    expect(screen.getByText('105 KRW')).toBeTruthy()
    expect(screen.getByText('79 KRW')).toBeTruthy()
    expect(screen.getAllByText('Current review basis unavailable')).toHaveLength(2)
    expect(screen.getAllByText('Current price is available, but the current review basis could not be compared with the snapshot record.')).toHaveLength(2)
    expect(screen.queryByText('Current state unavailable')).toBeNull()
    expect(renderedSymbols()).toEqual(['BTC', 'ETH'])
  })

  it('distinguishes current price availability from review-basis availability in both languages', () => {
    const props = { snapshot, currentStates: new Map<string, CandidateSnapshotCurrentState>(), currentPrices: new Map<string, number>(), now: '2026-09-25T01:00:00Z', canRefresh: true, onRefresh: vi.fn(), onOpenAnalysis: vi.fn() }
    const { rerender } = render(<CandidateSnapshotPanel {...props} language="en" />)
    expect(screen.getAllByText('Current price unavailable')).toHaveLength(2)
    rerender(<CandidateSnapshotPanel {...props} language="ko" />)
    expect(screen.getAllByText('현재 가격 확인 불가')).toHaveLength(2)
    rerender(<CandidateSnapshotPanel {...props} currentPrices={new Map([['btc', 105], ['eth', 79]])} language="ko" />)
    expect(screen.getAllByText('현재 판단 근거 확인 불가')).toHaveLength(2)
    expect(screen.getAllByText('현재 가격은 표시되지만, 기준 기록과 비교할 현재 판단 근거를 불러오지 못했습니다.')).toHaveLength(2)
    expect(screen.queryByText('현재 상태 확인 불가')).toBeNull()
  })

  it('uses a valid catalog reference price when a comparison state carries an invalid price', () => {
    const invalidStates = states(0)
    render(<CandidateSnapshotPanel snapshot={snapshot} currentStates={invalidStates} currentPrices={new Map([['btc', 105], ['eth', 79]])} language="en" now="2026-09-25T01:00:00Z" canRefresh onRefresh={vi.fn()} onOpenAnalysis={vi.fn()} />)
    expect(screen.getByText('105 KRW')).toBeTruthy()
    expect(screen.queryByText('Current price unavailable')).toBeNull()
  })

  it('keeps expired, changed, and held status labels precise', () => {
    const changedStates = states(110)
    changedStates.set('btc', { ...changedStates.get('btc')!, ruleBasis: [{ key: 'dataQuality', label: 'Data quality', value: 'Limited' }] })
    const props = { snapshot, language: 'en' as const, canRefresh: true, onRefresh: vi.fn(), onOpenAnalysis: vi.fn() }
    const { rerender } = render(<CandidateSnapshotPanel {...props} currentStates={states(110)} now="2026-09-25T01:00:00Z" />)
    expect(screen.getAllByText('Baseline held')).toHaveLength(2)
    rerender(<CandidateSnapshotPanel {...props} currentStates={changedStates} now="2026-09-25T01:00:00Z" />)
    expect(screen.getByText('Change check needed')).toBeTruthy()
    rerender(<CandidateSnapshotPanel {...props} currentStates={changedStates} language="ko" now="2026-09-27T01:00:00Z" />)
    expect(screen.getAllByText('기준 시점이 오래됨').length).toBeGreaterThan(0)
  })

  it('refreshes only after the explicit button is clicked and uses safe Korean labels', () => {
    const refresh = vi.fn()
    render(<CandidateSnapshotPanel snapshot={snapshot} currentStates={states(100)} language="ko" now="2026-09-25T01:00:00Z" canRefresh onRefresh={refresh} onOpenAnalysis={vi.fn()} />)
    expect(refresh).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '후보 새로고침' }))
    expect(refresh).toHaveBeenCalledOnce()
    expect(screen.getByRole('region', { name: '후보 기준 기록' }).textContent).toContain('시점의 기준 기록이며, 현재 시점의 투자 권유가 아닙니다. 후보 새로고침 전까지 자동으로 갱신되지 않습니다.')
    expect(screen.getByRole('heading', { name: '관심 후보 목록' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '후보 새로고침' })).toBeTruthy()
    expect(document.body.textContent).toContain('지금 판단: 관심 등록')
    expect(document.body.textContent).not.toMatch(/추천종목|매수가|손절가|익절가|목표가|지금 사세요|팔아야 합니다|1차|2차|3차/)
  })

  it('does not expose direct action or future order-price wording', () => {
    render(<CandidateSnapshotPanel snapshot={snapshot} currentStates={states(100)} language="en" now="2026-09-25T01:00:00Z" canRefresh onRefresh={vi.fn()} onOpenAnalysis={vi.fn()} />)
    expect(document.body.textContent?.toLowerCase()).not.toMatch(/buy signal|sell signal|entry price|target price|stop loss|take profit/)
  })
})
