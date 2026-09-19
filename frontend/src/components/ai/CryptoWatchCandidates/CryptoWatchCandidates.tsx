import { useMemo, useState } from 'react'

import { useCandidateFeedback } from '@/hooks/useCandidateFeedback'
import type { Language } from '@/i18n/translations'
import { getWatchScoreLabel } from '@/services/ai/cryptoWatchCandidateEngine'
import type { CandidateReviewFilter, CandidateReviewStatus } from '@/types/candidateFeedback'
import type { MarketDataMode } from '@/types/market'
import type { WatchCandidate, WatchCandidateNewsSource } from '@/types/watchCandidate'
import { CANDIDATE_NOTE_MAX_LENGTH } from '@/utils/candidateFeedbackStorage'
import { filterCandidatesByReviewStatus } from '@/utils/candidateFeedbackSelectors'
import styles from './CryptoWatchCandidates.module.css'

interface CryptoWatchCandidatesProps {
  candidates: readonly WatchCandidate[]
  language: Language
  mode: MarketDataMode
  newsSource: WatchCandidateNewsSource
  loading?: boolean
  error?: string | null
  onOpenInstrument: (instrumentId: string) => void
  onOpenMarket: () => void
  onModeChange: (mode: MarketDataMode) => void
  onRetry: () => void
}

const statusOrder: readonly CandidateReviewStatus[] = ['unreviewed', 'watching', 'reviewed', 'dismissed']

const text = {
  en: {
    title: 'Crypto Watch Candidates', eyebrow: 'DAILY REVIEW WORKSPACE', subtitle: 'A deterministic research shortlist from Upbit KRW market evidence.', trust: 'Transparent rule-based screen · no AI model · no investment recommendation', live: 'LIVE CATALOG', mock: 'MOCK CATALOG', loading: 'Preparing the evidence-ranked watchlist…', empty: 'No complete crypto market catalog is available.', filteredEmpty: 'No candidates match this review filter.', error: 'The crypto catalog could not be loaded.', openMarket: 'Open Market', useMock: 'Use mock catalog', retry: 'Retry', open: 'Open in Market', openAndReview: 'Mark reviewed after opening', why: 'Why it is on watch', evidence: 'Evidence breakdown', risk: 'Risk / invalidation', next: 'Next watch points', news: 'News provenance', source: 'Source', scope: 'Scope', headlines: 'headlines', details: 'Inspect evidence', score: 'Watch Score', today: "Today's review", candidates: 'candidates', dataMode: 'Data mode', newsSource: 'News source', realAi: 'Real AI', inactive: 'Not active', all: 'All', reviewFilter: 'Review status filter', statuses: { unreviewed: 'Unreviewed', watching: 'Watching', reviewed: 'Reviewed', dismissed: 'Dismissed' }, actions: { watching: 'Mark as Watching', reviewed: 'Mark as Reviewed', dismissed: 'Dismiss', unreviewed: 'Reset status' }, note: 'Local note', localOnly: 'Saved on this device only', addNote: 'Add note', clearNote: 'Clear note', reset: 'Reset local feedback', resetConfirm: 'Clear all candidate statuses and local notes on this device?', checklist: 'Review checklist', checklistItems: ['Check volume confirmation', 'Check BTC direction', 'Check news source', 'Check invalidation condition', 'Open chart before deciding'] },
  ko: {
    title: '가상자산 관찰 후보', eyebrow: '일일 검토 작업공간', subtitle: '업비트 KRW 시장 근거를 규칙 기반으로 계산한 리서치 후보 목록입니다.', trust: '투명한 규칙 기반 화면 · AI 모델 없음 · 투자 추천 아님', live: '실시간 카탈로그', mock: '모의 카탈로그', loading: '근거 기반 관찰 목록을 준비하고 있습니다…', empty: '사용 가능한 가상자산 시장 카탈로그가 없습니다.', filteredEmpty: '이 검토 필터에 맞는 후보가 없습니다.', error: '가상자산 카탈로그를 불러오지 못했습니다.', openMarket: '마켓 열기', useMock: '모의 카탈로그 사용', retry: '다시 시도', open: '마켓에서 열기', openAndReview: '연 후 검토 완료', why: '관찰 이유', evidence: '근거 점수 상세', risk: '위험 / 무효화 조건', next: '다음 확인 항목', news: '뉴스 출처', source: '출처', scope: '범위', headlines: '개 헤드라인', details: '근거 펼쳐보기', score: '관찰 점수', today: '오늘의 검토', candidates: '개 후보', dataMode: '데이터 모드', newsSource: '뉴스 출처', realAi: '실제 AI', inactive: '비활성', all: '전체', reviewFilter: '검토 상태 필터', statuses: { unreviewed: '미확인', watching: '관찰 중', reviewed: '검토 완료', dismissed: '제외' }, actions: { watching: '관찰 중으로 표시', reviewed: '검토 완료로 표시', dismissed: '제외', unreviewed: '상태 초기화' }, note: '로컬 메모', localOnly: '이 기기에만 저장됩니다', addNote: '메모 추가', clearNote: '메모 삭제', reset: '로컬 피드백 초기화', resetConfirm: '이 기기의 모든 후보 상태와 로컬 메모를 삭제할까요?', checklist: '검토 체크리스트', checklistItems: ['거래량 확인', 'BTC 방향 확인', '뉴스 출처 확인', '무효화 조건 확인', '판단 전 차트 열기'] },
} as const

