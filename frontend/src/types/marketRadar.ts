import type { MarketDataMode } from '@/types/market'

export type MarketRadarSignalType = 'hotSector' | 'unusualVolume' | 'volatility' | 'watchCandidate' | 'newsTheme' | 'risk'
export type MarketRadarScope = 'crypto' | 'korea' | 'us' | 'macro' | 'mixed'
export type MarketRadarSignalStatus = 'active' | 'watch' | 'caution' | 'incomplete'
export type MarketRadarSignalSource = 'rule-based' | 'mock' | 'local-proxy' | 'none'

export interface MarketRadarSignal {
  id: string
  type: MarketRadarSignalType
  scope: MarketRadarScope
  title: string
  summary: string
  evidenceLabel: string
  relatedSymbols: readonly string[]
  relatedMarkets: readonly string[]
  relatedInstrumentIds: readonly string[]
  score: number
  status: MarketRadarSignalStatus
  source: MarketRadarSignalSource
  disclaimer: string
}

export interface MarketRadarSnapshot {
  generatedAt: string
  mode: MarketDataMode
  newsSource: MarketRadarSignalSource
  signals: readonly MarketRadarSignal[]
  hotSectors: readonly MarketRadarSignal[]
  unusualVolume: readonly MarketRadarSignal[]
  volatilityRadar: readonly MarketRadarSignal[]
  watchCandidates: readonly MarketRadarSignal[]
  newsThemes: readonly MarketRadarSignal[]
  riskNotes: readonly string[]
}

