import type { Language } from '@/i18n/translations'
import type { AiFeatureKey, AiProductTier, AiRequestType, AiUsageDecision } from '@/types/aiProductTier'
import { getAiTierPolicy } from './aiTierPolicy'
import { getAiUsageEstimate } from './aiUsageEstimator'

const requestFeature: Readonly<Record<AiRequestType, AiFeatureKey>> = { newsSummary: 'aiNewsSummary', candidateAnalysis: 'aiCandidateAnalysis', deepDive: 'aiDeepDive', sectorPicks: 'sectorWatchCandidates', translationSummary: 'translationSummary', portfolioAnalysis: 'portfolioAnalysis' }

/** Planning-only decision. executable is intentionally always false until reviewed backend enforcement exists. */
export function evaluateAiUsage(tier: AiProductTier, requestType: AiRequestType, language: Language = 'en'): AiUsageDecision {
  const estimate = getAiUsageEstimate(requestType)
  const access = getAiTierPolicy(tier).features[requestFeature[requestType]]
  const reason = language === 'ko' ? access === 'locked' ? '이 기능은 현재 플랜에서 잠겨 있으며 아직 실행할 수 없습니다.' : access === 'planned' ? '향후 제공을 검토 중인 기능입니다.' : '향후 크레딧 제한이 적용될 예정이지만 현재는 실행할 수 없습니다.'
    : access === 'locked' ? 'This feature is locked for this planned tier and cannot run.' : access === 'planned' ? 'This feature is planned for a future release.' : 'Future credit limits will apply, but execution is not connected.'
  return { tier, requestType, access, executable: false, estimatedCredits: estimate.estimatedCredits, reason, cacheable: estimate.cacheable, safetyNote: language === 'ko' ? '실제 AI·결제·사용량 차감은 연결되지 않았습니다.' : 'No real AI, payment, or usage decrement is connected.' }
}
