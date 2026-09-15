import type { TradingMode } from '@/types/platform'

export interface OrderDraft {
  accountId: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
}

export interface TradingService {
  readonly mode: TradingMode
  validateOrder(order: OrderDraft): Promise<readonly string[]>
  /** A future implementation must enforce server-side approval and risk policy. */
  submitOrder(order: OrderDraft): Promise<{ orderId: string }>
}
