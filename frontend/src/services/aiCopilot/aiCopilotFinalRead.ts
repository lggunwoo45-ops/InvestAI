import type { Language } from '@/i18n/translations'
import type { CandidateReviewScore } from '@/services/candidateScore/candidateReviewScore'
import type { AiScenarioAnalysis } from '@/types/aiScenario'
import type { SnapshotFreshness } from '@/types/candidateSnapshot'
import type { MarketInstrument } from '@/types/market'
import type { Candle } from '@/types/marketDetail'
import type { AnalysisDataQuality } from '@/types/myAnalysis'
import type { PracticalDecisionResult, PracticalDecisionState } from '@/types/practicalDecision'
import type { TechnicalLevelAnalysis } from '@/types/technicalLevels'

export type AiCopilotFinalReadState =
  | 'wait'
  | 'keepWatching'
  | 'approachReviewPossible'
  | 'extendedCaution'
  | 'changeCheckNeeded'
  | 'holdingBasisReview'
  | 'notEnoughData'

export type AiCopilotTechnicalTrend = 'upward' | 'neutral' | 'downward' | 'unavailable'
export type AiCopilotMomentumState = 'strongPositive' | 'positive' | 'neutral' | 'negative' | 'strongNegative' | 'unavailable'
export type AiCopilotVolumeState = 'elevated' | 'normal' | 'low' | 'unavailable'
export type AiCopilotSupportResistanceState = 'nearSupport' | 'balanced' | 'nearResistance' | 'aboveResistance' | 'belowSupport' | 'unavailable'
export type AiCopilotBtcAnchorContext = 'stable' | 'mixed' | 'volatilityWatch' | 'unavailable'
export type AiCopilotMarketBriefDirection = 'upside' | 'neutral' | 'downsidePressure' | 'volatilityWatch' | 'unavailable'

/** A transparent snapshot of the existing evidence used by the deterministic final-read rules. */
export interface AiCopilotFinalReadEvidence {
  symbol: string
  marketType: string
  currentPriceAvailable: boolean
  priceSeriesAvailable: boolean
  candidateReviewScore: number | null
  practicalDecisionState: PracticalDecisionState | null
  technicalTrend: AiCopilotTechnicalTrend
  momentumState: AiCopilotMomentumState
  volumeState: AiCopilotVolumeState
  supportResistanceState: AiCopilotSupportResistanceState
  btcAnchorState: AiCopilotBtcAnchorContext
  marketCautionState: AiCopilotMarketBriefDirection
  positionReviewActive: boolean
  changeReviewActive: boolean
  dataQuality: AnalysisDataQuality
  recentMovePercent: number | null
  priceExtendedFromAverage: boolean
}

export interface AiCopilotFinalRead {
  state: AiCopilotFinalReadState
  title: string
  summary: string
  why: string
  nextCheck: string
  caution: string
  confidenceLabel: string
  sourceFactors: readonly string[]
  evidenceSummary: readonly string[]
}

export interface BuildAiCopilotFinalReadEvidenceInput {
  instrument: MarketInstrument
  candles?: readonly Candle[]
  practicalDecision?: PracticalDecisionResult | null
  reviewScore?: CandidateReviewScore | null
  technicalAnalysis?: TechnicalLevelAnalysis | null
  btcAnchorContext?: AiCopilotBtcAnchorContext | null
  marketBriefDirection?: AiCopilotMarketBriefDirection | null
  freshness?: SnapshotFreshness | null
  positionReviewActive?: boolean
  dataQuality?: AnalysisDataQuality
}

export interface AiCopilotFinalReadInput {
  language: Language
  evidence: AiCopilotFinalReadEvidence
  practicalDecision?: PracticalDecisionResult | null
  reviewScore?: CandidateReviewScore | null
}

