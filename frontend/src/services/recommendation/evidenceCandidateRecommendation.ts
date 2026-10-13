import type { Language } from '@/i18n/translations'
import type { BitcoinMarketAnchor } from '@/services/marketAnchor/bitcoinMarketAnchor'
import { buildAiCopilotFinalRead, type AiCopilotFinalReadEvidence, type AiCopilotFinalReadEvidenceItem, type BuildAiCopilotFinalReadEvidenceInput, buildAiCopilotFinalReadEvidence } from '@/services/aiCopilot/aiCopilotFinalRead'

export type RecommendationState = 'approachReviewPossible' | 'keepWatching' | 'extendedCaution' | 'wait' | 'held' | 'excluded' | 'notEnoughData' | 'changeCheckNeeded' | 'holdingBasisReview'
export interface EvidenceCandidateRecommendation {
  instrumentId: string
  symbol: string
  displayName: string
  marketType: string
  provider?: string
  quote?: string
  reviewScore?: number
  recommendationState: RecommendationState
  title: string
  summary: string
  why: string
  nextCheck: string
  evidenceFactors: readonly AiCopilotFinalReadEvidenceItem[]
  exclusionReasons: readonly string[]
  dataQuality: AiCopilotFinalReadEvidence['dataQuality']
  updatedAt: string | null
}
export interface RecommendationInput extends BuildAiCopilotFinalReadEvidenceInput {
  language: Language
  updatedAt?: string | null
}

const labels = {
  en: { approachReviewPossible: 'Approach review possible', keepWatching: 'Keep watching', extendedCaution: 'Already extended', wait: 'Wait for now', held: 'Held', excluded: 'Excluded', notEnoughData: 'Not enough data', changeCheckNeeded: 'Change check needed', holdingBasisReview: 'Re-check holding basis' },
  ko: { approachReviewPossible: '접근 검토 가능', keepWatching: '관심 유지', extendedCaution: '이미 움직임 큼', wait: '관망', held: '보류', excluded: '추천 제외', notEnoughData: '데이터 부족', changeCheckNeeded: '변화 확인 필요', holdingBasisReview: '보유 기준 재확인' },
} as const

export function recommendationAnchorContext(anchor: BitcoinMarketAnchor | null): AiCopilotFinalReadEvidence['btcAnchorState'] {
  if (!anchor || anchor.status === 'unavailable' || anchor.change24hPercent === null) return 'unavailable'
  if (Math.abs(anchor.change24hPercent) >= 5) return 'volatilityWatch'
  return anchor.status === 'ready' && Math.abs(anchor.change24hPercent) <= 2 ? 'stable' : 'mixed'
}

