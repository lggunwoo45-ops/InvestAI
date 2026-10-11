import type { Language } from '@/i18n/translations'
import type { MarketInstrument } from '@/types/market'
import type { ReviewSnapshot, WatchlistItem } from './watchlistStorage'

export type ReviewReason = 'first' | 'changed' | 'approach' | 'change' | 'holding' | 'extended' | 'improved' | 'price' | 'stale' | 'limited'
export const reviewReasonText: Record<Language, Record<ReviewReason, string>> = {
  ko: { first: '처음 확인 필요', changed: '판단 변화 확인 필요', approach: '접근 검토 상태', change: '변화 확인 필요', holding: '보유 기준 재확인', extended: '움직임 확대 확인 필요', improved: '데이터 확인 가능', price: '가격 변동 확대', stale: '마지막 확인 후 시간 경과', limited: '데이터 확인 필요' },
  en: { first: 'First review needed', changed: 'Final read changed', approach: 'Approach review state', change: 'Change check needed', holding: 'Re-check holding basis', extended: 'Review extended movement', improved: 'Data now available', price: 'Meaningful price movement', stale: 'Last review over 24 hours ago', limited: 'Data check needed' },
}
export interface CurrentReviewData {
  snapshot?: ReviewSnapshot
  priceChange24h?: number
}
/** No I/O: only current available evidence and an explicit clock are compared. */
export function getReviewReasons(item: WatchlistItem, current: CurrentReviewData = {}, now = Date.now()): ReviewReason[] {
  const reasons: ReviewReason[] = []
  const previous = item.lastReviewedSnapshot
  const snapshot = current.snapshot
  if (!previous) reasons.push('first')
  if (!snapshot || snapshot.dataQuality === 'limited' || snapshot.finalReadState === 'notEnoughData') reasons.push('limited')
  if (snapshot) {
    if (previous && previous.finalReadState !== snapshot.finalReadState) reasons.push('changed')
    const attention: Partial<Record<ReviewSnapshot['finalReadState'], ReviewReason>> = { approachReviewPossible: 'approach', changeCheckNeeded: 'change', holdingBasisReview: 'holding', extendedCaution: 'extended' }
    const reason = attention[snapshot.finalReadState]
    if (reason) reasons.push(reason)
    if (previous?.finalReadState === 'notEnoughData' && snapshot.finalReadState !== 'notEnoughData' && snapshot.dataQuality !== 'limited') reasons.push('improved')
  }
  const move = current.priceChange24h ?? snapshot?.priceChange24h
  const threshold = /stock|kospi|kosdaq|nasdaq|nyse/i.test(item.marketType) ? 3 : 5
  if (typeof move === 'number' && Number.isFinite(move) && Math.abs(move) >= threshold) reasons.push('price')
  if (item.lastReviewedAt && now - Date.parse(item.lastReviewedAt) > 24 * 60 * 60 * 1000) reasons.push('stale')
  return reasons
}
export function currentReviewData(instrument: MarketInstrument, active: { instrumentId: string; snapshot: ReviewSnapshot } | null): CurrentReviewData {
  return { priceChange24h: instrument.change24hPercent, snapshot: active?.instrumentId === instrument.id ? active.snapshot : undefined }
}
