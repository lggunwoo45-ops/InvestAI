import type { Language } from '@/i18n/translations'
import type { NewsProviderMode } from '@/services/news/newsService'
import type { AiAnalysisContextBuildResult } from '@/types/aiAnalysis'
import type { AiScenarioAnalysis } from '@/types/aiScenario'
import type { NewsArticle } from '@/types/dashboard'
import type { MarketConnectionStatus, MarketDataMode, MarketInstrument } from '@/types/market'

export interface AiAnalysisContextSource {
  instrument: MarketInstrument | null
  scenario: AiScenarioAnalysis | null
  relatedNews: readonly NewsArticle[]
  newsProviderMode: NewsProviderMode
  marketDataMode: MarketDataMode
  connectionStatus?: MarketConnectionStatus
  language: Language
  now?: () => Date
}

const marketLabels = {
  en: { upbit: 'Upbit', 'binance-spot': 'Binance Spot', 'binance-futures': 'Binance Futures', 'korea-stock': 'Korea Stock', 'us-stock': 'US Stock' },
  ko: { upbit: '업비트', 'binance-spot': '바이낸스 현물', 'binance-futures': '바이낸스 선물', 'korea-stock': '한국 주식', 'us-stock': '미국 주식' },
} as const

function finite(value: number): number | null {
  return Number.isFinite(value) ? value : null
}

/** Builds the transparent evidence package; it never fetches data or calls a model. */
export function buildAiAnalysisContext(source: AiAnalysisContextSource): AiAnalysisContextBuildResult {
  const instrument = source.instrument
  if (!instrument?.id.trim() || !instrument.symbol.trim()) return { status: 'unavailable', input: null, reason: 'instrument-missing' }

  const currentPrice = finite(instrument.lastPrice)
  const change24h = finite(instrument.change24hPercent)
  const volume24h = finite(instrument.volume24h)
  const crypto = instrument.marketId === 'upbit' || instrument.marketId.startsWith('binance')
  const relatedNews = source.relatedNews.slice(0, 3)
  const isRealNewsAvailable = relatedNews.some((article) => !article.isMock)

  return {
    status: 'ready',
    input: {
      instrument: {
        id: instrument.id,
        symbol: instrument.symbol,
        name: instrument.name,
        marketId: instrument.marketId,
        marketLabel: marketLabels[source.language][instrument.marketId],
        assetType: crypto ? 'crypto' : 'stock',
      },
      quote: {
        currentPrice,
        change24h,
        volume24h,
        quoteStatus: currentPrice === null || change24h === null || volume24h === null ? 'missing' : 'available',
      },
      marketContext: {
        marketType: instrument.marketType ?? instrument.marketId,
        providerMode: source.marketDataMode,
        isLive: source.marketDataMode === 'live' && source.connectionStatus === 'live',
        sessionStatus: crypto ? 'always-open' : 'unknown',
      },
      newsContext: {
        providerMode: source.newsProviderMode,
        providerStatus: source.newsProviderMode === 'mock' ? 'mock' : 'not-observed',
        relatedNewsCount: relatedNews.length,
        relatedHeadlines: relatedNews.map((article) => article.title),
        isDemoOnly: relatedNews.length === 0 || relatedNews.every((article) => article.isMock),
        isRealNewsAvailable,
      },
      scenarioContext: {
        marketBias: source.scenario?.marketBias ?? null,
        confidence: source.scenario?.confidence ?? null,
        timeframe: source.scenario?.timeframe ?? null,
        scenarioMap: source.scenario?.scenarioMap ?? null,
        evidenceState: source.scenario ? 'demo' : 'missing',
      },
      missingInputs: {
        realAi: true,
        realNewsBackend: true,
        backtesting: true,
        portfolioContext: true,
        realProbabilityModel: true,
      },
      generatedAt: (source.now?.() ?? new Date()).toISOString(),
    },
  }
}
