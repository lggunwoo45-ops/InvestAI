import { describe, expect, it } from 'vitest'

import type { CandidateReviewScore } from '@/services/candidateScore/candidateReviewScore'
import type { AiScenarioAnalysis } from '@/types/aiScenario'
import type { PracticalDecisionResult, PracticalDecisionState } from '@/types/practicalDecision'
import { applyFinalReadToScenarioAnalysis, buildAiCopilotFinalRead, formatAiCopilotFinalReadSummary, type AiCopilotFinalReadEvidence } from './aiCopilotFinalRead'

const reviewScore = (score: number | null): CandidateReviewScore => ({ score, level: score === null ? 'unavailable' : score >= 75 ? 'strong' : score >= 45 ? 'moderate' : 'low', label: 'Review', summary: 'Evidence summary.', factors: [], cautions: [] })
const decision = (state: PracticalDecisionState): PracticalDecisionResult => ({ state, title: state, summary: 'Summary', reason: 'Evidence reason.', nextCheck: 'Check evidence.', caution: 'Caution.', source: 'analysis', horizon: 'short', dataQuality: state === 'unavailable' ? 'unavailable' : 'live' })
const baseEvidence: AiCopilotFinalReadEvidence = {
  symbol: 'BTC/KRW', marketType: 'upbit-krw', currentPriceAvailable: true, priceSeriesAvailable: true,
  candidateReviewScore: 58, practicalDecisionState: 'watch', technicalTrend: 'neutral', momentumState: 'neutral',
  volumeState: 'normal', supportResistanceState: 'balanced', btcAnchorState: 'stable', marketCautionState: 'neutral',
  positionReviewActive: false, changeReviewActive: false, dataQuality: 'live', recentMovePercent: 0.8, priceExtendedFromAverage: false,
}
const build = (evidence: Partial<AiCopilotFinalReadEvidence>, language: 'en' | 'ko' = 'ko') => {
  const merged = { ...baseEvidence, ...evidence }
  return buildAiCopilotFinalRead({ language, evidence: merged, practicalDecision: decision(merged.practicalDecisionState ?? 'wait'), reviewScore: reviewScore(merged.candidateReviewScore) })
}

