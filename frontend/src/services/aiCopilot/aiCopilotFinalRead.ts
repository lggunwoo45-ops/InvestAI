import type { Language } from '@/i18n/translations'
import type { CandidateReviewScore } from '@/services/candidateScore/candidateReviewScore'
import type { SnapshotFreshness } from '@/types/candidateSnapshot'
import type { PracticalDecisionResult } from '@/types/practicalDecision'

export type AiCopilotFinalReadState =
  | 'wait'
  | 'keepWatching'
  | 'approachReviewPossible'
  | 'extendedCaution'
  | 'changeCheckNeeded'
  | 'holdingBasisReview'
  | 'notEnoughData'

export interface AiCopilotFinalRead {
  state: AiCopilotFinalReadState
  title: string
  summary: string
  why: string
  nextCheck: string
  caution: string
  confidenceLabel: string
  sourceFactors: readonly string[]
}

export type AiCopilotBtcAnchorContext = 'stable' | 'mixed' | 'volatilityWatch' | 'unavailable'
export type AiCopilotMarketBriefDirection = 'upside' | 'neutral' | 'downsidePressure' | 'volatilityWatch' | 'unavailable'

export interface AiCopilotFinalReadInput {
  language: Language
  instrumentLabel?: string
  practicalDecision: PracticalDecisionResult | null
  reviewScore?: CandidateReviewScore | null
  hasReviewRanges?: boolean
  hasTechnicalLevels?: boolean
  isCrypto?: boolean
  btcAnchorContext?: AiCopilotBtcAnchorContext | null
  marketBriefDirection?: AiCopilotMarketBriefDirection | null
  freshness?: SnapshotFreshness | null
  hasRecordedPrice?: boolean
  positionReviewActive?: boolean
  dataAvailable?: boolean
}

const copy = {
  en: {
    states: {
      wait: ['Final review: Wait for now', 'The current basis is not complete enough for a stronger conclusion.'],
      keepWatching: ['Final review: Keep watching', 'Keep this in view and check whether the current flow remains consistent.'],
      approachReviewPossible: ['Final review: Approach review possible', 'Several review conditions align, so the available evidence deserves a closer check.'],
      extendedCaution: ['Final review: Already extended', 'Price movement is already large, so confirmation matters more than following the move.'],
      changeCheckNeeded: ['Final review: Change check needed', 'The current evidence differs from the saved basis and needs another review.'],
      holdingBasisReview: ['Final review: Re-check holding basis', 'Use the recorded reference to check whether the original review basis still holds.'],
      notEnoughData: ['Final review: Not enough data', 'The available evidence is not sufficient for a useful current review.'],
    },
    confidence: { low: 'Low', moderate: 'Medium', strong: 'High', unavailable: 'Not available' },
    factors: {
      instrument: 'Instrument', decision: 'Practical decision', score: 'Candidate review score', ranges: 'Review ranges', technical: 'Technical levels',
      freshness: 'Snapshot freshness', position: 'Recorded position context', btc: 'Bitcoin market anchor', brief: 'Daily market brief',
    },
    fallbackWhy: 'The current evidence needs more confirmation.',
    fallbackNext: 'Check data quality, market context, and the next meaningful change together.',
    btcWhy: 'Bitcoin market volatility keeps the crypto review conservative.',
    btcNext: 'Check whether the Bitcoin market anchor stabilizes before strengthening the conclusion.',
    marketCaution: 'The daily market brief shows downside or volatility pressure, so confirm the wider market context.',
    caution: 'Decision-support information, not a trade instruction.',
    summaryHeading: 'AI Copilot final review:',
    reason: 'Reason', next: 'Next check', cautionLabel: 'Caution',
  },
  ko: {
    states: {
      wait: ['최종 검토 판단: 관망', '아직 근거가 충분하지 않아 무리해서 볼 단계는 아닙니다.'],
      keepWatching: ['최종 검토 판단: 관심 유지', '관심 후보로 유지하고 흐름을 더 확인할 단계입니다.'],
      approachReviewPossible: ['최종 검토 판단: 접근 검토 가능', '여러 검토 조건이 맞아 추가 확인할 만한 상태입니다.'],
      extendedCaution: ['최종 검토 판단: 이미 움직임 큼', '가격 움직임이 이미 커져 따라가기보다 확인이 필요한 상태입니다.'],
      changeCheckNeeded: ['최종 검토 판단: 변화 확인 필요', '기준 기록과 달라진 점이 있어 다시 확인할 단계입니다.'],
      holdingBasisReview: ['최종 검토 판단: 보유 기준 재확인', '내가 적은 참고 가격 기준으로 처음 판단 이유가 유지되는지 확인할 단계입니다.'],
      notEnoughData: ['최종 검토 판단: 데이터 부족', '현재 판단에 필요한 근거가 부족합니다.'],
    },
    confidence: { low: '낮음', moderate: '보통', strong: '높음', unavailable: '산정 불가' },
    factors: {
      instrument: '종목', decision: '실용 판단', score: '후보 검토 점수', ranges: '검토 범위', technical: '기술 참고 수준',
      freshness: '기준 기록 상태', position: '기록 가격 맥락', btc: '비트코인 시장 기준', brief: '일일 시장 브리핑',
    },
    fallbackWhy: '현재 근거는 추가 확인이 필요합니다.',
    fallbackNext: '데이터 품질과 시장 맥락, 다음 의미 있는 변화를 함께 확인하세요.',
    btcWhy: '비트코인 시장의 변동성 주의 때문에 코인 검토 판단을 보수적으로 유지합니다.',
    btcNext: '비트코인 시장 기준 흐름이 안정되는지 확인한 뒤 판단 강도를 다시 살펴보세요.',
    marketCaution: '일일 시장 브리핑에 하방 또는 변동성 주의가 있어 전체 시장 맥락을 함께 확인해야 합니다.',
    caution: '판단 보조 정보이며 거래 지시가 아닙니다.',
    summaryHeading: 'AI 코파일럿 최종 검토:',
    reason: '이유', next: '다음 확인', cautionLabel: '주의',
  },
} as const

