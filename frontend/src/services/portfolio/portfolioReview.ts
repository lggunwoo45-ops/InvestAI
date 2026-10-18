import { valuation, type Position } from './portfolioStorage'

export interface PricedPosition { position: Position; price: number | null }

/** Never add different quote currencies or report a partially priced portfolio as a total. */
export function summarizePortfolio(entries: readonly PricedPosition[]) {
  const groups = new Map<string, PricedPosition[]>()
  for (const entry of entries) {
    const currency = entry.position.quoteCurrency
    groups.set(currency, [...(groups.get(currency) ?? []), entry])
  }
  return [...groups].map(([currency, positions]) => {
    const cost = positions.reduce((sum, { position }) => sum + position.averagePrice * position.quantity, 0)
    const results = positions.map(({ position, price }) => valuation(position, price))
    const priced = results.filter(result => result !== null)
    const value = priced.reduce((sum, result) => sum + result.value, 0)
    const profit = value - cost
    const percent = profit / cost * 100
    const complete = priced.length === positions.length && [cost, value, profit, percent].every(Number.isFinite) && cost > 0
    return { currency, count: positions.length, pricedCount: priced.length, cost: Number.isFinite(cost) ? cost : null,
      value: complete ? value : null, profit: complete ? profit : null, percent: complete ? percent : null }
  })
}

export function reviewPosition(position: Position, price: number | null) {
  const current = valuation(position, price)
  const breakEvenChange = current && price !== null ? (position.averagePrice / price - 1) * 100 : null
  const threshold = (kind: 'target' | 'stop', level: number | undefined) => {
    if (level === undefined) return null
    const atLevel = valuation(position, level)
    const distance = current && price !== null ? (level / price - 1) * 100 : null
    return { price: level, atLevel,
      distance: distance !== null && Number.isFinite(distance) ? distance : null,
      reached: current && price !== null ? (kind === 'target' ? price >= level : price <= level) : null }
  }
  return { current, breakEvenChange: breakEvenChange !== null && Number.isFinite(breakEvenChange) ? breakEvenChange : null,
    target: threshold('target', position.targetPrice), stop: threshold('stop', position.stopPrice) }
}
