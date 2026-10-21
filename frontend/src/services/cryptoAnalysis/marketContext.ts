import type { MarketInstrument } from '@/types/market'
import type { DominanceRead } from './dominanceService'
import { seriesMarketTime, tradeFlow, type AnalysisFrame, type AnalysisSeries, type CryptoDecision } from './cryptoDecisionEngine'

export interface DecisionContext {
  flow: 'buy' | 'sell' | 'neutral' | 'unavailable'
  flowSample: ReturnType<typeof tradeFlow>
  flowStale: boolean
  flowLastAt: number | null
  validUntil: number | null
  dominanceDelta: number | null
  cautions: ('selling' | 'altWeakness')[]
}
/** Context may withhold an entry, never manufacture a trend, price target or probability. */
export function withMarketContext(decision: CryptoDecision, series: Record<AnalysisFrame, AnalysisSeries>, instrument: Pick<MarketInstrument, 'symbol' | 'quoteCurrency'>, dominance: DominanceRead | null, now: number): CryptoDecision {
  const live = Object.values(series).filter(s => s.dataQuality === 'live' && s.connectionStatus === 'live' && s.updatedAt != null && s.updatedAt <= now + 60_000 && now - s.updatedAt <= 90_000)
  // Use the most recently received tape, not the most favorable tape.
  const tape = live.filter(s => s.recentTrades?.length).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0]
  const marketNow = tape ? seriesMarketTime(tape, now) : now
  const flowSample = tradeFlow(tape?.recentTrades ?? [], marketNow)
  const flow = flowSample.direction
  const flowLastAt = (tape?.recentTrades ?? []).map(t => t.timestamp).filter(at => Number.isFinite(at) && at > 0 && at <= marketNow + 5000).sort((a, b) => b - a)[0] ?? null
  const point = dominance?.point, previous = dominance?.previous
  const validPoint = point && Number.isFinite(point.percent) && point.percent > 0 && point.percent <= 100 && Number.isFinite(point.at) && point.at <= now + 60_000 && now - point.at <= 3_600_000
  const validPrevious = validPoint && previous && Number.isFinite(previous.percent) && previous.percent > 0 && previous.percent <= 100 && Number.isFinite(previous.at) && point.at - previous.at >= 1_800_000 && point.at - previous.at <= 93_600_000
  const dominanceDelta = validPrevious ? point.percent - previous.percent : null
  const cautions: DecisionContext['cautions'] = []
  if (decision.direction !== 'unavailable') {
    if (flow === 'sell') cautions.push('selling')
    if (!['BTC', `BTC/${instrument.quoteCurrency}`, `BTC${instrument.quoteCurrency}`].includes(instrument.symbol.toUpperCase()) && dominanceDelta !== null && dominanceDelta >= 0.15) cautions.push('altWeakness')
  }
  const deadlines = [
    ...(flow !== 'unavailable' && flowSample.to !== null ? [now + 60_000 - Math.max(0, marketNow - flowSample.to)] : []),
    ...(dominanceDelta !== null && point ? [point.at + 3_600_000] : []),
  ]
  const validUntil = deadlines.length ? Math.min(...deadlines) : null
  return { ...decision, context: { flow, flowSample, flowLastAt, flowStale: flowLastAt !== null && marketNow - flowLastAt > 60_000, dominanceDelta, cautions, validUntil }, action: decision.action === 'entry' && cautions.length ? 'wait' : decision.action }
}
export function contextExplanation(context: DecisionContext | undefined, ko: boolean): string {
  if (!context?.cautions.length) return ''
  return context.cautions.map(reason => reason === 'selling'
    ? ko ? '최근 큰 체결에서 매도 쪽이 더 강해요.' : 'Recent larger executions lean toward selling.'
    : ko ? 'BTC 비중이 늘어 알트코인이 상대적으로 약할 수 있어요.' : 'Rising BTC share may signal relative altcoin weakness.').join(' ')
}
