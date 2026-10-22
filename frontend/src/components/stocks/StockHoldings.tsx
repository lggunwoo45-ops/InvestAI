import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStockSnapshot } from '@/hooks/useStockSnapshot'
import { useLanguage } from '@/i18n/useLanguage'
import { stockTrend, stockValuation } from '@/services/stocks/stockData'
import { domesticStocks } from '@/services/stocks/stockDirectory'
import { readStockHoldings, STOCK_HOLDINGS_KEY, writeStockHoldings, type StockHolding } from '@/services/stocks/stockHoldings'
import { stockErrorText, stockMoney } from '@/services/stocks/stockCopy'
import styles from './Stocks.module.css'

function HoldingRow({ holding, onDelete }: { holding: StockHolding; onDelete: () => void }) {
  const { language } = useLanguage(), ko = language === 'ko'
  const { data, error, loading, checkedAt } = useStockSnapshot(holding.symbol)
  const usable = data && !error && checkedAt - data.quote.fetchedAt < 120_000
  const value = usable ? stockValuation(holding.average, holding.quantity, data.quote.price) : null
  const trend = usable && !data.historyError ? stockTrend(data.candles, checkedAt) : null
  const [confirming, setConfirming] = useState(false)
  return <article className={`${styles.card} ${styles.holding}`} aria-label={`${holding.name} ${ko ? '보유 기록' : 'holding'}`}>
    <div className={styles.between}><div><h2>{holding.name}</h2><small>{holding.venue.toUpperCase()} · {holding.symbol} · {holding.quantity.toLocaleString()} {ko ? '주' : 'shares'}</small></div><span>{ko ? '평단가' : 'Average'} {stockMoney(holding.average)}</span></div>
    {error ? <p role="status">{stockErrorText(error.code, ko)}</p> : !data && loading ? <p role="status">{ko ? '시세·일봉 확인 중…' : 'Loading quote and history…'}</p> : null}
    {value && <div className={styles.metrics}><div><small>{ko ? '평가금액' : 'Market value'}</small><strong>{stockMoney(value.value)}</strong></div><div><small>{ko ? '평가손익' : 'Unrealized P/L'}</small><strong data-sign={value.profit >= 0 ? 'up' : 'down'}>{stockMoney(value.profit)} ({value.percent.toFixed(2)}%)</strong></div></div>}
    {trend && <p>{ko ? '최근 흐름' : 'Recent trend'} · {ko ? trend.direction === 'above' ? '20거래일 평균 위' : trend.direction === 'below' ? '20거래일 평균 아래' : '20거래일 평균 부근' : `${trend.direction} the 20-session average`}</p>}
    <div className={styles.actions}><Link to={`/my-analysis?${new URLSearchParams({ instrumentId: `krx-${holding.symbol}`, stockPositionId: holding.id })}`}>{ko ? '이 주식 분석·수정 →' : 'Analyze / edit this holding →'}</Link><button type="button" onClick={() => setConfirming(true)}>{ko ? '삭제' : 'Delete'}</button></div>
    {confirming && <div className={styles.actions}><span>{ko ? '이 보유 기록을 삭제할까요?' : 'Delete this holding?'}</span><button type="button" onClick={onDelete}>{ko ? '삭제 확인' : 'Confirm delete'}</button><button type="button" onClick={() => setConfirming(false)}>{ko ? '취소' : 'Cancel'}</button></div>}
  </article>
}
export function StockHoldings() {
  const { language } = useLanguage(), ko = language === 'ko'
  useDocumentTitle(ko ? '내 주식' : 'My Stocks')
  const [store, setStore] = useState(() => readStockHoldings())
  const [query, setQuery] = useState(''), [message, setMessage] = useState(''), [page, setPage] = useState(0)
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === STOCK_HOLDINGS_KEY || event.key === null) setStore(readStockHoldings()) }
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync)
  }, [])
  const needle = query.trim().toLocaleLowerCase()
  const results = needle ? domesticStocks.filter(row => `${row.symbol} ${row.name} ${row.koreanName ?? ''}`.toLocaleLowerCase().includes(needle)).slice(0, 8) : []
  const currentPage = Math.min(page, Math.max(0, Math.ceil(store.holdings.length / 6) - 1))
  const remove = (id: string) => {
    const next = writeStockHoldings(store.holdings.filter(row => row.id !== id), store.raw)
    if (next) { setStore(next); setMessage(ko ? '삭제했어요.' : 'Deleted.') }
    else setMessage(ko ? '변경하지 못했어요. 다른 탭의 변경이나 저장 공간을 확인해 주세요.' : 'Change failed. Check storage or changes in another tab.')
  }
  return <main className={styles.workspace}><header><span className={styles.eyebrow}>{ko ? '내 투자' : 'My Investments'}</span><h1>{ko ? '내 주식' : 'My Stocks'} <small>({store.holdings.length})</small></h1><p>{ko ? '국내 주식의 보유 기록과 손익을 확인하세요. 화면에 보이는 최대 6개 기록만 조회합니다.' : 'Review domestic stock holdings and returns. Only the six visible records are fetched.'}</p></header>
    <section className={styles.card}><label>{ko ? '주식 추가 · 이름이나 종목코드 검색' : 'Add a stock · search name or symbol'}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={ko ? '예: 삼성전자, 005930' : 'e.g. Samsung, 005930'} /></label><div className={styles.results}>{results.map(row => <Link key={row.id} to={`/my-analysis?instrumentId=${row.id}&stockLive=true`}>{ko ? row.koreanName ?? row.name : row.name} · {row.symbol} →</Link>)}</div>{needle && !results.length && <p>{ko ? '저장된 종목 목록에서 찾지 못했어요. 신규 상장 종목은 목록 갱신이 필요할 수 있어요.' : 'Not found in the bundled directory. Newly listed stocks may require a directory update.'}</p>}</section>
    {store.error && <p role="alert">{ko ? '저장 기록을 읽을 수 없어 변경을 중지했어요. 기존 자료는 보존됩니다.' : 'Stored records cannot be read. Changes are blocked and existing data is preserved.'}</p>}
    <p role="status">{message}</p>
    {!store.error && !store.holdings.length && <p>{ko ? '아직 저장한 주식이 없어요. 종목을 검색한 뒤 ‘이미 갖고 있어요’에서 저장하세요.' : 'No saved stocks. Search a stock and save it under “I own this”.'}</p>}
    {store.holdings.slice(currentPage * 6, currentPage * 6 + 6).map(holding => <HoldingRow key={holding.id} holding={holding} onDelete={() => remove(holding.id)} />)}
    {store.holdings.length > 6 && <nav className={styles.actions} aria-label={ko ? '보유 기록 페이지' : 'Holdings pages'}><button type="button" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>{ko ? '이전' : 'Previous'}</button><span>{currentPage + 1} / {Math.ceil(store.holdings.length / 6)}</span><button type="button" disabled={(currentPage + 1) * 6 >= store.holdings.length} onClick={() => setPage(currentPage + 1)}>{ko ? '다음' : 'Next'}</button></nav>}
    <small>{ko ? '이 브라우저에만 저장됩니다. 내 코인·관심종목과 분리되며 자동 동기화되지 않습니다. 수수료·세금 제외. 시세가 없으면 손익을 표시하지 않습니다.' : 'Saved only in this browser, separately from coins and watchlists. No sync. Excludes fees and taxes. Missing quotes withhold valuation.'}</small>
  </main>
}
