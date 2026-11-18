import { Link } from 'react-router-dom'
import type { Language } from '@/i18n/translations'
import type { ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import { opportunityShortlist } from '@/services/cryptoAnalysis/opportunityEngine'
import { easyDirection } from '@/services/cryptoAnalysis/decisionGuide'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import { checkText } from './opportunityPresentation'
import styles from './OpportunityPlans.module.css'

export function ScanObservations({ results, now, cost, language }: { results: readonly ScanResult[]; now: number; cost: number; language: Language }) {
  const ko = language === 'ko'
  // Observation is deliberately a different category from an eligible entry plan.
  const rows = opportunityShortlist(results, now, cost)
    .filter(row => row.best.status === 'avoid' && row.best.issue === null && row.result.decision.direction !== 'unavailable')
    .sort((a, b) => a.best.checks.filter(c => !c.passed).length - b.best.checks.filter(c => !c.passed).length
      || b.result.instrument.volume24h - a.result.instrument.volume24h).slice(0, 3)
  if (!rows.length) return null
  return <section aria-label={ko ? '다음에 볼 관찰 후보' : 'Observation shortlist'}>
    <h3 className={styles.groupTitle}>{ko ? '다음에 볼 관찰 후보' : 'Observation shortlist'} <span>{rows.length}</span></h3>
    <p>{ko ? '분석 자료는 있지만 매수 조건은 아직 맞지 않는 코인입니다. 미충족 조건이 적은 순서로 최대 3개를 보여드려요. 매수 추천이나 상승 확률 순위는 아닙니다.' : 'These assets have analysis data but do not qualify for entry. Up to three are ordered by fewer unmet conditions, not by predicted returns.'}</p>
    <div className={styles.grid}>{rows.map(({ result, best }) => {
      const { instrument, decision } = result, plan = decision.plan
      const price = (value: number) => `${formatAnalysisPrice(value, language)} ${instrument.quoteCurrency}`
      const missed = best.checks.filter(c => !c.passed)
      return <article className={styles.asset} key={instrument.id}>
        <header><h3>{instrument.displaySymbol ?? instrument.symbol}</h3><span className={styles.badge}>{ko ? '관찰만' : 'Observation only'}</span></header>
        <small>{instrument.marketId} · {instrument.quoteCurrency} · {new Date(result.analyzedAt).toLocaleTimeString(language)}</small>
        <p><strong>{easyDirection[language][decision.direction]}</strong></p>
        <p>{ko ? '아직 부족한 조건' : 'What is missing'} · {missed.slice(0, 2).map(c => checkText(best, c.key, ko)).join(' · ')}</p>
        {plan && <p>{ko ? '다시 확인할 가격' : 'Reassessment level'} · <strong>{price(decision.direction === 'sell' ? plan.sellInvalidation : plan.entry[1])}</strong><br />{ko ? decision.direction === 'sell' ? `${plan.frame} 종가가 이 가격 위로 회복하는지 확인하세요. 지금 매수하거나 숏에 진입하라는 뜻은 아닙니다.` : '지지 구간에 접근하면 하락이 멈추는지 다시 분석하세요. 가격 도달만으로 매수 조건이 충족되지는 않습니다.' : 'Recheck the trend and remaining conditions at this level. A price touch is not an entry signal.'}</p>}
        <Link to={`/my-analysis?instrumentId=${encodeURIComponent(instrument.id)}`}>{ko ? '현재 분석·가격 알림' : 'Current analysis and price alerts'} →</Link>
      </article>
    })}</div>
  </section>
}

export function ScanDataIssues({ results, now, language }: { results: readonly ScanResult[]; now: number; language: Language }) {
  const ko = language === 'ko'
  const unavailable = results.filter(r => r.expiresAt < now || r.decision.direction === 'unavailable' || !r.decision.frames.some(f => f.frame === '1H' && !f.issue))
  if (!unavailable.length) return null
  const names = ko ? { loading: '수신 대기', mock: '예시 자료', disconnected: '연결 지연', stale: '최신 자료 대기', history: '완료 봉 50개 미만', gaps: '원본 봉 누락', range: '변동 폭 계산 불가' } : { loading: 'Awaiting data', mock: 'Example data', disconnected: 'Connection delayed', stale: 'Awaiting fresh data', history: 'Fewer than 50 closed bars', gaps: 'Missing source bars', range: 'Range unavailable' }
  return <section className={styles.dataWarning} aria-label={ko ? '자료 미확인 종목' : 'Unassessed assets'}>
    <h3>{ko ? `자료 미확인 ${unavailable.length}개` : `${unavailable.length} unassessed assets`}</h3>
    <p>{ko ? '자료를 받지 못한 것은 투자 조건이 나쁘다는 뜻이 아닙니다. 잠시 지연된 자료는 한 번 재확인하며, 계속 부족하면 아래 종목 분석에서 연결 상태를 확인할 수 있어요.' : 'Missing data does not mean an unfavorable investment. Temporary failures are retried once; open an asset to inspect remaining issues.'}</p>
    <details><summary>{ko ? '종목별 원인 확인' : 'Reasons by asset'}</summary>{unavailable.map(r => <div key={r.instrument.id}><strong>{r.instrument.symbol}</strong><p>{r.expiresAt < now ? ko ? '분석 시세의 유효 시간 경과 · 최신 가격으로 재분석 필요' : 'Snapshot expired · fresh analysis required' : r.decision.frames.filter(f => f.issue).map(f => `${f.frame}: ${names[f.issue!]}`).join(' · ')}</p><Link to={`/my-analysis?instrumentId=${encodeURIComponent(r.instrument.id)}`}>{ko ? '이 종목 다시 분석' : 'Reanalyse this asset'} →</Link></div>)}</details>
  </section>
}
