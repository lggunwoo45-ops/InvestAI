import type { Watchlist } from '@/types/dashboard'

export const defaultWatchlists: readonly Watchlist[] = [
  { id: 'crypto', name: 'Crypto', instrumentIds: ['upbit-btc', 'upbit-eth', 'binance-sol'], isDefault: true },
  { id: 'korea', name: 'Korea', instrumentIds: ['krx-005930', 'krx-000660'], isDefault: true },
  { id: 'us', name: 'US', instrumentIds: ['us-nvda', 'us-aapl'], isDefault: true },
  { id: 'custom', name: 'Custom', instrumentIds: [], isDefault: true },
]

export function reorderIds(ids: readonly string[], sourceIndex: number, targetIndex: number): readonly string[] {
  if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0 || sourceIndex >= ids.length || targetIndex >= ids.length) return ids
  const next = [...ids]
  const [moved] = next.splice(sourceIndex, 1)
  if (moved) next.splice(targetIndex, 0, moved)
  return next
}
