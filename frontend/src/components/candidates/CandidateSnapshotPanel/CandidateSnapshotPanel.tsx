import type { Language } from '@/i18n/translations'
import { evaluateCandidateSnapshotFreshness } from '@/services/candidateSnapshot/candidateSnapshotFreshness'
import type { CandidateSnapshot, CandidateSnapshotCurrentState } from '@/types/candidateSnapshot'
import styles from './CandidateSnapshotPanel.module.css'

interface CandidateSnapshotPanelProps {
  snapshot: CandidateSnapshot | null
  currentStates: ReadonlyMap<string, CandidateSnapshotCurrentState>
  language: Language
  now: string
  canRefresh: boolean
  onRefresh: () => void
  onOpenAnalysis: (instrumentId: string, snapshotId: string) => void
}

const copy = {
  en: {
    title: 'Interest candidates', eyebrow: 'Snapshot record', disclaimer: (time: string) => `This list is a record from ${time}. It is not a current investment recommendation. It does not update automatically until refreshed.`, refresh: 'Refresh candidates', notReady: 'Candidate data is not ready to create a snapshot yet.', basis: 'Basis', current: 'Current', change: 'Change since basis', basisTime: 'Basis time', reason: 'Reason recorded', details: 'Rule basis and changed fields', open: 'Open analysis', changes: 'Changes found', none: 'No material evidence-state changes.', freshness: { basisHeld: 'Baseline held', changeReview: 'Change check needed', expired: 'Snapshot expired', unavailable: 'Current state unavailable' }, stages: { waiting: 'Waiting / checking conditions', first: 'Observation start', second: 'Conditions forming', third: 'Conditions clear', chaseCaution: 'Movement expansion caution', reboundCaution: 'Sharp-drop rebound caution' }, fields: { ruleBasis: 'Rule basis', interestStage: 'Interest stage', actionStatus: 'Action status', dataQuality: 'Data quality' },
  },
  ko: {
    title: '관심 후보 목록', eyebrow: '기준 기록', disclaimer: (time: string) => `이 목록은 ${time} 시점의 기록이며, 현재 시점의 투자 권유가 아닙니다. 새로고침 전까지 자동으로 갱신되지 않습니다.`, refresh: '후보 새로고침', notReady: '후보 기준을 만들 수 있는 데이터가 아직 준비되지 않았습니다.', basis: '기준', current: '현재', change: '기준 이후 변화', basisTime: '기준 시점', reason: '기록된 이유', details: '규칙 근거와 달라진 점', open: '분석 열기', changes: '달라진 점 있음', none: '근거 상태의 중요한 변화가 없습니다.', freshness: { basisHeld: '기준 유지', changeReview: '변화 확인 필요', expired: '기준 시점이 오래됨', unavailable: '현재 상태 확인 불가' }, stages: { waiting: '대기 / 조건 확인 중', first: '관찰 시작', second: '조건 확인', third: '조건 뚜렷', chaseCaution: '변동 확대 주의', reboundCaution: '급락 반등 주의' }, fields: { ruleBasis: '규칙 근거', interestStage: '관심 단계', actionStatus: '액션 상태', dataQuality: '데이터 품질' },
  },
} as const

function number(value: number, language: Language) { return Number.isFinite(value) ? new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 4 }).format(value) : '—' }
function time(value: string, language: Language) { return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }

export function CandidateSnapshotPanel({ snapshot, currentStates, language, now, canRefresh, onRefresh, onOpenAnalysis }: CandidateSnapshotPanelProps) {
  const t = copy[language]
  return <section className={styles.panel} aria-label={t.title}>
    <header><div><span>{t.eyebrow}</span><h2>{t.title}</h2>{snapshot && <p>{t.disclaimer(time(snapshot.generatedAt, language))}</p>}</div><button type="button" disabled={!canRefresh} onClick={onRefresh}>{t.refresh}</button></header>
    {!snapshot && <p className={styles.empty} role="status">{t.notReady}</p>}
    {snapshot && <ol className={styles.list}>{[...snapshot.items].sort((left, right) => left.order - right.order).slice(0, 5).map((item) => {
      const current = currentStates.get(item.instrumentId) ?? null
      const freshness = evaluateCandidateSnapshotFreshness(item, current, snapshot.expiresAt, now)
      const difference = current && Number.isFinite(current.currentPrice) ? current.currentPrice - item.basisPrice : null
      return <li key={item.instrumentId} className={styles.card} data-freshness={freshness.state}>
        <div className={styles.identity}><div><strong>{item.symbol}</strong><span>{item.displayName} · {item.assetType}</span></div><b>{t.stages[item.interestStage]}</b></div>
        <div className={styles.freshness}><span>{t.basisTime}: {time(snapshot.generatedAt, language)}</span><strong>{t.freshness[freshness.state]}</strong></div>
        <p className={styles.reason}><b>{t.reason}</b>{item.reasonText}</p>
        <div className={styles.values}><div><span>{t.basis}</span><strong>{number(item.basisPrice, language)} {item.quoteCurrency}</strong></div><div><span>{t.current}</span><strong>{current ? `${number(current.currentPrice, language)} ${item.quoteCurrency}` : '—'}</strong></div><div><span>{t.change}</span><strong>{difference === null ? '—' : `${difference >= 0 ? '+' : ''}${number(difference, language)} ${item.quoteCurrency}`}</strong></div></div>
        <details><summary>{t.details}</summary><dl>{item.ruleBasis.map((entry) => <div key={entry.key}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl><h3>{freshness.changes.length ? t.changes : t.none}</h3>{freshness.changes.length > 0 && <ul>{freshness.changes.map((change) => <li key={change.field}>{t.fields[change.field]}: {change.previousValue} → {change.currentValue}</li>)}</ul>}</details>
        <footer><button type="button" onClick={() => onOpenAnalysis(item.instrumentId, snapshot.snapshotId)}>{t.open} →</button></footer>
      </li>
    })}</ol>}
  </section>
}
