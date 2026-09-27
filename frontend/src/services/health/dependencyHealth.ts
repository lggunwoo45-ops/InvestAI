import type { NewsProviderMode, NewsProviderState } from '@/services/news/newsService'
import type { DartDisclosureStatus } from '@/types/dart'
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
}

function newsStatus(mode: NewsProviderMode, state?: NewsProviderState): DependencyHealthStatus {
  if (mode !== 'local-proxy') return 'disabled'
  if (!state) return 'unknown'
  if (state === 'local-proxy-ready') return 'ready'
  if (state === 'local-proxy-unavailable' || state === 'provider-not-configured') return 'unavailable'
  return 'unknown'
}

function dartProxyStatus(state?: DartDisclosureStatus): DependencyHealthStatus {
  if (!state || state === 'loading') return 'unknown'
  if (state === 'ready') return 'ready'
  if (state === 'mapping_unavailable') return 'limited'
  if (state === 'disabled') return 'disabled'
  return 'unavailable'
}

/** Builds an observed-state summary only; it never probes a dependency or creates network traffic. */
export function buildDependencyHealth(input: DependencyHealthInput): readonly DependencyHealthItem[] {
  const dartStatus = dartProxyStatus(input.dartState)
  return [
    { id: 'market-data', status: input.marketDataMode === 'live' ? 'ready' : 'limited' },
    { id: 'news-proxy', status: newsStatus(input.newsMode, input.newsState) },
    { id: 'dart-proxy', status: dartStatus },
    { id: 'dart-api-key', status: input.dartState === 'ready' ? 'ready' : input.dartState === 'disabled' ? 'disabled' : 'unknown' },
    { id: 'real-ai', status: 'disabled' },
    { id: 'trading', status: 'disabled' },
  ]
}
