import type { MyAnalysisResult } from '@/types/myAnalysis'

export type BeginnerInterestStage = 'waiting' | 'first' | 'second' | 'third' | 'chaseCaution' | 'reboundCaution'

export function deriveBeginnerInterestStage(analysis: MyAnalysisResult): BeginnerInterestStage {
  if (analysis.dataQuality !== 'live') return 'waiting'

  const plan = analysis.actionReadiness
  switch (plan.status) {
    case 'watchZone': return 'first'
    case 'conditionalApproach': return plan.strength === 'high' ? 'third' : 'second'
    case 'chaseCaution': return 'chaseCaution'
    case 'sharpDropReboundCaution': return 'reboundCaution'
    default: return 'waiting'
  }
}
