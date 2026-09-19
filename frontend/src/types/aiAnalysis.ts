import type { AiMarketBias, AiScenarioKind, AiScenarioTimeframe } from './aiScenario'
import type { MarketDataMode, MarketId } from './market'

export type AiAnalysisProviderMode = 'mock' | 'real-ai-disabled' | 'future-ai'
export type AiAnalysisStatus = 'mock-analysis' | 'incomplete-evidence' | 'unavailable'
export type AiEvidenceType = 'price' | 'volume' | 'news' | 'market' | 'scenario' | 'missing'
export type AiEvidenceStatus = 'available' | 'demo' | 'placeholder' | 'missing'

export interface AiAnalysisInput {
  instrument: {
    id: string
    symbol: string
    name: string
    marketId: MarketId
    marketLabel: string
    assetType: 'crypto' | 'stock'
  }
  quote: {
    currentPrice: number | null
    change24h: number | null
    volume24h: number | null
    quoteStatus: 'available' | 'missing'
  }
  marketContext: {
    marketType: string
    providerMode: MarketDataMode
    isLive: boolean
    sessionStatus: 'always-open' | 'unknown'
  }
  newsContext: {
    providerMode: 'mock' | 'rss-ready' | 'local-proxy'
    providerStatus: 'mock' | 'not-observed'
    relatedNewsCount: number
    relatedHeadlines: readonly string[]
    isDemoOnly: boolean
    isRealNewsAvailable: boolean
  }
  scenarioContext: {
    marketBias: AiMarketBias | null
    confidence: number | null
    timeframe: AiScenarioTimeframe | null
    scenarioMap: Readonly<Record<AiScenarioKind, string>> | null
    evidenceState: 'demo' | 'missing'
  }
  missingInputs: {
    realAi: boolean
    realNewsBackend: boolean
    backtesting: boolean
    portfolioContext: boolean
    realProbabilityModel: boolean
  }
  generatedAt: string
}

export type AiAnalysisContextBuildResult =
  | { status: 'ready'; input: AiAnalysisInput }
  | { status: 'unavailable'; input: null; reason: 'instrument-missing' }

export interface AiEvidenceItem {
  type: AiEvidenceType
  label: string
  value: string
  status: AiEvidenceStatus
}

export interface AiScenarioLink {
  kind: AiScenarioKind
  summary: string
}

export interface AiAnalysisResult {
  instrumentId: string
  generatedAt: string
  providerMode: AiAnalysisProviderMode
  status: AiAnalysisStatus
  summary: string
  watchReason: string
  evidenceUsed: readonly AiEvidenceItem[]
  missingEvidence: readonly string[]
  riskSummary: string
  invalidationSummary: string
  nextWatchPoints: readonly string[]
  scenarioLinks: readonly AiScenarioLink[]
  disclaimer: string
}
