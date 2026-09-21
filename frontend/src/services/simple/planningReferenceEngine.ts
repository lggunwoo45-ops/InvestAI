import type { Language } from '@/i18n/translations'
import type { MarketInstrument } from '@/types/market'
import type { SimplePlanningLevel, SimplePlanningReference } from '@/types/simpleMode'
import type { WatchCandidateHorizon } from '@/types/watchCandidate'

interface PlanningReferenceInput {
  instrument: MarketInstrument
  horizon: WatchCandidateHorizon
  language: Language
}

const bands = {
  short: { observation: [1.5, 5], risk: 7, upside: [3, 6] },
  swing: { observation: [3, 9], risk: 12, upside: [6, 12] },
  long: { observation: [5, 15], risk: 20, upside: [10, 20] },
} as const

const copy = {
  en: {
    observation: 'Observation area', risk: 'Risk check area', upside: 'Upside check area',
    belowRange: (low: number, high: number) => `About ${low}% to ${high}% below current price`,
    below: (value: number) => `About ${value}% below current price`,
    aboveRange: (low: number, high: number) => `About ${low}% to ${high}% above current price`,
    note: 'These are fixed-percentage distances from the current price, not calculated support/resistance levels.',
    levelNote: 'Fixed-percentage distance · planning reference only',
    unavailable: 'A reliable current price is unavailable, so the percentage planning summary is disabled.',
  },
  ko: {
    observation: '관찰 구간', risk: '위험 확인 구간', upside: '상승 확인 구간',
    belowRange: (low: number, high: number) => `현재가보다 약 ${low}%~${high}% 아래`,
    below: (value: number) => `현재가보다 약 ${value}% 아래`,
    aboveRange: (low: number, high: number) => `현재가보다 약 ${low}%~${high}% 위`,
    note: '이 구간은 현재가 기준의 고정 비율 거리이며, 계산된 지지·저항선이 아닙니다.',
    levelNote: '고정 비율 거리 · 계획 참고용',
    unavailable: '신뢰할 수 있는 현재가가 없어 비율 계획 요약을 표시하지 않습니다.',
  },
} as const

export function unavailablePlanningReference(reason: string): SimplePlanningReference {
  return { available: false, reason, observationArea: null, riskCheckArea: null, upsideCheckArea: null, notes: [] }
}

export function buildPlanningReference({ instrument, horizon, language }: PlanningReferenceInput): SimplePlanningReference {
  const t = copy[language]
  if (!Number.isFinite(instrument.lastPrice) || instrument.lastPrice <= 0) return unavailablePlanningReference(t.unavailable)
  const profile = bands[horizon]
  const level = (label: string, value: string): SimplePlanningLevel => ({ label, value, note: t.levelNote })
  return {
    available: true,
    reason: language === 'ko' ? '현재가에서 떨어진 고정 비율 거리입니다.' : 'Fixed-percentage distances from the current price.',
    observationArea: level(t.observation, t.belowRange(profile.observation[0], profile.observation[1])),
    riskCheckArea: level(t.risk, t.below(profile.risk)),
    upsideCheckArea: level(t.upside, t.aboveRange(profile.upside[0], profile.upside[1])),
    notes: [t.note],
  }
}
