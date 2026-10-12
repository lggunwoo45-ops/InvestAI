import type { AiCopilotFinalReadEvidence } from '@/services/aiCopilot/aiCopilotFinalRead'
import { chartTimeframes, type ChartTimeframe } from '@/types/marketDetail'
import type { MarketDataMode } from '@/types/market'

/** Actual evidence captured at confirmation; never reconstructed for old reviews. */
export interface AnalysisChangeEvidence {
  instrumentId: string
  market: string
  exchange: string
  quoteCurrency: string
  timeframe: ChartTimeframe
  source: MarketDataMode
  observedAt?: string
  stale: boolean
  technicalTrend?: AiCopilotFinalReadEvidence['technicalTrend']
  momentumState?: AiCopilotFinalReadEvidence['momentumState']
  volumeState?: AiCopilotFinalReadEvidence['volumeState']
  dataQuality?: AiCopilotFinalReadEvidence['dataQuality']
}

export function sanitizeAnalysisEvidence(value: unknown): AnalysisChangeEvidence | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const entry = value as Record<string, unknown>
  if (!['instrumentId', 'market', 'exchange', 'quoteCurrency'].every(key => typeof entry[key] === 'string' && entry[key] !== '')
    || !chartTimeframes.includes(entry.timeframe as ChartTimeframe)
    || !['live', 'mock'].includes(String(entry.source)) || typeof entry.stale !== 'boolean') return undefined
  const evidence: AnalysisChangeEvidence = {
    instrumentId: entry.instrumentId as string, market: entry.market as string,
    exchange: entry.exchange as string, quoteCurrency: entry.quoteCurrency as string,
    timeframe: entry.timeframe as ChartTimeframe, source: entry.source as MarketDataMode, stale: entry.stale,
  }
  if (typeof entry.observedAt === 'string' && Number.isFinite(Date.parse(entry.observedAt))) evidence.observedAt = entry.observedAt
  if (['upward', 'neutral', 'downward', 'unavailable'].includes(String(entry.technicalTrend))) evidence.technicalTrend = entry.technicalTrend as AnalysisChangeEvidence['technicalTrend']
  if (['strongPositive', 'positive', 'neutral', 'negative', 'strongNegative', 'unavailable'].includes(String(entry.momentumState))) evidence.momentumState = entry.momentumState as AnalysisChangeEvidence['momentumState']
  if (['elevated', 'normal', 'low', 'unavailable'].includes(String(entry.volumeState))) evidence.volumeState = entry.volumeState as AnalysisChangeEvidence['volumeState']
  if (['live', 'mock', 'limited', 'unavailable'].includes(String(entry.dataQuality))) evidence.dataQuality = entry.dataQuality as AnalysisChangeEvidence['dataQuality']
  return evidence
}
