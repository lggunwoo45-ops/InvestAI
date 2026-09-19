import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { WatchCandidate } from '@/types/watchCandidate'
import { CryptoWatchCandidates } from './CryptoWatchCandidates'

const candidate: WatchCandidate = {
  id: 'crypto-watch-upbit-btc', instrumentId: 'upbit-btc', symbol: 'BTC/KRW', name: 'Bitcoin', assetType: 'crypto', rank: 1, watchScore: 78, scoreLabel: 'high', summary: 'Transparent candidate.', watchReason: 'Evidence-ranked for review.',
  evidence: [{ type: 'momentum', label: 'Momentum', score: 20, maxScore: 25, summary: 'Positive movement.', status: 'positive' }], riskSummary: 'No extreme penalty.', invalidationSummary: 'Reassess on reversal.', nextWatchPoints: ['Confirm trend.'],
  newsEvidence: { source: 'local-proxy', scope: 'market', count: 1, headlines: ['Macro update'], generated: false, disclaimer: 'Market context only.' }, disclaimer: 'Not a recommendation.',
}

function renderCandidates(language: 'en' | 'ko' = 'en') {
  const open = vi.fn()
  render(<CryptoWatchCandidates candidates={[candidate]} language={language} mode="live" onOpenInstrument={open} onOpenMarket={vi.fn()} onModeChange={vi.fn()} onRetry={vi.fn()} />)
  return open
}

describe('CryptoWatchCandidates', () => {
  it('renders candidate score, evidence, trust language, and news provenance', () => {
    renderCandidates()
    expect(screen.getByRole('heading', { name: 'Crypto Watch Candidates' })).toBeTruthy()
    expect(screen.getByText('78')).toBeTruthy()
    expect(screen.getByText(/no AI model/i)).toBeTruthy()
    fireEvent.click(screen.getByText('Inspect evidence'))
    expect(screen.getByText(/local-proxy/)).toBeTruthy()
    expect(screen.getByText(/Macro update/)).toBeTruthy()
  })

  it('opens the selected instrument in Market', () => {
    const open = renderCandidates()
    fireEvent.click(screen.getByRole('button', { name: 'Open in Market' }))
    expect(open).toHaveBeenCalledWith('upbit-btc')
  })

  it('renders Korean trust and action labels', () => {
    renderCandidates('ko')
    expect(screen.getByRole('heading', { name: '가상자산 관찰 후보' })).toBeTruthy()
    expect(screen.getByText(/AI 모델 없음/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '마켓에서 열기' })).toBeTruthy()
  })

  it('shows an actionable empty state', () => {
    const openMarket = vi.fn()
    render(<CryptoWatchCandidates candidates={[]} language="en" mode="live" onOpenInstrument={vi.fn()} onOpenMarket={openMarket} onModeChange={vi.fn()} onRetry={vi.fn()} />)
    expect(screen.getByText('No complete crypto market catalog is available.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open Market' }))
    expect(openMarket).toHaveBeenCalledOnce()
  })
})
