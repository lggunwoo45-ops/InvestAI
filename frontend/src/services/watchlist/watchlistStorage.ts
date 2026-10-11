import type { MarketInstrument } from '@/types/market'
import type { AiCopilotFinalReadState } from '@/services/aiCopilot/aiCopilotFinalRead'

export const WATCHLIST_REVIEW_KEY = 'market-copilot.watchlist.v1'
export interface ReviewSnapshot {
  finalReadState: AiCopilotFinalReadState
  finalReadTitle: string
  finalReadSummary: string
  currentPrice?: number
  priceChange24h?: number
  candidateReviewScore?: number
  dataQuality?: string
  btcAnchorState?: string
  marketCautionState?: string
  capturedAt: string
}
export interface WatchlistItem {
  instrumentId: string
  symbol: string
  displayName: string
  marketType: string
  provider?: string
  quote?: string
  addedAt: string
  updatedAt: string
  lastReviewedAt?: string
  lastReviewedSnapshot?: ReviewSnapshot
}
const states = new Set(['wait', 'keepWatching', 'approachReviewPossible', 'extendedCaution', 'changeCheckNeeded', 'holdingBasisReview', 'notEnoughData'])
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function timestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}
/** Explicit field allowlist also strips unrecognized fields from write payloads. */
export function sanitizeSnapshot(value: unknown): ReviewSnapshot | undefined {
  if (!record(value) || !states.has(value.finalReadState as string) || typeof value.finalReadTitle !== 'string' || typeof value.finalReadSummary !== 'string' || !timestamp(value.capturedAt)) return undefined
  const snapshot: ReviewSnapshot = { finalReadState: value.finalReadState as AiCopilotFinalReadState, finalReadTitle: value.finalReadTitle, finalReadSummary: value.finalReadSummary, capturedAt: value.capturedAt }
  for (const field of ['currentPrice', 'priceChange24h', 'candidateReviewScore'] as const) {
    const number = value[field]
    if (typeof number === 'number' && Number.isFinite(number)) snapshot[field] = number
  }
  for (const field of ['dataQuality', 'btcAnchorState', 'marketCautionState'] as const) {
    if (typeof value[field] === 'string') snapshot[field] = value[field]
  }
  return snapshot
}
export function sanitizeItems(value: unknown): WatchlistItem[] {
  if (!Array.isArray(value)) return []
  const items: WatchlistItem[] = []
  for (const entry of value) {
    if (!record(entry) || !['instrumentId', 'symbol', 'displayName', 'marketType'].every(field => typeof entry[field] === 'string' && entry[field].length > 0) || !timestamp(entry.addedAt) || !timestamp(entry.updatedAt)) return []
    const item: WatchlistItem = { instrumentId: entry.instrumentId as string, symbol: entry.symbol as string, displayName: entry.displayName as string, marketType: entry.marketType as string, addedAt: entry.addedAt, updatedAt: entry.updatedAt }
    for (const field of ['provider', 'quote'] as const) if (typeof entry[field] === 'string') item[field] = entry[field]
    if (entry.lastReviewedSnapshot !== undefined) {
      const snapshot = sanitizeSnapshot(entry.lastReviewedSnapshot)
      if (!snapshot) return []
      item.lastReviewedSnapshot = snapshot
    }
    if (entry.lastReviewedAt !== undefined) {
      if (!timestamp(entry.lastReviewedAt)) return []
      item.lastReviewedAt = entry.lastReviewedAt
    }
    if (!items.some(existing => existing.instrumentId === item.instrumentId)) items.push(item)
  }
  return items
}
export function loadWatchlist(): WatchlistItem[] {
  try { return sanitizeItems(JSON.parse(localStorage.getItem(WATCHLIST_REVIEW_KEY) ?? '[]')) } catch { return [] }
}
export function saveWatchlist(items: readonly WatchlistItem[]): void {
  try { localStorage.setItem(WATCHLIST_REVIEW_KEY, JSON.stringify(sanitizeItems(items))) } catch { /* Remain usable in memory when storage is blocked or full. */ }
}
export function itemFromInstrument(instrument: MarketInstrument, at = new Date().toISOString()): WatchlistItem {
  return { instrumentId: instrument.id, symbol: instrument.displaySymbol ?? instrument.symbol, displayName: instrument.name, marketType: instrument.marketType ?? instrument.marketId, provider: instrument.providerType ?? instrument.marketId, quote: instrument.quoteCurrency, addedAt: at, updatedAt: at }
}
export function addItem(items: readonly WatchlistItem[], item: WatchlistItem): WatchlistItem[] {
  return items.some(existing => existing.instrumentId === item.instrumentId) ? [...items] : sanitizeItems([...items, item])
}
export function removeItem(items: readonly WatchlistItem[], id: string): WatchlistItem[] {
  return items.filter(item => item.instrumentId !== id)
}
export function toggleItem(items: readonly WatchlistItem[], item: WatchlistItem): WatchlistItem[] {
  return items.some(existing => existing.instrumentId === item.instrumentId) ? removeItem(items, item.instrumentId) : addItem(items, item)
}
export function reviewItem(items: readonly WatchlistItem[], id: string, value: ReviewSnapshot): WatchlistItem[] {
  const snapshot = sanitizeSnapshot(value)
  if (!snapshot) return [...items]
  return items.map(item => item.instrumentId === id ? { ...item, lastReviewedAt: snapshot.capturedAt, updatedAt: snapshot.capturedAt, lastReviewedSnapshot: snapshot } : item)
}