describe('buildAiCopilotFinalRead', () => {
  it('returns 접근 검토 가능 for strong constructive evidence', () => {
    expect(build({ candidateReviewScore: 76, practicalDecisionState: 'approachReview', technicalTrend: 'upward', momentumState: 'positive', supportResistanceState: 'balanced' })).toMatchObject({ state: 'approachReviewPossible', title: '접근 검토 가능' })
  })

  it('returns 관심 유지 for mixed evidence', () => {
    expect(build({ candidateReviewScore: 55, technicalTrend: 'neutral', momentumState: 'neutral' })).toMatchObject({ state: 'keepWatching', title: '관심 유지' })
  })

  it('returns 관망 for weak evidence instead of treating it as the universal default', () => {
    expect(build({ candidateReviewScore: 28, practicalDecisionState: 'wait', technicalTrend: 'downward', momentumState: 'negative', supportResistanceState: 'balanced' })).toMatchObject({ state: 'wait', title: '관망' })
  })

  it('returns 이미 움직임 큼 for extended evidence', () => {
    expect(build({ candidateReviewScore: 80, momentumState: 'strongPositive', volumeState: 'elevated' })).toMatchObject({ state: 'extendedCaution', title: '이미 움직임 큼' })
  })

  it('prioritizes missing data, changed basis, and active position context', () => {
    expect(build({ currentPriceAvailable: false }).state).toBe('notEnoughData')
    expect(build({ changeReviewActive: true }).state).toBe('changeCheckNeeded')
    expect(build({ positionReviewActive: true, changeReviewActive: true }).state).toBe('holdingBasisReview')
  })

  it('caps an aggressive crypto conclusion when Bitcoin volatility is active', () => {
    const result = build({ candidateReviewScore: 82, practicalDecisionState: 'approachReview', technicalTrend: 'upward', momentumState: 'positive', btcAnchorState: 'volatilityWatch' }, 'en')
    expect(result.state).toBe('keepWatching')
    expect(result.why).toContain('Bitcoin volatility')
  })

  it('lowers confidence and adds caution when wider-market caution is active', () => {
    const result = build({ candidateReviewScore: 82, practicalDecisionState: 'approachReview', technicalTrend: 'upward', momentumState: 'positive', marketCautionState: 'downsidePressure' }, 'en')
    expect(result.state).toBe('keepWatching')
    expect(result.confidenceLabel).toBe('Low')
    expect(result.caution).toContain('downside or volatility pressure')
  })

  it('produces different states and evidence for two different selected instruments', () => {
    const constructive = build({ symbol: 'AAA/KRW', candidateReviewScore: 72, practicalDecisionState: 'approachReview', technicalTrend: 'upward', momentumState: 'positive' })
    const weak = build({ symbol: 'BBB/KRW', candidateReviewScore: 20, practicalDecisionState: 'wait', technicalTrend: 'downward', momentumState: 'negative' })
    expect(constructive.state).not.toBe(weak.state)
    expect(constructive.sourceFactors.join(' ')).toContain('AAA/KRW')
    expect(weak.sourceFactors.join(' ')).toContain('BBB/KRW')
  })

  it('adapts scenario wording to the same final-read evidence context', () => {
    const scenario = { instrumentId: 'btc', generatedAt: '', providerMode: 'mock', confidence: null, marketBias: 'mixed', timeframe: 'short', scenarios: {
      bullish: { kind: 'bullish', status: 'watch', label: 'Bullish', probability: null, summary: 'base', conditions: [], checks: [], invalidation: 'base', risks: [] },
      neutral: { kind: 'neutral', status: 'wait', label: 'Neutral', probability: null, summary: 'base', conditions: [], checks: [], invalidation: 'base', risks: [] },
      bearish: { kind: 'bearish', status: 'risk', label: 'Bearish', probability: null, summary: 'base', conditions: [], checks: [], invalidation: 'base', risks: [] },
    }, scenarioMap: { bullish: '', neutral: '', bearish: '' }, rationale: [], watchConditions: [], riskFactors: [], tradePlan: { firstInterestArea: '', secondInterestArea: '', invalidationCondition: '', targetArea: '' }, evidence: { priceAction: 'mock-placeholder', volume: 'mock-placeholder', newsContext: 'demo-only', marketRegime: 'mock-placeholder', missingEvidence: [] }, disclaimer: '' } satisfies AiScenarioAnalysis
    const finalRead = build({ candidateReviewScore: 30, practicalDecisionState: 'wait', technicalTrend: 'downward', momentumState: 'negative' }, 'en')
    const adapted = applyFinalReadToScenarioAnalysis(scenario, finalRead, 'en')
    expect(adapted.scenarios.bullish.summary).toContain('requires clearer momentum')
    expect(adapted.scenarios.neutral.summary).toContain('observation mode')
    expect(adapted.scenarios.bearish.summary).toContain('structure weakness')
  })

  it('formats evidence in the copied summary and contains no prohibited instruction wording', () => {
    const result = build({ candidateReviewScore: 72, practicalDecisionState: 'approachReview', technicalTrend: 'upward', momentumState: 'positive' })
    const combined = `${JSON.stringify(result)}\n${formatAiCopilotFinalReadSummary(result, 'ko')}`
    expect(combined).toContain('참고 근거')
    expect(combined).toContain('접근 검토 가능')
    expect(combined).not.toMatch(/매수|매도|매수가|진입가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i)
  })

  it('guards against all normal fixtures collapsing into 관망', () => {
    const states = [
      build({ candidateReviewScore: 76, practicalDecisionState: 'approachReview', technicalTrend: 'upward', momentumState: 'positive' }).state,
      build({ candidateReviewScore: 55, technicalTrend: 'neutral' }).state,
      build({ candidateReviewScore: 25, technicalTrend: 'downward', momentumState: 'negative' }).state,
      build({ momentumState: 'strongPositive' }).state,
    ]
    expect(new Set(states).size).toBeGreaterThan(2)
    expect(states.every((state) => state === 'wait')).toBe(false)
  })
})
