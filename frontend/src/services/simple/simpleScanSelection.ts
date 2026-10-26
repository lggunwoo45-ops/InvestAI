import { matchesScan, type ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import { contextExplanation } from '@/services/cryptoAnalysis/marketContext'

/** A small review list, never padded with stale, simulated or opposing results. */
export function simpleScanSelection(results: readonly ScanResult[], now: number) {
  return results.filter(result => matchesScan(result, {
    direction: 'buy', minimumVolumeRatio: 1, minimumRewardRisk: 1.5, excludeExtended: true,
  }, now) && result.decision.action === 'entry' && !contextExplanation(result.decision.context, true))
    .sort((a, b) => b.instrument.volume24h - a.instrument.volume24h || a.instrument.id.localeCompare(b.instrument.id))
    .slice(0, 3)
}