/** Reuses Final Read evidence; never fetches data, recalculates a score, or invents candles. */
export function buildEvidenceCandidateRecommendation(input: RecommendationInput): EvidenceCandidateRecommendation {
  const e = buildAiCopilotFinalReadEvidence(input)
  const finalRead = buildAiCopilotFinalRead({ language: input.language, evidence: e, practicalDecision: input.practicalDecision, reviewScore: input.reviewScore })
  const ko = input.language === 'ko'
  const score = e.candidateReviewScore
  const crypto = input.instrument.marketId !== 'korea-stock' && input.instrument.marketId !== 'us-stock'
  const missing: string[] = []
  if (!e.currentPriceAvailable) missing.push(ko ? '현재 가격 확인 필요' : 'Current price missing')
  if (!e.priceSeriesAvailable && !input.technicalAnalysis?.movingAverageContext.available) missing.push(ko ? '캔들·이동평균 근거 부족' : 'Candle / moving-average evidence missing')
  if (e.volumeState === 'unavailable') missing.push(ko ? '거래량 확인 필요' : 'Volume evidence missing')
  let state: RecommendationState = finalRead.state
  let reason = finalRead.why
  const exclusions: string[] = []
  if (Number.isFinite(input.instrument.lastPrice) && input.instrument.lastPrice <= 0) exclusions.push(ko ? '유효하지 않은 가격' : 'Invalid price')
  if (e.dataQuality === 'unavailable') exclusions.push(ko ? '데이터 품질 이용 불가' : 'Data quality unavailable')
  if (e.marketCautionState === 'downsidePressure') exclusions.push(ko ? '시장 하방 주의' : 'Market downside pressure')
  // Mock scores are intentionally capped by the existing engine; that cap is not weak live evidence.
  if (e.dataQuality === 'live' && score !== null && score < 25) exclusions.push(ko ? '검토 점수 부족' : 'Review score too low')
  const weak = e.technicalTrend === 'downward' || e.momentumState === 'negative' || e.momentumState === 'strongNegative' || e.volumeState === 'low' || e.supportResistanceState === 'belowSupport'
  const blocked = (crypto && e.btcAnchorState === 'volatilityWatch') || e.marketCautionState === 'volatilityWatch'
  if (exclusions.length) { state = 'excluded'; reason = exclusions.join(' · ') }
  else if (!e.currentPriceAvailable || (e.momentumState === 'unavailable' && !e.priceSeriesAvailable)) { state = 'notEnoughData'; reason = missing.join(' · ') }
  else if (e.changeReviewActive) state = 'changeCheckNeeded'
  else if (e.positionReviewActive) state = 'holdingBasisReview'
  else if (e.priceExtendedFromAverage || (e.recentMovePercent !== null && Math.abs(e.recentMovePercent) >= 8) || e.supportResistanceState === 'aboveResistance' || e.supportResistanceState === 'nearResistance') state = 'extendedCaution'
  else if (blocked) { state = 'held'; reason = ko ? 'BTC 기준 또는 시장 변동성 확인 필요' : 'Bitcoin anchor or market volatility needs confirmation' }
  else if (weak) {
    state = 'wait'
    reason = [e.technicalTrend === 'downward' ? (ko ? '추세 약함' : 'Weak trend') : '', e.momentumState === 'negative' || e.momentumState === 'strongNegative' ? (ko ? '모멘텀 약함' : 'Weak momentum') : '', e.volumeState === 'low' ? (ko ? '거래량 부족' : 'Low volume') : '', e.supportResistanceState === 'belowSupport' ? (ko ? '지지 구조 약화' : 'Weakened support') : ''].filter(Boolean).join(' · ')
  }
  else if (e.dataQuality === 'live' && score !== null && score >= 70 && e.technicalTrend === 'upward' && e.momentumState === 'positive' && e.volumeState !== 'unavailable' && e.supportResistanceState !== 'unavailable' && (!crypto || e.btcAnchorState === 'stable')) state = 'approachReviewPossible'
  else if (e.volumeState !== 'unavailable' && (e.momentumState !== 'unavailable' || e.priceSeriesAvailable)) {
    state = 'keepWatching'
    reason = ko ? '가격 움직임과 거래 활동은 확인되지만 추가 구조 확인이 필요합니다.' : 'Movement and activity are available; further structure confirmation is needed.'
  } else { state = 'notEnoughData'; reason = missing.join(' · ') }
  if (state === 'extendedCaution') reason = ko ? '최근 움직임이 크거나 관측 저항·이동평균에서 가격이 확장되어 있습니다.' : 'Recent movement or observed resistance / moving-average distance is extended.'
  if (state === 'changeCheckNeeded' || state === 'holdingBasisReview') reason = finalRead.why
  if (state === 'approachReviewPossible' && finalRead.state !== state) reason = ko ? '검토 점수·추세·모멘텀·가격 구조가 함께 확인됩니다.' : 'Review score, trend, momentum and price structure align.'
  const nextChecks = ko ? {
    approachReviewPossible: '확인된 추세·거래 활동과 지지 구조가 유지되는지 확인하세요.', keepWatching: '추세·거래량과 지지/저항 구조를 함께 확인하세요.', extendedCaution: '큰 움직임이 안정되고 가격 구조가 유지되는지 확인하세요.', wait: '약한 근거가 개선되는지 확인하세요.', held: reason, excluded: '제외 원인이 해소되고 데이터가 유효한지 확인하세요.', notEnoughData: missing.join(' · '), changeCheckNeeded: '저장된 기준과 현재 근거를 비교하세요.', holdingBasisReview: '처음 기록한 보유 이유와 현재 근거를 비교하세요.',
  } : {
    approachReviewPossible: 'Check whether trend, activity and observed support remain aligned.', keepWatching: 'Review trend, volume and observed support / resistance together.', extendedCaution: 'Check whether movement stabilizes and observed structure holds.', wait: 'Check whether weak evidence improves.', held: reason, excluded: 'Verify valid data and whether exclusion reasons have cleared.', notEnoughData: missing.join(' · '), changeCheckNeeded: 'Compare the saved basis with current evidence.', holdingBasisReview: 'Compare the recorded holding reason with current evidence.',
  }
  const nextCheck = nextChecks[state]
  const qualityNote = e.dataQuality === 'mock' ? (ko ? '모의 데이터 · 실제 시장 근거가 아닙니다.' : 'Mock data · illustrative evidence only.') : e.dataQuality === 'limited' ? (ko ? '제한된 데이터 · 출처와 최신성 확인 필요.' : 'Limited data · verify source and freshness.') : ''
  return { instrumentId: input.instrument.id, symbol: input.instrument.displaySymbol ?? input.instrument.symbol, displayName: input.instrument.name, marketType: input.instrument.marketType ?? input.instrument.marketId, provider: input.instrument.providerType, quote: input.instrument.quoteCurrency, ...(score !== null ? { reviewScore: score } : {}), recommendationState: state, title: labels[input.language][state], summary: [reason, qualityNote].filter(Boolean).join(' '), why: reason, nextCheck, evidenceFactors: finalRead.evidenceItems, exclusionReasons: exclusions, dataQuality: e.dataQuality, updatedAt: input.updatedAt ?? null }
}

export function selectEvidenceCandidates(items: readonly EvidenceCandidateRecommendation[], limit = 5) {
  const priority: Record<RecommendationState, number> = { approachReviewPossible: 0, keepWatching: 1, extendedCaution: 2, changeCheckNeeded: 3, holdingBasisReview: 3, held: 4, wait: 5, notEnoughData: 6, excluded: 7 }
  return { recommended: items.filter((item) => priority[item.recommendationState] <= 2).sort((a, b) => priority[a.recommendationState] - priority[b.recommendationState] || (b.reviewScore ?? -1) - (a.reviewScore ?? -1) || a.instrumentId.localeCompare(b.instrumentId)).slice(0, Math.max(0, limit)), secondary: items.filter((item) => priority[item.recommendationState] > 2) }
}
