export type WatchCandidateAssetType = 'crypto' | 'stock'
export type WatchCandidateEvidenceType = 'momentum' | 'volume' | 'liquidity' | 'marketContext' | 'news' | 'risk' | 'scenario'
export type WatchCandidateEvidenceStatus = 'positive' | 'neutral' | 'risk' | 'missing' | 'demo'
export type WatchCandidateScoreLabel = 'high' | 'medium' | 'low' | 'incomplete'
export type WatchCandidateNewsSource = 'demo' | 'local-proxy' | 'browser-rss' | 'none'
export type WatchCandidateNewsScope = 'instrument' | 'market' | 'demo' | 'none'

export interface WatchCandidateBreakdown {
  type: WatchCandidateEvidenceType
  label: string
  score: number
  maxScore: number
  summary: string
  status: WatchCandidateEvidenceStatus
}

export interface WatchCandidateNewsEvidence {
  source: WatchCandidateNewsSource
  scope: WatchCandidateNewsScope
  count: number
  headlines: readonly string[]
  generated: boolean
  disclaimer: string
}

export interface WatchCandidate {
  id: string
  instrumentId: string
  symbol: string
  name: string
  assetType: WatchCandidateAssetType
  rank: number
  watchScore: number
  scoreLabel: WatchCandidateScoreLabel
  summary: string
  watchReason: string
  evidence: readonly WatchCandidateBreakdown[]
  riskSummary: string
  invalidationSummary: string
  nextWatchPoints: readonly string[]
  newsEvidence: WatchCandidateNewsEvidence
  disclaimer: string
}
