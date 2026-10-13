import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { buildEvidenceCandidateRecommendation as build } from '@/services/recommendation/evidenceCandidateRecommendation'
import type { MarketInstrument } from '@/types/market'
import { EvidenceCandidatePanel } from './EvidenceRecommendation'

const instrument: MarketInstrument = { id: 'one', marketId: 'us-stock', symbol: 'ONE', name: 'One', lastPrice: 100, change24hPercent: 1, volume24h: 1000, quoteCurrency: 'USD' }
describe('EvidenceCandidatePanel', () => {
  it('shows useful candidates, why, next check and stable selection buttons', () => {
    const onSelect = vi.fn()
    const item = build({ instrument, language: 'en', dataQuality: 'mock' })
    renderWithProviders(<EvidenceCandidatePanel items={[item]} language="en" onSelect={onSelect} />)
    const panel = screen.getByRole('region', { name: 'AI candidates' })
    expect(panel.textContent).toContain('Keep watching')
    expect(panel.textContent).toContain(item.why)
    expect(panel.textContent).toContain(item.nextCheck)
    fireEvent.click(within(panel).getByRole('button', { name: 'Select evidence candidate ONE' }))
    expect(onSelect).toHaveBeenCalledWith('one')
  })
  it('keeps exclusions out of the main list and exposes exact reasons in secondary details', () => {
    const item = build({ instrument: { ...instrument, lastPrice: 0 }, language: 'en', dataQuality: 'live' })
    renderWithProviders(<EvidenceCandidatePanel items={[item]} language="en" onSelect={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Select evidence candidate ONE' })).toBeNull()
    const summary = screen.getByText('Held / excluded evidence (1)')
    expect(summary.closest('details')?.open).toBe(false)
    expect(summary.closest('details')?.textContent).toContain('Invalid price')
  })
})
