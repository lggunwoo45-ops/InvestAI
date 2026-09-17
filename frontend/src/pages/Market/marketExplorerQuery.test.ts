import { describe, expect, it } from 'vitest'

import { mockCryptoCatalogProvider } from '@/services/market/explorer/MockCryptoCatalogProvider'
import type { MarketInstrument } from '@/types/market'
import { nextExplorerSort, queryMarketInstruments, type ExplorerSortDirection, type ExplorerSortField } from './marketExplorerQuery'

const fixtures: MarketInstrument[] = [
  { id: 'a', marketId: 'upbit', symbol: 'AAA/KRW', name: 'Alpha Coin', quoteCurrency: 'KRW', lastPrice: 30, change24hPercent: -2, volume24h: 100 },
  { id: 'b', marketId: 'upbit', symbol: 'BBB/KRW', name: 'Beta Coin', quoteCurrency: 'KRW', lastPrice: 10, change24hPercent: 3, volume24h: 300 },
  { id: 'c', marketId: 'upbit', symbol: 'CCC/KRW', name: 'Gamma Asset', quoteCurrency: 'KRW', lastPrice: 20, change24hPercent: 1, volume24h: 200 },
]

function ids(field: ExplorerSortField, direction: ExplorerSortDirection, search = '', instruments = fixtures) {
  return queryMarketInstruments(instruments, {
    search, favoritesOnly: false, favoriteIds: new Set(), sortField: field, sortDirection: direction,
  }).map((item) => item.id)
}

describe('Market Explorer sorting', () => {
  it.each([
    ['price', ['b', 'c', 'a'], ['a', 'c', 'b']],
    ['change', ['a', 'c', 'b'], ['b', 'c', 'a']],
    ['volume', ['a', 'c', 'b'], ['b', 'c', 'a']],
    ['alphabet', ['a', 'b', 'c'], ['c', 'b', 'a']],
  ] as const)('sorts %s ascending and descending', (field, ascending, descending) => {
    expect(ids(field, 'asc')).toEqual(ascending)
    expect(ids(field, 'desc')).toEqual(descending)
  })

  it('toggles the same column and gives new fields a predictable default', () => {
    expect(nextExplorerSort('price', 'desc', 'price')).toEqual({ field: 'price', direction: 'asc' })
    expect(nextExplorerSort('price', 'asc', 'price')).toEqual({ field: 'price', direction: 'desc' })
    expect(nextExplorerSort('price', 'asc', 'volume')).toEqual({ field: 'volume', direction: 'desc' })
    expect(nextExplorerSort('volume', 'desc', 'alphabet')).toEqual({ field: 'alphabet', direction: 'asc' })
  })

  it('sorts only search matches without losing the search filter', () => {
    expect(ids('price', 'asc', 'Coin')).toEqual(['b', 'a'])
    expect(ids('price', 'desc', 'Coin')).toEqual(['a', 'b'])
  })

  it('sorts only instruments in the currently selected venue after a tab change', async () => {
    const krw = await mockCryptoCatalogProvider.load('upbit-krw', new AbortController().signal)
    const btc = await mockCryptoCatalogProvider.load('upbit-btc', new AbortController().signal)
    for (const catalog of [krw, btc]) {
      const ascending = ids('price', 'asc', '', [...catalog.instruments])
      const descending = ids('price', 'desc', '', [...catalog.instruments])
      expect(new Set(ascending)).toEqual(new Set(catalog.instruments.map((item) => item.id)))
      expect(descending).toEqual([...ascending].reverse())
      expect(catalog.instruments.every((item) => item.marketType === catalog.venue)).toBe(true)
    }
  })
})
