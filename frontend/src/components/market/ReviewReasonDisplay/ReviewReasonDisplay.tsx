import type { Language } from '@/i18n/translations'
import { compareAnalysisChanges } from '@/services/watchlist/analysisChangeComparison'
import { reviewReasonText, type ReviewReason } from '@/services/watchlist/reviewQueue'
import type { ReviewSnapshot, WatchlistItem } from '@/services/watchlist/watchlistStorage'

/** Presentation only: retain the queue's existing primary-reason order. */
export function ReviewReasonDisplay({ item, current, reasons, language }: {
  item: WatchlistItem; current?: ReviewSnapshot; reasons: readonly ReviewReason[]; language: Language
}) {
  const previous = item.lastReviewedSnapshot
  const changed = previous && current && previous.finalReadState !== current.finalReadState
  const comparison = compareAnalysisChanges(previous, current ?? null)
  const evidenceChanged = comparison.compatible && comparison.differences.some(value => value.status === 'improved' || value.status === 'weakened')
  const secondary = changed && previous && current ? `${previous.finalReadTitle || previous.finalReadState} → ${current.finalReadTitle || current.finalReadState}`
    : evidenceChanged ? (language === 'ko' ? '분석 변화 있음' : 'Analysis evidence changed')
      : item.note ? (language === 'ko' ? '메모 있음' : 'Note saved') : null
  return <span>
    <strong>{reasons[0] ? reviewReasonText[language][reasons[0]] : language === 'ko' ? '확인 완료' : 'Reviewed'}</strong>
    {secondary && <small>{secondary}</small>}
  </span>
}