function mappedState(decision: PracticalDecisionResult): AiCopilotFinalReadState {
  switch (decision.state) {
    case 'wait': return 'wait'
    case 'watch': return 'keepWatching'
    case 'approachReview': return 'approachReviewPossible'
    case 'extendedCaution':
    case 'postDropReview': return 'extendedCaution'
    case 'changeCheck': return 'changeCheckNeeded'
    case 'holdingRecheck': return 'holdingBasisReview'
    case 'unavailable': return 'notEnoughData'
  }
}

export function buildAiCopilotFinalRead(input: AiCopilotFinalReadInput): AiCopilotFinalRead {
  const t = copy[input.language]
  const scoreAvailable = input.reviewScore?.score !== null && input.reviewScore?.score !== undefined
  let state: AiCopilotFinalReadState

  if (input.dataAvailable === false || !input.practicalDecision || !scoreAvailable) state = 'notEnoughData'
  else if (input.hasRecordedPrice && input.positionReviewActive) state = 'holdingBasisReview'
  else if (input.freshness === 'changeReview' || input.freshness === 'expired') state = 'changeCheckNeeded'
  else state = mappedState(input.practicalDecision)

  const btcCapsConclusion = Boolean(input.isCrypto && input.btcAnchorContext === 'volatilityWatch')
  if (btcCapsConclusion && state === 'approachReviewPossible') state = 'keepWatching'

  const sourceFactors = [
    input.instrumentLabel ? `${t.factors.instrument}: ${input.instrumentLabel}` : null,
    input.practicalDecision ? t.factors.decision : null,
    scoreAvailable ? t.factors.score : null,
    input.hasReviewRanges ? t.factors.ranges : null,
    input.hasTechnicalLevels ? t.factors.technical : null,
    input.freshness ? t.factors.freshness : null,
    input.hasRecordedPrice && input.positionReviewActive ? t.factors.position : null,
    input.isCrypto && input.btcAnchorContext ? t.factors.btc : null,
    input.marketBriefDirection ? t.factors.brief : null,
  ].filter((factor): factor is string => Boolean(factor))

  const [title, summary] = t.states[state]
  const marketNeedsCaution = input.marketBriefDirection === 'downsidePressure' || input.marketBriefDirection === 'volatilityWatch'
  const baseWhy = input.practicalDecision?.reason || t.fallbackWhy
  const baseNext = input.practicalDecision?.nextCheck || t.fallbackNext

  return {
    state,
    title,
    summary,
    why: btcCapsConclusion ? `${baseWhy} ${t.btcWhy}` : baseWhy,
    nextCheck: btcCapsConclusion ? t.btcNext : marketNeedsCaution ? `${baseNext} ${t.marketCaution}` : baseNext,
    caution: marketNeedsCaution ? `${t.marketCaution} ${t.caution}` : t.caution,
    confidenceLabel: t.confidence[input.reviewScore?.level ?? 'unavailable'],
    sourceFactors,
  }
}

export function formatAiCopilotFinalReadSummary(finalRead: AiCopilotFinalRead, language: Language): string {
  const t = copy[language]
  return [t.summaryHeading, finalRead.title.replace(/^.*?:\s*/, ''), `${t.reason}: ${finalRead.why}`, `${t.next}: ${finalRead.nextCheck}`, `${t.cautionLabel}: ${finalRead.caution}`].join('\n')
}
