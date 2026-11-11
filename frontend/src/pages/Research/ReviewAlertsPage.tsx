import { Link, useSearchParams } from 'react-router-dom'
import { ScenarioBoard } from '@/components/scenarios/ScenarioBoard'
import { ReviewSteps } from '@/components/product/ReviewSteps'
import { useScenarios } from '@/hooks/useScenarios'
import { useLanguage } from '@/i18n/useLanguage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useCloud } from '@/services/cloud/useCloud'
import { baseAsset } from '@/services/cryptoAnalysis/opportunityEngine'
import { MonitorWorkspace } from './MonitorWorkspace'
import styles from '@/components/product/InvestmentWorkflow.module.css'

/** Spot plan identity is carried by the saved scenario, never converted to a futures quote. */
export function ReviewAlertsPage() {
  const { language } = useLanguage(), ko = language === 'ko'
  const cloud = useCloud(), store = useScenarios(), [params] = useSearchParams()
  const requested = params.get('scenario'), instrumentId = params.get('instrumentId')
  const selected = store.scenarios.find(s => s.id === requested && (!instrumentId || s.instrument.id === instrumentId))
  const invalid = !!requested && !selected
  useDocumentTitle(ko ? '알림' : 'Alerts')
  return <div className={styles.page}>
    <header><span className={styles.eyebrow}>INVESTAI · FOLLOW THROUGH</span><h1>{ko ? '알림' : 'Alerts'}</h1><p>{ko ? '분석한 거래소와 통화를 그대로 유지해 가격 도달과 이후 기록을 확인합니다.' : 'Keep the original venue and quote currency when reviewing price arrivals and subsequent observations.'}</p><ReviewSteps language={language} current={2} /></header>
    <nav className={styles.actions} aria-label={ko ? '알림 종류' : 'Alert types'}><Link to="/review-alerts" aria-current="page">{ko ? '현물 가격 기준' : 'Spot price criteria'}</Link><Link to="/research?mode=alerts">{ko ? '선물 가격·신호 조건' : 'Futures prices and signals'} →</Link></nav>
    {selected && <section className={styles.tile} aria-label={ko ? '분석에서 이어온 가격 기준' : 'Price plan from analysis'}><span className={styles.tag}>{selected.instrument.marketId} · {selected.instrument.quoteCurrency}</span><h2>{selected.instrument.symbol}</h2><p>{ko ? '저장 기준' : 'Saved'} · {new Date(selected.updatedAt).toLocaleString(language)} · {ko ? '가격 조건은 자동으로 바뀌지 않습니다.' : 'The saved prices do not change automatically.'}</p><Link to={`/my-analysis?instrumentId=${encodeURIComponent(selected.instrument.id)}`}>{ko ? '같은 종목 다시 분석' : 'Recheck the same asset'} →</Link></section>}
    {(invalid || store.error) && <p role="alert" className={styles.error}>{ko ? '연결한 가격 기준을 찾을 수 없거나 종목이 다릅니다. 다른 종목으로 바꾸지 않았습니다. 아래 저장 목록을 확인하거나 원래 분석에서 다시 저장해주세요.' : 'The requested plan is unavailable or belongs to another asset. No substitution was made. Review the saved list or save again from the original analysis.'}</p>}
    <div className={styles.grid}>
      <article className={styles.tile}><h3>{ko ? '가격 도달' : 'Price arrivals'}</h3><p>{ko ? '관심 구간·목표·손절 가격을 관측했는지 확인합니다. 실제 체결을 뜻하지 않습니다.' : 'Observe entry-zone, target and stop prices. Observations are not executions.'}</p></article>
      <article className={styles.tile}><h3>{ko ? '추가 조건 확인' : 'Additional checks'}</h3><p>{ko ? '기기 감시는 저장 시간대의 추세·반등·거래량을 별도로 표시합니다. 원래 추천 전략의 모든 조건과 동일하지 않습니다.' : 'Device monitoring separately checks trend, rebound and volume on the saved timeframe. These checks differ from the full original strategy.'}</p></article>
      <article className={styles.tile}><h3>{ko ? '화면을 닫은 뒤' : 'After closing the app'}</h3><p>{ko ? '기기 감시는 멈춥니다. 로그인 후 아래 서버 감시에 별도로 등록하면 가격 관측이 이어집니다.' : 'Device monitoring stops. Sign in and separately register server monitoring below to continue price observations.'}</p></article>
    </div>
    <section><h2>{ko ? '기기에 저장한 가격 알림' : 'Saved device price alerts'}</h2><ScenarioBoard /></section>
    <section id="server-monitor"><h2>{ko ? '서버 감시·이후 결과' : 'Server monitoring and outcomes'}</h2>{cloud.user && !invalid && !store.error ? <MonitorWorkspace key={`${cloud.user.id}:${requested ?? 'all'}`} asset={selected ? baseAsset(selected.instrument.symbol, selected.instrument.quoteCurrency) : 'BTC'} /> : <article className={styles.tile}><p>{ko ? invalid || store.error ? '올바른 원본 기록을 확인한 뒤 서버 감시를 등록할 수 있습니다.' : '로그인하면 저장한 가격 조건을 서버에 등록할 수 있습니다. 이미 저장한 기기 알림은 위에서 확인하세요.' : 'Sign in and select a valid saved plan to register server monitoring. Device alerts remain above.'}</p><Link to="/settings">{ko ? '계정·연결 확인' : 'Account and connections'} →</Link></article>}</section>
    <section className={styles.tile}><h2>{ko ? '추천 이후 결과도 확인하세요' : 'Review recommendation outcomes too'}</h2><p>{ko ? '후보 검색에서 기록한 사례는 별도의 추천 검증 기록에 모입니다. 조건 충족·미진입·손절·자료 부족을 함께 비교하세요.' : 'Cases saved from candidate scans are kept in the separate forward review ledger, including skipped, stopped and unresolved cases.'}</p><div className={styles.actions}><Link className={styles.primary} to="/results">{ko ? '추천 검증 결과 보기' : 'Open forward review results'} →</Link><Link to="/dashboard#find-candidates">{ko ? '새 후보 찾기' : 'Find candidates'} →</Link></div></section>
    <details><summary>{ko ? '기존 Binance 선물 가격 알림' : 'Existing Binance futures alerts'}</summary><p>{ko ? 'USDT 선물 가격으로 직접 입력했던 알림은 기존 화면에서 계속 사용할 수 있습니다. 위 현물 가격과 혼합하지 않습니다.' : 'Existing manually entered USDT futures alerts remain available separately.'}</p><Link to="/research?mode=alerts">{ko ? '선물 가격 알림 열기' : 'Open futures alerts'} →</Link></details>
  </div>
}
