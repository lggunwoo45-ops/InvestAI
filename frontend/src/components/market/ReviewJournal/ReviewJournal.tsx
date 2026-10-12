import { useId, useState, type ReactNode } from 'react'

import type { Language } from '@/i18n/translations'
import { reviewReasonText, type ReviewReason } from '@/services/watchlist/reviewQueue'
import { REVIEW_NOTE_LIMIT, WATCH_REASON_LIMIT, type WatchlistItem } from '@/services/watchlist/watchlistStorage'
import styles from './ReviewJournal.module.css'

interface Props {
  item: WatchlistItem | undefined
  language: Language
  onSave: (note: string, reason: string) => void
  children?: ReactNode
}
const copy = {
  ko: { note: '검토 메모', reason: '관심 이유', save: '저장', none: '메모 없음', history: '최근 검토 이력', empty: '아직 확인 이력이 없습니다.', locked: '관심종목에 등록하면 메모를 남길 수 있습니다.', saved: '저장됨' },
  en: { note: 'Review note', reason: 'Watch reason', save: 'Save', none: 'No note', history: 'Recent review history', empty: 'No review history yet.', locked: 'Add to watchlist to leave a note.', saved: 'Saved' },
} as const

function JournalEditor({ item, language, onSave, children }: Props & { item: WatchlistItem }) {
  const text = copy[language]
  const id = useId()
  const [note, setNote] = useState(item.note ?? '')
  const [reason, setReason] = useState(item.reviewReason ?? '')
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const recordTitle = language === 'ko' ? '검토 기록' : 'Review record'
  return <section className={styles.journal} aria-label={recordTitle}>
    <strong>{recordTitle}</strong>
    <form onSubmit={event => { event.preventDefault(); onSave(note, reason); setSaved(true) }}>
      <label htmlFor={`${id}-reason`}>{text.reason}</label>
      <input id={`${id}-reason`} value={reason} maxLength={WATCH_REASON_LIMIT} onChange={event => { setReason(event.target.value); setSaved(false) }} />
      <label htmlFor={`${id}-note`}>{text.note}</label>
      <textarea id={`${id}-note`} rows={2} value={note} maxLength={REVIEW_NOTE_LIMIT} placeholder={text.none} onChange={event => { setNote(event.target.value); setSaved(false) }} />
      <div><button type="submit">{text.save}</button>{saved && <span role="status">{text.saved}</span>}</div>
    </form>
    {children}
    <button type="button" aria-label={text.history} aria-expanded={expanded} aria-controls={expanded ? `${id}-history` : undefined} onClick={() => setExpanded(value => !value)}>{text.history} {item.reviewHistory?.length ?? 0} {expanded ? '▴' : '▾'}</button>
    {expanded && <section id={`${id}-history`} aria-label={text.history}>
      {!item.reviewHistory?.length ? <small>{text.empty}</small> : <ol>{item.reviewHistory.slice(0, 3).map((entry, index) => <li key={`${entry.reviewedAt}-${index}`}>
        <time dateTime={entry.reviewedAt}>{new Date(entry.reviewedAt).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')}</time>
        <b>{entry.finalReadTitle || entry.finalReadState}</b>
        <span>{entry.primaryReviewReason ? reviewReasonText[language][entry.primaryReviewReason as ReviewReason] ?? entry.primaryReviewReason : entry.finalReadSummary}</span>
        {entry.note && <small title={entry.note}>{entry.note.slice(0, 100)}</small>}
      </li>)}</ol>}
    </section>}
  </section>
}
export function ReviewJournal(props: Props) {
  if (!props.item) return <>{props.children}<small className={styles.locked}>{copy[props.language].locked}</small></>
  return <JournalEditor key={props.item.instrumentId} {...props} item={props.item} />
}
