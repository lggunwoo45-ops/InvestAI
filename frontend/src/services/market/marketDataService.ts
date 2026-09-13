import type { MarketSectionData } from '@/types/market'

export interface MarketOverviewService {
  getMarketOverview(): Promise<readonly MarketSectionData[]>
}

const mockMarketSections: readonly MarketSectionData[] = [
  {
    id: 'upbit',
    name: 'Upbit',
    description: 'KRW spot market',
    sessionLabel: '24H market',
    instruments: [
      { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 148_721_000, change24hPercent: 2.34, volume24h: 178_420_000_000 },
      { id: 'upbit-eth', marketId: 'upbit', symbol: 'ETH/KRW', name: 'Ethereum', quoteCurrency: 'KRW', lastPrice: 5_284_000, change24hPercent: 1.18, volume24h: 94_810_000_000 },
      { id: 'upbit-xrp', marketId: 'upbit', symbol: 'XRP/KRW', name: 'XRP', quoteCurrency: 'KRW', lastPrice: 4_126, change24hPercent: -0.72, volume24h: 68_330_000_000 },
      { id: 'upbit-sol', marketId: 'upbit', symbol: 'SOL/KRW', name: 'Solana', quoteCurrency: 'KRW', lastPrice: 287_400, change24hPercent: 3.86, volume24h: 42_690_000_000 },
      { id: 'upbit-ada', marketId: 'upbit', symbol: 'ADA/KRW', name: 'Cardano', quoteCurrency: 'KRW', lastPrice: 1_187, change24hPercent: -1.06, volume24h: 17_520_000_000 },
    ],
  },
  {
    id: 'binance-futures',
    name: 'Binance Futures',
    description: 'USDT perpetuals',
    sessionLabel: '24H market',
    instruments: [
      { id: 'binance-btc', marketId: 'binance-futures', symbol: 'BTCUSDT', name: 'Bitcoin Perpetual', quoteCurrency: 'USDT', lastPrice: 104_382.6, change24hPercent: 2.11, volume24h: 18_720_000_000 },
      { id: 'binance-eth', marketId: 'binance-futures', symbol: 'ETHUSDT', name: 'Ethereum Perpetual', quoteCurrency: 'USDT', lastPrice: 3_708.42, change24hPercent: 1.42, volume24h: 9_840_000_000 },
      { id: 'binance-sol', marketId: 'binance-futures', symbol: 'SOLUSDT', name: 'Solana Perpetual', quoteCurrency: 'USDT', lastPrice: 201.76, change24hPercent: 4.08, volume24h: 3_260_000_000 },
      { id: 'binance-bnb', marketId: 'binance-futures', symbol: 'BNBUSDT', name: 'BNB Perpetual', quoteCurrency: 'USDT', lastPrice: 643.91, change24hPercent: -0.31, volume24h: 1_180_000_000 },
      { id: 'binance-doge', marketId: 'binance-futures', symbol: 'DOGEUSDT', name: 'Dogecoin Perpetual', quoteCurrency: 'USDT', lastPrice: 0.2738, change24hPercent: -1.54, volume24h: 924_000_000 },
    ],
  },
  {
    id: 'korea-stock',
    name: 'Korea Stock',
    description: 'KOSPI · KOSDAQ',
    sessionLabel: 'Market closed',
    instruments: [
      { id: 'krx-005930', marketId: 'korea-stock', symbol: '005930', name: 'Samsung Electronics', quoteCurrency: 'KRW', lastPrice: 72_800, change24hPercent: 0.83, volume24h: 14_218_450 },
      { id: 'krx-000660', marketId: 'korea-stock', symbol: '000660', name: 'SK hynix', quoteCurrency: 'KRW', lastPrice: 198_500, change24hPercent: 2.06, volume24h: 4_826_190 },
      { id: 'krx-373220', marketId: 'korea-stock', symbol: '373220', name: 'LG Energy Solution', quoteCurrency: 'KRW', lastPrice: 401_000, change24hPercent: -0.62, volume24h: 392_840 },
      { id: 'krx-005380', marketId: 'korea-stock', symbol: '005380', name: 'Hyundai Motor', quoteCurrency: 'KRW', lastPrice: 246_500, change24hPercent: 1.23, volume24h: 681_220 },
      { id: 'krx-035420', marketId: 'korea-stock', symbol: '035420', name: 'NAVER', quoteCurrency: 'KRW', lastPrice: 214_000, change24hPercent: -1.38, volume24h: 742_910 },
    ],
  },
  {
    id: 'us-stock',
    name: 'US Stock',
    description: 'NYSE · NASDAQ',
    sessionLabel: 'Pre-market',
    instruments: [
      { id: 'us-nvda', marketId: 'us-stock', symbol: 'NVDA', name: 'NVIDIA', quoteCurrency: 'USD', lastPrice: 181.42, change24hPercent: 1.92, volume24h: 182_640_000 },
      { id: 'us-aapl', marketId: 'us-stock', symbol: 'AAPL', name: 'Apple', quoteCurrency: 'USD', lastPrice: 234.86, change24hPercent: -0.28, volume24h: 48_310_000 },
      { id: 'us-msft', marketId: 'us-stock', symbol: 'MSFT', name: 'Microsoft', quoteCurrency: 'USD', lastPrice: 514.27, change24hPercent: 0.67, volume24h: 21_780_000 },
      { id: 'us-tsla', marketId: 'us-stock', symbol: 'TSLA', name: 'Tesla', quoteCurrency: 'USD', lastPrice: 347.15, change24hPercent: -2.14, volume24h: 96_540_000 },
      { id: 'us-amzn', marketId: 'us-stock', symbol: 'AMZN', name: 'Amazon', quoteCurrency: 'USD', lastPrice: 226.73, change24hPercent: 0.39, volume24h: 35_120_000 },
    ],
  },
]

/**
 * UI code depends only on this service contract. Sprint 3 can replace this mock
 * implementation with provider adapters without changing the market components.
 */
export const marketDataService: MarketOverviewService = {
  async getMarketOverview() {
    return Promise.resolve(mockMarketSections)
  },
}
