import { marketDataService, type MarketStreamOptions } from '@/services/market/marketDataService'
import type { MarketInstrument, MarketVenue } from '@/types/market'
import type { RealtimeMarketState } from '@/types/marketDetail'
import { analysisIntervals, buildCryptoDecision, type AnalysisFrame, type AnalysisSeries, type CryptoDecision } from './cryptoDecisionEngine'

export const SCAN_LIMIT = 12
export const SCAN_VALID_MS = 90_000
export interface ScanResult {
  instrument: MarketInstrument
  decision: CryptoDecision
  analyzedAt: number
  expiresAt: number
  timedOut: boolean
}
export interface ScanCriteria {
  direction: 'all' | 'buy' | 'sell' | 'neutral'
  minimumVolumeRatio: number
  minimumRewardRisk: number
  excludeExtended: boolean
}
const frames = Object.keys(analysisIntervals) as AnalysisFrame[]
const empty = (): AnalysisSeries => ({ candles: [], dataQuality: 'unavailable', currentPrice: null, connectionStatus: 'connecting', updatedAt: null })
const positive = (value: number) => Number.isFinite(value) && value > 0

/** Comparable quote turnover within a single venue; never compare KRW and BTC amounts. */
export function selectScanPool(instruments: readonly MarketInstrument[], venue: MarketVenue): readonly MarketInstrument[] {
  const unique = new Map<string, MarketInstrument>()
  for (const instrument of instruments) {
    const matches = venue.startsWith('upbit-')
      ? instrument.marketId === 'upbit' && instrument.quoteCurrency === venue.slice(6).toUpperCase()
      : (venue === 'binance-spot' || venue === 'binance-futures') && instrument.marketId === venue && instrument.quoteCurrency === 'USDT'
    if (matches && positive(instrument.lastPrice) && positive(instrument.volume24h) && Number.isFinite(instrument.change24hPercent)) unique.set(instrument.id, instrument)
  }
  return [...unique.values()].sort((a, b) => b.volume24h - a.volume24h || a.id.localeCompare(b.id)).slice(0, SCAN_LIMIT)
}

export function matchesScan(result: ScanResult, criteria: ScanCriteria, now: number) {
  const { decision } = result
  if (now < result.analyzedAt || now > result.expiresAt || decision.direction === 'unavailable') return false
  if (criteria.direction !== 'all' && decision.direction !== criteria.direction) return false
  if (criteria.excludeExtended && decision.extended) return false
  // Use the same reference timeframe as the price plan; no cherry-picking a higher volume ratio.
  const reference = decision.frames.find(frame => frame.frame === decision.plan?.frame)
    ?? decision.frames.find(frame => frame.frame === '4H' && !frame.issue) ?? decision.frames.find(frame => !frame.issue)
  if (criteria.minimumVolumeRatio > 0 && (reference?.volumeRatio == null || reference.volumeRatio < criteria.minimumVolumeRatio)) return false
  if (criteria.minimumRewardRisk > 0 && (!decision.plan || decision.plan.rewardRisk < criteria.minimumRewardRisk)) return false
  return true
}

type Subscribe = (options: MarketStreamOptions) => () => void
function asSeries(state: RealtimeMarketState): AnalysisSeries {
  return {
    candles: state.snapshot?.candles ?? [], currentPrice: state.snapshot?.instrument.lastPrice ?? null,
    dataQuality: state.snapshot ? state.connection.effectiveMode === 'live' ? 'live' : 'mock' : 'unavailable',
    connectionStatus: state.connection.status, updatedAt: state.connection.lastUpdatedAt,
    marketTime: state.connection.marketTime,
  }
}

export function inspectInstrument(instrument: MarketInstrument, signal: AbortSignal, {
  subscribe = marketDataService.subscribe.bind(marketDataService), now = Date.now, timeoutMs = 18_000,
}: { subscribe?: Subscribe; now?: () => number; timeoutMs?: number } = {}): Promise<ScanResult | null> {
  return new Promise(resolve => {
    const series = { '1H': empty(), '4H': empty(), '1D': empty() }
    const stops: (() => void)[] = []
    let done = false
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); for (const stop of stops) stop() }
    const finish = (timedOut: boolean, cancelled = false) => {
      if (done) return
      done = true
      cleanup()
      const at = now()
      const decision = buildCryptoDecision(series, at)
      const receipts = decision.frames.filter(frame => !frame.issue).map(frame => series[frame.frame].updatedAt ?? 0)
      const expiresAt = Math.min(at + SCAN_VALID_MS, ...receipts.map(receipt => receipt + SCAN_VALID_MS))
      resolve(cancelled ? null : { instrument, decision, analyzedAt: at, expiresAt, timedOut })
    }
    const abort = () => finish(false, true)
    const timer = setTimeout(() => finish(true), timeoutMs)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) { abort(); return }
    for (const frame of frames) {
      if (done) break
      try {
        const stop = subscribe({ instrument, timeframe: frame, mode: 'live', priority: 1, onState: state => {
          if (done) return
          series[frame] = asSeries(state)
          if (frames.every(key => ['live', 'mock', 'unsupported'].includes(series[key].connectionStatus))) finish(false)
        } })
        if (done) stop()
        else stops.push(stop)
      } catch { finish(true) }
    }
  })
}

/** User-triggered, two instruments at a time, with release on completion/cancel/navigation. */
export async function scanCandidates(instruments: readonly MarketInstrument[], {
  signal, onResult, inspect = inspectInstrument,
}: { signal: AbortSignal; onResult: (result: ScanResult, completed: number, total: number) => void; inspect?: typeof inspectInstrument }) {
  const pool = instruments.slice(0, SCAN_LIMIT)
  let cursor = 0, completed = 0
  const worker = async () => {
    while (!signal.aborted) {
      const instrument = pool[cursor++]
      if (!instrument) return
      const result = await inspect(instrument, signal)
      if (result && !signal.aborted) onResult(result, ++completed, pool.length)
    }
  }
  await Promise.all([worker(), worker()])
}
