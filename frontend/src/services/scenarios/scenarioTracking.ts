import { readFrame, type AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { eventKinds, type Scenario, type ScenarioEventKind } from './scenarioStorage'

export interface ScenarioObservation {
  revision: string
  at: number
  price: number | null
  state: 'waiting' | 'entry' | 'target' | 'stop' | 'unavailable'
  weakened: boolean | null
  issue: 'connection' | 'stale' | 'trades' | null
}

export function observeScenario(s: Scenario, series: AnalysisSeries, now: number): ScenarioObservation {
  // Orderbook receipt times are not price timestamps. Require a recent execution,
  // never the persisted/catalog price, before claiming a threshold was reached.
  const trade = [...(series.recentTrades ?? [])].filter(t => Number.isFinite(t.price) && t.price > 0 && Number.isFinite(t.timestamp)
    && t.timestamp > 0 && t.timestamp <= now && now - t.timestamp <= 90_000).sort((a, b) => b.timestamp - a.timestamp)[0]
  const fresh = series.dataQuality === 'live' && series.connectionStatus === 'live' && typeof series.updatedAt === 'number'
    && series.updatedAt <= now && now - series.updatedAt <= 90_000 && !!trade
  const price = fresh ? trade.price : null
  const frame = readFrame(s.baseline.frame, series, now)
  const state = price === null ? 'unavailable' : price <= s.stop ? 'stop' : price >= s.target ? 'target'
    : price >= s.entry[0] && price <= s.entry[1] ? 'entry' : 'waiting'
  // Compare only a newer completed reference candle, never an unfinished bar or a different timeframe.
  const weakened = !fresh || frame.issue ? null : s.baseline.frameDirection === 'buy' && frame.asOf! > s.baseline.frameAsOf && frame.direction !== 'buy'
  const issue = price !== null ? null : series.dataQuality !== 'live' || series.connectionStatus !== 'live' ? 'connection' : !trade ? 'trades' : 'stale'
  return { revision: s.revision, at: now, price, state, weakened, issue }
}

/** First connection and recovery establish a baseline; missed intervals never fabricate crossings. */
export function scenarioTransitions(previous: ScenarioObservation | null, current: ScenarioObservation): ScenarioEventKind[] {
  if (!previous || previous.revision !== current.revision || previous.price === null || current.price === null
    || current.at < previous.at || current.at - previous.at > 15_000) return []
  return eventKinds.filter(kind => kind === 'weakened'
    ? previous.weakened === false && current.weakened === true
    : current.state === kind && previous.state !== kind)
}
