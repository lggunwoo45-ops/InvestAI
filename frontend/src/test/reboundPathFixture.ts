import { analysisIntervals, type AnalysisFrame, type AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { supportNow } from './majorSupportFixture'

export function pathSeries(price = 100): Record<AnalysisFrame, AnalysisSeries> {
  return Object.fromEntries(Object.entries(analysisIntervals).map(([frame, interval]) => {
    const end = Math.floor(supportNow / interval) * interval
    return [frame, { dataQuality: 'live', connectionStatus: 'live', updatedAt: supportNow, currentPrice: price,
      candles: Array.from({ length: 120 }, (_, i) => {
        const amplitude = i < 40 ? 16 : i < 80 ? 9 : 5, close = 100 + Math.sin(i * Math.PI / 8) * amplitude
        return { timestamp: end - (120 - i) * interval, open: close, close, low: close - 1, high: close + 1, volume: 100 }
      }) }]
  })) as unknown as Record<AnalysisFrame, AnalysisSeries>
}


