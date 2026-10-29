import { analysisIntervals, buildCryptoDecision, type AnalysisFrame, type AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import type { MarketInstrument } from '@/types/market'

export const opportunityNow = Date.parse('2026-10-29T12:00:00Z')
export const opportunityCoin: MarketInstrument = { id:'upbit-sol', marketId:'upbit', symbol:'SOL/KRW', name:'Solana', quoteCurrency:'KRW', lastPrice:101.4, volume24h:10000, change24hPercent:-2 }
export function opportunitySeries(rebound = true): Record<AnalysisFrame, AnalysisSeries> {
  const make = (frame:AnalysisFrame): AnalysisSeries => {
    const interval = analysisIntervals[frame], end = Math.floor(opportunityNow / interval) * interval
    const closes = Array.from({length:80},(_,i)=>frame === '1H' ? rebound ? 130 - i * .4 : 99 + (i % 2 ? .6 : -.6) : rebound ? 150 - i * .4 : 95 + i * .02)
    if (frame === '1H') closes.splice(76,4,...(rebound ? [98,99,100,101.4] : [98.4,99.6,98.4,100.6]))
    const candles = closes.map((close,i)=>({timestamp:end - (80-i)*interval,open:i===79 ? closes[78] : close,close, high:Math.max(close,i===79 ? closes[78] : close)+.5,low:Math.min(close,i===79 ? closes[78] : close)-.5,volume:i===79 ? 160 : 100}))
    if (frame === '1H') { candles[78].high = rebound ? 100.8 : 100.1; if (!rebound) candles[25].high = 108 }
    return {candles,dataQuality:'live',connectionStatus:'live',currentPrice:rebound ? 101.4 : 100.6, updatedAt:opportunityNow}
  }
  return {'1H':make('1H'),'4H':make('4H'),'1D':make('1D')}
}
export const opportunityDecision = (rebound = true) => buildCryptoDecision(opportunitySeries(rebound),opportunityNow)
export const opportunityResult = (rebound = true):ScanResult => ({instrument:{...opportunityCoin,lastPrice:rebound ? 101.4 : 100.6},decision:opportunityDecision(rebound),analyzedAt:opportunityNow,expiresAt:opportunityNow+90_000,timedOut:false})