const copy = {
  en: {
    states: {
      wait: ['Wait for now', 'The current evidence is weak, unclear, or unfavorable, so more observation is appropriate.'],
      keepWatching: ['Keep watching', 'The evidence is mixed but still useful enough to keep under review.'],
      approachReviewPossible: ['Approach review possible', 'Several independent review factors are constructive without showing excessive extension.'],
      extendedCaution: ['Already extended', 'Recent movement or resistance context is already stretched, so stabilization matters.'],
      changeCheckNeeded: ['Change check needed', 'The current evidence differs from the saved basis and needs another review.'],
      holdingBasisReview: ['Re-check holding basis', 'Compare the recorded basis with current evidence and verify whether the original reasoning still holds.'],
      notEnoughData: ['Not enough data', 'There is not enough usable current evidence for a meaningful final read.'],
    },
    confidence: { low: 'Low', moderate: 'Medium', strong: 'High', unavailable: 'Not available' },
    factors: { instrument: 'Instrument', decision: 'Practical decision', score: 'Review score', trend: 'Technical trend', momentum: 'Momentum', volume: 'Volume state', structure: 'Price structure', btc: 'Bitcoin anchor', brief: 'Market caution', quality: 'Data quality', series: 'Price series' },
    values: {
      trend: { upward: 'Upward bias', neutral: 'Mixed', downward: 'Downward bias', unavailable: 'Unavailable' },
      momentum: { strongPositive: 'Strong positive', positive: 'Positive', neutral: 'Neutral', negative: 'Negative', strongNegative: 'Strong negative', unavailable: 'Unavailable' },
      volume: { elevated: 'Elevated', normal: 'Normal', low: 'Low', unavailable: 'Unavailable' },
      structure: { nearSupport: 'Near observed support', balanced: 'Between observed levels', nearResistance: 'Near observed resistance', aboveResistance: 'Above observed resistance', belowSupport: 'Below observed support', unavailable: 'Unavailable' },
      btc: { stable: 'Stable', mixed: 'Mixed', volatilityWatch: 'Volatility watch', unavailable: 'Unavailable' },
      market: { upside: 'Supportive', neutral: 'Neutral', downsidePressure: 'Downside pressure', volatilityWatch: 'Volatility watch', unavailable: 'Unavailable' },
      quality: { live: 'Live', mock: 'Mock / demo', limited: 'Limited', unavailable: 'Unavailable' },
    },
    why: {
      wait: 'The available factors do not yet form a sufficiently constructive or stable structure.',
      keepWatching: 'Usable factors are present, but trend, momentum, or wider-market context remains mixed.',
      approachReviewPossible: 'Review score, momentum, and technical structure are sufficiently aligned for closer review.',
      extendedCaution: 'Recent movement, volume, or resistance proximity shows that the move is already extended.',
      changeCheckNeeded: 'Saved context is stale or materially different from the current evidence.',
      holdingBasisReview: 'A recorded basis is active, so the original reasoning should be checked against current conditions.',
      notEnoughData: 'Current price or enough independent evidence could not be verified.',
    },
    next: {
      wait: 'Check whether trend, activity, and price structure become clearer together.',
      keepWatching: 'Check whether momentum and activity remain consistent around the observed structure.',
      approachReviewPossible: 'Check whether constructive structure remains intact near the next observed resistance.',
      extendedCaution: 'Check whether movement stabilizes and the observed structure remains intact.',
      changeCheckNeeded: 'Compare the latest evidence with the saved basis before relying on the earlier review.',
      holdingBasisReview: 'Review whether current structure still supports the reason recorded with the position context.',
      notEnoughData: 'Wait for current price and additional market evidence to become available.',
    },
    btcWhy: 'Bitcoin volatility limits the strength of the crypto conclusion.',
    btcNext: 'Check whether the Bitcoin market anchor stabilizes before strengthening the conclusion.',
    marketCaution: 'The wider market context shows downside or volatility pressure.',
    caution: 'Decision-support information, not a trade instruction.',
    summaryHeading: 'AI Copilot final review:', reason: 'Reason', nextLabel: 'Next check', cautionLabel: 'Caution', evidence: 'Evidence',
    scenario: {
      wait: { upside: 'A constructive path requires clearer momentum, activity, and structure.', neutral: 'Mixed evidence can keep this instrument in observation mode.', downside: 'Further structure weakness would reduce the current review basis.', checks: ['Check whether momentum and activity improve together.', 'Confirm that price structure becomes more stable.'] },
      approachReviewPossible: { upside: 'Constructive continuation remains possible while the supporting structure holds.', neutral: 'A stable consolidation can preserve the current review basis.', downside: 'The conclusion weakens if momentum and observed support deteriorate.', checks: ['Check whether constructive momentum remains consistent.', 'Confirm that activity supports the current structure.'] },
      extendedCaution: { upside: 'Further movement needs stabilization and fresh confirmation rather than following momentum.', neutral: 'Consolidation may reduce extension and improve the quality of the next review.', downside: 'A pullback can deepen if stretched structure and activity weaken together.', checks: ['Check whether recent movement stabilizes.', 'Confirm whether the observed support structure remains intact.'] },
    },
  },
  ko: {
    states: {
      wait: ['관망', '현재 근거가 약하거나 불분명해 더 지켜보는 것이 적절합니다.'],
      keepWatching: ['관심 유지', '근거가 혼재하지만 계속 확인할 가치는 남아 있습니다.'],
      approachReviewPossible: ['접근 검토 가능', '여러 독립적인 검토 근거가 과도한 움직임 없이 비교적 양호하게 맞습니다.'],
      extendedCaution: ['이미 움직임 큼', '최근 움직임이나 저항 맥락이 이미 확대되어 안정 여부를 먼저 확인해야 합니다.'],
      changeCheckNeeded: ['변화 확인 필요', '현재 근거가 저장된 기준과 달라져 다시 확인해야 합니다.'],
      holdingBasisReview: ['보유 기준 재확인', '기록한 기준과 현재 근거를 비교해 처음 판단 이유가 유지되는지 확인해야 합니다.'],
      notEnoughData: ['데이터 부족', '의미 있는 최종 검토에 필요한 현재 근거가 충분하지 않습니다.'],
    },
    confidence: { low: '낮음', moderate: '보통', strong: '높음', unavailable: '산정 불가' },
    factors: { instrument: '종목', decision: '실용 판단', score: '검토 점수', trend: '기술 상태', momentum: '모멘텀', volume: '거래량 상태', structure: '가격 구조', btc: 'BTC 기준', brief: '시장 주의', quality: '데이터 품질', series: '가격 흐름' },
    values: {
      trend: { upward: '상승 우위', neutral: '혼재', downward: '하락 우위', unavailable: '확인 불가' },
      momentum: { strongPositive: '강한 상승', positive: '상승', neutral: '중립', negative: '하락', strongNegative: '강한 하락', unavailable: '확인 불가' },
      volume: { elevated: '증가', normal: '보통', low: '낮음', unavailable: '확인 불가' },
      structure: { nearSupport: '관찰 지지 부근', balanced: '관찰 구간 내부', nearResistance: '관찰 저항 부근', aboveResistance: '관찰 저항 상단', belowSupport: '관찰 지지 하단', unavailable: '확인 불가' },
      btc: { stable: '안정', mixed: '혼재', volatilityWatch: '변동성 주의', unavailable: '확인 불가' },
      market: { upside: '양호', neutral: '중립', downsidePressure: '하방 주의', volatilityWatch: '변동성 주의', unavailable: '확인 불가' },
      quality: { live: '실시간', mock: '모의 / 데모', limited: '제한', unavailable: '이용 불가' },
    },
    why: {
      wait: '현재 근거만으로는 충분히 양호하거나 안정적인 구조가 확인되지 않습니다.',
      keepWatching: '활용할 근거는 있지만 추세, 모멘텀 또는 시장 맥락이 혼재되어 있습니다.',
      approachReviewPossible: '검토 점수와 모멘텀, 기술 구조가 추가 검토 가능한 수준으로 함께 맞습니다.',
      extendedCaution: '최근 움직임, 거래량 또는 저항 근접도가 이미 확대된 흐름을 보여줍니다.',
      changeCheckNeeded: '저장된 기준이 오래되었거나 현재 근거와 의미 있게 달라졌습니다.',
      holdingBasisReview: '기록 가격 맥락이 활성화되어 현재 조건과 처음 판단 이유를 비교해야 합니다.',
      notEnoughData: '현재 가격 또는 서로 다른 검토 근거를 충분히 확인하지 못했습니다.',
    },
    next: {
      wait: '추세와 거래 활동, 가격 구조가 함께 분명해지는지 확인하세요.',
      keepWatching: '관찰된 구조 주변에서 모멘텀과 거래 활동이 유지되는지 확인하세요.',
      approachReviewPossible: '다음 관찰 저항 부근에서도 양호한 구조가 유지되는지 확인하세요.',
      extendedCaution: '움직임이 안정되고 관찰된 구조가 유지되는지 확인하세요.',
      changeCheckNeeded: '이전 검토를 신뢰하기 전에 최신 근거와 저장된 기준을 비교하세요.',
      holdingBasisReview: '현재 구조가 기록한 보유 맥락의 판단 이유를 계속 뒷받침하는지 확인하세요.',
      notEnoughData: '현재 가격과 추가 시장 근거가 확보될 때까지 기다리세요.',
    },
    btcWhy: '비트코인 변동성으로 코인 판단 강도를 제한했습니다.',
    btcNext: '비트코인 시장 기준이 안정되는지 확인한 뒤 판단 강도를 다시 살펴보세요.',
    marketCaution: '전체 시장 맥락에 하방 또는 변동성 주의가 있습니다.',
    caution: '판단 보조 정보이며 거래 지시가 아닙니다.',
    summaryHeading: 'AI 코파일럿 최종 검토:', reason: '핵심 이유', nextLabel: '다음 확인', cautionLabel: '주의', evidence: '참고 근거',
    scenario: {
      wait: { upside: '양호한 흐름으로 보려면 모멘텀과 거래 활동, 구조가 더 분명해져야 합니다.', neutral: '근거가 혼재된 동안 관망 상태가 이어질 수 있습니다.', downside: '가격 구조가 더 약해지면 현재 검토 근거도 줄어듭니다.', checks: ['모멘텀과 거래 활동이 함께 개선되는지 확인합니다.', '가격 구조가 더 안정되는지 확인합니다.'] },
      approachReviewPossible: { upside: '뒷받침 구조가 유지되면 양호한 흐름이 이어질 수 있습니다.', neutral: '안정적인 횡보는 현재 검토 근거를 유지할 수 있습니다.', downside: '모멘텀과 관찰 지지가 약해지면 현재 판단도 약해집니다.', checks: ['양호한 모멘텀이 유지되는지 확인합니다.', '거래 활동이 현재 구조를 뒷받침하는지 확인합니다.'] },
      extendedCaution: { upside: '추가 움직임은 따라가기보다 안정과 새로운 확인 근거가 필요합니다.', neutral: '횡보로 움직임이 완화되면 다음 검토의 품질이 높아질 수 있습니다.', downside: '확대된 구조와 거래 활동이 함께 약해지면 조정이 깊어질 수 있습니다.', checks: ['최근 움직임이 안정되는지 확인합니다.', '관찰된 지지 구조가 유지되는지 확인합니다.'] },
    },
  },
} as const

