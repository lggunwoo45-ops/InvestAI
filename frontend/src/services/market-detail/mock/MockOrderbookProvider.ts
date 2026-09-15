import type { OrderbookProvider } from '@/services/market-detail/contracts/OrderbookProvider'
import { createRandom, createSeed, priceStep, roundToStep } from './mockDataUtils'

export const mockOrderbookProvider: OrderbookProvider = {
  async getOrderbook(instrument) {
    const random = createRandom(createSeed(`${instrument.id}-orderbook`))
    const step = priceStep(instrument)
    const buildLevel = (offset: number, direction: 1 | -1) => {
      const price = roundToStep(instrument.lastPrice + step * offset * direction, step)
      const amount = Number((0.08 + random() * 4.5).toFixed(4))
      return { price, amount, total: price * amount }
    }

    return {
      symbolId: instrument.id,
      asks: Array.from({ length: 10 }, (_, index) => buildLevel(10 - index, 1)),
      bids: Array.from({ length: 10 }, (_, index) => buildLevel(index + 1, -1)),
      spread: step * 2,
    }
  },
}
