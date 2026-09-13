export type AssetClass = 'crypto' | 'korea-equity' | 'us-equity'

export type MarketProviderId = 'upbit' | 'binance' | 'krx' | 'us-market'

export type TradingMode = 'analysis-only' | 'semi-automatic' | 'automatic'

export type AiProviderId = 'openai' | 'anthropic' | 'google' | 'local' | 'custom'

export interface MarketProviderDescriptor {
  id: MarketProviderId
  name: string
  assetClasses: readonly AssetClass[]
}

export interface AiModelDescriptor {
  id: string
  provider: AiProviderId
  displayName: string
  enabled: boolean
}

export interface PluginManifest {
  id: string
  name: string
  version: string
  permissions: readonly string[]
}
