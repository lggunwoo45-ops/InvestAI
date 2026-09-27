import type { Language } from '@/i18n/translations'
import type { MarketVenue } from './market'

export type MarketBucketId = 'upbit' | 'binance' | 'kospi' | 'kosdaq' | 'usStocks'

export interface MarketBucket {
  id: MarketBucketId
  label: string
  description: string
  assetType: 'crypto' | 'stock'
  sourceMarketIds: readonly MarketVenue[]
}

const definitions = {
  upbit: { labels: { en: 'Upbit', ko: '업비트' }, descriptions: { en: 'Upbit crypto markets', ko: '업비트 가상자산 시장' }, assetType: 'crypto', sourceMarketIds: ['upbit-krw', 'upbit-btc', 'upbit-usdt'] },
  binance: { labels: { en: 'Binance', ko: '바이낸스' }, descriptions: { en: 'Binance spot and futures', ko: '바이낸스 현물·선물 시장' }, assetType: 'crypto', sourceMarketIds: ['binance-spot', 'binance-futures'] },
  kospi: { labels: { en: 'KOSPI', ko: '코스피' }, descriptions: { en: 'KOSPI stock catalog', ko: '코스피 주식 카탈로그' }, assetType: 'stock', sourceMarketIds: ['kospi'] },
  kosdaq: { labels: { en: 'KOSDAQ', ko: '코스닥' }, descriptions: { en: 'KOSDAQ stock catalog', ko: '코스닥 주식 카탈로그' }, assetType: 'stock', sourceMarketIds: ['kosdaq'] },
  usStocks: { labels: { en: 'US stocks', ko: '미국주식' }, descriptions: { en: 'NASDAQ and NYSE stock catalogs', ko: '나스닥·뉴욕증권거래소 주식 카탈로그' }, assetType: 'stock', sourceMarketIds: ['nasdaq', 'nyse'] },
} as const

export const marketBucketIds = Object.keys(definitions) as MarketBucketId[]

export function getMarketBuckets(language: Language): readonly MarketBucket[] {
  return marketBucketIds.map((id) => ({
    id,
    label: definitions[id].labels[language],
    description: definitions[id].descriptions[language],
    assetType: definitions[id].assetType,
    sourceMarketIds: definitions[id].sourceMarketIds,
  }))
}
