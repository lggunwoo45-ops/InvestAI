/** Future-only model contract. Sprint 7 does not calculate or display recommendations. */
export interface AiAssessmentPlaceholder {
  instrumentId: string
  modelId: string | null
  score: number | null
  confidence: number | null
  recommendation: 'buy' | 'hold' | 'sell' | null
  riskLevel: 'low' | 'medium' | 'high' | null
  trend: 'rising' | 'flat' | 'falling' | null
  explanation: string | null
}
