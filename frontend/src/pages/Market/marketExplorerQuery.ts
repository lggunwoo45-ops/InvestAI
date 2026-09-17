import type { MarketInstrument } from '@/types/market'

export type ExplorerSortField = 'alphabet' | 'price' | 'change' | 'volume'
export type ExplorerSortDirection = 'asc' | 'desc'

export interface ExplorerQuery {
  search: string
  favoritesOnly: boolean
  favoriteIds: ReadonlySet<string>
  sortField: ExplorerSortField
  sortDirection: ExplorerSortDirection
}

export function queryMarketInstruments(instruments: readonly MarketInstrument[], query: ExplorerQuery): MarketInstrument[] {
  const needle = query.search.trim().toLocaleLowerCase()
  const filtered = instruments.filter((instrument) =>
    (!query.favoritesOnly || query.favoriteIds.has(instrument.id))
    && (!needle || [instrument.symbol, instrument.displaySymbol, instrument.name, instrument.koreanName, instrument.englishName]
      .some((value) => value?.toLocaleLowerCase().includes(needle))),
  )
  const sign = query.sortDirection === 'asc' ? 1 : -1
  return filtered.sort((left, right) => {
    const comparison = query.sortField === 'alphabet'
      ? (left.englishName ?? left.name).localeCompare(right.englishName ?? right.name)
      : query.sortField === 'price'
        ? left.lastPrice - right.lastPrice
        : query.sortField === 'change'
          ? left.change24hPercent - right.change24hPercent
          : left.volume24h - right.volume24h
    return sign * comparison || left.id.localeCompare(right.id)
  })
}
