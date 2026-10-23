import { array, numeric, object, observedFundingInterval, providerNow, sourceData, type ResearchSnapshot } from './researchModel'
export interface FundingComparison { exchange: string; rate: number; hours: number; annualPercent: number; nextAt: number | null; sourceAt: number; quote: string }
export function fundingComparison(snapshot: ResearchSnapshot | null, now: number): FundingComparison[] {
  if (!snapshot) return []
  const rows: FundingComparison[] = []
  const add = (exchange: string, rate: unknown, hours: unknown, next: unknown, sourceAt: unknown, quote = 'USDT', key = '') => {
    const r = numeric(rate), h = numeric(hours), n = numeric(next), t = numeric(sourceAt)
    const clock = key ? providerNow(snapshot, key, now) : now
    if (r === null || h === null || h <= 0 || h > 24 || t === null || clock - t < -5000 || clock - t > 180_000 || (n !== null && (n < clock || n - clock > 86_400_000))) return
    rows.push({ exchange, rate: r, hours: h, annualPercent: r * 100 * 24 / h * 365, nextAt: n, sourceAt: t, quote })
  }
  const mark = object(sourceData(snapshot, 'mark', now))
  add('Binance', mark.lastFundingRate, observedFundingInterval(snapshot, now), mark.nextFundingTime, mark.time, 'USDT', 'mark')
  const bybit = object(sourceData(snapshot, 'bybit', now)), bybitRow = array(object(bybit.result).list).map(object).find(r => r.symbol === snapshot.symbol)
  if (bybitRow) add('Bybit', bybitRow.fundingRate, bybitRow.fundingIntervalHour, bybitRow.nextFundingTime, bybit.time, 'USDT', 'bybit')
  const okx = object(array(object(sourceData(snapshot, 'okx', now)).data)[0])
  if (okx.instId === `${snapshot.asset}-USDT-SWAP`) add('OKX', okx.fundingRate, numeric(okx.nextFundingTime) !== null && numeric(okx.fundingTime) !== null ? (Number(okx.nextFundingTime) - Number(okx.fundingTime)) / 3_600_000 : null, okx.fundingTime, okx.ts, 'USDT', 'okx')
  const bitget = object(sourceData(snapshot, 'bitget', now)), bitgetRow = array(bitget.data).map(object).find(r => r.symbol === snapshot.symbol)
  if (bitgetRow) add('Bitget', bitgetRow.fundingRate, bitgetRow.fundingRateInterval, bitgetRow.nextUpdate, bitget.requestTime, 'USDT', 'bitget')
  const hl = array(sourceData(snapshot, 'hyperliquid', now)), universe = array(object(hl[0]).universe), index = universe.findIndex(r => object(r).name === snapshot.asset)
  if (index >= 0) add('Hyperliquid', object(array(hl[1])[index]).funding, 1, null, snapshot.sources.hyperliquid?.receivedAt, 'USDC')
  return rows.sort((a, b) => a.annualPercent - b.annualPercent)
}
