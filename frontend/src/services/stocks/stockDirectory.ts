import stockCatalog from '@/services/market/explorer/stockCatalog.json'
import type { MarketCatalogProvider } from '@/services/market/explorer/MarketCatalogProvider'
import type { MarketInstrument } from '@/types/market'

// Company identities only. Missing quotes are not replaced with simulated prices.
export const domesticStocks: readonly MarketInstrument[] = (['kospi', 'kosdaq'] as const).flatMap(venue =>
  stockCatalog[venue === 'kospi' ? 'KOSPI' : 'KOSDAQ'].map(row => ({
    id: `krx-${row.symbol}`, marketId: 'korea-stock' as const, symbol: row.symbol,
    displaySymbol: row.symbol, providerSymbol: row.symbol, providerType: 'kis-krx' as const,
    marketType: venue, name: row.name, koreanName: row.koreanName ?? undefined, englishName: row.name,
    quoteCurrency: 'KRW', lastPrice: NaN, change24hPercent: NaN, volume24h: NaN,
  })))
export const domesticStockDirectoryProvider: MarketCatalogProvider = {
  id: 'KRX instrument directory',
  supports: (venue, mode) => mode === 'live' && (venue === 'kospi' || venue === 'kosdaq'),
  async load(venue) {
    if (venue !== 'kospi' && venue !== 'kosdaq') throw new Error('Unsupported venue')
    return { venue, source: 'directory', fetchedAt: Date.now(), instruments: domesticStocks.filter(row => row.marketType === venue) }
  },
}
