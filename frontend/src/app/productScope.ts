import type { MarketGroup, MarketInstrument, MarketVenue } from '@/types/market'
import type { NewsArticle } from '@/types/dashboard'

export type ProductKind = 'crypto' | 'stocks'
const cryptoVenues: readonly MarketVenue[] = ['upbit-krw', 'upbit-btc', 'upbit-usdt', 'binance-spot', 'binance-futures']
const stockVenues: readonly MarketVenue[] = ['kospi', 'kosdaq', 'nasdaq', 'nyse']

/** Build-time product boundary. URL parameters and browser storage cannot enable stocks. */
export function createProductScope(kind: ProductKind) {
  const groups: readonly MarketGroup[] = kind === 'crypto' ? ['crypto'] : ['korea', 'us']
  const venues = kind === 'crypto' ? cryptoVenues : stockVenues
  const allowsVenue = (venue: string) => venues.includes(venue as MarketVenue)
  const allowsInstrumentId = (id: string) => kind === 'crypto' ? /^(upbit-|binance-)/.test(id) : /^(krx-|us-)/.test(id)
  // Legacy/unresolved records stay removable; they never become eligible for a data request.
  const allowsStoredInstrumentId = (id: string) => !/^(upbit-|binance-|krx-|us-)/.test(id) || allowsInstrumentId(id)
  const allowsMarketId = (id: string) => kind === 'crypto' ? ['upbit', 'binance-spot', 'binance-futures'].includes(id) : ['korea-stock', 'us-stock'].includes(id)
  const allowsInstrument = (item: Pick<MarketInstrument, 'id' | 'marketId'>) => allowsMarketId(item.marketId) && allowsInstrumentId(item.id)
  const allowsNews = (article: NewsArticle) => kind === 'crypto'
    ? !['korea-stock', 'us-stock', 'earnings'].includes(article.category) && (!article.relatedMarkets.length || article.relatedMarkets.some(m => m === 'crypto' || m === 'macro'))
    : article.category !== 'crypto' && (!article.relatedMarkets.length || article.relatedMarkets.some(m => m !== 'crypto'))
  return { kind, groups, venues, defaultGroup: groups[0], defaultVenue: venues[0], allowsVenue, allowsInstrumentId, allowsStoredInstrumentId, allowsMarketId, allowsInstrument, allowsNews }
}

// The public Pages workflow builds production mode; only the separate preview command selects stocks.
export const productScope = createProductScope(import.meta.env.MODE === 'stocks-preview' ? 'stocks' : 'crypto')

export function isUnavailableProductRequest(search: string, scope = productScope): boolean {
  const params = new URLSearchParams(search)
  for (const key of ['instrumentId', 'instrument']) {
    for (const id of params.getAll(key)) if (/^(upbit-|binance-|krx-|us-)/.test(id) && !scope.allowsInstrumentId(id)) return true
  }
  const stock = ['korea', 'us', 'stock', 'stocks', 'korea-stock', 'us-stock', 'kospi', 'kosdaq', 'nasdaq', 'nyse', 'usStocks']
  const crypto = ['crypto', 'upbit', 'binance', ...cryptoVenues]
  return ['market', 'venue', 'bucketId', 'assetMode', 'assetType'].some(key => params.getAll(key).some(value => (scope.kind === 'crypto' ? stock : crypto).includes(value)))
}
