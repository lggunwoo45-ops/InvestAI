import type { Candle } from '@/types/marketDetail'
export interface PricePlanInput { entry: number; quantity: number; stop: number; target: number; feePercent: number }
export function calculatePurchasePlan(input: PricePlanInput) {
  const { entry, quantity, stop, target, feePercent } = input
  if (![entry, quantity, stop, target].every(n => Number.isFinite(n) && n > 0) || !Number.isFinite(feePercent) || feePercent < 0 || feePercent > 5 || !(stop < entry && entry < target)) throw new Error('invalid-plan')
  const fee = feePercent / 100
  const cost = entry * quantity * (1 + fee)
  const loss = cost - stop * quantity * (1 - fee)
  const gain = target * quantity * (1 - fee) - cost
  if (![cost, loss, gain].every(Number.isFinite) || cost <= 0 || loss <= 0) throw new Error('invalid-plan')
  return { cost, loss, gain, rewardRisk: gain / loss }
}
export interface BacktestTrade { entryAt: number; exitAt: number; entry: number; exit: number; pnl: number }
export interface BacktestResult { starting: number; equity: number; returnPercent: number; buyHoldPercent: number; drawdownPercent: number; trades: BacktestTrade[]; from: number; to: number; bars: number; feePercent: number; slippagePercent: number }
/** Daily, long/cash only. Signals at close; fills at NEXT open. Final liquidation is disclosed. */
export function runDailyBacktest(candles: readonly Candle[], now: number, starting: number, feePercent: number, slippagePercent = 0.1): BacktestResult {
  if (!Number.isFinite(now) || !Number.isFinite(starting) || starting <= 0 || starting > 1e12 || ![feePercent, slippagePercent].every(v => Number.isFinite(v) && v >= 0 && v <= 5)) throw new Error('invalid-settings')
  const day = 86_400_000
  const bars = candles.filter(c => Number.isFinite(c.timestamp) && c.timestamp > 0 && c.timestamp + day <= now).slice(-300)
  if (bars.length < 80 || bars.some((c, i) => ![c.open, c.high, c.low, c.close].every(v => Number.isFinite(v) && v > 0) || !Number.isFinite(c.volume) || c.volume < 0 || c.high < Math.max(c.open, c.close, c.low) || c.low > Math.min(c.open, c.close, c.high) || (i > 0 && c.timestamp - bars[i - 1].timestamp !== day))) throw new Error('insufficient-contiguous-bars')
  const fee = feePercent / 100, slip = slippagePercent / 100
  let cash = starting, units = 0, entry = 0, entryAt = 0, entryCost = 0, peak = starting, drawdown = 0
  const trades: BacktestTrade[] = []
  const exit = (rawPrice: number, at: number) => {
    const price = rawPrice * (1 - slip), proceeds = units * price * (1 - fee)
    cash = proceeds
    trades.push({ entryAt, exitAt: at, entry, exit: price, pnl: proceeds - entryCost })
    units = 0
  }
  for (let i = 50; i < bars.length; i++) {
    const previous = bars.slice(i - 50, i)
    const slow = previous.reduce((s, c) => s + c.close, 0) / 50
    const fast = previous.slice(-20).reduce((s, c) => s + c.close, 0) / 20
    const wantsLong = fast > slow
    if (!units && wantsLong) {
      entry = bars[i].open * (1 + slip); entryAt = bars[i].timestamp; entryCost = cash
      units = cash / (entry * (1 + fee)); cash = 0
    } else if (units && !wantsLong) exit(bars[i].open, bars[i].timestamp)
    const equity = units ? units * bars[i].close * (1 - slip) * (1 - fee) : cash
    peak = Math.max(peak, equity); drawdown = Math.max(drawdown, (peak - equity) / peak)
  }
  if (units) exit(bars.at(-1)!.close, bars.at(-1)!.timestamp + day)
  const hold = starting / (bars[50].open * (1 + slip) * (1 + fee)) * bars.at(-1)!.close * (1 - slip) * (1 - fee)
  if (![cash, hold, drawdown].every(Number.isFinite)) throw new Error('invalid-result')
  return { starting, equity: cash, returnPercent: (cash / starting - 1) * 100, buyHoldPercent: (hold / starting - 1) * 100, drawdownPercent: drawdown * 100, trades, from: bars[50].timestamp, to: bars.at(-1)!.timestamp + day, bars: bars.length, feePercent, slippagePercent }
}
