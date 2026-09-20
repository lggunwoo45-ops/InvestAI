export type AiProductTier = 'free' | 'basic' | 'pro'
export type AiFeatureKey = 'marketRadar' | 'cryptoWatchCandidates' | 'candidatePlanningZones' | 'localNotes' | 'newsOriginal' | 'aiNewsSummary' | 'aiCandidateAnalysis' | 'aiDeepDive' | 'sectorWatchCandidates' | 'portfolioAnalysis' | 'translationSummary' | 'aiAlerts'
export type AiFeatureAccess = 'available' | 'limited' | 'locked' | 'planned'
export type AiUsageUnit = 'credit' | 'request' | 'report'
export type AiRequestType = 'newsSummary' | 'candidateAnalysis' | 'deepDive' | 'sectorPicks' | 'translationSummary' | 'portfolioAnalysis'

export interface AiTierPolicy {
  tier: AiProductTier
  label: string
  monthlyPricePlaceholder: string
  monthlyCredits: number
  dailySoftLimit: number
  features: Readonly<Record<AiFeatureKey, AiFeatureAccess>>
  description: string
  disclaimer: string
}

export interface AiUsageEstimate {
  requestType: AiRequestType
  label: string
  estimatedCredits: number
  estimatedInputSize: string
  estimatedOutputSize: string
  recommendedTier: AiProductTier
  cacheable: boolean
  notes: string
  unit: AiUsageUnit
}

export interface AiUsageDecision {
  tier: AiProductTier
  requestType: AiRequestType
  access: AiFeatureAccess
  executable: false
  estimatedCredits: number
  reason: string
  cacheable: boolean
  safetyNote: string
}
