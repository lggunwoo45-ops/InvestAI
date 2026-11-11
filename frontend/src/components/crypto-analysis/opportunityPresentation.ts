import { useState } from 'react'
import { validOpportunityCost, type OpportunityPlan, type CheckKey } from '@/services/cryptoAnalysis/opportunityEngine'

export function useCost() {
  const [value, setValue] = useState(() => { try { const v = localStorage.getItem('investai.opportunity.cost.v1'); if (v !== null && v.trim() && validOpportunityCost(Number(v))) return v } catch { /* Optional preference. */ } return '0.2' })
  const cost = value.trim() ? Number(value) : NaN
  const change = (v: string) => { setValue(v); if (v.trim() && validOpportunityCost(Number(v))) try { localStorage.setItem('investai.opportunity.cost.v1',v) } catch { /* Session still works. */ } }
  return { value, cost, change }
}
export function checkText(plan:OpportunityPlan, key:CheckKey, ko:boolean) {
  const rules:Record<CheckKey,string> = ko ? {
    regime:plan.kind === 'pullback' ? '큰 흐름이 상승 우세' : plan.kind === 'rebound' ? '상위 시간대 하락 속 반등 전략' : '상위 시간대가 하락 우세가 아님',
    close:plan.kind === 'pullback' ? '1시간봉이 지지 구간 안에서 전 봉보다 높게 상승 마감' : '1시간봉이 돌파 기준 위에서 상승 마감',
    volume:`1시간 거래량이 이전 20개 봉 평균의 ${plan.volumeRequired}배 이상`,
    recovery:'직전 RSI 45 이하에서 2 이상 회복하고 현재 RSI 35~65', price:'현재 가격이 진입 검토 구간 안에 있음',
    structure:'손절 < 진입 구간 < 실제 고점·이동평균 기반 목표', reward:'거래 비용을 뺀 손익비가 1.5 이상',
    heat:'단기 과열·급격한 가격 이탈 없음', risk:'현재 가격이 손절 기준보다 높음', context:'확인된 매도 체결·알트 약세 경고 없음',
  } : {
    regime:plan.kind === 'pullback' ? 'Higher-timeframe uptrend' : plan.kind === 'rebound' ? 'Countertrend setup within a higher-timeframe decline' : 'Higher timeframe is not bearish',
    close:plan.kind === 'pullback' ? 'Hourly bullish close inside support, above the previous close' : 'Hourly bullish close above the breakout threshold',
    volume:`Hourly volume at least ${plan.volumeRequired}× the previous 20-bar average`, recovery:'RSI recovers by 2+ from 45 or less, now between 35 and 65', price:'Current price remains inside the entry zone',
    structure:'Stop < entry zone < observed swing / moving-average target', reward:'Reward/risk after assumed costs is at least 1.5', heat:'No short-term overheating or sudden price displacement', risk:'Current price is above the stop reference', context:'No observed selling-flow or altcoin-weakness warning',
  }
  return rules[key]
}
