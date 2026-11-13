import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LiveCandidateSearch } from '@/components/ai-analysis/LiveCandidateSearch'
import { SimpleFeatureLinks } from '@/components/simple/SimpleWorkspace'
import { ReviewSteps } from '@/components/product/ReviewSteps'
import { useScenarios } from '@/hooks/useScenarios'
import { useWatchlists } from '@/hooks/useWatchlists'
import { useLanguage } from '@/i18n/useLanguage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PORTFOLIO_KEY, readPortfolio } from '@/services/portfolio/portfolioStorage'
import { WATCHLIST_STORAGE_KEY } from '@/utils/watchlistStorage'
import { WATCHLIST_REVIEW_KEY } from '@/services/watchlist/watchlistStorage'
import { cloudSignedIn, CLOUD_RECORDS_CHANGED } from '@/services/cloud/cloudClient'
import { scenarioCopy } from '@/components/scenarios/scenarioCopy'
import styles from '@/components/product/InvestmentWorkflow.module.css'

export function SimpleHome() {
  const { language } = useLanguage(), ko = language === 'ko'
  const { watchlistItems: allWatchlistItems } = useWatchlists(), scenarios = useScenarios()
  let hasSavedWatchlist = cloudSignedIn()
  try { hasSavedWatchlist ||= localStorage.getItem(WATCHLIST_STORAGE_KEY) !== null || localStorage.getItem(WATCHLIST_REVIEW_KEY) !== null } catch { /* Do not present example defaults as saved records. */ }
  const watchlistItems = hasSavedWatchlist ? allWatchlistItems : []
  const [portfolio, setPortfolio] = useState(readPortfolio)
  useDocumentTitle(ko ? '오늘의 투자 점검' : 'Your daily review')
  useEffect(() => {
    const reload = () => setPortfolio(readPortfolio())
    const sync = (e: StorageEvent) => { if (e.key === PORTFOLIO_KEY || e.key === null) reload() }
    window.addEventListener(CLOUD_RECORDS_CHANGED, reload); window.addEventListener('storage', sync)
    return () => { window.removeEventListener(CLOUD_RECORDS_CHANGED, reload); window.removeEventListener('storage', sync) }
  }, [])
  const events = [...scenarios.events].sort((a, b) => b.at - a.at).slice(0, 3)
  const holdings = portfolio.positions.filter(p => p.quantity > 0)
  const returning = holdings.length > 0 || watchlistItems.length > 0 || scenarios.scenarios.length > 0
  return <div className={styles.page}>
    <section className={styles.hero} aria-label={ko ? '오늘 시작할 일' : 'Start your review'}>
      <div><span className={styles.eyebrow}>MARKET COPILOT · DAILY REVIEW</span><h1>{ko ? returning ? '내 종목, 달라진 점부터 확인하세요.' : '오늘, 어떤 종목을 살펴볼까요?' : returning ? 'Pick up where you left off.' : 'What would you like to review today?'}</h1><p>{ko ? '살펴볼 후보를 찾거나 보유 종목을 점검하고, 다시 확인할 가격을 정하세요.' : 'Find candidates or review your holdings, then set the prices you want to revisit.'}</p></div>
      <div className={styles.choices}>
        <a className={styles.choice} href="#find-candidates"><strong>{ko ? '새 종목 찾기 →' : 'Find candidates →'}</strong><span>{ko ? '현재 조건에 맞는 코인부터' : 'Coins that match current conditions'}</span></a>
        <Link className={styles.choice} to="/portfolio"><strong>{ko ? '보유 종목 점검 →' : 'Review holdings →'}</strong><span>{ko ? holdings.length ? `저장한 ${holdings.length}개 보유 종목 이어보기` : '평단가·수량으로 내 손익 확인' : 'Review your cost basis, quantities and risk'}</span></Link>
      </div>
      <div className={styles.actions}><Link to="/my-analysis">{ko ? '궁금한 종목 직접 검색' : 'Search an asset'}</Link><Link to="/demo">{ko ? '처음 사용하는 방법' : 'How it works'}</Link></div>
      <ReviewSteps language={language} current={0} />
    </section>
    {(returning || portfolio.error || scenarios.error) && <section aria-label={ko ? '내 기록 이어보기' : 'Continue your saved reviews'}>
      <div className={styles.head}><h2>{ko ? '내가 다시 볼 것' : 'Your next checks'}</h2><Link to="/review-alerts">{ko ? '알림·감지 기록 전체' : 'All alerts and observations'} →</Link></div>
      {(portfolio.error || scenarios.error) && <p className={styles.error} role="alert">{ko ? '일부 저장 기록을 읽지 못했습니다. 원본을 유지하고 있으니 설정에서 저장 상태를 확인해주세요.' : 'Some saved records could not be read. Originals are preserved; check storage in settings.'}</p>}
      <div className={styles.grid}>
        <article className={styles.tile}><h3>{ko ? '관심종목' : 'Watchlist'}</h3>{watchlistItems.length ? <ul className={styles.list}>{watchlistItems.slice(0, 3).map(item => <li key={item.instrumentId}><div><strong>{item.displayName}</strong><small>{item.symbol} · {item.provider ?? item.marketType}</small></div><Link to={`/my-analysis?instrumentId=${encodeURIComponent(item.instrumentId)}`}>{ko ? '지금 분석' : 'Review now'} →</Link></li>)}</ul> : <p>{ko ? '마켓에서 관심종목을 저장하면 여기에 모입니다.' : 'Save assets in Market to see them here.'}</p>}</article>
        <article className={styles.tile}><h3>{ko ? '최근 감지한 변화' : 'Recent observations'}</h3>{events.length ? <ul className={styles.list}>{events.map(event => { const s = scenarios.scenarios.find(s => s.id === event.scenarioId); return <li key={event.id}><div><strong>{s?.instrument.symbol} · {scenarioCopy[language].event[event.kind]}</strong><small>{new Date(event.at).toLocaleString(language)} · {event.price.toLocaleString(language)} {s?.instrument.quoteCurrency}</small></div></li> })}</ul> : <p>{ko ? '아직 감지 기록이 없습니다. 가격 조건을 저장하면 관측한 변화가 남습니다.' : 'No observations yet. Save a price plan to track changes.'}</p>}<small>{ko ? '저장된 감지 기록이며 현재 시세나 새로운 추천이 아닙니다.' : 'Saved observations, not current prices or fresh recommendations.'}</small></article>
        <article className={styles.tile}><h3>{ko ? '가격 기준과 결과' : 'Price plans and results'}</h3><p>{ko ? `저장한 가격 기준 ${scenarios.scenarios.length}개 · 보유 종목 ${holdings.length}개` : `${scenarios.scenarios.length} plans · ${holdings.length} holdings`}</p><Link to="/review-alerts">{ko ? '가격 알림 이어보기' : 'Review price alerts'} →</Link><br /><Link to="/results">{ko ? '추천 이후 결과 확인' : 'Forward review results'} →</Link></article>
      </div>
    </section>}
    <section id="find-candidates" style={{ scrollMarginTop: 80 }}><div className={styles.head}><h2>{ko ? '지금 살펴볼 후보' : 'Candidates to review now'}</h2><Link to="/results">{ko ? '내 검증 기록' : 'My forward records'} →</Link></div><LiveCandidateSearch /></section>
    <details><summary>{ko ? '시장 도구·사용 가이드' : 'Market tools and guides'}</summary><SimpleFeatureLinks /></details>
  </div>
}
