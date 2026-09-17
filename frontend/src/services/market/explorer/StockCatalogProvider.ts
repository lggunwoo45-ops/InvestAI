import stockCatalog from './stockCatalog.json'
import type { MarketCatalog, MarketInstrument, MarketVenue } from '@/types/market'
import type { MarketCatalogProvider } from './MarketCatalogProvider'

type StockVenue = 'kospi' | 'kosdaq' | 'nasdaq' | 'nyse'
type StockExchange = 'KOSPI' | 'KOSDAQ' | 'NASDAQ' | 'NYSE'

const exchangeByVenue: Record<StockVenue, StockExchange> = {
  kospi: 'KOSPI', kosdaq: 'KOSDAQ', nasdaq: 'NASDAQ', nyse: 'NYSE',
}

const venueByStockId = new Map<string, StockVenue>(
  (Object.entries(exchangeByVenue) as [StockVenue, StockExchange][]).flatMap(([venue, exchange]) =>
    stockCatalog[exchange].map((row) => [venue === 'kospi' || venue === 'kosdaq' ? `krx-${row.symbol}` : `us-${row.symbol.toLowerCase()}`, venue] as const)),
)

export function venueForStockId(id: string): StockVenue | undefined { return venueByStockId.get(id) }

function isStockVenue(venue: MarketVenue): venue is StockVenue {
  return venue in exchangeByVenue
}

function mockQuote(symbol: string, exchange: StockExchange) {
  let hash = 2166136261
  for (const char of symbol) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  const seed = hash >>> 0
  const korea = exchange === 'KOSPI' || exchange === 'KOSDAQ'
  return {
    lastPrice: korea ? Math.round(5_000 + seed % 495_000) : Number((8 + (seed % 90_000) / 100).toFixed(2)),
    change24hPercent: Number((((seed >>> 8) % 1_201) / 100 - 6).toFixed(2)),
    volume24h: 100_000 + ((seed >>> 4) % 20_000_000),
  }
}

/** Frozen company identities from the MIT-licensed Adanos ticker database.
 * Quote values are deterministic simulations, never live exchange prices.
 */
export const stockCatalogProvider: MarketCatalogProvider = {
  id: 'InvestAI stock simulator',
  supports: (venue) => isStockVenue(venue),
  async load(venue): Promise<MarketCatalog> {
    if (!isStockVenue(venue)) throw new Error('Unsupported stock venue')
    const exchange = exchangeByVenue[venue]
    const korea = venue === 'kospi' || venue === 'kosdaq'
    const instruments: MarketInstrument[] = stockCatalog[exchange].map((row) => ({
      id: korea ? `krx-${row.symbol}` : `us-${row.symbol.toLowerCase()}`,
      marketId: korea ? 'korea-stock' : 'us-stock',
      symbol: row.symbol,
      displaySymbol: row.symbol,
      providerSymbol: row.symbol,
      providerType: korea ? 'mock-krx' : 'mock-us',
      marketType: venue,
      name: row.name,
      koreanName: row.koreanName ?? undefined,
      englishName: row.name,
      quoteCurrency: korea ? 'KRW' : 'USD',
      ...mockQuote(row.symbol, exchange),
    }))
    return { venue, instruments, source: 'mock', fetchedAt: Date.now() }
  },
}
