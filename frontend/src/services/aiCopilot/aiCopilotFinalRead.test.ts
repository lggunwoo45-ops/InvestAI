import { describe, expect, it } from 'vitest'

import type { CandidateReviewScore } from '@/services/candidateScore/candidateReviewScore'
import type { PracticalDecisionResult, PracticalDecisionState } from '@/types/practicalDecision'
import { buildAiCopilotFinalRead, formatAiCopilotFinalReadSummary } from './aiCopilotFinalRead'

const score: CandidateReviewScore = { score: 72, level: 'moderate', label: 'Medium', summary: 'Evidence is usable.', factors: [], cautions: [] }
const decision = (state: PracticalDecisionState): PracticalDecisionResult => ({ state, title: state, summary: 'Summary', reason: 'Existing evidence reason.', nextCheck: 'Check the next evidence change.', caution: 'Existing caution.', source: 'analysis', horizon: 'short', dataQuality: state === 'unavailable' ? 'unavailable' : 'live' })

describe('buildAiCopilotFinalRead', () => {
  it.each([
    ['wait', 'wait', '최종 검토 판단: 관망'],
    ['watch', 'keepWatching', '최종 검토 판단: 관심 유지'],
    ['approachReview', 'approachReviewPossible', '최종 검토 판단: 접근 검토 가능'],
    ['extendedCaution', 'extendedCaution', '최종 검토 판단: 이미 움직임 큼'],
  ] as const)('maps %s to %s', (practicalState, expectedState, title) => {
    expect(buildAiCopilotFinalRead({ language: 'ko', practicalDecision: decision(practicalState), reviewScore: score })).toMatchObject({ state: expectedState, title })
  })

  it('prioritizes snapshot change and active recorded-position context', () => {
    expect(buildAiCopilotFinalRead({ language: 'ko', practicalDecision: decision('watch'), reviewScore: score, freshness: 'changeReview' }).state).toBe('changeCheckNeeded')
    expect(buildAiCopilotFinalRead({ language: 'ko', practicalDecision: decision('watch'), reviewScore: score, hasRecordedPrice: true, positionReviewActive: true }).state).toBe('holdingBasisReview')
  })

  it('uses not enough data when a practical basis or review score is unavailable', () => {
    expect(buildAiCopilotFinalRead({ language: 'ko', practicalDecision: null, reviewScore: null }).state).toBe('notEnoughData')
    expect(buildAiCopilotFinalRead({ language: 'en', practicalDecision: decision('watch'), reviewScore: { ...score, score: null, level: 'unavailable' } }).title).toBe('Final review: Not enough data')
  })

  it('caps an aggressive crypto conclusion when the Bitcoin anchor is on volatility watch', () => {
    const result = buildAiCopilotFinalRead({ language: 'en', practicalDecision: decision('approachReview'), reviewScore: score, isCrypto: true, btcAnchorContext: 'volatilityWatch' })
    expect(result.state).toBe('keepWatching')
    expect(result.why).toContain('Bitcoin market volatility')
  })

  it('adds wider-market caution without forcing a positive conclusion', () => {
    const result = buildAiCopilotFinalRead({ language: 'en', practicalDecision: decision('watch'), reviewScore: score, marketBriefDirection: 'downsidePressure' })
    expect(result.state).toBe('keepWatching')
    expect(result.caution).toContain('downside or volatility pressure')
  })

  it('formats a safe bilingual copy summary without prohibited order wording', () => {
    const result = buildAiCopilotFinalRead({ language: 'ko', practicalDecision: decision('approachReview'), reviewScore: score, hasTechnicalLevels: true })
    const combined = `${JSON.stringify(result)}\n${formatAiCopilotFinalReadSummary(result, 'ko')}`
    expect(combined).toContain('AI 코파일럿 최종 검토')
    expect(combined).toContain('판단 보조 정보이며 거래 지시가 아닙니다.')
    expect(combined).not.toMatch(/매수|매도|매수가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i)
  })
})
