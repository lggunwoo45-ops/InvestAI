import type { MyAnalysisResult } from '@/types/myAnalysis'

export type BeginnerInterestStage = 'waiting' | 'first' | 'second' | 'third' | 'chaseCaution' | 'reboundCaution'

export function deriveBeginnerInterestStage(analysis: MyAnalysisResult): BeginnerInterestStage {
  if (analysis.dataQuality !== 'live') return 'waiting'

  const plan = analysis.actionReadiness
  switch (plan.status) {
    case 'watchZone': return 'first'
    case 'conditionalApproach': {
      const candidateEvidence = analysis.evidence.some((item) => item.type === 'candidate')
      const relatedNewsEvidence = analysis.evidence.some((item) => item.type === 'news' && item.level === 'available')
      return candidateEvidence && relatedNewsEvidence ? 'third' : 'second'
    }
    case 'chaseCaution': return 'chaseCaution'
    case 'sharpDropReboundCaution': return 'reboundCaution'
    default: return 'waiting'
  }
}
