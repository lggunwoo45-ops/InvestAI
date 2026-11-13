import type { Candle, ChartTimeframe } from '@/types/marketDetail'
export const movingAveragePeriods = [5, 20, 60] as const
const intervalMs: Record<ChartTimeframe, number> = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1H': 3_600_000, '4H': 14_400_000, '1D': 86_400_000 }
/** Closed candles only. A missing/invalid bar breaks the window rather than joining unrelated periods. */
export function movingAverageSeries(candles: readonly Candle[], period: number, timeframe: ChartTimeframe, now = Date.now()) {
  if (!Number.isInteger(period) || period < 1) return []
  const result: { time: number; value?: number }[] = [], window: number[] = []
  let lastTime: number | null = null, sum = 0
  const ordered = [...new Map(candles.filter(c => Number.isFinite(c.timestamp)).map(c => [c.timestamp, c])).values()].sort((a, b) => a.timestamp - b.timestamp)
  for (const candle of ordered) {
    if (candle.timestamp + intervalMs[timeframe] > now) break
    const valid = Number.isFinite(candle.close) && candle.close > 0
    if (!valid) { window.length = 0; sum = 0; lastTime = null; result.push({ time: Math.floor(candle.timestamp / 1000) }); continue }
    if (lastTime !== null && candle.timestamp - lastTime !== intervalMs[timeframe]) { window.length = 0; sum = 0; result.push({ time: Math.floor((lastTime + intervalMs[timeframe]) / 1000) }) }
    lastTime = candle.timestamp
    window.push(candle.close); sum += candle.close
    if (window.length > period) sum -= window.shift()!
    if (window.length === period) result.push({ time: Math.floor(candle.timestamp / 1000), value: sum / period })
  }
  return result
}
