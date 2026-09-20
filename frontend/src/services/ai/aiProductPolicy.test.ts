import { describe, expect, it } from 'vitest'

import { aiTierPolicies, getAiTierPolicy } from './aiTierPolicy'
import { getAiUsageEstimate, listAiUsageEstimates } from './aiUsageEstimator'
import { evaluateAiUsage } from './aiUsageManager'

describe('AI product and usage policy', () => {
  it('returns deterministic Free, Basic, and Pro configurations', () => {
    expect(Object.keys(aiTierPolicies)).toEqual(['free', 'basic', 'pro'])
    expect(getAiTierPolicy('free').monthlyCredits).toBe(0)
    expect(getAiTierPolicy('basic').monthlyCredits).toBe(50)
    expect(getAiTierPolicy('pro').monthlyCredits).toBe(200)
  })

  it('keeps rule-based features free and locks AI-consuming features', () => {
    const free = getAiTierPolicy('free').features
    expect(free.cryptoWatchCandidates).toBe('available')
    expect(free.candidatePlanningZones).toBe('available')
    expect(free.localNotes).toBe('available')
    expect(free.newsInsight).toBe('available')
    expect(free.aiNewsSummary).toBe('locked')
    expect(free.aiCandidateAnalysis).toBe('locked')
  })

  it('exposes higher planned AI access in Basic and Pro', () => {
    expect(getAiTierPolicy('basic').features.aiCandidateAnalysis).toBe('limited')
    expect(getAiTierPolicy('pro').features.aiDeepDive).toBe('limited')
    expect(getAiTierPolicy('pro').features.sectorWatchCandidates).toBe('planned')
  })

  it('returns stable credit estimates without external pricing', () => {
    expect(getAiUsageEstimate('newsSummary').estimatedCredits).toBe(1)
    expect(getAiUsageEstimate('candidateAnalysis').estimatedCredits).toBe(2)
    expect(getAiUsageEstimate('deepDive').estimatedCredits).toBe(5)
    expect(getAiUsageEstimate('portfolioAnalysis').estimatedCredits).toBe(8)
    expect(getAiUsageEstimate('candidateReport').estimatedCredits).toBe(3)
    expect(listAiUsageEstimates()).toHaveLength(7)
  })

  it('never marks a planned request executable', () => {
    expect(evaluateAiUsage('free', 'candidateAnalysis')).toMatchObject({ access: 'locked', executable: false, estimatedCredits: 2 })
    expect(evaluateAiUsage('pro', 'deepDive')).toMatchObject({ access: 'limited', executable: false, estimatedCredits: 5 })
    expect(evaluateAiUsage('pro', 'sectorPicks')).toMatchObject({ access: 'planned', executable: false })
    expect(evaluateAiUsage('basic', 'candidateReport')).toMatchObject({ access: 'limited', executable: false })
  })
})
