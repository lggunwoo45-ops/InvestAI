import { fetchJson, finiteNumber } from '@/services/market/providers/providerUtils'
import type { MarketCatalog, MarketInstrument } from '@/types/market'
import type { MarketCatalogProvider } from './MarketCatalogProvider'

interface UpbitPair {
  market: string
  korean_name: string
  english_name: string
}

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
    const [pairs, tickers] = await Promise.all([
      fetchJson<readonly UpbitPair[]>('https://api.upbit.com/v1/market/all', signal),
      fetchJson<readonly UpbitTicker[]>(`https://api.upbit.com/v1/ticker/all?quoteCurrencies=${quote}`, signal),
    ])
    if (!Array.isArray(pairs) || !Array.isArray(tickers)) throw new Error('Invalid Upbit catalog response')
    const prices = new Map(tickers.map((ticker) => [ticker.market, ticker]))
    const instruments: MarketInstrument[] = pairs.filter((pair) => typeof pair.market === 'string' && pair.market.startsWith(`${quote}-`) && typeof pair.korean_name === 'string' && typeof pair.english_name === 'string').map((pair) => {
      const asset = pair.market.slice(quote.length + 1)
      const ticker = prices.get(pair.market)
      return {
        id: quote === 'KRW' ? `upbit-${asset.toLowerCase()}` : `upbit-${quote.toLowerCase()}-${asset.toLowerCase()}`,
        marketId: 'upbit',
        symbol: `${asset}/${quote}`,
        displaySymbol: `${asset}/${quote}`,
        providerSymbol: pair.market,
        providerType: 'upbit',
        marketType: venue,
        name: pair.english_name,
        koreanName: pair.korean_name,
        englishName: pair.english_name,
        quoteCurrency: quote,
        lastPrice: finiteNumber(ticker?.trade_price),
        change24hPercent: finiteNumber(ticker?.signed_change_rate) * 100,
        volume24h: finiteNumber(ticker?.acc_trade_price_24h),
      }
    })
    return { venue, instruments, source: 'live', fetchedAt: Date.now() }
  },
}
