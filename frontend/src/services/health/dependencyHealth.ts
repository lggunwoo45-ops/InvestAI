import type { NewsProviderMode, NewsProviderState } from '@/services/news/newsService'
import type { DartDisclosureStatus, DartProxyHealthResult } from '@/types/dart'
import type { MarketDataMode } from '@/types/market'

export type DependencyHealthStatus = 'ready' | 'disabled' | 'unavailable' | 'limited' | 'unknown'
export type DependencyHealthId = 'market-data' | 'news-proxy' | 'dart-proxy' | 'dart-api-key' | 'real-ai' | 'trading'

export interface DependencyHealthItem {
  id: DependencyHealthId
  status: DependencyHealthStatus
}

export interface DependencyHealthInput {
  marketDataMode: MarketDataMode
  newsMode: NewsProviderMode
  newsState?: NewsProviderState
  dartState?: DartDisclosureStatus
  dartHealth?: DartProxyHealthResult | null
}

export type ApiUsageStatus = 'active' | 'notConfigured' | 'disabled' | 'unavailable' | 'unknown'
export type ApiUsageId = 'news-proxy' | 'dart-proxy' | 'dart-api-key' | 'real-ai' | 'trading'

export interface ApiUsageItem {
  id: ApiUsageId
  status: ApiUsageStatus
}

export interface ApiUsageInput {
  newsMode: NewsProviderMode
  newsState?: NewsProviderState
  dartHealth?: DartProxyHealthResult | null
}

/** Canonical visible state shared by every Demo DART status surface. */
export type DartHealthUiState = 'checking' | 'ready' | 'notConfigured' | 'unavailable'

function normalizedDartHealth(health?: DartProxyHealthResult | null): DartProxyHealthResult | null {
  if (health?.status === 'ready' && health.apiKeyConfigured === true) return health
  if (health?.status === 'disabled' && health.apiKeyConfigured === false) return health
  if (health?.status === 'unavailable' && health.apiKeyConfigured === null) return health
  return null
}

/**
 * Converts the safe proxy health response into one UI state. Components receive
 * this value directly so the Demo status panels cannot disagree about DART.
 */
export function getDartHealthUiState(health?: DartProxyHealthResult | null): DartHealthUiState {
  const normalized = normalizedDartHealth(health)
  if (!normalized) return 'checking'
  if (normalized.status === 'ready') return 'ready'
  if (normalized.status === 'disabled') return 'notConfigured'
  return 'unavailable'
}

function newsStatus(mode: NewsProviderMode, state?: NewsProviderState): DependencyHealthStatus {
  if (mode !== 'local-proxy') return 'disabled'
  if (!state) return 'unknown'
  if (state === 'local-proxy-ready') return 'ready'
  if (state === 'local-proxy-unavailable' || state === 'provider-not-configured') return 'unavailable'
  return 'unknown'
}

/** Builds an observed-state summary only; it never probes a dependency or creates network traffic. */
export function buildDependencyHealth(input: DependencyHealthInput): readonly DependencyHealthItem[] {
  const dartHealthState = getDartHealthUiState(input.dartHealth)
  const dartStatus: DependencyHealthStatus = dartHealthState === 'checking'
    ? 'unknown'
    : dartHealthState === 'unavailable' ? 'unavailable' : 'ready'
  const dartApiKeyStatus: DependencyHealthStatus = dartHealthState === 'ready'
    ? 'ready'
    : dartHealthState === 'notConfigured' ? 'disabled' : 'unknown'
  return [
    { id: 'market-data', status: input.marketDataMode === 'live' ? 'ready' : 'limited' },
    { id: 'news-proxy', status: newsStatus(input.newsMode, input.newsState) },
    { id: 'dart-proxy', status: dartStatus },
    { id: 'dart-api-key', status: dartApiKeyStatus },
    { id: 'real-ai', status: 'disabled' },
    { id: 'trading', status: 'disabled' },
  ]
}

function newsApiUsage(mode: NewsProviderMode, state?: NewsProviderState): ApiUsageStatus {
  if (mode !== 'local-proxy') return 'notConfigured'
  if (!state) return 'unknown'
  if (state === 'local-proxy-ready') return 'active'
  if (state === 'local-proxy-unavailable') return 'unavailable'
  if (state === 'provider-not-configured') return 'notConfigured'
  return 'unknown'
}

/** Maps already-observed frontend state and the safe local DART health response; no secret is accepted or returned. */
export function buildApiUsageStatus(input: ApiUsageInput): readonly ApiUsageItem[] {
  const dartHealthState = getDartHealthUiState(input.dartHealth)
  const dartProxyStatus: ApiUsageStatus = dartHealthState === 'checking'
    ? 'unknown'
    : dartHealthState === 'unavailable' ? 'unavailable' : 'active'
  const dartKeyStatus: ApiUsageStatus = dartHealthState === 'ready'
    ? 'active'
    : dartHealthState === 'notConfigured' ? 'notConfigured' : 'unknown'

  return [
    { id: 'news-proxy', status: newsApiUsage(input.newsMode, input.newsState) },
    { id: 'dart-proxy', status: dartProxyStatus },
    { id: 'dart-api-key', status: dartKeyStatus },
    { id: 'real-ai', status: 'disabled' },
    { id: 'trading', status: 'disabled' },
  ]
}