const finitePositive = (value: number) => Number.isFinite(value) && value > 0

function momentumState(change: number, candles: readonly Candle[]): AiCopilotMomentumState {
  const validChange = Number.isFinite(change) ? change : null
  const recent = candles.filter((candle) => finitePositive(candle.close)).slice(-6)
  const candleMove = recent.length >= 2 ? ((recent.at(-1)!.close - recent[0].close) / recent[0].close) * 100 : null
  const strongest = Math.abs(candleMove ?? 0) > Math.abs(validChange ?? 0) ? candleMove : validChange
  if (strongest === null) return 'unavailable'
  if (strongest >= 8) return 'strongPositive'
  if (strongest >= 2) return 'positive'
  if (strongest <= -8) return 'strongNegative'
  if (strongest <= -2) return 'negative'
  return 'neutral'
}

function volumeState(instrument: MarketInstrument, candles: readonly Candle[]): AiCopilotVolumeState {
  const recent = candles.filter((candle) => Number.isFinite(candle.volume) && candle.volume >= 0).slice(-21)
  if (recent.length >= 6) {
    const latest = recent.at(-1)!.volume
    const baseline = recent.slice(0, -1).reduce((sum, candle) => sum + candle.volume, 0) / (recent.length - 1)
    if (baseline > 0 && latest / baseline >= 1.8) return 'elevated'
    if (baseline > 0 && latest / baseline < 0.6) return 'low'
    return 'normal'
  }
  return Number.isFinite(instrument.volume24h) && instrument.volume24h > 0 ? 'normal' : 'unavailable'
}

