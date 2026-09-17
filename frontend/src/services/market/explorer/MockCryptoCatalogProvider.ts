import type { MarketCatalog, MarketInstrument } from '@/types/market'
import type { MarketCatalogProvider } from './MarketCatalogProvider'

const assets = [
  ['BTC', 'Bitcoin', '비트코인', 148_721_000],
  ['ETH', 'Ethereum', '이더리움', 5_284_000],
  ['XRP', 'XRP', '리플', 4_126],
  ['SOL', 'Solana', '솔라나', 287_400],
  ['ADA', 'Cardano', '에이다', 1_187],
] as const

const quoteScale: Record<string, number> = { KRW: 1, BTC: 1 / 148_721_000, USDT: 1 / 1_420 }

/** Offline exploration remains available without suggesting the catalog is complete. */
export const mockCryptoCatalogProvider: MarketCatalogProvider = {
  id: 'InvestAI crypto simulator',
  supports: (venue, mode) => mode === 'mock' && (venue.startsWith('upbit-') || venue.startsWith('binance-')),
  async load(venue): Promise<MarketCatalog> {
    const upbit = venue.startsWith('upbit-')
    const quote = upbit ? venue.slice('upbit-'.length).toUpperCase() : 'USDT'
    const instruments: MarketInstrument[] = assets.filter(([asset]) => asset !== quote).map(([asset, name, koreanName, krwPrice], index) => {
      const marketId = upbit ? 'upbit' : venue === 'binance-spot' ? 'binance-spot' : 'binance-futures'
      const symbol = upbit ? `${asset}/${quote}` : `${asset}USDT`
      return {
        id: upbit ? quote === 'KRW' ? `upbit-${asset.toLowerCase()}` : `upbit-${quote.toLowerCase()}-${asset.toLowerCase()}`
          : venue === 'binance-spot' ? `binance-spot-${symbol.toLowerCase()}` : `binance-${asset.toLowerCase()}`,
        marketId,
        symbol,
        displaySymbol: upbit ? symbol : `${asset}/USDT`,
        providerSymbol: upbit ? `${quote}-${asset}` : symbol,
        providerType: marketId,
        marketType: venue,
        name,
        koreanName,
        englishName: name,
        quoteCurrency: quote,
        lastPrice: Number((krwPrice * quoteScale[quote]).toFixed(quote === 'BTC' ? 8 : 2)),
        change24hPercent: [2.34, 1.18, -0.72, 3.86, -1.06][index],
        volume24h: (178_420_000_000 / (index + 1)) * quoteScale[quote],
      }
    })
    return { venue, instruments, source: 'mock', fetchedAt: Date.now() }
  },
}
