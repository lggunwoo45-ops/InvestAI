import { researchBase, type ResearchHistory } from './researchClient'
import { researchAssets } from './researchModel'
import { timeframes } from './signalExplorer'

export interface FundingSettlement { at: number; rate: number; markPrice: number | null }
export interface FundingHistory {
  version: 1; asset: string; source: 'Binance USDⓈ-M'; from: number; to: number; fetchedAt: number; records: FundingSettlement[];
}
export interface FundingImpact { debitLow: number; debitHigh: number; settlements: number; uncertain: number }
const tolerance = 15_000, maxGap = 8 * 3_600_000 + 60_000
export function validFundingHistory(value: unknown): value is FundingHistory {
  if (!value || typeof value !== 'object') return false
  const v = value as FundingHistory
  return v.version === 1 && researchAssets.some(a => a === v.asset) && v.source === 'Binance USDⓈ-M'
    && [v.from, v.to, v.fetchedAt].every(n => Number.isSafeInteger(n) && n >= 0) && v.to > v.from && v.to <= v.fetchedAt && v.to - v.from <= 5001 * 86_400_000
    && Array.isArray(v.records) && v.records.length <= 12000 && v.records.every((r, i) => r && Number.isSafeInteger(r.at) && r.at >= v.from && r.at <= v.to && (i === 0 || r.at > v.records[i - 1].at)
      && Number.isFinite(r.rate) && Math.abs(r.rate) <= 1 && (r.markPrice === null || Number.isFinite(r.markPrice) && r.markPrice > 0))
}
export function fundingQuery(history: ResearchHistory) {
  if (!history.candles[60]) throw new Error('과거 가격 기록을 먼저 불러와주세요.')
  return { from: Math.max(0, history.candles[60].timestamp - 9 * 3_600_000), to: Math.min(history.asOf, history.candles.at(-1)!.timestamp + timeframes[history.timeframe] + 9 * 3_600_000) }
}
export async function fetchFundingSettlements(history: ResearchHistory, signal?: AbortSignal): Promise<FundingHistory> {
  const { from, to } = fundingQuery(history)
  const query = new URLSearchParams({ asset: history.asset, from: String(from), to: String(to) })
  const response = await fetch(`${researchBase()}/funding-settlements?${query}`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(90_000)]) : AbortSignal.timeout(90_000), credentials: 'omit', redirect: 'error' })
  if (!response.ok) throw new Error(response.status === 422 ? '정산 기록이 너무 많아요. 가격 조회 범위를 줄여 다시 실행해주세요.' : response.status === 429 ? '거래소 조회가 많아요. 5분 뒤 다시 실행해주세요.' : '정산 기록을 불러오지 못했어요. 비용을 0으로 처리하지 않았습니다. 잠시 후 다시 실행해주세요.')
  const value: unknown = await response.json()
  if (!validFundingHistory(value) || value.asset !== history.asset || value.from !== from || value.to !== to) throw new Error('정산 기록의 종목·기간·가격을 확인할 수 없어요. 다시 실행해주세요.')
  return value
}

/** Public records, not an account statement. Positive = paid; negative = received (% of filled entry notional).
 * Require bracketing settlements and reject long gaps. Endpoint completion is not proof of provider completeness.
 * Entry/exit ±15s and an intrabar exit produce conservative outer bounds, not a fabricated exact charge.
 */
export function fundingImpact(history: FundingHistory, entryAt: number, earliestExit: number, latestExit: number, filledEntry: number, side: 1 | -1): FundingImpact | null {
  const rows = history.records
  const before = rows.findLastIndex(r => r.at < entryAt - tolerance)
  const after = rows.findIndex(r => r.at > latestExit + tolerance)
  if (before < 0 || after < 0) return null
  for (let i = before + 1; i <= after; i++) if (rows[i].at - rows[i - 1].at > maxGap) return null
  let debitLow = 0, debitHigh = 0, settlements = 0, uncertain = 0
  for (const r of rows.slice(before + 1, after)) {
    if (r.at + tolerance < entryAt || r.at - tolerance > latestExit) continue
    if (r.markPrice === null) return null
    const debit = side * r.markPrice / filledEntry * r.rate * 100
    const certain = r.at - tolerance > entryAt && r.at + tolerance < earliestExit
    debitLow += certain ? debit : Math.min(0, debit)
    debitHigh += certain ? debit : Math.max(0, debit)
    settlements++; if (!certain) uncertain++
  }
  return { debitLow, debitHigh, settlements, uncertain }
}

export function cleanFundingHistory(h: FundingHistory): FundingHistory {
  return { version: 1, asset: h.asset, source: h.source, from: h.from, to: h.to, fetchedAt: h.fetchedAt, records: h.records.map(r => ({ at: r.at, rate: r.rate, markPrice: r.markPrice })) }
}
