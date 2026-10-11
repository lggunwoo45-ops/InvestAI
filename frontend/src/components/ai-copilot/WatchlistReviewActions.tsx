import { useEffect, useMemo } from 'react'

import { useWatchlists } from '@/hooks/useWatchlists'
import type { Language } from '@/i18n/translations'
import type { AiCopilotFinalRead } from '@/services/aiCopilot/aiCopilotFinalRead'
import { itemFromInstrument, type ReviewSnapshot } from '@/services/watchlist/watchlistStorage'
import type { MarketInstrument } from '@/types/market'
import styles from './WatchlistReviewActions.module.css'

export function WatchlistReviewActions({ instrument, finalRead, language }: { instrument: MarketInstrument; finalRead: AiCopilotFinalRead | null; language: Language }) {
  const { isWatchlisted, toggleWatchlist, markReviewed, getWatchlistItem, setActiveReview } = useWatchlists()
  const saved = isWatchlisted(instrument.id)
  const item = getWatchlistItem(instrument.id)
  const snapshot = useMemo<ReviewSnapshot>(() => ({
    finalReadState: finalRead?.state ?? 'notEnoughData',
    finalReadTitle: finalRead?.title ?? '',
    finalReadSummary: finalRead?.summary ?? '',
    currentPrice: Number.isFinite(instrument.lastPrice) ? instrument.lastPrice : undefined,
    priceChange24h: Number.isFinite(instrument.change24hPercent) ? instrument.change24hPercent : undefined,
    dataQuality: !finalRead || finalRead.state === 'notEnoughData' ? 'limited' : 'available',
    capturedAt: new Date().toISOString(),
  }), [instrument, finalRead])
  useEffect(() => {
    setActiveReview({ instrumentId: instrument.id, snapshot })
    return () => setActiveReview(null)
  }, [instrument.id, snapshot, setActiveReview])
  const toggleLabel = language === 'ko' ? (saved ? '관심 해제' : '관심 등록') : (saved ? 'Remove from watchlist' : 'Add to watchlist')
  return <div className={styles.actions} aria-label={language === 'ko' ? '관심종목 확인' : 'Watchlist review'}>
    <span>{language === 'ko' ? (saved ? '관심종목에 등록됨' : '관심종목에 없음') : (saved ? 'In watchlist' : 'Not in watchlist')}</span>
    <button type="button" aria-label={`${toggleLabel} ${instrument.symbol} · AI Copilot`} aria-pressed={saved} onClick={() => toggleWatchlist(itemFromInstrument(instrument))}>{saved ? '★' : '☆'}</button>
    {saved && <button type="button" onClick={() => markReviewed(instrument.id, { ...snapshot, capturedAt: new Date().toISOString() })}>{language === 'ko' ? '확인 완료' : 'Mark reviewed'}</button>}
    {saved && item?.lastReviewedAt && <time dateTime={item.lastReviewedAt}>{new Date(item.lastReviewedAt).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')}</time>}
  </div>
}
