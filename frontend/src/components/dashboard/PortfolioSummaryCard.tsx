import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useLanguage } from '@/i18n/useLanguage'
import { PORTFOLIO_KEY, readPortfolio } from '@/services/portfolio/portfolioStorage'
import { summarizePortfolio } from '@/services/portfolio/portfolioReview'
import { portfolioNumber, portfolioPercent } from '@/utils/formatPortfolio'
import styles from './PortfolioSummaryCard.module.css'

export function PortfolioSummaryCard() {
  const { language } = useLanguage()
  const ko = language === 'ko'
  const { marketDataMode } = useMarketWorkspace()
  const [store, setStore] = useState(readPortfolio)
  const [now, setNow] = useState(Date.now)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === PORTFOLIO_KEY || event.key === null) setStore(readPortfolio()) }
    window.addEventListener('storage', sync)
    const timer = setInterval(() => setNow(Date.now()), 5000)
    return () => { window.removeEventListener('storage', sync); clearInterval(timer) }
  }, [])
  const positions = store.positions.filter(p => p.quantity > 0)
  const hasHoldings = positions.length > 0
  useEffect(() => {
    if (!hasHoldings || marketDataMode !== 'live') return
    const refresh = () => { if (document.visibilityState === 'visible') setRetry(n => n + 1) }
    const timer = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [hasHoldings, marketDataMode])
  const enabled = (venue: string) => positions.some(p => p.venue === venue)
  const upbit = useMarketCatalog('upbit-krw', marketDataMode, retry, enabled('upbit-krw'))
  const btc = useMarketCatalog('upbit-btc', marketDataMode, retry, enabled('upbit-btc'))
  const usdt = useMarketCatalog('upbit-usdt', marketDataMode, retry, enabled('upbit-usdt'))
  const binance = useMarketCatalog('binance-spot', marketDataMode, retry, enabled('binance-spot'))
  const catalogs = { 'upbit-krw': upbit, 'upbit-btc': btc, 'upbit-usdt': usdt, 'binance-spot': binance }
  const entries = positions.map(position => {
    const state = catalogs[position.venue]
    const catalog = state.catalog
    const valid = !state.loading && !state.error && catalog?.source === marketDataMode && Number.isFinite(catalog.fetchedAt)
      && now - catalog.fetchedAt <= 90_000 && catalog.fetchedAt <= now + 5000
    const instrument = valid ? catalog.instruments.find(i => i.id === position.instrumentId && i.quoteCurrency === position.quoteCurrency) : null
    return { position, price: instrument?.lastPrice ?? null }
  })
  const totals = summarizePortfolio(entries)
  return <section className={styles.summary} aria-label={ko ? '내 투자 요약' : 'Investment overview'}>
    <header><div><span>{ko ? '내가 저장한 코인' : 'My saved coins'}</span><h2>{ko ? `보유 기록 ${positions.length}개` : `${positions.length} open holdings`}</h2></div><Link to="/portfolio">{ko ? '내 투자 전체 보기' : 'View my investments'} →</Link></header>
    {store.error ? <p role="alert">{ko ? '보유 기록을 읽지 못했어요. 내 투자에서 저장 상태를 확인해주세요.' : 'Could not read saved holdings. Check storage in My Investments.'}</p>
      : positions.length === 0 ? <div className={styles.empty}><p>{ko ? '코인과 평단가를 저장하면 손익과 분석을 한곳에서 볼 수 있어요.' : 'Save your coins and average prices to review returns and analysis together.'}</p><Link to="/portfolio">{ko ? '첫 코인 저장하기' : 'Save my first coin'} →</Link></div>
        : <><div className={styles.totals}>{totals.map(total => <div key={total.currency}>
          <strong>{total.currency}</strong><dl><div><dt>{ko ? '평가금액' : 'Market value'}</dt><dd>{total.value === null ? '—' : portfolioNumber(total.value)}</dd></div><div><dt>{ko ? '평가손익' : 'Unrealized P/L'}</dt><dd data-direction={total.profit === null ? undefined : total.profit >= 0 ? 'positive' : 'negative'}>{total.profit === null ? '—' : portfolioNumber(total.profit)} {total.percent === null ? '' : `(${portfolioPercent(total.percent)})`}</dd></div></dl>
          {total.value === null && <small>{ko ? '최신 시세가 부족해 합계를 표시하지 않아요.' : 'Current quotes are incomplete; total withheld.'}</small>}
        </div>)}</div><footer><small>{ko ? '조회 시점 기준 · 통화별 합계 · 세금·환율 제외' : 'Fetched quotes · totals by currency · excludes taxes and FX'}{marketDataMode === 'mock' && (ko ? ' · 예시 시세' : ' · Demo quotes')}</small><button type="button" onClick={() => { setNow(Date.now()); setRetry(n => n + 1) }}>{ko ? '시세 새로고침' : 'Refresh quotes'}</button></footer></>}
  </section>
}
