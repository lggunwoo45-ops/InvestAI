import { fetchJson, finiteNumber } from '@/services/market/providers/providerUtils'
import type { MarketCatalog, MarketInstrument } from '@/types/market'
import type { MarketCatalogProvider } from './MarketCatalogProvider'

interface BinanceSymbol {
  symbol: string
  status: string
  baseAsset: string
  quoteAsset: string
  contractType?: string
}

interface BinanceExchangeInfo {
  symbols: readonly BinanceSymbol[]
}

interface BinanceTicker {
  symbol: string
  lastPrice: string
  priceChangePercent: string
  quoteVolume?: string
  volume: string
}

const endpoints = {
  'binance-spot': {
    exchange: 'https://data-api.binance.vision/api/v3/exchangeInfo',
    tickers: 'https://data-api.binance.vision/api/v3/ticker/24hr',
  },
  'binance-futures': {
    exchange: 'https://fapi.binance.com/fapi/v1/exchangeInfo',
    tickers: 'https://fapi.binance.com/fapi/v1/ticker/24hr',
  },
} as const

export const binanceCatalogProvider: MarketCatalogProvider = {
  id: 'Binance public catalog',
  supports: (venue, mode) => mode === 'live' && (venue === 'binance-spot' || venue === 'binance-futures'),

  async load(venue, signal): Promise<MarketCatalog> {
    if (venue !== 'binance-spot' && venue !== 'binance-futures') throw new Error('Unsupported Binance venue')
    const paths = endpoints[venue]
    const [exchange, tickerRows] = await Promise.all([
      fetchJson<BinanceExchangeInfo>(paths.exchange, signal),
      fetchJson<readonly BinanceTicker[]>(paths.tickers, signal),
    ])
    if (!Array.isArray(exchange.symbols) || !Array.isArray(tickerRows)) throw new Error('Invalid Binance catalog response')
    const tickers = new Map(tickerRows.map((ticker) => [ticker.symbol, ticker]))
    const instruments: MarketInstrument[] = exchange.symbols.filter((symbol) =>
      typeof symbol.symbol === 'string' && typeof symbol.baseAsset === 'string' && typeof symbol.quoteAsset === 'string'
      &&
      symbol.status === 'TRADING'
      && (venue === 'binance-spot' || (symbol.quoteAsset === 'USDT' && symbol.contractType === 'PERPETUAL')),
    ).map((symbol) => {
      const ticker = tickers.get(symbol.symbol)
      const id = venue === 'binance-futures'
        ? `binance-${symbol.baseAsset.toLowerCase()}`
        : `binance-spot-${symbol.symbol.toLowerCase()}`
      return {
        id,
        marketId: venue,
        symbol: symbol.symbol,
        displaySymbol: `${symbol.baseAsset}/${symbol.quoteAsset}`,
        providerSymbol: symbol.symbol,
        providerType: venue,
        marketType: venue,
        name: symbol.baseAsset,
        englishName: symbol.baseAsset,
        quoteCurrency: symbol.quoteAsset,
        lastPrice: finiteNumber(ticker?.lastPrice),
        change24hPercent: finiteNumber(ticker?.priceChangePercent),
        volume24h: finiteNumber(ticker?.quoteVolume ?? ticker?.volume),
      }
    })
    return { venue, instruments, source: 'live', fetchedAt: Date.now() }
  },
}
