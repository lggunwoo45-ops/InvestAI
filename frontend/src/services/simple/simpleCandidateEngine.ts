import type { Language } from '@/i18n/translations'
import type { MarketInstrument } from '@/types/market'
import type { SimpleAttentionBand, SimpleCandidate, SimpleCandidateDataQuality } from '@/types/simpleMode'
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

const wording = {
  en: {
    volume: 'Trading activity is relatively active compared with nearby candidates.', momentum: 'Recent movement is strong enough to review, but it still needs confirmation.', news: 'Related news context exists, but it should be checked with the original source.', fallback: 'The rule-based evidence placed this item in the review list.',
    continue: 'Check whether the move continues before making any decision.', volatile: 'Price movement is wider than usual, so review both opportunity and risk.', stockReason: 'This is an early-beta stock workflow item. Use it to review the workflow, not as a live stock call.', stockCheck: 'Check the data-quality label and review detailed evidence in Expert Mode.', stockCaution: 'Data quality is limited. Stock price planning is disabled until reliable data is connected.',
  },
  ko: {
    volume: '비슷한 후보들보다 거래 활동이 비교적 활발합니다.', momentum: '최근 움직임이 있어 확인 대상이지만, 추가 확인이 필요합니다.', news: '관련 뉴스 흐름이 있으나 원문 기준 확인이 필요합니다.', fallback: '규칙 기반 근거에 따라 검토 목록에 포함되었습니다.',
    continue: '판단 전 움직임이 이어지는지 확인해야 합니다.', volatile: '가격 움직임이 커져 기회와 위험을 함께 확인해야 합니다.', stockReason: '초기 베타 주식 흐름 확인용 후보입니다. 실시간 주식 판단으로 사용하지 마세요.', stockCheck: '데이터 품질 표시를 확인하고 전문모드에서 상세 근거를 검토하세요.', stockCaution: '데이터 품질이 제한적입니다. 신뢰 가능한 데이터 연결 전까지 주식 가격 계획은 비활성화됩니다.',
  },
} as const

export function scoreToAttentionBand(score: number): SimpleAttentionBand {
  return score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low'
}

function mappedEvidence(candidate: WatchCandidate, language: Language) {
  const t = wording[language]
  const positive = new Set(candidate.evidence.filter((item) => item.status === 'positive').map((item) => item.type))
  return unique([positive.has('volume') || positive.has('liquidity') ? t.volume : '', positive.has('momentum') ? t.momentum : '', positive.has('news') ? t.news : ''])
}

function candidateCopy(candidate: WatchCandidate, language: Language, stock = false) {
  const t = wording[language]
  if (stock) return { reason: t.stockReason, checks: [t.stockCheck], cautions: [t.stockCaution] }
  const checks = mappedEvidence(candidate, language)
  const volatile = candidate.evidence.some((item) => item.type === 'risk' && item.status === 'risk')
  return { reason: checks[0] ?? t.fallback, checks: checks.length ? checks : [t.fallback], cautions: [volatile ? t.volatile : t.continue] }
}

/** Pure candidate adapter. It never fetches data, invokes a model, or creates missing instruments. */
export function buildSimpleCandidates(input: SimpleCandidateEngineInput): readonly SimpleCandidate[] {
  const instruments = new Map(input.marketInstruments.map((instrument) => [instrument.id, instrument]))
  const cryptoQuality = input.cryptoDataQuality ?? 'unavailable'
  const crypto = input.cryptoCandidates.flatMap((candidate): SimpleCandidate[] => {
    const instrument = instruments.get(candidate.instrumentId)
    if (!instrument) return []
    const quality: SimpleCandidateDataQuality = Number.isFinite(instrument.lastPrice) && instrument.lastPrice > 0 ? cryptoQuality : 'unavailable'
    const mapped = candidateCopy(candidate, input.language)
    return [{
      id: `simple-${candidate.id}`, instrumentId: candidate.instrumentId, symbol: candidate.symbol, name: candidate.name, assetType: 'crypto', region: instrument.quoteCurrency,
      score: candidate.watchScore, horizon: candidate.horizon, dataQuality: quality,
      dataQualityNote: input.language === 'ko' ? (quality === 'live' ? '공개 시장 데이터 기반' : quality === 'mock' ? '모의 시장 데이터 기반' : '가격 데이터 미지원') : (quality === 'live' ? 'Public market data' : quality === 'mock' ? 'Mock market data' : 'Price data unavailable'),
      simpleReason: mapped.reason, goodPoints: mapped.checks, riskPoints: mapped.cautions,
      planningReference: buildPlanningReference({ instrument, horizon: candidate.horizon, language: input.language }), sourceCandidateId: candidate.id,
    }]
  })
  const mapStocks = (candidates: readonly StockWatchCandidate[]) => candidates.flatMap((candidate): SimpleCandidate[] => {
    if (!instruments.has(candidate.instrumentId)) return []
    const canPlan = candidate.dataQuality === 'live'
    const mapped = candidateCopy(candidate, input.language, true)
    return [{
      id: `simple-${candidate.id}`, instrumentId: candidate.instrumentId, symbol: candidate.symbol, name: candidate.name, assetType: 'stock', region: candidate.region === 'korea' ? 'KOSPI / KOSDAQ' : 'NASDAQ / NYSE',
      score: candidate.watchScore, horizon: candidate.horizon, dataQuality: candidate.dataQuality, dataQualityNote: candidate.dataQualityNote,
      simpleReason: mapped.reason, goodPoints: mapped.checks, riskPoints: mapped.cautions,
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
