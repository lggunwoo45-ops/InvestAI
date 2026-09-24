import { describe, expect, it } from 'vitest'

import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import type { CandidateSnapshotBuildSource } from '@/types/candidateSnapshot'
import type { MarketInstrument } from '@/types/market'
import type { WatchCandidate } from '@/types/watchCandidate'
import { buildCandidateSnapshot } from './candidateSnapshotBuilder'

const candidate = (instrumentId: string, symbol: string): WatchCandidate => ({ id: `watch-${instrumentId}`, instrumentId, symbol, name: symbol, assetType: 'crypto', horizon: 'short', lifecycleStatus: 'new', reviewCadence: 'Daily', planningZones: { interestArea: 'not persisted', secondInterestArea: 'not persisted', targetObservationArea: 'not persisted', invalidationRiskArea: 'not persisted', riskRewardNote: 'not persisted', confidenceNote: 'not persisted' }, rank: 1, watchScore: 70, scoreLabel: 'medium', summary: 'Summary', watchReason: `Reason for ${symbol}`, evidence: [], riskSummary: 'Risk', invalidationSummary: 'Review', nextWatchPoints: [], newsEvidence: { source: 'none', scope: 'none', count: 0, headlines: [], generated: false, disclaimer: 'Source only' }, disclaimer: 'Record only' })
const source = (id: string, symbol: string, price: number): CandidateSnapshotBuildSource => {
  const instrument: MarketInstrument = { id, marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol, name: symbol, quoteCurrency: 'KRW', lastPrice: price, change24hPercent: 1, volume24h: 100 }
  const watch = candidate(id, symbol)
  return { instrument, candidate: watch, analysis: buildMyInstrumentAnalysis({ instrument, candidate: watch, intent: 'watching', userNote: 'must not persist', averagePrice: 123, catalogSource: 'live', newsResult: null, language: 'en' }) }
}

describe('buildCandidateSnapshot', () => {
  it('preserves order and captures reason and rule basis', () => {
    const snapshot = buildCandidateSnapshot({ sources: [source('btc', 'BTC/KRW', 100), source('eth', 'ETH/KRW', 50)], generatedAt: '2026-09-25T00:00:00.000Z', expiresAt: '2026-09-26T00:00:00.000Z', snapshotId: 'snapshot-1', catalogSource: 'live', providerLabel: 'Upbit KRW' })!
    expect(snapshot.items.map((item) => item.instrumentId)).toEqual(['btc', 'eth'])
    expect(snapshot.items.map((item) => item.order)).toEqual([1, 2])
    expect(snapshot.items[0].reasonText).toBe('Reason for BTC/KRW')
    expect(snapshot.items[0].ruleBasis.length).toBeGreaterThan(0)
  })

  it('does not persist personal or transaction planning fields', () => {
    const snapshot = buildCandidateSnapshot({ sources: [source('btc', 'BTC/KRW', 100)], generatedAt: '2026-09-25T00:00:00.000Z', expiresAt: '2026-09-26T00:00:00.000Z', snapshotId: 'snapshot-1', catalogSource: 'live', providerLabel: 'Upbit KRW' })!
    const json = JSON.stringify(snapshot)
    expect(json).not.toMatch(/averagePrice|userNote|memo|targetPrice|stopPrice|takeProfit|watchScore/)
  })

  it('records no more than five candidates', () => {
    const sources = Array.from({ length: 7 }, (_, index) => source(`asset-${index}`, `ASSET${index}/KRW`, 100 + index))
    const snapshot = buildCandidateSnapshot({ sources, generatedAt: '2026-09-25T00:00:00.000Z', expiresAt: '2026-09-26T00:00:00.000Z', snapshotId: 'snapshot-1', catalogSource: 'live', providerLabel: 'Upbit KRW' })!
    expect(snapshot.items).toHaveLength(5)
    expect(snapshot.items.map((item) => item.order)).toEqual([1, 2, 3, 4, 5])
  })

  it('rejects an invalid basis price', () => {
    expect(buildCandidateSnapshot({ sources: [source('btc', 'BTC/KRW', Number.NaN)], generatedAt: '2026-09-25T00:00:00.000Z', expiresAt: '2026-09-26T00:00:00.000Z', snapshotId: 'snapshot-1', catalogSource: 'live', providerLabel: 'Upbit KRW' })).toBeNull()
  })
})
