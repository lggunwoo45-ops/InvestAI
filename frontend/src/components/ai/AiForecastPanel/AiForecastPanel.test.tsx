import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { MarketInstrument } from '@/types/market'
import { AiForecastPanel } from './AiForecastPanel'

const incomplete: MarketInstrument = { id: '', marketId: 'upbit', symbol: '', name: '', quoteCurrency: 'KRW', lastPrice: 0, change24hPercent: 0, volume24h: 0 }

describe('AI Forecast fallback', () => {
  it('shows a safe unavailable state for incomplete mock analysis input', () => {
    render(<AppProviders><AiForecastPanel instrument={incomplete} timeframe="short" displayTimeframe="1H" /></AppProviders>)
    expect(screen.getByRole('region', { name: 'Scenario Analysis' })).toBeTruthy()
    expect(screen.getByText('Mock scenario analysis is temporarily unavailable.')).toBeTruthy()
    expect(screen.getByText('AI analysis is not active yet.')).toBeTruthy()
  })
})
