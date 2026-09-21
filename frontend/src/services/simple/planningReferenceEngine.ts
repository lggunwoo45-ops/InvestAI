import type { Language } from '@/i18n/translations'
import type { MarketInstrument } from '@/types/market'
import type { SimplePlanningLevel, SimplePlanningReference } from '@/types/simpleMode'
import type { WatchCandidateHorizon } from '@/types/watchCandidate'
import { formatMarketPrice } from '@/utils/formatMarketValue'

interface PlanningReferenceInput {
  instrument: MarketInstrument
  horizon: WatchCandidateHorizon
  language: Language
}

const bands = {
  short: { observations: [-0.015, -0.03, -0.05], risk: -0.07, profit: [0.03, 0.06] },
  swing: { observations: [-0.03, -0.06, -0.09], risk: -0.12, profit: [0.06, 0.12] },
  long: { observations: [-0.05, -0.1, -0.15], risk: -0.2, profit: [0.1, 0.2] },
} as const

const copy = {
  en: {
    labels: ['1st Observation Price', '2nd Observation Price', '3rd Observation Price'], risk: 'Risk Reference Price', profit: 'Profit-Taking Reference Range',
    note: 'These levels are rule-based planning references from the current price. They are not entry, stop-loss, or target-price instructions.',
    levelNote: 'Observation level · planning reference only', unavailable: 'A reliable current price is unavailable, so numeric planning references are disabled.',
  },
  ko: {
    labels: ['1차 관찰가', '2차 관찰가', '3차 관찰가'], risk: '위험 기준가', profit: '수익 실현 참고 구간',
    note: '이 구간은 현재가 기준의 규칙 기반 계획 참고값입니다. 진입가, 손절가, 목표가 지시가 아닙니다.',
    levelNote: '관찰 구간 · 계획 참고용', unavailable: '신뢰할 수 있는 현재가가 없어 숫자 계획 참고값을 표시하지 않습니다.',
  },
} as const

export function unavailablePlanningReference(reason: string): SimplePlanningReference {
  return { available: false, reason, firstObservationPrice: null, secondObservationPrice: null, thirdObservationPrice: null, riskReferencePrice: null, profitTakingReferenceRange: null, notes: [] }
}

export function buildPlanningReference({ instrument, horizon, language }: PlanningReferenceInput): SimplePlanningReference {
  const current = instrument.lastPrice
  const t = copy[language]
  if (!Number.isFinite(current) || current <= 0) return unavailablePlanningReference(t.unavailable)
  const profile = bands[horizon]
  const format = (ratio: number) => formatMarketPrice({ ...instrument, lastPrice: current * (1 + ratio) })
  const level = (label: string, ratio: number): SimplePlanningLevel => ({ label, value: format(ratio), note: t.levelNote })
  return {
    available: true,
    reason: language === 'ko' ? '현재가를 기준으로 기간별 간격을 적용했습니다.' : 'Horizon spacing is applied to the current price.',
    firstObservationPrice: level(t.labels[0], profile.observations[0]),
    secondObservationPrice: level(t.labels[1], profile.observations[1]),
    thirdObservationPrice: level(t.labels[2], profile.observations[2]),
    riskReferencePrice: level(t.risk, profile.risk),
    profitTakingReferenceRange: { label: t.profit, value: `${format(profile.profit[0])} – ${format(profile.profit[1])}`, note: t.levelNote },
    notes: [t.note],
  }
}
