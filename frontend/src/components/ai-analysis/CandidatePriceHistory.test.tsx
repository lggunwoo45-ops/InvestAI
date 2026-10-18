import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Candle } from '@/types/marketDetail'
import { CandidatePriceHistory } from './CandidatePriceHistory'

const candles: Candle[] = Array.from({ length: 35 }, (_, index) => ({ timestamp: 1_700_000_000_000 + index * 86_400_000, open: 100, high: 102, low: 99, close: 100, volume: 10 }))

describe('CandidatePriceHistory', () => {
  it('labels simulated data and renders the last 30 valid daily closes, including a flat series', () => {
    const { container } = render(<CandidatePriceHistory candles={candles} dataQuality="mock" language="en" />)
    expect(screen.getByRole('img', { name: /Mock data/ })).toBeTruthy()
    expect(screen.getByText('Mock data · 30 daily closes')).toBeTruthy()
    expect(container.querySelector('polyline')?.getAttribute('points')?.split(' ')).toHaveLength(30)
    expect(container.innerHTML).not.toContain('NaN')
  })

  it.each(['unavailable', 'invalid', 'insufficient'])('does not draw invented history for %s inputs', (state) => {
    const series = state === 'invalid' ? [{ ...candles[0], close: NaN }, candles[1]] : state === 'insufficient' ? candles.slice(0, 1) : candles
    render(<CandidatePriceHistory candles={series} dataQuality={state === 'unavailable' ? 'unavailable' : 'live'} language="ko" />)
    expect(screen.queryByRole('img')).toBeNull()
  })
})
