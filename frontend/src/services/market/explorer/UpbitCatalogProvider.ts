import { fetchJson, finiteNumber } from '@/services/market/providers/providerUtils'
import type { MarketCatalog, MarketInstrument, MarketVenue } from '@/types/market'
import type { MarketCatalogProvider } from './MarketCatalogProvider'

interface UpbitTicker {
  market: string
  trade_price: number
  signed_change_rate: number
  acc_trade_price_24h: number
}

const quotes = ['KRW', 'BTC', 'USDT'] as const

export const upbitCatalogProvider: MarketCatalogProvider = {
  id: 'Upbit public catalog',
  supports: (venue, mode) => mode === 'live' && venue.startsWith('upbit-'),

  async load(venue, signal): Promise<MarketCatalog> {
    const quote = venue.slice('upbit-'.length).toUpperCase()
    if (!quotes.some((item) => item === quote)) throw new Error('Unsupported Upbit quote market')

    return (await loadAll(signal)).find(catalog => catalog.venue === venue)!
  },
  loadAll,
}

async function loadAll(signal?: AbortSignal): Promise<readonly MarketCatalog[]> {
  // Upbit supports comma-separated quotes. One paced request supplies all three
  // catalogs; MarketDataService shares the pending request and caches each venue.
  const tickers = await fetchJson<readonly UpbitTicker[]>(
    'https://api.upbit.com/v1/ticker/all?quote_currencies=KRW,BTC,USDT', signal,
  )
  if (!Array.isArray(tickers)) throw new Error('Invalid Upbit catalog response')
  const fetchedAt = Date.now()
  return quotes.map(quote => {
    const venue: MarketVenue = `upbit-${quote.toLowerCase()}` as MarketVenue

    const instruments: MarketInstrument[] = tickers
      .filter((ticker) => typeof ticker.market === 'string' && ticker.market.startsWith(`${quote}-`))
      .map((ticker) => {
        const asset = ticker.market.slice(quote.length + 1)
        return {
          id: quote === 'KRW' ? `upbit-${asset.toLowerCase()}` : `upbit-${quote.toLowerCase()}-${asset.toLowerCase()}`,
          marketId: 'upbit',
          symbol: `${asset}/${quote}`,
          displaySymbol: `${asset}/${quote}`,
          providerSymbol: ticker.market,
          providerType: 'upbit',
          marketType: venue,
          name: asset,
          englishName: asset,
          quoteCurrency: quote,
          lastPrice: finiteNumber(ticker.trade_price),
          change24hPercent: finiteNumber(ticker.signed_change_rate) * 100,
          volume24h: finiteNumber(ticker.acc_trade_price_24h),
        }
      })

    return { venue, instruments, source: 'live', fetchedAt }
  })
}
