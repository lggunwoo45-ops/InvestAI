import type { MarketInstrument } from '@/types/market'
// Name aliases only. Listing availability, identity and prices always come from the catalog.
const aliases: Record<string, string> = {
  BTC: '비트코인 bitcoin', ETH: '이더리움 ethereum', XRP: '리플 ripple',
  SOL: '솔라나 solana', DOGE: '도지코인 dogecoin', ADA: '에이다 cardano',
  USDT: '테더 tether', USDC: '유에스디코인 usd coin', BNB: '바이낸스코인 binance coin',
  AVAX: '아발란체 avalanche', LINK: '체인링크 chainlink', DOT: '폴카닷 polkadot',
  TRX: '트론 tron', BCH: '비트코인캐시 bitcoin cash', ETC: '이더리움클래식 ethereum classic',
}
export function matchesInstrumentSearch(asset: MarketInstrument, query: string): boolean {
  const symbol = asset.symbol.toUpperCase()
  const base = symbol.includes('/') ? symbol.split('/')[0] : symbol.endsWith(asset.quoteCurrency) ? symbol.slice(0, -asset.quoteCurrency.length) : symbol
  return [asset.symbol, asset.name, asset.koreanName, asset.englishName, asset.providerSymbol, aliases[base] ?? ''].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
}
