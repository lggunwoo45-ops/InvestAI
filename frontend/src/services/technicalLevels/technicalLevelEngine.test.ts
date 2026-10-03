import { describe, expect, it } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import type { Candle } from '@/types/marketDetail'
import type { TechnicalLevel } from '@/types/technicalLevels'
import {
  buildTechnicalLevelAnalysis,
  buildTechnicalLevels,
  MIN_TECHNICAL_LEVEL_CANDLES,
} from './technicalLevelEngine'

const instrument: MarketInstrument = {
  id: 'upbit-btc',
  marketId: 'upbit',
  symbol: 'BTC/KRW',
  displaySymbol: 'BTC/KRW',
  name: 'Bitcoin',
  quoteCurrency: 'KRW',
  lastPrice: 112,
  change24hPercent: 1.2,
  volume24h: 10_000,
}

function candles(count: number): Candle[] {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * 0.12 + Math.sin(index / 2) * 4
    return {
      timestamp: 1_700_000_000_000 + index * 60_000,
      open: close - 0.4,
      high: close + 2.5,
      low: close - 2.5,
      close,
      volume: 100 + index,
    }
  })
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys)
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)])
}

function preciseLevels(analysis: ReturnType<typeof buildTechnicalLevelAnalysis>): TechnicalLevel[] {
  const { levelSet } = analysis
  return [
    levelSet.firstSupport,
    levelSet.secondSupport,
    levelSet.firstResistance,
    levelSet.secondResistance,
    levelSet.reboundWatchZone,
    levelSet.breakdownCheckZone,
    ...levelSet.movingAverages,
    ...levelSet.fibonacciLevels,
  ].filter((level): level is TechnicalLevel => level !== null)
}

