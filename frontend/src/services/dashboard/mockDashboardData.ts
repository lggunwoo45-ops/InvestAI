import type { DiscoverAsset, MarketPulseItem, NewsArticle } from '@/types/dashboard'

export const marketPulseItems: readonly MarketPulseItem[] = [
  { id: 'pulse-btc', symbol: 'BTC', name: 'Bitcoin', region: 'crypto', price: 104_382.6, quote: 'USD', changePercent: 2.11 },
  { id: 'pulse-eth', symbol: 'ETH', name: 'Ethereum', region: 'crypto', price: 3_708.42, quote: 'USD', changePercent: 1.42 },
  { id: 'pulse-xrp', symbol: 'XRP', name: 'XRP', region: 'crypto', price: 2.86, quote: 'USD', changePercent: -0.72 },
  { id: 'pulse-sol', symbol: 'SOL', name: 'Solana', region: 'crypto', price: 201.76, quote: 'USD', changePercent: 4.08 },
  { id: 'pulse-kospi', symbol: 'KOSPI', name: 'Korea Composite', region: 'korea', price: 2_612.34, quote: 'KRW', changePercent: 0.63 },
  { id: 'pulse-kosdaq', symbol: 'KOSDAQ', name: 'Korea Technology', region: 'korea', price: 768.41, quote: 'KRW', changePercent: -0.18 },
  { id: 'pulse-nasdaq', symbol: 'NASDAQ', name: 'Nasdaq Composite', region: 'us', price: 20_611.34, quote: 'USD', changePercent: 1.02 },
  { id: 'pulse-spx', symbol: 'S&P 500', name: 'S&P 500 Index', region: 'us', price: 6_389.45, quote: 'USD', changePercent: 0.78 },
  { id: 'pulse-dji', symbol: 'DOW', name: 'Dow Jones', region: 'us', price: 44_175.61, quote: 'USD', changePercent: 0.42 },
]

export const newsArticles: readonly NewsArticle[] = [
  { id: 'news-btc-etf', category: 'crypto', title: 'Bitcoin liquidity builds as institutions rebalance digital-asset exposure', source: 'Market Ledger', publishedAt: '2026-09-14T11:45:00Z', relatedSymbols: ['BTC', 'BTC/KRW', 'BTCUSDT'], thumbnailTone: 'teal' },
  { id: 'news-eth-network', category: 'crypto', title: 'Ethereum network activity rises ahead of the next protocol milestone', source: 'Chain Brief', publishedAt: '2026-09-14T10:20:00Z', relatedSymbols: ['ETH', 'ETH/KRW', 'ETHUSDT'], thumbnailTone: 'blue' },
  { id: 'news-nvda-chips', category: 'technology', title: 'NVIDIA outlines new enterprise AI infrastructure roadmap', source: 'Technology Wire', publishedAt: '2026-09-14T09:36:00Z', relatedSymbols: ['NVDA', 'NASDAQ'], thumbnailTone: 'amber' },
  { id: 'news-korea-semiconductors', category: 'stocks', title: 'Korean semiconductor exporters extend gains on memory demand outlook', source: 'Seoul Markets', publishedAt: '2026-09-14T08:15:00Z', relatedSymbols: ['005930', '000660', 'KOSPI'], thumbnailTone: 'slate' },
  { id: 'news-fed-outlook', category: 'economy', title: 'Global markets assess the path for rates after mixed inflation data', source: 'Macro Desk', publishedAt: '2026-09-14T07:50:00Z', relatedSymbols: ['S&P 500', 'NASDAQ', 'DOW'], thumbnailTone: 'blue' },
  { id: 'news-sol-volume', category: 'crypto', title: 'Solana volume accelerates as on-chain activity broadens', source: 'Digital Markets', publishedAt: '2026-09-14T06:42:00Z', relatedSymbols: ['SOL', 'SOL/KRW', 'SOLUSDT'], thumbnailTone: 'teal' },
  { id: 'news-apple-devices', category: 'technology', title: 'Apple supply-chain checks point to steady premium-device demand', source: 'Equity Signal', publishedAt: '2026-09-14T05:25:00Z', relatedSymbols: ['AAPL'], thumbnailTone: 'slate' },
  { id: 'news-us-session', category: 'stocks', title: 'US index futures advance as technology shares lead pre-market trade', source: 'Opening Bell', publishedAt: '2026-09-14T04:55:00Z', relatedSymbols: ['NASDAQ', 'S&P 500', 'DOW', 'NVDA'], thumbnailTone: 'amber' },
]

export const discoverAssets: readonly DiscoverAsset[] = [
  { id: 'discover-btc', instrumentId: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', price: 148_721_000, changePercent: 2.34, volume: 178_420_000_000, quote: 'KRW' },
  { id: 'discover-sol', instrumentId: 'binance-sol', marketId: 'binance-futures', symbol: 'SOLUSDT', name: 'Solana Perpetual', price: 201.76, changePercent: 4.08, volume: 3_260_000_000, quote: 'USDT' },
  { id: 'discover-nvda', instrumentId: 'us-nvda', marketId: 'us-stock', symbol: 'NVDA', name: 'NVIDIA', price: 181.42, changePercent: 1.92, volume: 182_640_000, quote: 'USD' },
  { id: 'discover-hynix', instrumentId: 'krx-000660', marketId: 'korea-stock', symbol: '000660', name: 'SK hynix', price: 198_500, changePercent: 2.06, volume: 4_826_190, quote: 'KRW' },
  { id: 'discover-xrp', instrumentId: 'upbit-xrp', marketId: 'upbit', symbol: 'XRP/KRW', name: 'XRP', price: 4_126, changePercent: -0.72, volume: 68_330_000_000, quote: 'KRW' },
  { id: 'discover-tsla', instrumentId: 'us-tsla', marketId: 'us-stock', symbol: 'TSLA', name: 'Tesla', price: 347.15, changePercent: -2.14, volume: 96_540_000, quote: 'USD' },
  { id: 'discover-eth', instrumentId: 'binance-eth', marketId: 'binance-futures', symbol: 'ETHUSDT', name: 'Ethereum Perpetual', price: 3_708.42, changePercent: 1.42, volume: 9_840_000_000, quote: 'USDT' },
  { id: 'discover-samsung', instrumentId: 'krx-005930', marketId: 'korea-stock', symbol: '005930', name: 'Samsung Electronics', price: 72_800, changePercent: 0.83, volume: 14_218_450, quote: 'KRW' },
]
