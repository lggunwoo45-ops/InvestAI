import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { useTechnicalLevelData } from '@/hooks/useTechnicalLevelData'
import type { MarketInstrument } from '@/types/market'
import { AnalysisWarmup } from './AnalysisWarmup'

vi.mock('@/hooks/useTechnicalLevelData', () => ({ useTechnicalLevelData: vi.fn(() => ({ connectionStatus: 'connecting' })) }))
it('prepares only the given instrument at background priority and never claims a decision is ready', () => {
  const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'BTC', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 1, volume24h: 1000 }
  const { rerender } = render(<MemoryRouter><AnalysisWarmup instrument={instrument} language="ko" /></MemoryRouter>)
  expect(screen.getByRole('status').textContent).toContain('미리 준비 중 (0/3)')
  expect(vi.mocked(useTechnicalLevelData).mock.calls).toEqual([[instrument, '1D', 0], [instrument, '4H', 0], [instrument, '1H', 0]])
  vi.mocked(useTechnicalLevelData).mockReturnValue({ connectionStatus: 'live' } as ReturnType<typeof useTechnicalLevelData>)
  rerender(<MemoryRouter><AnalysisWarmup instrument={instrument} language="ko" /></MemoryRouter>)
  expect(screen.getByRole('status').textContent).toContain('분석 데이터 연결됨')
  expect(screen.getByRole('link').getAttribute('href')).toBe('/my-analysis?instrumentId=upbit-btc')
})
