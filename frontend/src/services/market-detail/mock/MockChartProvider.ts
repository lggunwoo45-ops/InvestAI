import type { ChartProvider } from '@/services/market-detail/contracts/ChartProvider'
import type { ChartTimeframe, Candle } from '@/types/marketDetail'
import { createRandom, createSeed, priceStep, roundToStep } from './mockDataUtils'

const timeframeMinutes: Record<ChartTimeframe, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '1H': 60,
  '4H': 240,
  '1D': 1440,
}

export const mockChartProvider: ChartProvider = {
  async getCandles(instrument, timeframe) {
    const random = createRandom(createSeed(`${instrument.id}-${timeframe}`))
    const step = priceStep(instrument)
    const interval = timeframeMinutes[timeframe] * 60_000
    const startTime = Date.UTC(2026, 8, 13, 12, 0) - interval * 47
    const volatility = instrument.lastPrice * ({ '1m': 0.0012, '5m': 0.002, '15m': 0.0032, '1H': 0.005, '4H': 0.008, '1D': 0.014 }[timeframe])
    const candles: Candle[] = []
    let previousClose = instrument.lastPrice * (0.965 + random() * 0.035)

    for (let index = 0; index < 48; index += 1) {
      const open = previousClose
      const directionalBias = instrument.change24hPercent >= 0 ? 0.13 : -0.13
      const close = open + (random() - 0.5 + directionalBias) * volatility
      const wick = volatility * (0.15 + random() * 0.45)
      const candle: Candle = {
        timestamp: startTime + interval * index,
        open: roundToStep(open, step),
        high: roundToStep(Math.max(open, close) + wick, step),
        low: roundToStep(Math.min(open, close) - wick, step),
        close: roundToStep(close, step),
        volume: instrument.volume24h * (0.008 + random() * 0.03),
      }
      candles.push(candle)
      previousClose = candle.close
    }

    const scale = instrument.lastPrice / (candles.at(-1)?.close ?? instrument.lastPrice)
    return candles.map((candle, index) => ({
      ...candle,
      timestamp: startTime + interval * index,
      open: roundToStep(candle.open * scale, step),
      high: roundToStep(candle.high * scale, step),
      low: roundToStep(candle.low * scale, step),
      close: roundToStep(candle.close * scale, step),
    }))
  },
}