describe('buildTechnicalLevelAnalysis', () => {
  it('builds deterministic, bounded reference levels without mutating candle history', () => {
    const source = candles(80)
    const sourceSnapshot = structuredClone(source)
    const first = buildTechnicalLevelAnalysis({ instrument, candles: source, language: 'en', dataQuality: 'live' })
    const second = buildTechnicalLevelAnalysis({ instrument, candles: source, language: 'en', dataQuality: 'live' })

    expect(first).toEqual(second)
    expect(first.levelSet).toMatchObject({
      status: 'ready',
      currentPrice: 112,
      asOfTimestamp: source.at(-1)?.timestamp,
      candleCount: 60,
      dataQuality: 'live',
      unavailableReason: null,
    })
    expect([first.levelSet.firstSupport, first.levelSet.secondSupport].filter(Boolean)).toHaveLength(2)
    expect([first.levelSet.firstResistance, first.levelSet.secondResistance].filter(Boolean)).toHaveLength(2)
    expect(first.levelSet.movingAverages.map((average) => average.id)).toEqual([
      'moving-average-5',
      'moving-average-20',
      'moving-average-60',
    ])
    expect(first.levelSet.fibonacciLevels.map((level) => level.id)).toEqual([
      'fibonacci-382',
      'fibonacci-500',
      'fibonacci-618',
    ])
    expect(first.levelSet.firstSupport?.price).toBeLessThan(112)
    expect(first.levelSet.secondSupport?.price).toBeLessThan(112)
    expect(first.levelSet.firstResistance?.price).toBeGreaterThan(112)
    expect(first.levelSet.secondResistance?.price).toBeGreaterThan(112)
    expect(first.levelSet.firstSupport?.label).toBe('First support')
    expect(first.levelSet.secondSupport?.label).toBe('Second support')
    expect(first.levelSet.firstResistance?.label).toBe('First resistance')
    expect(first.levelSet.secondResistance?.label).toBe('Second resistance')
    expect(first.levelSet.reboundWatchZone?.label).toBe('Rebound watch zone')
    expect(first.levelSet.breakdownCheckZone?.label).toBe('Breakdown check zone')
    expect(first.levelSet.cautions.join(' ')).toContain('not order prices, trade instructions, or forecasts')
    expect(source).toEqual(sourceSnapshot)
  })

  it('populates price labels, rationale, source, strength, distance, and position flags', () => {
    const analysis = buildTechnicalLevelAnalysis({ instrument, candles: candles(80), language: 'en', dataQuality: 'live' })
    const levels = [analysis.levelSet.currentPriceLevel, ...preciseLevels(analysis)].filter((level): level is TechnicalLevel => level !== null)

    expect(levels.length).toBeGreaterThan(0)
    levels.forEach((level) => {
      expect(level.priceLabel).toContain('KRW')
      expect(level.reason.length).toBeGreaterThan(0)
      expect(['candlePivot', 'candleRange', 'movingAverage', 'fibonacciRange', 'currentPrice']).toContain(level.source)
      expect(['weak', 'moderate', 'strong']).toContain(level.strength)
      expect(level.price).not.toBeNull()
      expect(level.distanceFromCurrentPercent).toBeCloseTo((((level.price ?? 112) - 112) / 112) * 100, 4)
      expect(level.isAboveCurrent).toBe((level.price ?? 112) > 112)
      expect(level.isBelowCurrent).toBe((level.price ?? 112) < 112)
    })
  })

  it('returns moving-average context and chart overlay contracts together', () => {
    const analysis = buildTechnicalLevelAnalysis({ instrument, candles: candles(80), language: 'en', dataQuality: 'live' })
    const context = analysis.movingAverageContext

    expect(context.available).toBe(true)
    expect(context.shortAverage?.id).toBe('moving-average-5')
    expect(context.mediumAverage?.id).toBe('moving-average-20')
    expect(context.longAverage?.id).toBe('moving-average-60')
    expect(context.nearestAverage).toBeTruthy()
    expect(['above', 'below', 'mixed']).toContain(context.pricePosition)
    expect(context.summary.length).toBeGreaterThan(0)
    expect(analysis.overlayLines.length).toBeGreaterThan(0)
    analysis.overlayLines.forEach((line) => {
      expect(Number.isFinite(line.price)).toBe(true)
      expect(['solid', 'dashed', 'dotted']).toContain(line.style)
      expect(['weak', 'moderate', 'strong']).toContain(line.strength)
      expect(typeof line.visibleByDefault).toBe('boolean')
    })
  })

  it('exposes only moving averages whose individual history requirement is met', () => {
    const analysis = buildTechnicalLevelAnalysis({ instrument, candles: candles(20), language: 'en', dataQuality: 'live' })

    expect(analysis.levelSet.status).toBe('ready')
    expect(analysis.levelSet.movingAverages.map((average) => average.id)).toEqual(['moving-average-5', 'moving-average-20'])
    expect(analysis.movingAverageContext.shortAverage).toBeTruthy()
    expect(analysis.movingAverageContext.mediumAverage).toBeTruthy()
    expect(analysis.movingAverageContext.longAverage).toBeNull()
  })

  it('sorts out-of-order input before deriving the same deterministic result', () => {
    const ordered = candles(30)
    const expected = buildTechnicalLevelAnalysis({ instrument, candles: ordered, language: 'en', dataQuality: 'live' })
    const shuffled = ordered.filter((_, index) => index % 2 === 0).reverse().concat(ordered.filter((_, index) => index % 2 === 1))
    const actual = buildTechnicalLevelAnalysis({ instrument, candles: shuffled, language: 'en', dataQuality: 'live' })

    expect(actual).toEqual(expected)
    expect(actual.levelSet.asOfTimestamp).toBe(ordered.at(-1)?.timestamp)
  })

  it('describes narrowly spaced mixed moving averages as clustered', () => {
    const clusteredCandles = Array.from({ length: 80 }, (_, index): Candle => {
      const close = index % 2 === 0 ? 99.9 : 100.1
      return {
        timestamp: 1_700_000_000_000 + index * 60_000,
        open: close,
        high: close + 1,
        low: close - 1,
        close,
        volume: 100,
      }
    })
    const english = buildTechnicalLevelAnalysis({ instrument: { ...instrument, lastPrice: 100 }, candles: clusteredCandles, language: 'en', dataQuality: 'live' })
    const korean = buildTechnicalLevelAnalysis({ instrument: { ...instrument, lastPrice: 100 }, candles: clusteredCandles, language: 'ko', dataQuality: 'live' })

    expect(english.movingAverageContext.pricePosition).toBe('mixed')
    expect(english.movingAverageContext.summary).toContain('clustered')
    expect(korean.movingAverageContext.summary).toContain('이동평균선이')
    expect(korean.movingAverageContext.summary).toContain('밀집')
  })

  it('preserves a valid comparison price but emits no precise levels with insufficient history', () => {
    const source = candles(MIN_TECHNICAL_LEVEL_CANDLES - 1)
    const analysis = buildTechnicalLevelAnalysis({ instrument, candles: source, language: 'en' })

    expect(analysis.levelSet).toMatchObject({
      status: 'unavailable',
      unavailableReason: 'insufficientCandles',
      currentPrice: 112,
      asOfTimestamp: source.at(-1)?.timestamp,
      dataQuality: 'limited',
    })
    expect(analysis.levelSet.currentPriceLevel).toBeTruthy()
    expect(analysis.levelSet.firstSupport).toBeNull()
    expect(analysis.levelSet.secondSupport).toBeNull()
    expect(analysis.levelSet.firstResistance).toBeNull()
    expect(analysis.levelSet.secondResistance).toBeNull()
    expect(analysis.levelSet.reboundWatchZone).toBeNull()
    expect(analysis.levelSet.breakdownCheckZone).toBeNull()
    expect(analysis.levelSet.movingAverages).toEqual([])
    expect(analysis.levelSet.fibonacciLevels).toEqual([])
    expect(analysis.overlayLines).toEqual([])
    expect(analysis.movingAverageContext).toMatchObject({ available: false, pricePosition: 'unavailable' })
  })

  it('honors unavailable source quality without generating precise references', () => {
    const analysis = buildTechnicalLevelAnalysis({ instrument, candles: candles(80), language: 'en', dataQuality: 'unavailable' })

    expect(analysis.levelSet).toMatchObject({
      status: 'unavailable',
      unavailableReason: 'unavailableData',
      currentPrice: 112,
      dataQuality: 'unavailable',
    })
    expect(preciseLevels(analysis)).toEqual([])
    expect(analysis.overlayLines).toEqual([])
  })

  it('filters invalid and duplicate candles before checking availability', () => {
    const source = candles(MIN_TECHNICAL_LEVEL_CANDLES)
    const duplicate = { ...source[0], close: source[0].close + 0.1 }
    const invalid = { ...source.at(-1)!, high: Number.NaN }
    const analysis = buildTechnicalLevelAnalysis({ instrument, candles: [...source.slice(0, -1), duplicate, invalid], language: 'en' })

    expect(analysis.levelSet.status).toBe('unavailable')
    expect(analysis.levelSet.candleCount).toBe(MIN_TECHNICAL_LEVEL_CANDLES - 1)
  })

  it('uses the latest valid close when the instrument price is unavailable', () => {
    const source = candles(30)
    const result = buildTechnicalLevels({ instrument: { ...instrument, lastPrice: Number.NaN }, candles: source, language: 'en' })

    expect(result.status).toBe('ready')
    expect(result.currentPrice).toBe(source.at(-1)?.close)
  })

  it('preserves meaningful precision for micro-priced instruments', () => {
    const microInstrument = { ...instrument, id: 'binance-shib', marketId: 'binance-spot' as const, symbol: 'SHIB/USDT', quoteCurrency: 'USDT', lastPrice: 0.00001234 }
    const microCandles = Array.from({ length: 60 }, (_, index): Candle => {
      const close = 0.00001 + Math.sin(index / 3) * 0.000001
      return { timestamp: 1_700_000_000_000 + index * 60_000, open: close, high: close + 0.000003, low: close - 0.000003, close, volume: 100 + index }
    })
    const analysis = buildTechnicalLevelAnalysis({ instrument: microInstrument, candles: microCandles, language: 'en', dataQuality: 'live' })

    expect(analysis.levelSet.status).toBe('ready')
    expect(analysis.levelSet.firstSupport?.priceLabel).toMatch(/^0\.0+[1-9]/)
    expect(analysis.levelSet.firstResistance?.priceLabel).toMatch(/^0\.0+[1-9]/)
    preciseLevels(analysis).forEach((level) => expect(level.priceLabel).not.toBe('0 USDT'))
  })

  it('returns unavailable for a flat range and retains Korean safety wording', () => {
    const flat = candles(20).map((candle) => ({ ...candle, open: 100, high: 100, low: 100, close: 100 }))
    const result = buildTechnicalLevels({ instrument, candles: flat, language: 'ko' })

    expect(result).toMatchObject({ status: 'unavailable', unavailableReason: 'insufficientRange', currentPrice: 112 })
    expect(result.summary).toContain('유효한 가격 범위')
    expect(result.cautions.join(' ')).toContain('주문 가격이나 거래 지시 또는 예측이 아닙니다')
  })

  it('does not expose execution-oriented field names', () => {
    const analysis = buildTechnicalLevelAnalysis({ instrument, candles: candles(80), language: 'en' })

    expect(collectKeys(analysis)).not.toEqual(expect.arrayContaining(['entry', 'stopLoss', 'takeProfit', 'target', 'orderAction']))
  })
})
