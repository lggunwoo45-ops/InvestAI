import type { TradeProvider } from '@/services/market-detail/contracts/TradeProvider'
import { createRandom, createSeed, priceStep, roundToStep } from './mockDataUtils'

export const mockTradeProvider: TradeProvider = {
  async getRecentTrades(instrument) {
    const random = createRandom(createSeed(`${instrument.id}-trades`))
    const step = priceStep(instrument)
    const baseTime = Date.UTC(2026, 8, 13, 12, 0)

    return Array.from({ length: 14 }, (_, index) => ({
      id: `${instrument.id}-trade-${index}`,
      timestamp: baseTime - index * (8_000 + Math.floor(random() * 13_000)),
      price: roundToStep(instrument.lastPrice + (random() - 0.5) * step * 8, step),
      amount: Number((0.01 + random() * 2.4).toFixed(4)),
      side: random() >= 0.48 ? 'buy' as const : 'sell' as const,
    }))
  },
}
