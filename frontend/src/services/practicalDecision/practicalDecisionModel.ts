import type { PracticalDecisionInput, PracticalDecisionResult, PracticalDecisionState } from '@/types/practicalDecision'

const copy = {
  en: {
    caution: 'Decision-support information, not a trade instruction or profit guarantee.',
    states: {
      wait: ['Wait for now', 'Evidence is not strong enough yet, so this needs more observation.'],
      watch: ['Add to watch', 'This is worth keeping on the watch list and reviewing over time.'],
      approachReview: ['Approach review possible', 'Several review conditions are aligned, so it may deserve closer review.'],
      extendedCaution: ['Already extended', 'Price movement is already large, so extra caution is needed.'],
      postDropReview: ['Post-drop review needed', 'A rebound after a sharp drop needs more supporting evidence.'],
      changeCheck: ['Change check needed', 'Some conditions have changed from the snapshot record and should be reviewed.'],
      holdingRecheck: ['Re-check holding basis', 'Review whether the original reason still holds from your recorded price.'],
      unavailable: ['Not enough basis', 'There is not enough basis for a useful review.'],
    },
    reasons: { wait: 'The available conditions remain incomplete.', watch: 'The evidence supports continued observation.', approachReview: 'Multiple review conditions are aligned.', extendedCaution: 'The recent movement is already expanded.', postDropReview: 'The rebound context needs additional evidence.', changeCheck: 'The current evidence differs from the saved basis.', holdingRecheck: 'A personal reference price is available for basis review.', unavailable: 'Reliable review inputs are missing.' },
    next: { wait: 'Wait for stronger price, volume, or evidence confirmation.', watch: 'Review whether the flow remains consistent over time.', approachReview: 'Review volume, market context, and related news before deciding.', extendedCaution: 'Check whether movement stabilizes before drawing a conclusion.', postDropReview: 'Confirm whether the rebound has broader supporting evidence.', changeCheck: 'Compare the changed rule basis with the snapshot record.', holdingRecheck: 'Check whether the original reason still holds from your recorded price.', unavailable: 'Confirm reliable price and evidence data first.' },
  },
  ko: {
    caution: '판단 보조 정보이며, 거래 지시나 수익 보장이 아닙니다.',
    states: {
      wait: ['아직 대기', '근거가 충분하지 않아 바로 판단하기보다 더 지켜볼 단계입니다.'],
      watch: ['관심 등록', '관심 후보로 기록해두고 흐름을 확인할 단계입니다.'],
      approachReview: ['접근 검토 가능', '여러 검토 조건이 맞아 추가 확인할 만한 상태입니다.'],
      extendedCaution: ['이미 움직임 큼', '가격 움직임이 이미 커져 따라가기보다 추가 확인이 필요한 상태입니다.'],
      postDropReview: ['급락 후 확인 필요', '급락 이후 반등처럼 보일 수 있어 추가 근거 확인이 필요합니다.'],
      changeCheck: ['변화 확인 필요', '기준 기록과 달라진 점이 있어 확인이 필요한 상태입니다.'],
      holdingRecheck: ['보유 기준 재확인', '내가 기록한 가격 기준으로 처음 판단 이유가 유지되는지 확인할 단계입니다.'],
      unavailable: ['판단 근거 부족', '현재 판단에 필요한 근거가 부족합니다.'],
    },
    reasons: { wait: '현재 확인된 조건이 아직 충분하지 않습니다.', watch: '계속 관찰할 근거가 확인되었습니다.', approachReview: '여러 검토 조건이 함께 확인되었습니다.', extendedCaution: '최근 가격 움직임이 이미 확대되었습니다.', postDropReview: '반등 맥락을 뒷받침할 추가 근거가 필요합니다.', changeCheck: '현재 근거가 저장된 기준과 달라졌습니다.', holdingRecheck: '내가 적은 참고 가격을 기준으로 다시 검토할 수 있습니다.', unavailable: '신뢰할 수 있는 검토 입력이 부족합니다.' },
    next: { wait: '가격·거래량·근거가 더 분명해지는지 확인하세요.', watch: '현재 흐름이 계속 유지되는지 확인하세요.', approachReview: '판단 전 거래량, 시장 맥락과 관련 뉴스를 확인하세요.', extendedCaution: '움직임이 안정되는지 확인한 뒤 다시 검토하세요.', postDropReview: '반등을 뒷받침하는 추가 근거가 있는지 확인하세요.', changeCheck: '달라진 규칙 근거를 기준 기록과 비교하세요.', holdingRecheck: '내가 적은 참고 가격에서 처음 판단 이유가 유지되는지 확인하세요.', unavailable: '먼저 신뢰 가능한 가격과 근거 데이터를 확인하세요.' },
  },
} as const

function stateFor(input: PracticalDecisionInput): PracticalDecisionState {
  if (input.dataQuality !== 'live' || input.freshness === 'priceUnavailable' || input.freshness === 'reviewBasisUnavailable') return 'unavailable'
  if (input.hasAveragePrice) return 'holdingRecheck'
  if (input.freshness === 'changeReview' || input.freshness === 'expired') return 'changeCheck'
  if (input.actionStatus === 'chaseCaution' || input.movementBand?.includes('Large upward') || input.movementBand?.includes('큰 상승')) return 'extendedCaution'
  if (input.actionStatus === 'sharpDropReboundCaution' || input.movementBand?.includes('Large downward') || input.movementBand?.includes('큰 하락')) return 'postDropReview'
  if (input.actionStatus === 'conditionalApproach' || input.interestStage === 'second' || input.interestStage === 'third') return 'approachReview'
  if (input.actionStatus === 'watchZone' || input.interestStage === 'first') return 'watch'
  return 'wait'
}

export function buildPracticalDecision(input: PracticalDecisionInput): PracticalDecisionResult {
  const state = stateFor(input)
  const t = copy[input.language]
  const usesStateSpecificCopy = state === 'changeCheck' || state === 'holdingRecheck' || state === 'unavailable'
  return {
    state,
    title: t.states[state][0],
    summary: t.states[state][1],
    reason: usesStateSpecificCopy ? t.reasons[state] : input.reason?.trim() || t.reasons[state],
    nextCheck: usesStateSpecificCopy ? t.next[state] : input.nextCheck?.trim() || t.next[state],
    caution: t.caution,
    source: input.source,
    horizon: input.horizon,
    dataQuality: input.dataQuality,
  }
}