function technicalTrend(technical: TechnicalLevelAnalysis | null | undefined, momentum: AiCopilotMomentumState): AiCopilotTechnicalTrend {
  const position = technical?.movingAverageContext.pricePosition
  if (position === 'above') return 'upward'
  if (position === 'below') return 'downward'
  if (position === 'mixed') return 'neutral'
  if (momentum === 'strongPositive' || momentum === 'positive') return 'upward'
  if (momentum === 'strongNegative' || momentum === 'negative') return 'downward'
  return momentum === 'neutral' ? 'neutral' : 'unavailable'
}

function structureState(technical: TechnicalLevelAnalysis | null | undefined, currentPrice: number): AiCopilotSupportResistanceState {
  if (technical?.levelSet.status !== 'ready' || !finitePositive(currentPrice)) return 'unavailable'
  const support = technical.levelSet.firstSupport?.price
  const resistance = technical.levelSet.firstResistance?.price
  if (support && currentPrice < support) return 'belowSupport'
  if (resistance && currentPrice > resistance) return 'aboveResistance'
  const supportDistance = support ? ((currentPrice - support) / currentPrice) * 100 : Number.POSITIVE_INFINITY
  const resistanceDistance = resistance ? ((resistance - currentPrice) / currentPrice) * 100 : Number.POSITIVE_INFINITY
  if (resistanceDistance <= 1.5) return 'nearResistance'
  if (supportDistance <= 1.5) return 'nearSupport'
  return 'balanced'
}

