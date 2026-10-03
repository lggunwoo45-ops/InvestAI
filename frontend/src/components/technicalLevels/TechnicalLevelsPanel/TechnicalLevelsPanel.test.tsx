import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MovingAverageContext, TechnicalLevel, TechnicalLevelSet } from '@/types/technicalLevels'
import { TechnicalLevelsPanel } from './TechnicalLevelsPanel'

const level = (id: string, kind: TechnicalLevel['kind'], label: string, price: number, source: TechnicalLevel['source']): TechnicalLevel => ({ id, kind, label, price, priceLabel: price.toLocaleString(), strength: 'moderate', reason: `${label} reason`, source, distanceFromCurrentPercent: price - 120, isAboveCurrent: price > 120, isBelowCurrent: price < 120 })
const ma20 = level('ma20', 'movingAverage', 'MA 20', 116, 'movingAverage')
const movingAverageContext: MovingAverageContext = { available: true, nearestAverage: ma20, shortAverage: level('ma5', 'movingAverage', 'MA 5', 119, 'movingAverage'), mediumAverage: ma20, longAverage: level('ma60', 'movingAverage', 'MA 60', 108, 'movingAverage'), pricePosition: 'above', summary: 'Price is above the reviewed averages.' }
const ready: TechnicalLevelSet = { status: 'ready', instrumentId: 'upbit-btc', symbol: 'BTC/KRW', currentPrice: 120, currentPriceLevel: level('current', 'currentPrice', 'Current price', 120, 'currentPrice'), asOfTimestamp: 1_700_000_000_000, candleCount: 80, firstSupport: level('s1', 'support', 'Support reference 1', 110, 'candlePivot'), secondSupport: level('s2', 'support', 'Support reference 2', 100, 'candleRange'), firstResistance: level('r1', 'resistance', 'Resistance reference 1', 130, 'candlePivot'), secondResistance: level('r2', 'resistance', 'Resistance reference 2', 140, 'candleRange'), reboundWatchZone: level('rw', 'reboundWatch', 'Rebound watch reference', 105, 'candleRange'), breakdownCheckZone: level('bc', 'breakdownCheck', 'Breakdown check reference', 98, 'candleRange'), movingAverages: [movingAverageContext.shortAverage!, ma20, movingAverageContext.longAverage!], fibonacciLevels: [level('f1', 'fibonacci', 'Fibonacci 38.2%', 115, 'fibonacciRange')], summary: 'Calculated from loaded candles.', cautions: ['Technical levels are historical, rule-based reference areas. They are not order prices, trade instructions, or forecasts.'], dataQuality: 'live', unavailableReason: null }

describe('TechnicalLevelsPanel', () => {
  it('keeps Simple Mode to first support, first resistance, moving-average summary, and safety', () => {
    render(<TechnicalLevelsPanel levelSet={ready} movingAverageContext={movingAverageContext} displayMode="simple" language="en" />)
    const panel = screen.getByRole('region', { name: 'Chart structure analysis' })
    expect(panel.textContent).toContain('Support reference 1')
    expect(panel.textContent).toContain('Resistance reference 1')
    expect(panel.textContent).toContain('Price is above the reviewed averages.')
    expect(panel.textContent).not.toContain('Support reference 2')
    expect(panel.textContent).not.toContain('Fibonacci 38.2%')
    expect(panel.textContent).not.toContain('Candle pivot')
    expect(panel.textContent).toContain('Technical levels are historical, rule-based reference areas.')
  })
  it('shows reasons, sources, strengths, and Fibonacci references in Expert Mode', () => {
    render(<TechnicalLevelsPanel levelSet={ready} movingAverageContext={movingAverageContext} displayMode="expert" language="en" />)
    const panel = screen.getByRole('region', { name: 'Chart structure analysis' })
    expect(within(panel).getAllByRole('listitem')).toHaveLength(10)
    expect(panel.textContent).toContain('Support reference 2 reason')
    expect(panel.textContent).toContain('Candle pivot')
    expect(panel.textContent).toContain('Moderate')
    expect(panel.textContent).toContain('Fibonacci 38.2%')
  })
  it('renders the exact Korean unavailable copy without prohibited wording', () => {
    const unavailable: TechnicalLevelSet = { ...ready, status: 'unavailable', currentPrice: null, currentPriceLevel: null, asOfTimestamp: null, firstSupport: null, secondSupport: null, firstResistance: null, secondResistance: null, reboundWatchZone: null, breakdownCheckZone: null, movingAverages: [], fibonacciLevels: [], summary: '', cautions: [], dataQuality: 'unavailable', unavailableReason: 'insufficientCandles' }
    render(<TechnicalLevelsPanel levelSet={unavailable} movingAverageContext={{ ...movingAverageContext, available: false, nearestAverage: null, shortAverage: null, mediumAverage: null, longAverage: null, pricePosition: 'unavailable', summary: '' }} displayMode="simple" language="ko" />)
    expect(screen.getByRole('status').textContent).toContain('차트 구조를 계산할 데이터가 부족합니다.')
    expect(document.body.textContent).not.toMatch(/매수|매도|손절가|익절가|목표가/)
  })
  it('keeps loading and compact mock-data limitations explicit', () => {
    const mock = { ...ready, dataQuality: 'mock' as const, cautions: ['Technical safety.', 'Mock data limits the reliability of these references.'] }
    const { rerender } = render(<TechnicalLevelsPanel levelSet={mock} movingAverageContext={movingAverageContext} displayMode="simple" language="en" isLoading />)
    expect(screen.getByRole('status').textContent).toContain('Calculating chart structure')
    expect(screen.queryByText('Support reference 1')).toBeNull()
    rerender(<TechnicalLevelsPanel levelSet={mock} movingAverageContext={movingAverageContext} displayMode="simple" language="en" />)
    expect(screen.getByText('Mock data limits the reliability of these references.')).toBeTruthy()
  })
})
