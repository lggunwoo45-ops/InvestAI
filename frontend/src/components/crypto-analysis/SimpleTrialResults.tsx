import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { OpportunityTrialStore } from '@/services/cryptoAnalysis/opportunityTrialStorage'
import { opportunityReport } from '@/services/cryptoAnalysis/opportunityReport'
import type { TrialState } from '@/services/cryptoAnalysis/opportunityTrials'
import type { Language } from '@/i18n/translations'
import { ModeGuide } from '@/components/simple/ModeGuide'
import styles from '@/components/simple/SimpleWorkspace.module.css'

const labels: Record<Language, Record<TrialState, string>> = {
  ko: { pending: '아직 시작 전', open: '가상 진입 후 관찰 중', target: '목표 가격 도달', stop: '손절 기준 도달', timeout: '24시간 관찰 종료', ambiguous: '목표·손절 도달 순서 불명', skipped: '조건이 맞지 않아 미진입', unresolved: '자료가 부족해 결과 확인 불가' },
  en: { pending: 'Waiting to start', open: 'Observing a simulated entry', target: 'Target reached', stop: 'Stop reached', timeout: '24-hour observation ended', ambiguous: 'Target/stop order unknown', skipped: 'Entry conditions not met', unresolved: 'Not enough evidence' },
}
export function SimpleTrialResults({ store, language, now, busy, error, live, onRefresh }: { store: OpportunityTrialStore; language: Language; now: number; busy: boolean; error: string; live: boolean; onRefresh: () => void }) {
  const ko = language === 'ko'
  const [limit, setLimit] = useState(6)
  const report = opportunityReport(store.trials, now, { kind: 'all', period: 'all', market: 'all' })
  const { summary } = report
  const stamp = (at: number) => new Date(at).toLocaleString(ko ? 'ko-KR' : 'en-US')
  const percent = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
  return <section className={styles.tasks} aria-label={ko ? '후보 기록 한눈에 보기' : 'Candidate results at a glance'}>
    <p className={styles.note}>{ko ? '저장한 조건으로 계산한 가상 결과예요. 실제 계좌 손익이 아니며, 미진입·손실·자료 부족도 모두 표시해요.' : 'Simulated outcomes using saved conditions, not account returns. Skipped entries, losses and missing evidence remain visible.'}</p>
    {!store.error && !error && !store.loading && <div className={styles.resultCounts}>
      <div><span>{ko ? '저장한 후보' : 'Recorded'}</span><strong>{summary.total}</strong></div>
      <div><span>{ko ? '결과 확인' : 'Evaluated'}</span><strong>{summary.completed}</strong></div>
      <div><span>{ko ? '시작 전·관찰 중' : 'Waiting / observing'}</span><strong>{summary.pending}</strong></div>
      <div><span>{ko ? '미진입·자료 부족' : 'Skipped / unresolved'}</span><strong>{summary.skipped + summary.unresolved}</strong></div>
    </div>}
    <div className={styles.actions}><button type="button" disabled={busy || !live || (store.source !== 'server' && (!store.trials.length || store.error))} onClick={onRefresh}>{busy ? (ko ? '결과 확인 중…' : 'Checking…') : (ko ? '이후 결과 확인' : 'Refresh outcomes')}</button><Link to="/ai-analysis">{ko ? '새 후보 찾기' : 'Find candidates'} →</Link></div>
    <p className={styles.note}>{ko ? store.source === 'server' ? '서버가 화면을 닫아도 관찰해요. 아래는 마지막으로 가져온 기록입니다.' : '이 기기에 저장한 기록이에요. 이 화면을 열고 실제 시세 모드에서 갱신할 수 있어요.' : store.source === 'server' ? 'The server observes while the app is closed. These are the latest fetched records.' : 'Records are stored on this device. Open this page in live mode to refresh.'} {store.asOf ? stamp(store.asOf) : ''}</p>
    {!live && <p role="status">{ko ? '예시 시세에서는 결과를 갱신하지 않아요. 기존 기록만 보여드려요.' : 'Demo mode shows saved records without refreshing outcomes.'}</p>}
    {(store.error || error) && <p role="alert">{store.message || (ko ? '기록을 갱신하지 못했어요. 기존 기록은 보존했으니 다시 확인해주세요.' : 'Could not refresh. Existing records are preserved; please retry.')}</p>}
    {store.loading && <p role="status">{ko ? '저장한 기록을 불러오는 중…' : 'Loading saved records…'}</p>}
    {!store.loading && !store.error && !error && !store.trials.length && <article className={styles.card}><h2>{ko ? '첫 후보를 기록해보세요' : 'Record your first candidate'}</h2><p>{ko ? '종목 찾기에서 검색한 후보를 저장하면, 이후 가격과 가상 결과를 여기서 확인할 수 있어요.' : 'Save candidates from a scan to follow their subsequent prices and simulated outcomes here.'}</p><Link to="/ai-analysis">{ko ? '후보 검색 시작하기' : 'Start a candidate scan'} →</Link></article>}
    {report.rows.slice(0, limit).map(({ trial, outcome }) => <article key={trial.id} className={styles.simpleResult} data-state={outcome.state}>
      <header><div><h2>{trial.instrument.displaySymbol ?? trial.instrument.symbol}</h2><small>{trial.instrument.marketId === 'upbit' ? 'Upbit' : 'Binance Spot'} · {trial.instrument.quoteCurrency}</small></div><strong>{labels[language][outcome.state]}</strong></header>
      <p>{ko ? '비용 반영 가상 손익' : 'Simulated return after costs'} <b>{outcome.netLow === outcome.netHigh ? percent(outcome.netLow) : `${percent(outcome.netLow)} ~ ${percent(outcome.netHigh)}`}</b></p>
      <small>{ko ? '기록한 시각' : 'Recorded'} · {stamp(trial.recordedAt)}</small>
      {outcome.state === 'ambiguous' && <p>{ko ? '같은 시간봉에서 양쪽 가격에 닿아 순서를 알 수 없어요. 손실부터 이익까지 범위로 표시해요.' : 'Both prices were touched in the same bar. Unknown ordering is shown as a loss-to-gain range.'}</p>}
      {trial.issue && <p role="status">{ko ? '가격 자료가 빠졌거나 기존 값과 달라 판정을 보류한 부분이 있어요.' : 'Missing or revised prices prevent a definitive outcome.'}</p>}
      <Link to={`/my-analysis?instrumentId=${encodeURIComponent(trial.instrument.id)}`}>{ko ? '이 종목 다시 분석' : 'Review this asset now'} →</Link>
    </article>)}
    {report.rows.length > limit && <button type="button" onClick={() => setLimit(n => n + 6)}>{ko ? '기록 더 보기' : 'More records'}</button>}
    <ModeGuide expert={{ ko: '전략별 비교, 기간·시장 필터, 가격 근거와 파일 내보내기는 전문가모드에서 확인하세요.', en: 'Expert mode includes strategy comparisons, period and market filters, price evidence and exports.' }} />
  </section>
}
