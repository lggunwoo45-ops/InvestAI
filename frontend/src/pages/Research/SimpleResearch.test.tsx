import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SimpleMarketSummary } from './SimpleResearch'

describe('plain-language market observations', () => {
  beforeEach(() => localStorage.clear())
  const candles = () => Array.from({ length: 25 }, (_, i) => ({ timestamp: 1_792_699_200_000 + i * 3_600_000, open: 100 + i, high: 101 + i, low: 99 + i, close: 100 + i, volume: i === 24 ? 6 : 3 }))
  const show = (rows: ReturnType<typeof candles>) => renderWithProviders(<SimpleMarketSummary asset="BTC" price={150} at={Date.now()} candles={rows} loading={false} onMode={vi.fn()} onWatch={vi.fn()} watchlisted={false} canWatch message="" />)
  it('uses matching completed hourly candles for the explanation, independently of the current mark price', () => {
    show(candles())
    expect(screen.getByText('최근 완료된 24시간 동안 가격이 24% 올랐어요.')).toBeTruthy()
    expect(screen.getByText('최근 1시간 거래량은 그전 20시간 평균의 2배예요.')).toBeTruthy()
    expect(screen.getByLabelText('현재 기준 가격').textContent).toContain('150')
  })
  it('does not describe a continuous daily move from candles with a missing hour', () => {
    const rows = candles(); rows[12].timestamp -= 3_600_000
    show(rows)
    expect(screen.getByText('최근 하루의 흐름을 설명할 자료가 부족해요.')).toBeTruthy()
    expect(screen.getByText('거래량을 비교할 자료가 부족해요.')).toBeTruthy()
  })
})
