import { useEffect, useMemo } from 'react'

import { useWatchlists } from '@/hooks/useWatchlists'
import type { Language } from '@/i18n/translations'
import type { AiCopilotFinalRead, AiCopilotFinalReadEvidence } from '@/services/aiCopilot/aiCopilotFinalRead'
import type { ChartTimeframe, RealtimeMarketState } from '@/types/marketDetail'
import { AnalysisChanges } from '@/components/market/AnalysisChanges/AnalysisChanges'
import { ReviewJournal } from '@/components/market/ReviewJournal/ReviewJournal'
import { MarkReviewedFeedback } from '@/components/market/ReviewJournal/MarkReviewedFeedback'
import { itemFromInstrument, type ReviewSnapshot } from '@/services/watchlist/watchlistStorage'
import type { MarketInstrument } from '@/types/market'
import styles from './WatchlistReviewActions.module.css'

export function WatchlistReviewActions({ instrument, finalRead, language, evidence, timeframe, marketState }: {
  instrument: MarketInstrument; finalRead: AiCopilotFinalRead | null; language: Language
  evidence?: AiCopilotFinalReadEvidence; timeframe?: ChartTimeframe; marketState?: RealtimeMarketState | null
}) {
  const { isWatchlisted, toggleWatchlist, markReviewed, saveReviewJournal, getWatchlistItem, setActiveReview } = useWatchlists()
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
    // Save only the evidence already used by Final Read, for the exact loaded series.
    ...(evidence && timeframe && (instrument.marketType || !['korea-stock', 'us-stock'].includes(instrument.marketId))
      && marketState?.snapshot?.instrument.id === instrument.id && marketState.snapshot.timeframe === timeframe ? {
      analysisEvidence: {
        instrumentId: instrument.id, market: instrument.marketId,
        exchange: instrument.marketType ?? instrument.marketId, quoteCurrency: instrument.quoteCurrency,
        timeframe, source: marketState.connection.effectiveMode,
        observedAt: marketState.connection.lastUpdatedAt !== null && Number.isFinite(marketState.connection.lastUpdatedAt)
          ? new Date(marketState.connection.lastUpdatedAt).toISOString() : undefined,
        stale: marketState.connection.status !== 'live' || marketState.connection.lastUpdatedAt === null,
        technicalTrend: evidence.technicalTrend, momentumState: evidence.momentumState,
        volumeState: evidence.volumeState, dataQuality: evidence.dataQuality,
      },
    } : {}),
  }), [instrument, finalRead, evidence, timeframe, marketState])
  useEffect(() => {
    setActiveReview({ instrumentId: instrument.id, snapshot })
    return () => setActiveReview(null)
  }, [instrument.id, snapshot, setActiveReview])
  const toggleLabel = language === 'ko' ? (saved ? '관심 해제' : '관심 등록') : (saved ? 'Remove from watchlist' : 'Add to watchlist')
  return <ReviewJournal item={item} language={language} onSave={(note, reason) => saveReviewJournal(instrument.id, note, reason)}><div className={styles.actions} aria-label={language === 'ko' ? '관심종목 확인' : 'Watchlist review'}>
    <span>{language === 'ko' ? (saved ? '관심종목에 등록됨' : '관심종목에 없음') : (saved ? 'In watchlist' : 'Not in watchlist')}</span>
    <button type="button" aria-label={`${toggleLabel} ${instrument.symbol} · AI Copilot`} aria-pressed={saved} onClick={() => toggleWatchlist(itemFromInstrument(instrument))}>{saved ? '★' : '☆'}</button>
    {saved && <MarkReviewedFeedback key={instrument.id} language={language} onReview={() => markReviewed(instrument.id, { ...snapshot, capturedAt: new Date().toISOString() })} />}
    {saved && item?.lastReviewedAt && <time dateTime={item.lastReviewedAt}>{new Date(item.lastReviewedAt).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')}</time>}
  </div>
    {saved && <AnalysisChanges key={instrument.id} previous={item?.lastReviewedSnapshot} current={snapshot} language={language} />}
  </ReviewJournal>
}