export function CryptoWatchCandidates({ candidates, language, mode, newsSource, loading = false, error = null, onOpenInstrument, onOpenMarket, onModeChange, onRetry }: CryptoWatchCandidatesProps) {
  const t = text[language]
  const { feedback, setStatus, setNote, resetStatus, resetAll } = useCandidateFeedback()
  const [filter, setFilter] = useState<CandidateReviewFilter>('all')
  const visible = useMemo(() => filterCandidatesByReviewStatus(candidates, feedback, filter), [candidates, feedback, filter])
  const counts = useMemo(() => Object.fromEntries(statusOrder.map((status) => [status, candidates.filter((candidate) => (feedback[candidate.instrumentId]?.status ?? 'unreviewed') === status).length])) as Record<CandidateReviewStatus, number>, [candidates, feedback])
  const resetFeedback = () => { if (window.confirm(t.resetConfirm)) { resetAll(); setFilter('all') } }
  const openAndReview = (instrumentId: string) => { setStatus(instrumentId, 'reviewed'); onOpenInstrument(instrumentId) }

  return <main className={styles.page}>
    <header className={styles.heading}><div><span>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><div className={styles.mode} aria-label={language === 'ko' ? '시장 데이터 모드' : 'Market data mode'}><button className={mode === 'live' ? styles.active : ''} onClick={() => onModeChange('live')}>{t.live}</button><button className={mode === 'mock' ? styles.active : ''} onClick={() => onModeChange('mock')}>{t.mock}</button></div></header>
    <p className={styles.trust}>{t.trust}</p>
    {!loading && !error && candidates.length > 0 && <><section className={styles.reviewSummary} aria-label={t.today}><div><span>{t.today}</span><strong>{candidates.length} {t.candidates}</strong></div>{statusOrder.map((status) => <div key={status}><span>{t.statuses[status]}</span><strong>{counts[status]}</strong></div>)}<div><span>{t.dataMode}</span><strong>{mode.toUpperCase()}</strong></div><div><span>{t.newsSource}</span><strong>{newsSource}</strong></div><div><span>{t.realAi}</span><strong>{t.inactive}</strong></div></section><nav className={styles.filters} aria-label={t.reviewFilter}>{(['all', ...statusOrder] as const).map((status) => <button key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status === 'all' ? t.all : t.statuses[status]}<span>{status === 'all' ? candidates.length : counts[status]}</span></button>)}<button className={styles.reset} onClick={resetFeedback}>{t.reset}</button></nav></>}
    {loading && <section className={styles.state} role="status">{t.loading}</section>}
    {!loading && (error || candidates.length === 0) && <section className={styles.state} role="status"><strong>{error ? t.error : t.empty}</strong>{error && <small>{error}</small>}<div><button onClick={onOpenMarket}>{t.openMarket}</button>{error && <button onClick={onRetry}>{t.retry}</button>}{mode === 'live' && <button onClick={() => onModeChange('mock')}>{t.useMock}</button>}</div></section>}
    {!loading && !error && candidates.length > 0 && visible.length === 0 && <section className={styles.state} role="status"><strong>{t.filteredEmpty}</strong></section>}
    {!loading && !error && visible.length > 0 && <ol className={styles.list} aria-label={t.title}>{visible.map((candidate) => { const item = feedback[candidate.instrumentId]; const status = item?.status ?? 'unreviewed'; return <li key={candidate.id} className={styles.card} data-review-status={status}><div className={styles.rank} aria-label={`Rank ${candidate.rank}`}>{String(candidate.rank).padStart(2, '0')}</div><div className={styles.body}>
      <header className={styles.cardHeader}><div><strong>{candidate.symbol}</strong><span>{candidate.name}</span><em data-review-status={status}>{t.statuses[status]}</em></div><div className={styles.score}><span>{t.score}</span><b>{candidate.watchScore}</b><em data-level={candidate.scoreLabel}>{getWatchScoreLabel(candidate.scoreLabel, language)}</em></div></header>
      <p className={styles.reason}><b>{t.why}</b>{candidate.watchReason}</p><div className={styles.chips}>{candidate.evidence.slice(0, 4).map((evidence) => <span key={evidence.type} data-status={evidence.status}>{evidence.label} {evidence.score > 0 ? `+${evidence.score}` : evidence.score}</span>)}</div><div className={styles.snapshot}><p><b>{t.risk}</b>{candidate.riskSummary}</p><p><b>{t.news}</b>{candidate.newsEvidence.source} · {candidate.newsEvidence.scope}</p></div>
      <div className={styles.actions}>{statusOrder.map((next) => <button key={next} aria-pressed={status === next} onClick={() => next === 'unreviewed' ? resetStatus(candidate.instrumentId) : setStatus(candidate.instrumentId, next)}>{t.actions[next]}</button>)}</div>
      <label className={styles.note}><span><b>{t.note}</b><small>{t.localOnly}</small></span><textarea aria-label={`${t.note} ${candidate.symbol}`} maxLength={CANDIDATE_NOTE_MAX_LENGTH} placeholder={t.addNote} value={item?.note ?? ''} onChange={(event) => setNote(candidate.instrumentId, event.target.value)} /><span><small>{(item?.note.length ?? 0)}/{CANDIDATE_NOTE_MAX_LENGTH}</small>{item?.note && <button onClick={() => setNote(candidate.instrumentId, '')}>{t.clearNote}</button>}</span></label>
      <details className={styles.details}><summary>{t.details}</summary><section><h2>{t.evidence}</h2><dl>{candidate.evidence.map((evidence) => <div key={evidence.type} data-status={evidence.status}><dt>{evidence.label}</dt><dd><b>{evidence.score}/{evidence.maxScore}</b>{evidence.summary}</dd></div>)}</dl></section><section><h2>{t.risk}</h2><p>{candidate.riskSummary}</p><p>{candidate.invalidationSummary}</p></section><section><h2>{t.next}</h2><ul>{candidate.nextWatchPoints.map((point) => <li key={point}>{point}</li>)}</ul></section><section><h2>{t.checklist}</h2><ul className={styles.checklist}>{t.checklistItems.map((point) => <li key={point}>□ {point}</li>)}</ul></section><section><h2>{t.news}</h2><p>{t.source}: {candidate.newsEvidence.source} · {t.scope}: {candidate.newsEvidence.scope} · {candidate.newsEvidence.count} {t.headlines}</p>{candidate.newsEvidence.headlines.map((headline) => <p key={headline}>— {headline}</p>)}<small>{candidate.newsEvidence.disclaimer}</small></section></details>
      <footer><small>{candidate.disclaimer}</small><div><button onClick={() => onOpenInstrument(candidate.instrumentId)}>{t.open}</button><button onClick={() => openAndReview(candidate.instrumentId)}>{t.openAndReview}</button></div></footer>
    </div></li> })}</ol>}
  </main>
}