export function buildAiCopilotFinalReadEvidence(input: BuildAiCopilotFinalReadEvidenceInput): AiCopilotFinalReadEvidence {
  const candles = input.candles ?? []
  const currentPriceAvailable = finitePositive(input.instrument.lastPrice)
  const priceSeriesAvailable = candles.filter((candle) => finitePositive(candle.close)).length >= 5
  const momentum = momentumState(input.instrument.change24hPercent, candles)
  const trend = technicalTrend(input.technicalAnalysis, momentum)
  const nearestAverage = input.technicalAnalysis?.movingAverageContext.nearestAverage?.price
  const averageDistance = currentPriceAvailable && nearestAverage && finitePositive(nearestAverage)
    ? Math.abs(((input.instrument.lastPrice - nearestAverage) / nearestAverage) * 100)
    : 0
  return {
    symbol: input.instrument.displaySymbol ?? input.instrument.symbol,
    marketType: input.instrument.marketType ?? input.instrument.marketId,
    currentPriceAvailable,
    priceSeriesAvailable,
    candidateReviewScore: input.reviewScore?.score ?? null,
    practicalDecisionState: input.practicalDecision?.state ?? null,
    technicalTrend: trend,
    momentumState: momentum,
    volumeState: volumeState(input.instrument, candles),
    supportResistanceState: structureState(input.technicalAnalysis, input.instrument.lastPrice),
    btcAnchorState: input.btcAnchorContext ?? 'unavailable',
    marketCautionState: input.marketBriefDirection ?? 'unavailable',
    positionReviewActive: input.positionReviewActive ?? false,
    changeReviewActive: input.freshness === 'changeReview' || input.freshness === 'expired',
    dataQuality: input.dataQuality ?? input.technicalAnalysis?.levelSet.dataQuality ?? 'limited',
    recentMovePercent: Number.isFinite(input.instrument.change24hPercent) ? input.instrument.change24hPercent : null,
    priceExtendedFromAverage: averageDistance >= 5,
  }
}

