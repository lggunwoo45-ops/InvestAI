import type { Language } from '@/i18n/translations'
import type { MarketInstrument } from '@/types/market'
import type { SimpleCandidate, SimpleCandidateDataQuality } from '@/types/simpleMode'
import type { StockWatchCandidate, WatchCandidate } from '@/types/watchCandidate'
import { buildPlanningReference, unavailablePlanningReference } from './planningReferenceEngine'

export interface SimpleCandidateEngineInput {
  cryptoCandidates: readonly WatchCandidate[]
  koreaStockCandidates: readonly StockWatchCandidate[]
  usStockCandidates: readonly StockWatchCandidate[]
  marketInstruments: readonly MarketInstrument[]
  language: Language
  maxCandidates?: number
  cryptoDataQuality?: SimpleCandidateDataQuality
}

const stockPlanningReason = {
  en: 'Price planning is disabled for this stock candidate because real stock data is not connected yet.',
  ko: '실제 주식 데이터가 아직 연결되지 않아 이 주식 후보의 가격 계획은 비활성화되어 있습니다.',
} as const

const unique = (values: readonly string[]) => [...new Set(values.filter(Boolean))]

function evidencePoints(candidate: WatchCandidate) {
  const positive = candidate.evidence.filter((item) => item.status === 'positive').map((item) => item.summary)
  return unique(positive.length ? positive : candidate.nextWatchPoints).slice(0, 3)
}

function riskPoints(candidate: WatchCandidate) {
  return unique([candidate.riskSummary, candidate.invalidationSummary]).slice(0, 2)
}

/** Pure candidate adapter. It never fetches data, invokes a model, or creates missing instruments. */
export function buildSimpleCandidates(input: SimpleCandidateEngineInput): readonly SimpleCandidate[] {
  const instruments = new Map(input.marketInstruments.map((instrument) => [instrument.id, instrument]))
  const cryptoQuality = input.cryptoDataQuality ?? 'live'
  const crypto = input.cryptoCandidates.flatMap((candidate): SimpleCandidate[] => {
    const instrument = instruments.get(candidate.instrumentId)
    if (!instrument) return []
    const quality: SimpleCandidateDataQuality = Number.isFinite(instrument.lastPrice) ? cryptoQuality : 'unavailable'
    return [{
      id: `simple-${candidate.id}`, instrumentId: candidate.instrumentId, symbol: candidate.symbol, name: candidate.name, assetType: 'crypto', region: instrument.quoteCurrency,
      score: candidate.watchScore, horizon: candidate.horizon, dataQuality: quality,
      dataQualityNote: input.language === 'ko' ? (quality === 'live' ? '공개 시장 데이터 기반' : quality === 'mock' ? '모의 시장 데이터 기반' : '가격 데이터 미지원') : (quality === 'live' ? 'Public market data' : quality === 'mock' ? 'Mock market data' : 'Price data unavailable'),
      simpleReason: candidate.watchReason, goodPoints: evidencePoints(candidate), riskPoints: riskPoints(candidate),
      planningReference: buildPlanningReference({ instrument, horizon: candidate.horizon, language: input.language }), sourceCandidateId: candidate.id,
    }]
  })
  const mapStocks = (candidates: readonly StockWatchCandidate[]) => candidates.flatMap((candidate): SimpleCandidate[] => {
    if (!instruments.has(candidate.instrumentId)) return []
    const canPlan = candidate.dataQuality === 'live'
    return [{
      id: `simple-${candidate.id}`, instrumentId: candidate.instrumentId, symbol: candidate.symbol, name: candidate.name, assetType: 'stock', region: candidate.region === 'korea' ? 'KOSPI / KOSDAQ' : 'NASDAQ / NYSE',
      score: candidate.watchScore, horizon: candidate.horizon, dataQuality: candidate.dataQuality, dataQualityNote: candidate.dataQualityNote,
      simpleReason: candidate.watchReason, goodPoints: evidencePoints(candidate), riskPoints: riskPoints(candidate),
      planningReference: canPlan ? buildPlanningReference({ instrument: instruments.get(candidate.instrumentId)!, horizon: candidate.horizon, language: input.language }) : unavailablePlanningReference(stockPlanningReason[input.language]), sourceCandidateId: candidate.id,
    }]
  })
  const koreaStocks = mapStocks(input.koreaStockCandidates)
  const usStocks = mapStocks(input.usStockCandidates)
  const limit = Math.min(10, Math.max(1, Math.trunc(input.maxCandidates ?? 5)))
  const cryptoLeadCount = Math.min(crypto.length, Math.max(1, limit - Number(koreaStocks.length > 0) - Number(usStocks.length > 0)))
  const featured = [...crypto.slice(0, cryptoLeadCount), ...koreaStocks.slice(0, 1), ...usStocks.slice(0, 1)]
  const featuredIds = new Set(featured.map((candidate) => candidate.id))
  const remaining = [...crypto, ...koreaStocks, ...usStocks].filter((candidate) => !featuredIds.has(candidate.id))
  return [...featured, ...remaining].slice(0, limit)
}
