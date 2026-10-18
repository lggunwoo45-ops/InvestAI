import { describe, expect, it } from 'vitest'
import { reviewPosition, summarizePortfolio } from './portfolioReview'
import type { Position } from './portfolioStorage'

const position: Position = { id: '1', exchange: 'upbit', venue: 'upbit-krw', instrumentId: 'btc', symbol: 'BTC/KRW', quoteCurrency: 'KRW', averagePrice: 100, quantity: 2, targetPrice: 150, stopPrice: 75 }

describe('portfolio review calculations', () => {
  it('distinguishes loss from the rise needed to recover and computes plan outcomes', () => {
    const review = reviewPosition(position, 80)
    expect(review.current?.percent).toBeCloseTo(-20)
    expect(review.breakEvenChange).toBe(25)
    expect(review.target?.atLevel).toEqual({ cost: 200, value: 300, profit: 100, percent: 50 })
    expect(review.stop?.atLevel?.profit).toBe(-50)
    expect(review.target?.distance).toBe(87.5)
    expect(review.stop?.distance).toBe(-6.25)
  })
  it('includes exact thresholds and clears reached status when the price moves back', () => {
    expect(reviewPosition(position, 150).target?.reached).toBe(true)
    expect(reviewPosition(position, 151).target?.reached).toBe(true)
    expect(reviewPosition(position, 149).target?.reached).toBe(false)
    expect(reviewPosition(position, 75).stop?.reached).toBe(true)
    expect(reviewPosition(position, 74).stop?.reached).toBe(true)
    expect(reviewPosition(position, 76).stop?.reached).toBe(false)
    expect(reviewPosition(position, 100).breakEvenChange).toBe(0)
  })
  it.each([null, 0, -1, NaN, Infinity])('withholds current signals without a valid quote: %s', price => {
    const review = reviewPosition(position, price)
    expect(review.current).toBeNull()
    expect(review.breakEvenChange).toBeNull()
    expect(review.target?.reached).toBeNull()
    expect(review.stop?.distance).toBeNull()
    expect(review.target?.atLevel?.profit).toBe(100)
  })
  it('supports legacy positions and a stop above cost without mislabeling it as a loss', () => {
    expect(reviewPosition({ ...position, targetPrice: undefined, stopPrice: undefined }, 100).target).toBeNull()
    expect(reviewPosition({ ...position, stopPrice: 120 }, 110).stop?.atLevel?.profit).toBe(40)
  })
  it('groups currencies and calculates return from total cost, not average percentages', () => {
    const result = summarizePortfolio([
      { position: { ...position, quantity: 1 }, price: 125 },
      { position: { ...position, id: '2', averagePrice: 200, quantity: 3 }, price: 125 },
      { position: { ...position, id: '3', venue: 'upbit-usdt', quoteCurrency: 'USDT' }, price: 80 },
    ])
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ currency: 'KRW', count: 2, pricedCount: 2, cost: 700, value: 500, profit: -200 })
    expect(result[0].percent).toBeCloseTo(-200 / 700 * 100)
    expect(result[1]).toMatchObject({ currency: 'USDT', cost: 200, value: 160, profit: -40 })
  })
  it('preserves full cost but never displays partial valuations as totals', () => {
    expect(summarizePortfolio([{ position, price: 125 }, { position: { ...position, id: '2' }, price: null }])[0])
      .toEqual({ currency: 'KRW', count: 2, pricedCount: 1, cost: 400, value: null, profit: null, percent: null })
    expect(summarizePortfolio([])).toEqual([])
  })
  it('withholds overflowing totals even when individual positions are finite', () => {
    const large = { ...position, averagePrice: 1e308, quantity: 1 }
    expect(summarizePortfolio([{ position: large, price: 1e308 }, { position: { ...large, id: '2' }, price: 1e308 }])[0])
      .toMatchObject({ cost: null, value: null, profit: null, percent: null })
  })
})
