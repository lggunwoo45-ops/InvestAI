import { deriveBeginnerInterestStage } from '@/components/my-analysis/BeginnerInterestZone/beginnerInterestZoneModel'
import type { CandidateSnapshot, CandidateSnapshotBuildSource, CandidateSnapshotCurrentState, CandidateSnapshotItem } from '@/types/candidateSnapshot'

export const CANDIDATE_SNAPSHOT_ENGINE_VERSION = 'candidate-snapshot-v1'
export const CANDIDATE_SNAPSHOT_SCHEMA_VERSION = 1 as const
export const CANDIDATE_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1_000

export function deriveCandidateSnapshotExpiry(generatedAt: string, ttlMs = CANDIDATE_SNAPSHOT_TTL_MS) {
  return new Date(Date.parse(generatedAt) + ttlMs).toISOString()
}

function movementBand(source: CandidateSnapshotBuildSource) {
  return source.analysis.actionReadiness.ruleBasis.find((item) => item.key === 'movementBand')?.value ?? 'Unavailable'
}

function newsState(source: CandidateSnapshotBuildSource) {
  return source.analysis.actionReadiness.ruleBasis.find((item) => item.key === 'newsState')?.value ?? 'Unavailable'
}

export function buildCandidateCurrentState(source: CandidateSnapshotBuildSource): CandidateSnapshotCurrentState {
  return {
    instrumentId: source.instrument.id,
    currentPrice: source.instrument.lastPrice,
    interestStage: deriveBeginnerInterestStage(source.analysis),
    actionStatus: source.analysis.actionReadiness.status,
    clarity: source.analysis.actionReadiness.strength,
    ruleBasis: source.analysis.actionReadiness.ruleBasis.map((item) => ({ ...item })),
    dataQuality: source.analysis.dataQuality,
  }
}

function item(source: CandidateSnapshotBuildSource, order: number): CandidateSnapshotItem | null {
  const { instrument, candidate, analysis } = source
  if (!Number.isFinite(instrument.lastPrice) || instrument.lastPrice <= 0 || !Number.isFinite(instrument.change24hPercent) || !Number.isFinite(instrument.volume24h)) return null
  return {
    instrumentId: instrument.id,
    symbol: instrument.displaySymbol ?? instrument.symbol,
    displayName: instrument.name,
    assetType: candidate.assetType,
    marketId: instrument.marketId,
    quoteCurrency: instrument.quoteCurrency,
    order,
    basisPrice: instrument.lastPrice,
    basisChange24hPercent: instrument.change24hPercent,
    basisVolume24h: instrument.volume24h,
    basisMovementBand: movementBand(source),
    interestStage: deriveBeginnerInterestStage(analysis),
    actionStatus: analysis.actionReadiness.status,
    clarity: analysis.actionReadiness.strength,
    reasonText: candidate.watchReason,
    ruleBasis: analysis.actionReadiness.ruleBasis.map((entry) => ({ ...entry })),
    dataQuality: analysis.dataQuality,
    newsState: newsState(source),
    disclosureCount: source.disclosureCount ?? 0,
    latestDisclosureAt: source.latestDisclosureAt ?? null,
  }
}

interface BuildCandidateSnapshotInput {
  sources: readonly CandidateSnapshotBuildSource[]
  generatedAt: string
  expiresAt: string
  snapshotId: string
  catalogSource: string
  providerLabel: string
  engineVersion?: string
}

/** Pure snapshot builder. Time, identifier, catalog data, and expiry are all caller supplied. */
export function buildCandidateSnapshot(input: BuildCandidateSnapshotInput): CandidateSnapshot | null {
  const items = input.sources.slice(0, 5).map((source, index) => item(source, index + 1)).filter((entry): entry is CandidateSnapshotItem => entry !== null)
  if (items.length === 0) return null
  return { schemaVersion: CANDIDATE_SNAPSHOT_SCHEMA_VERSION, snapshotId: input.snapshotId, generatedAt: input.generatedAt, expiresAt: input.expiresAt, engineVersion: input.engineVersion ?? CANDIDATE_SNAPSHOT_ENGINE_VERSION, catalogSource: input.catalogSource, providerLabel: input.providerLabel, items }
}
