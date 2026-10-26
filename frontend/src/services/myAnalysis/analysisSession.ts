import type { AnalysisIntent } from '@/types/myAnalysis'
import { cloudSnapshot } from '@/services/cloud/cloudClient'

export const ANALYSIS_SESSION_KEY = 'investai.analysis-session.v1'
const storageKey=()=>cloudSnapshot().user?`${ANALYSIS_SESSION_KEY}.${cloudSnapshot().user!.id}`:ANALYSIS_SESSION_KEY
export type AnalysisTab = 'summary' | 'details' | 'investment'
export interface AnalysisSession { query: string; intent: AnalysisIntent; note: string; averagePrice: string; tab: AnalysisTab; positionBasis: string }
export function analysisContextKey(query: string) {
  const p = new URLSearchParams(query)
  return ['instrumentId', 'positionId', 'snapshotId', 'snapshotItemId', 'bucketId'].map(k => p.get(k) ?? '').join('\u001f')
}
export function readAnalysisSession(): AnalysisSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey()) ?? 'null') as AnalysisSession | null
    if (!value || typeof value.query !== 'string' || value.query.length > 2000 || !new URLSearchParams(value.query).get('instrumentId')
      || !['watching', 'holding', 'longTerm', 'swing', 'shortTerm'].includes(value.intent)
      || !['summary', 'details', 'investment'].includes(value.tab) || typeof value.note !== 'string' || value.note.length > 10000
      || typeof value.averagePrice !== 'string' || value.averagePrice.length > 100 || typeof value.positionBasis !== 'string') return null
    return value
  } catch { return null }
}
export function saveAnalysisSession(value: AnalysisSession) {
  try { sessionStorage.setItem(storageKey(), JSON.stringify(value)) } catch { /* Navigation must work when storage is blocked. */ }
}
