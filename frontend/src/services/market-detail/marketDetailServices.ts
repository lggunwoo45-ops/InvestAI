import type { ChartProvider } from './contracts/ChartProvider'
import type { OrderbookProvider } from './contracts/OrderbookProvider'
import type { TradeProvider } from './contracts/TradeProvider'
import { mockChartProvider } from './mock/MockChartProvider'
import { mockOrderbookProvider } from './mock/MockOrderbookProvider'
import { mockTradeProvider } from './mock/MockTradeProvider'

export interface MarketDetailServices {
  chartProvider: ChartProvider
  orderbookProvider: OrderbookProvider
  tradeProvider: TradeProvider
}

/** Composition root: replace these mocks with live adapters without touching UI code. */
export const marketDetailServices: MarketDetailServices = {
  chartProvider: mockChartProvider,
  orderbookProvider: mockOrderbookProvider,
  tradeProvider: mockTradeProvider,
}
