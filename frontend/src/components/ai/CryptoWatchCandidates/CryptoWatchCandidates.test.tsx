import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WatchCandidate } from '@/types/watchCandidate'
import { getCandidateHorizonProfile } from '@/services/ai/candidateHorizonProfiles'
import { CANDIDATE_FEEDBACK_STORAGE_KEY } from '@/utils/candidateFeedbackStorage'
import { filterCandidatesByReviewStatus } from '@/utils/candidateFeedbackSelectors'
import { CryptoWatchCandidates } from './CryptoWatchCandidates'

const candidate: WatchCandidate = {
  id: 'crypto-watch-short-upbit-btc', instrumentId: 'upbit-btc', symbol: 'BTC/KRW', name: 'Bitcoin', assetType: 'crypto', horizon: 'short', lifecycleStatus: 'new', reviewCadence: 'Review daily or intraday', planningZones: { interestArea: '98 – 100 KRW', secondInterestArea: '96.5 – 98 KRW', targetObservationArea: '102 – 105 KRW', invalidationRiskArea: '95 – 97 KRW', riskRewardNote: 'Reference only.', confidenceNote: 'Rule-based.' }, rank: 1, watchScore: 78, scoreLabel: 'high', summary: 'Transparent candidate.', watchReason: 'Evidence-ranked for review.',
  evidence: [{ type: 'momentum', label: 'Momentum', score: 20, maxScore: 25, summary: 'Positive movement.', status: 'positive' }], riskSummary: 'No extreme penalty.', invalidationSummary: 'Reassess on reversal.', nextWatchPoints: ['Confirm trend.'],
  newsEvidence: { source: 'local-proxy', scope: 'market', count: 1, headlines: ['Macro update'], generated: false, disclaimer: 'Market context only.' }, disclaimer: 'Not a recommendation.',
}

function renderCandidates(language: 'en' | 'ko' = 'en') {
  const open = vi.fn()
  render(<CryptoWatchCandidates candidates={[candidate]} language={language} mode="live" newsSource="local-proxy" horizon="short" horizonProfile={getCandidateHorizonProfile('short', language)} onHorizonChange={vi.fn()} onOpenInstrument={open} onOpenMarket={vi.fn()} onModeChange={vi.fn()} onRetry={vi.fn()} />)
  return open
}