function usableEvidenceCount(evidence: AiCopilotFinalReadEvidence) {
  return [evidence.priceSeriesAvailable, evidence.candidateReviewScore !== null, evidence.technicalTrend !== 'unavailable', evidence.momentumState !== 'unavailable', evidence.volumeState !== 'unavailable', evidence.supportResistanceState !== 'unavailable'].filter(Boolean).length
}

function stateFor(evidence: AiCopilotFinalReadEvidence): AiCopilotFinalReadState {
  if (evidence.positionReviewActive) return 'holdingBasisReview'
  if (!evidence.currentPriceAvailable || evidence.dataQuality === 'unavailable' || usableEvidenceCount(evidence) < 2) return 'notEnoughData'
  if (evidence.changeReviewActive) return 'changeCheckNeeded'
  const stronglyExtended = evidence.momentumState === 'strongPositive'
    || evidence.priceExtendedFromAverage
    || evidence.supportResistanceState === 'aboveResistance'
    || (evidence.supportResistanceState === 'nearResistance' && evidence.volumeState === 'elevated' && evidence.momentumState === 'positive')
  if (stronglyExtended) return 'extendedCaution'
  const score = evidence.candidateReviewScore ?? 0
  const constructive = evidence.dataQuality !== 'mock'
    && evidence.supportResistanceState !== 'aboveResistance'
    && evidence.supportResistanceState !== 'belowSupport'
    && (evidence.practicalDecisionState === 'approachReview' || score >= 68 || (score >= 55 && evidence.technicalTrend === 'upward' && evidence.momentumState === 'positive'))
  if (constructive) return 'approachReviewPossible'
  const worthTracking = score >= 45
    || evidence.practicalDecisionState === 'watch'
    || evidence.practicalDecisionState === 'approachReview'
    || (evidence.technicalTrend === 'upward' && evidence.momentumState !== 'strongNegative' && evidence.momentumState !== 'negative')
    || (evidence.supportResistanceState === 'nearSupport' && evidence.momentumState !== 'strongNegative')
  if (worthTracking) return 'keepWatching'
  return 'wait'
}

function confidenceFor(state: AiCopilotFinalReadState, evidence: AiCopilotFinalReadEvidence, reviewScore: CandidateReviewScore | null | undefined) {
  if (state === 'notEnoughData') return 'unavailable' as const
  if (evidence.dataQuality === 'mock' || evidence.dataQuality === 'limited' || usableEvidenceCount(evidence) < 4) return 'low' as const
  if (evidence.marketCautionState === 'downsidePressure' || evidence.marketCautionState === 'volatilityWatch') return 'low' as const
  if (reviewScore?.level === 'strong' && evidence.priceSeriesAvailable) return 'strong' as const
  return reviewScore?.level === 'low' ? 'low' as const : 'moderate' as const
}

