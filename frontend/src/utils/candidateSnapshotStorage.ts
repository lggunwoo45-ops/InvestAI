import type { WatchCandidate, WatchCandidateHorizon, WatchCandidateLifecycleStatus } from '@/types/watchCandidate'

export const CANDIDATE_SNAPSHOT_STORAGE_KEY = 'market-copilot.cryptoCandidateSnapshot.v1'
const SCHEMA_VERSION = 1

export interface CandidateScoreSnapshot { instrumentId: string; horizon: WatchCandidateHorizon; score: number; riskScore: number; incomplete: boolean; updatedAt: string }
export type CandidateScoreSnapshotMap = Readonly<Record<string, CandidateScoreSnapshot>>
const keyFor = (instrumentId: string, horizon: WatchCandidateHorizon) => `${instrumentId}::${horizon}`
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const horizons = new Set<WatchCandidateHorizon>(['short', 'swing', 'long'])
function valid(value: unknown): value is CandidateScoreSnapshot { return isRecord(value) && typeof value.instrumentId === 'string' && typeof value.horizon === 'string' && horizons.has(value.horizon as WatchCandidateHorizon) && typeof value.score === 'number' && Number.isFinite(value.score) && typeof value.riskScore === 'number' && Number.isFinite(value.riskScore) && typeof value.incomplete === 'boolean' && typeof value.updatedAt === 'string' && !Number.isNaN(Date.parse(value.updatedAt)) }

export function loadCandidateSnapshots(storage: Pick<Storage, 'getItem' | 'removeItem'> = window.localStorage): CandidateScoreSnapshotMap {
  try { const raw = storage.getItem(CANDIDATE_SNAPSHOT_STORAGE_KEY); if (!raw) return {}; const parsed: unknown = JSON.parse(raw); if (!isRecord(parsed) || parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.snapshots) || !parsed.snapshots.every(valid)) throw new Error('Invalid snapshots'); return Object.fromEntries(parsed.snapshots.map((item) => [keyFor(item.instrumentId, item.horizon), item])) } catch { try { storage.removeItem(CANDIDATE_SNAPSHOT_STORAGE_KEY) } catch { /* Safe fallback. */ } return {} }
}

export function lifecycleFromSnapshot(candidate: Pick<WatchCandidate, 'instrumentId' | 'horizon' | 'watchScore' | 'scoreLabel' | 'evidence'>, snapshots: CandidateScoreSnapshotMap): WatchCandidateLifecycleStatus {
  const previous = snapshots[keyFor(candidate.instrumentId, candidate.horizon)]
  if (!previous) return 'new'
  const riskScore = candidate.evidence.find((item) => item.type === 'risk')?.score ?? 0
  if (candidate.scoreLabel === 'incomplete' || riskScore < previous.riskScore) return 'review-needed'
  const change = candidate.watchScore - previous.score
  return change >= 6 ? 'strengthened' : change <= -6 ? 'weakened' : 'maintained'
}

export function saveCandidateSnapshots(candidates: readonly WatchCandidate[], storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'> = window.localStorage): void {
  const current = loadCandidateSnapshots(storage)
  const now = new Date().toISOString()
  const next = { ...current }
  for (const candidate of candidates) next[keyFor(candidate.instrumentId, candidate.horizon)] = { instrumentId: candidate.instrumentId, horizon: candidate.horizon, score: candidate.watchScore, riskScore: candidate.evidence.find((item) => item.type === 'risk')?.score ?? 0, incomplete: candidate.scoreLabel === 'incomplete', updatedAt: now }
  try { storage.setItem(CANDIDATE_SNAPSHOT_STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, snapshots: Object.values(next) })) } catch { /* Keep current UI usable. */ }
}
