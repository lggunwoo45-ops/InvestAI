import type { MarketInstrument } from '@/types/market'

// A stable navigation shortlist, not a market-cap ranking or an investment score.
const coreCoins = [
  { symbol: 'BTC', ko: '비트코인', en: 'Bitcoin' },
  { symbol: 'ETH', ko: '이더리움', en: 'Ethereum' },
  { symbol: 'XRP', ko: '엑스알피(리플)', en: 'XRP (Ripple)' },
  { symbol: 'SOL', ko: '솔라나', en: 'Solana' },
  { symbol: 'DOGE', ko: '도지코인', en: 'Dogecoin' },
  { symbol: 'ADA', ko: '에이다', en: 'Cardano' },
  { symbol: 'LINK', ko: '체인링크', en: 'Chainlink' },
] as const

export function coreCoinName(item: MarketInstrument, language: 'ko' | 'en') {
  const symbol = item.displaySymbol ?? item.symbol
  const base = symbol.includes('/') ? symbol.split('/')[0] : symbol.endsWith(item.quoteCurrency) ? symbol.slice(0, -item.quoteCurrency.length) : symbol
  return coreCoins.find(coin => coin.symbol === base)?.[language]
}

export function coreMarketCoins(instruments: readonly MarketInstrument[]) {
  // Binance exposes multiple quote pairs. Prefer USDT, then USDC, while returning
  // the original instrument object and keeping every pair in the full catalog.
  const quoteOrder = (item: MarketInstrument) => item.quoteCurrency === 'USDT' ? 0 : item.quoteCurrency === 'USDC' ? 1 : 2
  return coreCoins.flatMap(coin => {
    const matches = instruments.filter(item => coreCoinName(item, 'en') === coin.en)
    const chosen = matches.reduce<MarketInstrument | undefined>((best, item) => !best || quoteOrder(item) < quoteOrder(best) ? item : best, undefined)
    return chosen ? [chosen] : []
  })
}
