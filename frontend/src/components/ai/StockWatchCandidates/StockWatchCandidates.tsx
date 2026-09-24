import { useCandidateFeedback } from '@/hooks/useCandidateFeedback'
import type { Language } from '@/i18n/translations'
import type { StockMarketRegion, StockWatchCandidate, WatchCandidateHorizon } from '@/types/watchCandidate'
import { CANDIDATE_NOTE_MAX_LENGTH } from '@/utils/candidateFeedbackStorage'
import styles from './StockWatchCandidates.module.css'

interface StockWatchCandidatesProps {
  candidates: readonly StockWatchCandidate[]
  region: StockMarketRegion
  language: Language
  horizon: WatchCandidateHorizon
  supportedInstrumentIds: ReadonlySet<string>
  loading?: boolean
  onOpenInstrument: (instrumentId: string) => void
}

const copy = {
  en: { title: 'Stock Interest Candidates', korea: 'Korea Stock Interest Candidates', us: 'US Stock Interest Candidates', eyebrow: 'EARLY BETA · RULE-BASED', coverage: 'Stock candidate coverage is in early beta. Some data may be mock, limited, or unavailable. Use this screen to review the workflow, not as live investment guidance.', empty: 'Stock interest candidates are not available yet. Stock data coverage is still being expanded.', loading: 'Preparing limited stock catalog evidence…', score: 'Watch context', quality: 'Data quality', sector: 'Sector / theme', unavailable: 'Not available', why: 'Why watch', evidence: 'Evidence breakdown', risk: 'Risk summary', news: 'News evidence', planning: 'Research reference', interest: 'Observation context', target: 'Follow-up context', invalidation: 'Risk context', cadence: 'Review cadence', open: 'Open in Market', advice: 'Research record only', status: { unreviewed: 'Unreviewed', watching: 'Watching', reviewed: 'Reviewed', dismissed: 'Dismissed' }, actions: { watching: 'Mark as Watching', reviewed: 'Mark as Reviewed', dismissed: 'Dismiss' }, note: 'Local note', noteHelp: 'Saved on this device only', qualityLabels: { live: 'Live data', mock: 'Mock / preview data', limited: 'Limited data', unavailable: 'Unavailable' } },
  ko: { title: '주식 관심 후보 목록', korea: '한국 주식 관심 후보', us: '미국 주식 관심 후보', eyebrow: '초기 베타 · 규칙 기반', coverage: '주식 후보 기능은 초기 베타입니다. 일부 데이터는 모의·제한·미지원 상태일 수 있습니다. 이 화면은 실시간 투자 판단이 아니라 분석 흐름 검토용입니다.', empty: '주식 관심 후보는 아직 준비 중입니다. 주식 데이터 범위를 확장하는 중입니다.', loading: '제한된 주식 카탈로그 근거를 준비하고 있습니다…', score: '관찰 맥락', quality: '데이터 품질', sector: '섹터 / 테마', unavailable: '정보 없음', why: '관찰 이유', evidence: '근거 상세', risk: '위험 요약', news: '뉴스 근거', planning: '리서치 참고', interest: '관찰 맥락', target: '후속 확인 맥락', invalidation: '위험 맥락', cadence: '검토 주기', open: '마켓에서 열기', advice: '리서치 기록 전용', status: { unreviewed: '미확인', watching: '관찰 중', reviewed: '검토 완료', dismissed: '제외' }, actions: { watching: '관찰 중으로 표시', reviewed: '검토 완료로 표시', dismissed: '제외' }, note: '로컬 메모', noteHelp: '이 기기에만 저장됩니다', qualityLabels: { live: '실시간 데이터', mock: '모의 / 미리보기 데이터', limited: '제한된 데이터', unavailable: '미지원' } },
} as const

export function StockWatchCandidates({ candidates, region, language, horizon, supportedInstrumentIds, loading = false, onOpenInstrument }: StockWatchCandidatesProps) {
  const t = copy[language]
  const { feedback, setStatus, setNote } = useCandidateFeedback()
  return <section className={styles.page} aria-labelledby="stock-candidates-title">
    <header className={styles.heading}><div><span>{t.eyebrow}</span><h1 id="stock-candidates-title">{region === 'korea' ? t.korea : t.us}</h1><p>{t.title} · {horizon.toUpperCase()}</p></div><strong>{t.advice}</strong></header>
    <div className={styles.coverage} role="note"><b>{language === 'ko' ? '주식 데이터 범위 · 초기 베타' : 'Stock data coverage · Early beta'}</b><p>{t.coverage}</p></div>
    {loading && <div className={styles.state} role="status">{t.loading}</div>}
    {!loading && candidates.length === 0 && <div className={styles.state} role="status">{t.empty}</div>}
    {!loading && candidates.length > 0 && <ol className={styles.list}>{candidates.map((candidate) => { const item = feedback[candidate.instrumentId]; const status = item?.status ?? 'unreviewed'; const supported = supportedInstrumentIds.has(candidate.instrumentId); return <li key={candidate.id} className={styles.card} data-status={status}>
      <div className={styles.body}><header><div><strong>{candidate.symbol}</strong><span>{candidate.name}</span><em>{region === 'korea' ? 'KOSPI / KOSDAQ' : 'NASDAQ / NYSE'}</em></div></header>
      <div className={styles.badges}><span>{t.quality}: <b>{t.qualityLabels[candidate.dataQuality]}</b></span><span>{t.sector}: <b>{candidate.sectorLabel ?? t.unavailable}</b></span><span>{t.status[status]}</span></div>
      <p className={styles.qualityNote}>{candidate.dataQualityNote}</p><p className={styles.reason}><b>{t.why}</b>{candidate.watchReason}</p>
      <details><summary>{t.evidence}</summary><dl>{candidate.evidence.map((evidence) => <div key={evidence.type}><dt>{evidence.label}</dt><dd>{evidence.summary}</dd></div>)}</dl><h2>{t.news}</h2><p>{candidate.newsEvidence.scope} · {candidate.newsEvidence.count}</p><h2>{t.risk}</h2><p>{candidate.riskSummary}</p></details>
      <div className={styles.feedback}>{(['watching', 'reviewed', 'dismissed'] as const).map((next) => <button key={next} type="button" aria-pressed={status === next} onClick={() => setStatus(candidate.instrumentId, next)}>{t.actions[next]}</button>)}</div>
      <label className={styles.note}><span><b>{t.note}</b><small>{t.noteHelp}</small></span><textarea aria-label={`${t.note} ${candidate.symbol}`} maxLength={CANDIDATE_NOTE_MAX_LENGTH} value={item?.note ?? ''} onChange={(event) => setNote(candidate.instrumentId, event.target.value)} /></label>
      <footer><small>{candidate.disclaimer}</small>{supported && <button type="button" onClick={() => onOpenInstrument(candidate.instrumentId)}>{t.open} →</button>}</footer>
    </div></li> })}</ol>}
  </section>
}