describe('CryptoWatchCandidates', () => {
  beforeEach(() => window.localStorage.clear())

  it('renders candidate evidence, trust language, and news provenance without a score', () => {
    renderCandidates()
    expect(screen.getByRole('heading', { name: 'Crypto Interest Candidates' })).toBeTruthy()
    expect(screen.queryByText('78')).toBeNull()
    expect(screen.getByText(/no AI model/i)).toBeTruthy()
    fireEvent.click(screen.getByText('Inspect evidence'))
    expect(screen.getAllByText(/local-proxy/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Macro update/)).toBeTruthy()
  })

  it('opens the selected instrument in Market', () => {
    const open = renderCandidates()
    fireEvent.click(screen.getByRole('button', { name: 'Open in Market' }))
    expect(open).toHaveBeenCalledWith('upbit-btc')
  })

  it('renders Korean trust and action labels', () => {
    renderCandidates('ko')
    expect(screen.getByRole('heading', { name: '가상자산 관심 후보 목록' })).toBeTruthy()
    expect(screen.getByText(/AI 모델 없음/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '마켓에서 열기' })).toBeTruthy()
  })

  it('renders the review summary and updates local review status', () => {
    renderCandidates()
    expect(screen.getByLabelText("Today's review").textContent).toContain('1 candidates')
    fireEvent.click(screen.getByRole('button', { name: 'Mark as Watching' }))
    expect(screen.getByText('Watching', { selector: 'em' })).toBeTruthy()
    expect(window.localStorage.getItem(CANDIDATE_FEEDBACK_STORAGE_KEY)).toContain('watching')
    fireEvent.click(screen.getByRole('button', { name: 'Mark as Reviewed' }))
    expect(screen.getByText('Reviewed', { selector: 'em' })).toBeTruthy()
  })

  it('stores and clears a local note', () => {
    renderCandidates()
    const note = screen.getByRole('textbox', { name: 'Local note BTC/KRW' })
    fireEvent.change(note, { target: { value: 'Check volume again' } })
    expect(window.localStorage.getItem(CANDIDATE_FEEDBACK_STORAGE_KEY)).toContain('Check volume again')
    fireEvent.click(screen.getByRole('button', { name: 'Clear note' }))
    expect((note as HTMLTextAreaElement).value).toBe('')
  })

  it('filters review statuses without changing candidate scoring', () => {
    const feedback = { 'upbit-btc': { instrumentId: 'upbit-btc', status: 'dismissed' as const, note: '', updatedAt: '2026-01-01T00:00:00.000Z' } }
    expect(filterCandidatesByReviewStatus([candidate], feedback, 'watching')).toEqual([])
    expect(filterCandidatesByReviewStatus([candidate], feedback, 'dismissed')[0]?.watchScore).toBe(78)
  })

  it('marks dismissed candidates visibly and supports the dismissed filter', () => {
    renderCandidates()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.getByText('Dismissed', { selector: 'em' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Dismissed/ }))
    expect(screen.getByText('BTC/KRW')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Watching0$/ }))
    expect(screen.getByText('No candidates match this review filter.')).toBeTruthy()
  })

  it('resets all local feedback after confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderCandidates()
    fireEvent.click(screen.getByRole('button', { name: 'Mark as Watching' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Local only' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset local feedback' }))
    expect(window.localStorage.getItem(CANDIDATE_FEEDBACK_STORAGE_KEY)).toBeNull()
    expect(screen.getByText('Unreviewed', { selector: 'em' })).toBeTruthy()
  })

  it('offers a review-after-opening action and avoids unsafe wording', () => {
    const open = renderCandidates()
    fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed after opening' }))
    expect(open).toHaveBeenCalledWith('upbit-btc')
    expect(document.body.textContent?.toLowerCase()).not.toMatch(/buy here|sell here|strong buy|strong sell|guaranteed target|profit expected/)
  })

  it('renders horizon tabs and cadence guidance without price-zone guidance', () => {
    const changeHorizon = vi.fn()
    render(<CryptoWatchCandidates candidates={[candidate]} language="en" mode="live" newsSource="local-proxy" horizon="short" horizonProfile={getCandidateHorizonProfile('short', 'en')} onHorizonChange={changeHorizon} onOpenInstrument={vi.fn()} onOpenMarket={vi.fn()} onModeChange={vi.fn()} onRetry={vi.fn()} />)
    expect(screen.queryByText('98 – 100 KRW')).toBeNull()
    expect(screen.getAllByText(/Review daily or intraday/).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('tab', { name: 'Swing' }))
    expect(changeHorizon).toHaveBeenCalledWith('swing')
  })

  it('renders disabled AI action placeholders', () => {
    renderCandidates()
    for (const label of ['AI Analyze · Planned', 'AI News Summary · Planned', 'Deep Dive · Planned']) {
      expect((screen.getByRole('button', { name: new RegExp(label) }) as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('shows an actionable empty state', () => {
    const openMarket = vi.fn()
    render(<CryptoWatchCandidates candidates={[]} language="en" mode="live" newsSource="none" horizon="short" horizonProfile={getCandidateHorizonProfile('short', 'en')} onHorizonChange={vi.fn()} onOpenInstrument={vi.fn()} onOpenMarket={openMarket} onModeChange={vi.fn()} onRetry={vi.fn()} />)
    expect(screen.getByText('No complete crypto market catalog is available.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open Market' }))
    expect(openMarket).toHaveBeenCalledOnce()
  })
})
