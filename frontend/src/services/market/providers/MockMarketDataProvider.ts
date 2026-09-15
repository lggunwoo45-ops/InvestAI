import { marketDetailServices } from '@/services/market-detail/marketDetailServices'
import { createRandom, createSeed, priceStep, roundToStep } from '@/services/market-detail/mock/mockDataUtils'
import type { RealtimeMarketProvider } from '@/services/market/contracts/RealtimeMarketProvider'
import type { MarketDetailSnapshot, RecentTrade } from '@/types/marketDetail'
import { applyTrade, createTradeCandle, mergeCandle } from './providerUtils'

export const mockMarketDataProvider: RealtimeMarketProvider = {
  id: 'InvestAI simulator',
  supports: () => true,

  async loadSnapshot(instrument, timeframe) {
    const [candles, orderbook, recentTrades] = await Promise.all([
      marketDetailServices.chartProvider.getCandles(instrument, timeframe),
      marketDetailServices.orderbookProvider.getOrderbook(instrument),
      marketDetailServices.tradeProvider.getRecentTrades(instrument),
    ])
    return { instrument, timeframe, candles, orderbook, recentTrades }
  },

  subscribe(instrument, timeframe, initialSnapshot, onEvent) {
    const random = createRandom(createSeed(`${instrument.id}:${timeframe}:realtime`))
    const step = priceStep(instrument)
    let snapshot: MarketDetailSnapshot = initialSnapshot
    let sequence = 0

    const timer = setInterval(() => {
      sequence += 1
      const previousPrice = snapshot.instrument.lastPrice
      const price = roundToStep(previousPrice + (random() - 0.49) * step * 3, step)
      const amount = Number((0.02 + random() * 1.8).toFixed(4))
      const trade: RecentTrade = {
        id: `${instrument.id}-mock-live-${sequence}`,
        timestamp: Date.now(),
        price,
        amount,
        side: price >= previousPrice ? 'buy' : 'sell',
      }
      snapshot = applyTrade(snapshot, trade)
      const priceDelta = price - previousPrice
      const shiftLevel = (level: MarketDetailSnapshot['orderbook']['asks'][number]) => ({
        ...level,
        price: level.price + priceDelta,
        total: (level.price + priceDelta) * level.amount,
      })
      const asks = snapshot.orderbook.asks.map(shiftLevel)
      const bids = snapshot.orderbook.bids.map(shiftLevel)
      snapshot = {
        ...snapshot,
        candles: mergeCandle(snapshot.candles, createTradeCandle(snapshot, trade)),
        orderbook: {
          ...snapshot.orderbook,
          asks,
          bids,
          spread: (asks.at(-1)?.price ?? price) - (bids[0]?.price ?? price),
        },
      }
      onEvent({ snapshot })
    }, 1_000)

    return () => clearInterval(timer)
  },
}
