import { describe, expect, it } from 'vitest'

import type { ActionReadinessStatus } from '@/types/myAnalysis'
import { buildPracticalDecision } from './practicalDecisionModel'

const result = (actionStatus: ActionReadinessStatus, language: 'en' | 'ko' = 'ko', extra = {}) => buildPracticalDecision({ language, horizon: 'short', dataQuality: 'live', actionStatus, source: 'analysis', ...extra })

describe('buildPracticalDecision', () => {
  it.each([
    ['waiting', '아직 대기'], ['watchZone', '관심 등록'], ['conditionalApproach', '접근 검토 가능'], ['chaseCaution', '이미 움직임 큼'],
  ] as const)('maps %s to a practical Korean read', (status, title) => expect(result(status).title).toBe(title))

  it('maps change, holding, post-drop, unavailable, and English states', () => {
    expect(result('waiting', 'ko', { freshness: 'changeReview' }).title).toBe('변화 확인 필요')
    expect(result('waiting', 'ko', { hasAveragePrice: true }).title).toBe('보유 기준 재확인')
    expect(result('sharpDropReboundCaution').title).toBe('급락 후 확인 필요')
    expect(buildPracticalDecision({ language: 'ko', horizon: 'short', dataQuality: 'mock', actionStatus: 'watchZone', source: 'analysis' }).title).toBe('판단 근거 부족')
    expect(result('conditionalApproach', 'en').title).toBe('Approach review possible')
  })

  it('keeps an overridden holding state internally consistent', () => {
    const value = result('watchZone', 'en', { hasAveragePrice: true, reason: 'Old watch reason', nextCheck: 'Old watch check' })
    expect(value.state).toBe('holdingRecheck')
    expect(value.reason).not.toContain('Old watch reason')
    expect(value.nextCheck).not.toContain('Old watch check')
  })

  it('contains no positive action instruction', () => {
    const value = result('conditionalApproach', 'en')
    expect(`${value.title} ${value.summary} ${value.reason} ${value.nextCheck}`).not.toMatch(/buy|sell|entry price|stop loss|target price|take profit/i)
  })
})
