import type { AiRequestType, AiUsageEstimate } from '@/types/aiProductTier'

const estimates: Readonly<Record<AiRequestType, AiUsageEstimate>> = {
  newsSummary: { requestType: 'newsSummary', label: 'AI news summary', estimatedCredits: 1, estimatedInputSize: 'One normalized article', estimatedOutputSize: 'Short evidence summary', recommendedTier: 'basic', cacheable: true, notes: 'Reuse by normalized article identity in a future backend.', unit: 'credit' },
  candidateAnalysis: { requestType: 'candidateAnalysis', label: 'AI candidate analysis', estimatedCredits: 2, estimatedInputSize: 'One evidence package', estimatedOutputSize: 'Structured explanation', recommendedTier: 'basic', cacheable: true, notes: 'Explain existing engine evidence; do not select unexplained winners.', unit: 'credit' },
  deepDive: { requestType: 'deepDive', label: 'Deep dive', estimatedCredits: 5, estimatedInputSize: 'Expanded evidence and scenarios', estimatedOutputSize: 'Long-form reviewed report', recommendedTier: 'pro', cacheable: true, notes: 'Refresh only when material evidence changes.', unit: 'report' },
  sectorPicks: { requestType: 'sectorPicks', label: 'Sector watch candidates', estimatedCredits: 5, estimatedInputSize: 'Sector evidence set', estimatedOutputSize: 'Evidence-based watch report', recommendedTier: 'pro', cacheable: true, notes: 'Future feature; candidates are not trade recommendations.', unit: 'report' },
  translationSummary: { requestType: 'translationSummary', label: 'Korean news summary', estimatedCredits: 1, estimatedInputSize: 'Original headline and article evidence', estimatedOutputSize: 'Separate labelled Korean summary', recommendedTier: 'basic', cacheable: true, notes: 'Preserve original headline and source link.', unit: 'credit' },
  portfolioAnalysis: { requestType: 'portfolioAnalysis', label: 'Portfolio analysis', estimatedCredits: 8, estimatedInputSize: 'Future consented portfolio context', estimatedOutputSize: 'Risk-focused report', recommendedTier: 'pro', cacheable: false, notes: 'Planned only; account and portfolio boundaries do not exist.', unit: 'report' },
}

export const getAiUsageEstimate = (requestType: AiRequestType): AiUsageEstimate => estimates[requestType]
export const listAiUsageEstimates = (): readonly AiUsageEstimate[] => Object.values(estimates)
