import { buildCryptoDecision } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { opportunityNow, opportunityResult, opportunitySeries } from './opportunityFixtures'

/** Reflect the existing observed breakout tape into a bearish breakdown tape. */
export function futuresResult() {
  const series = opportunitySeries(false)
  for (const frame of Object.values(series)) {
    frame.candles = frame.candles.map(bar => ({ ...bar, open:200 - bar.open, close:200 - bar.close, high:200 - bar.low, low:200 - bar.high }))
    frame.currentPrice = 200 - frame.currentPrice!
  }
  const row = opportunityResult(false)
  return { ...row, instrument:{ ...row.instrument, id:'binance-futures-solusdt', marketId:'binance-futures' as const, quoteCurrency:'USDT', symbol:'SOL/USDT', lastPrice:series['1H'].currentPrice! }, decision:buildCryptoDecision(series, opportunityNow) }
}
