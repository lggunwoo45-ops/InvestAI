export type AiScenarioProviderMode = 'mock' | 'real-ai-disabled' | 'future-ai'
export type AiMarketBias = 'bullish' | 'neutral' | 'bearish' | 'mixed'
export type AiScenarioTimeframe = 'short' | 'medium' | 'long'
export type AiScenarioKind = 'bullish' | 'neutral' | 'bearish'

export interface AiScenarioItem {
  kind: AiScenarioKind
  label: string
  /** Null until a real, validated model and probability methodology exist. */
  probability: number | null
  summary: string
  conditions: readonly string[]
  invalidation: string
  risks: readonly string[]
}

export interface AiScenarioTradePlan {
  firstInterestArea: string
  secondInterestArea: string
  invalidationCondition: string
  targetArea: string
}

/** Stable UI contract for a future AI provider. Sprint 9.0 supplies mock values only. */
export interface AiScenarioAnalysis {
  instrumentId: string
  generatedAt: string
  providerMode: AiScenarioProviderMode
  /** Placeholder only in mock mode; it is not a model probability. */
  confidence: number | null
  marketBias: AiMarketBias
  timeframe: AiScenarioTimeframe
  scenarios: Record<AiScenarioKind, AiScenarioItem>
  rationale: readonly string[]
  watchConditions: readonly string[]
  riskFactors: readonly string[]
  tradePlan: AiScenarioTradePlan
  disclaimer: string
}
