import type { MarketInstrument } from '@/types/market'
import type { AiCopilotFinalReadState } from '@/services/aiCopilot/aiCopilotFinalRead'
import { getReviewReasons } from './reviewQueue'
import { sanitizeAnalysisEvidence, type AnalysisChangeEvidence } from './analysisChangeEvidence'

export const WATCHLIST_REVIEW_KEY = 'market-copilot.watchlist.v1'
export interface ReviewSnapshot {
  analysisEvidence?: AnalysisChangeEvidence
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
  note?: string
  reviewReason?: string
  reviewHistory?: readonly ReviewHistoryEntry[]
}
export interface ReviewHistoryEntry {
  analysisEvidence?: AnalysisChangeEvidence
  reviewedAt: string
  finalReadState: AiCopilotFinalReadState
  finalReadTitle: string
  finalReadSummary: string
  currentPrice?: number
  priceChange24h?: number
  primaryReviewReason?: string
  note?: string
}
export const REVIEW_NOTE_LIMIT = 1000
export const WATCH_REASON_LIMIT = 300
/** Free text is local only; reject recognizable credential payloads as well as objects. */
function journalText(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined
  if (/(?:api[_ -]?key|secret|token|password|credentials?|authorization)\s*[:=]|\bBearer\s+\S+|\bsk-[A-Za-z0-9_-]{12,}|-----BEGIN .*PRIVATE KEY-----/i.test(value)) return undefined
  return value.trim().slice(0, limit) || undefined
}
function normalizeHistory(value: unknown): ReviewHistoryEntry[] {
  if (!Array.isArray(value)) return []
  const history: ReviewHistoryEntry[] = []
  for (const entry of value) {
    if (!record(entry) || !timestamp(entry.reviewedAt)) continue
    const snapshot = sanitizeSnapshot({ ...entry, capturedAt: entry.reviewedAt })
    if (!snapshot) continue
    history.push({ reviewedAt: entry.reviewedAt, finalReadState: snapshot.finalReadState, finalReadTitle: snapshot.finalReadTitle, finalReadSummary: snapshot.finalReadSummary, currentPrice: snapshot.currentPrice, priceChange24h: snapshot.priceChange24h, ...(snapshot.analysisEvidence ? { analysisEvidence: snapshot.analysisEvidence } : {}), primaryReviewReason: journalText(entry.primaryReviewReason, WATCH_REASON_LIMIT), note: journalText(entry.note, REVIEW_NOTE_LIMIT) })
  }
  return history.sort((a, b) => Date.parse(b.reviewedAt) - Date.parse(a.reviewedAt)).slice(0, 10)
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
  const analysisEvidence = sanitizeAnalysisEvidence(value.analysisEvidence)
  if (analysisEvidence) snapshot.analysisEvidence = analysisEvidence
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
    const note = journalText(entry.note, REVIEW_NOTE_LIMIT)
    const reason = journalText(entry.reviewReason, WATCH_REASON_LIMIT)
    if (note) item.note = note
    if (reason) item.reviewReason = reason
    if (entry.reviewHistory !== undefined) item.reviewHistory = normalizeHistory(entry.reviewHistory)
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
  return items.map(item => {
    if (item.instrumentId !== id) return item
    const history = normalizeHistory(item.reviewHistory)
    const note = journalText(item.note, REVIEW_NOTE_LIMIT)
    const entry: ReviewHistoryEntry = {
      reviewedAt: snapshot.capturedAt,
      finalReadState: snapshot.finalReadState,
      finalReadTitle: snapshot.finalReadTitle,
      finalReadSummary: snapshot.finalReadSummary,
      currentPrice: snapshot.currentPrice,
      priceChange24h: snapshot.priceChange24h,
      ...(snapshot.analysisEvidence ? { analysisEvidence: snapshot.analysisEvidence } : {}),
      primaryReviewReason: getReviewReasons(item, { snapshot, priceChange24h: snapshot.priceChange24h }, Date.parse(snapshot.capturedAt))[0],
      note,
    }
    const latest = history[0]
    const elapsed = latest ? Date.parse(entry.reviewedAt) - Date.parse(latest.reviewedAt) : Infinity
    const duplicate = latest && elapsed >= 0 && elapsed <= 5000 && latest.finalReadState === entry.finalReadState && latest.finalReadTitle === entry.finalReadTitle && latest.finalReadSummary === entry.finalReadSummary && latest.note === note
    return { ...item, lastReviewedAt: snapshot.capturedAt, updatedAt: snapshot.capturedAt, lastReviewedSnapshot: snapshot, reviewHistory: duplicate ? history : normalizeHistory([entry, ...history]) }
  })
}
export function updateReviewJournal(items: readonly WatchlistItem[], id: string, note: string, reason: string, at = new Date().toISOString()): WatchlistItem[] {
  if (!timestamp(at)) return [...items]
  return items.map(item => item.instrumentId === id ? { ...item, note: journalText(note, REVIEW_NOTE_LIMIT), reviewReason: journalText(reason, WATCH_REASON_LIMIT), updatedAt: at } : item)
}
