import type { Candle } from '@/types/marketDetail'
import type { MarketInstrument } from '@/types/market'
import type { DailyHistory } from '@/services/market/providers/dailyHistory'
export const supportNow = Date.parse('2026-11-12T12:00:00Z')
export const supportInstrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', quoteCurrency: 'KRW', name: 'Bitcoin', lastPrice: 100, change24hPercent: -1, volume24h: 100 }
export function supportHistory(now = supportNow): DailyHistory {
  const end = Math.floor(now / 86_400_000) * 86_400_000
  const candles: Candle[] = Array.from({ length: 400 }, (_, i) => {
    const nearest = Math.min(...[30, 100, 170, 240, 310].map(v => Math.abs(i - v)))
    const close = nearest <= 10 ? 90 + nearest * 2 : i === 380 ? 98 : 110
    return { timestamp: end - (400 - i) * 86_400_000, open: close, close, low: nearest === 0 ? 82 : close - 2, high: close + 2, volume: 100 }
  })
  return { instrumentId: supportInstrument.id, marketId: supportInstrument.marketId, currency: 'KRW', fetchedAt: now, candles }
}
