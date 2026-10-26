import { describe, expect, it } from 'vitest'
import { buildCryptoDecision } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import { simpleScanSelection } from './simpleScanSelection'

const now = 1_700_000_000_000
const empty = { candles: [], dataQuality: 'unavailable' as const, currentPrice: null, connectionStatus: 'disconnected' as const, updatedAt: null }
function result(id = 'btc', turnover = 100): ScanResult {
  const decision = buildCryptoDecision({ '1H': empty, '4H': empty, '1D': empty }, now)
  return { instrument: { id, name: id, symbol: id, marketId: 'upbit', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 1, volume24h: turnover }, analyzedAt: now, expiresAt: now + 90_000, timedOut: false,
    decision: { ...decision, price: 100, coverage: 2, direction: 'buy', action: 'entry', extended: false, mixed: false,
      frames: decision.frames.map(frame => ({ ...frame, issue: null, volumeRatio: 1.2 })),
      plan: { frame: '4H', entry: [98, 100], resistance: [110, 112], stop: 95, sellInvalidation: 114, target: 111, targetBasis: 'observed', supportBasis: 'pivot', rewardRisk: 3 },
    },
  }
}
describe('simple candidate shortlist', () => {
  it('returns at most three in turnover order, without mutating the scan', () => {
    const input = [result('a', 1), result('b', 3), result('c', 2), result('d', 4)]
    expect(simpleScanSelection(input, now).map(row => row.instrument.id)).toEqual(['d', 'b', 'c'])
    expect(input[0].instrument.id).toBe('a')
  })
  it('withdraws expired results and rejects future timestamps', () => {
    expect(simpleScanSelection([result()], now + 90_001)).toEqual([])
    expect(simpleScanSelection([result()], now - 1)).toEqual([])
  })
  it('never fills an empty shortlist with weak, simulated, extended or waiting results', () => {
    const seed = result()
    const variants = [
      { direction: 'unavailable' as const }, { direction: 'sell' as const }, { direction: 'neutral' as const },
      { extended: true }, { action: 'pullback' as const }, { action: 'wait' as const }, { plan: null },
      { plan: { ...seed.decision.plan!, rewardRisk: 1.4 } },
      { frames: seed.decision.frames.map(frame => ({ ...frame, volumeRatio: .9 })) },
    ]
    for (const patch of variants) expect(simpleScanSelection([{ ...seed, decision: { ...seed.decision, ...patch } }], now)).toEqual([])
  })
})
