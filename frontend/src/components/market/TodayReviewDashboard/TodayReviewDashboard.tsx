import { useId, useState } from 'react'

import type { Language } from '@/i18n/translations'
import { reviewReasonText } from '@/services/watchlist/reviewQueue'
import type { TodayReviewModel, TodayReviewSummary } from '@/services/watchlist/todayReviewSummary'
import type { MarketInstrument } from '@/types/market'
import { formatMarketChange, formatMarketPrice } from '@/utils/formatMarketValue'
import styles from './TodayReviewDashboard.module.css'

export type TodayReviewScope = 'watchlist' | 'review'
interface Props {
  model: TodayReviewModel
  language: Language
  instruments: ReadonlyMap<string, MarketInstrument>
  onOpen: (instrument: MarketInstrument) => void
  onScopeChange: (scope: TodayReviewScope) => void
}
const copy = {
  ko: { title: '오늘의 검토', highlights: '검토 종목', open: '보기', empty: '오늘 다시 볼 종목이 없습니다.', limited: '데이터 확인 필요', unavailable: '현재 목록에서 확인할 수 없음', cards: [
    ['관심종목', '저장된 종목'], ['다시 볼 종목', '확인이 필요한 종목'], ['판단 변화', '이전 확인과 다른 판단'], ['접근 검토 가능', '현재 검토 가능한 상태'], ['이미 움직임 큼', '움직임 확대 확인'], ['데이터 확인 가능', '부족했던 데이터 개선'],
  ] },
  en: { title: 'Today review', highlights: 'Review highlights', open: 'Open', empty: 'No instruments need review today.', limited: 'Data check needed', unavailable: 'Not available in the current list', cards: [
    ['Watchlist', 'Saved instruments'], ['Review queue', 'Instruments needing review'], ['Changed', 'Different from last review'], ['Approach review possible', 'Current review state'], ['Already extended', 'Check expanded movement'], ['Data available', 'Previously limited data improved'],
  ] },
} as const
const countKeys: readonly (keyof Pick<TodayReviewSummary, 'watchlistCount' | 'reviewQueueCount' | 'changedCount' | 'approachReviewCount' | 'extendedCount' | 'dataRecoveredCount'>)[] = ['watchlistCount', 'reviewQueueCount', 'changedCount', 'approachReviewCount', 'extendedCount', 'dataRecoveredCount']

export function TodayReviewDashboard({ model, language, instruments, onOpen, onScopeChange }: Props) {
  const text = copy[language]
  const panelId = useId()
  const [showHighlights, setShowHighlights] = useState(model.summary.reviewQueueCount > 0)
  return <section className={styles.dashboard} aria-label={text.title}>
    <div className={styles.strip}>
      <strong className={styles.title}>{text.title}</strong>
      <div className={styles.cards}>
        {countKeys.map((key, index) => <button key={key} type="button" className={styles.card} aria-label={`${text.cards[index]![0]} ${model.summary[key]} ${text.cards[index]![1]}`} title={text.cards[index]![1]} onClick={() => onScopeChange(index === 0 ? 'watchlist' : 'review')}>
          <span>{text.cards[index]![0]}</span><b>{model.summary[key]}</b><small>{text.cards[index]![1]}</small>
        </button>)}
      </div>
      <button type="button" className={styles.toggle} aria-expanded={showHighlights} aria-controls={panelId} onClick={() => setShowHighlights(value => !value)}>{text.highlights} {model.summary.reviewQueueCount} {showHighlights ? '▴' : '▾'}</button>
    </div>
    {model.summary.reviewQueueCount === 0 && !showHighlights && <span className={styles.empty}>{text.empty}</span>}
    <div className={styles.highlights} id={panelId} hidden={!showHighlights}>
      {model.queue.length === 0 ? (showHighlights && <span>{text.empty}</span>) : <ul>{model.queue.slice(0, 5).map(entry => {
        const instrument = instruments.get(entry.item.instrumentId)
        const snapshot = entry.current.snapshot
        const change = entry.current.priceChange24h ?? snapshot?.priceChange24h
        const price = instrument && Number.isFinite(instrument.lastPrice) ? formatMarketPrice(instrument) : snapshot?.currentPrice !== undefined && Number.isFinite(snapshot.currentPrice) ? `${snapshot.currentPrice.toLocaleString()} ${entry.item.quote ?? ''}` : null
        return <li key={entry.item.instrumentId}>
          <div><strong>{entry.item.symbol}</strong><small>{entry.item.displayName}</small></div>
          <div><span>{snapshot?.finalReadTitle || text.limited}</span><small>{entry.reasons[0] ? reviewReasonText[language][entry.reasons[0]] : text.limited}</small></div>
          <span className={styles.quote}>{price}{typeof change === 'number' && Number.isFinite(change) ? ` · ${formatMarketChange(change)}` : ''}</span>
          <button type="button" aria-label={`${text.open} ${entry.item.symbol} · ${text.title}`} disabled={!instrument} title={!instrument ? text.unavailable : undefined} onClick={() => { if (instrument) { onOpen(instrument); setShowHighlights(false) } }}>{text.open}</button>
        </li>
      })}</ul>}
    </div>
  </section>
}