export function buildAiCopilotFinalRead(input: AiCopilotFinalReadInput): AiCopilotFinalRead {
  const t = copy[input.language]
  const { evidence } = input
  let state = stateFor(evidence)
  const btcCapsConclusion = evidence.btcAnchorState === 'volatilityWatch' && state === 'approachReviewPossible'
  const marketCapsConclusion = (evidence.marketCautionState === 'downsidePressure' || evidence.marketCautionState === 'volatilityWatch') && state === 'approachReviewPossible'
  if (btcCapsConclusion || marketCapsConclusion) state = 'keepWatching'
  const sourceFactors = [
    `${t.factors.instrument}: ${evidence.symbol}`,
    `${t.factors.quality}: ${t.values.quality[evidence.dataQuality]}`,
    evidence.practicalDecisionState ? t.factors.decision : null,
    evidence.candidateReviewScore !== null ? t.factors.score : null,
    evidence.priceSeriesAvailable ? t.factors.series : null,
    evidence.technicalTrend !== 'unavailable' ? t.factors.trend : null,
    evidence.momentumState !== 'unavailable' ? t.factors.momentum : null,
    evidence.volumeState !== 'unavailable' ? t.factors.volume : null,
    evidence.supportResistanceState !== 'unavailable' ? t.factors.structure : null,
    evidence.btcAnchorState !== 'unavailable' ? t.factors.btc : null,
    evidence.marketCautionState !== 'unavailable' ? t.factors.brief : null,
  ].filter((factor): factor is string => Boolean(factor))
  const evidenceSummary = [
    evidence.candidateReviewScore !== null ? `${t.factors.score}: ${evidence.candidateReviewScore}` : null,
    `${t.factors.trend}: ${t.values.trend[evidence.technicalTrend]}`,
    `${t.factors.momentum}: ${t.values.momentum[evidence.momentumState]}`,
    `${t.factors.volume}: ${t.values.volume[evidence.volumeState]}`,
    `${t.factors.structure}: ${t.values.structure[evidence.supportResistanceState]}`,
    evidence.btcAnchorState !== 'unavailable' ? `${t.factors.btc}: ${t.values.btc[evidence.btcAnchorState]}` : null,
    evidence.marketCautionState !== 'unavailable' ? `${t.factors.brief}: ${t.values.market[evidence.marketCautionState]}` : null,
  ].filter((factor): factor is string => Boolean(factor))
  const [title, summary] = t.states[state]
  const whySuffix = btcCapsConclusion ? ` ${t.btcWhy}` : marketCapsConclusion ? ` ${t.marketCaution}` : ''
  const nextCheck = btcCapsConclusion ? t.btcNext : t.next[state]
  const marketNeedsCaution = evidence.marketCautionState === 'downsidePressure' || evidence.marketCautionState === 'volatilityWatch'
  return {
    state,
    title,
    summary,
    why: `${t.why[state]}${whySuffix}`,
    nextCheck,
    caution: marketNeedsCaution ? `${t.marketCaution} ${t.caution}` : t.caution,
    confidenceLabel: t.confidence[confidenceFor(state, evidence, input.reviewScore)],
    sourceFactors,
    evidenceSummary,
  }
}

export function applyFinalReadToScenarioAnalysis(analysis: AiScenarioAnalysis, finalRead: AiCopilotFinalRead, language: Language): AiScenarioAnalysis {
  const scenarioGroup = finalRead.state === 'approachReviewPossible'
    ? copy[language].scenario.approachReviewPossible
    : finalRead.state === 'extendedCaution'
      ? copy[language].scenario.extendedCaution
      : finalRead.state === 'wait'
        ? copy[language].scenario.wait
        : null
  if (!scenarioGroup) return analysis
  return {
    ...analysis,
    scenarios: {
      bullish: { ...analysis.scenarios.bullish, summary: scenarioGroup.upside, checks: scenarioGroup.checks },
      neutral: { ...analysis.scenarios.neutral, summary: scenarioGroup.neutral, checks: scenarioGroup.checks },
      bearish: { ...analysis.scenarios.bearish, summary: scenarioGroup.downside, checks: scenarioGroup.checks },
    },
  }
}

export function formatAiCopilotFinalReadSummary(finalRead: AiCopilotFinalRead, language: Language): string {
  const t = copy[language]
  return [`${t.summaryHeading} ${finalRead.title}`, `${t.reason}: ${finalRead.why}`, `${t.nextLabel}: ${finalRead.nextCheck}`, `${t.evidence}: ${finalRead.evidenceSummary.join(' · ')}`, `${t.cautionLabel}: ${finalRead.caution}`].join('\n')
}
