import type { AnalysisDataQuality } from '@/types/myAnalysis'

export type PositionReviewState = 'waiting' | 'baselineValid' | 'invalidationReview' | 'profitProtection'

export interface PositionReviewResult {
  state: PositionReviewState
  difference: number | null
  percentChange: number | null
}

export function derivePositionReview(currentPrice: number, basisPrice: number | null, dataQuality: AnalysisDataQuality): PositionReviewResult {
  if (basisPrice === null || !Number.isFinite(basisPrice) || basisPrice <= 0 || !Number.isFinite(currentPrice) || dataQuality === 'unavailable') {
    return { state: 'waiting', difference: null, percentChange: null }
  }

  const difference = currentPrice - basisPrice
  const percentChange = (difference / basisPrice) * 100
  const state: PositionReviewState = percentChange >= 3 ? 'profitProtection' : percentChange <= -3 ? 'invalidationReview' : 'baselineValid'
  return { state, difference, percentChange }
}
