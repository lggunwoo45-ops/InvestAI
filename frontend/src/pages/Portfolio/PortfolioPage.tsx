import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useLanguage } from '@/i18n/useLanguage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { coinVenues, PORTFOLIO_KEY, positionFor, readPortfolio, valuation, writePortfolio, type CoinVenue, type Position } from '@/services/portfolio/portfolioStorage'
import styles from './PortfolioPage.module.css'

const copy = {
  ko: { title: '내 투자', coins: '내 코인', help: '관심종목과 별도로 이 브라우저에 저장됩니다. 브라우저 데이터 삭제 시 사라지며 기기 간 동기화되지 않습니다.', venue: '거래소 · 마켓', asset: '종목 · 기준통화', average: '평단가', quantity: '수량', save: '저장', edit: '수정', remove: '삭제', confirm: '이 보유 기록을 삭제할까요?', cancel: '취소', analyze: '내 종목 분석', empty: '저장한 코인이 없습니다.', select: '종목 선택', loading: '시세 불러오는 중', unavailable: '시세 이용 불가', mock: '모의 시세', live: '조회 시세', value: '평가금액', profit: '평가손익', rate: '수익률', refresh: '시세 새로고침', error: '변경하지 못했습니다. 유효한 양수를 입력하세요. 저장공간 제한 또는 다른 탭의 변경도 확인해주세요.', storage: '저장 데이터를 읽을 수 없어 변경을 중지했습니다. 기존 데이터는 보존됩니다.', reload: '저장 데이터 다시 읽기', saved: '저장했습니다.', deleted: '삭제했습니다.', notice: '현물 보유 기준 · 수수료/세금/환율 미반영. 서로 다른 기준통화를 합산하지 않습니다. 시세는 조회 시점 기준입니다.', search: '종목 검색', cost: '매입금액' },
  en: { title: 'My Investments', coins: 'My Coins', help: 'Saved separately from watchlists in this browser. Clearing browser data removes positions; no device sync.', venue: 'Exchange · market', asset: 'Instrument · quote currency', average: 'Average price', quantity: 'Quantity', save: 'Save', edit: 'Edit', remove: 'Delete', confirm: 'Delete this position?', cancel: 'Cancel', analyze: 'My Instrument Analysis', empty: 'No saved coins.', select: 'Select instrument', loading: 'Loading quotes', unavailable: 'Quote unavailable', mock: 'Mock quote', live: 'Fetched quote', value: 'Market value', profit: 'Unrealized P/L', rate: 'Return', refresh: 'Refresh quotes', error: 'Change failed. Enter valid positive values. Check storage availability or changes in another tab.', storage: 'Stored data could not be read. Changes are blocked and existing data is preserved.', reload: 'Reload stored data', saved: 'Saved.', deleted: 'Deleted.', notice: 'Spot holdings only. Excludes fees, taxes and FX. Different currencies are never summed. Quotes reflect the time fetched.', search: 'Search instruments', cost: 'Cost' },
}
const number = (value: number) => value.toLocaleString(undefined, { maximumSignificantDigits: 12 })

export function PortfolioPage() {
  const { language } = useLanguage()
  const t = copy[language]
  useDocumentTitle(t.title)
  const { marketDataMode } = useMarketWorkspace()
  const [store, setStore] = useState(readPortfolio)
  const [venue, setVenue] = useState<CoinVenue>('upbit-krw')
  const [retry, setRetry] = useState(0)
  const upbit = useMarketCatalog('upbit-krw', marketDataMode, retry)
  const btc = useMarketCatalog('upbit-btc', marketDataMode, retry)
  const usdt = useMarketCatalog('upbit-usdt', marketDataMode, retry)
  const binance = useMarketCatalog('binance-spot', marketDataMode, retry)
  const catalogs = { 'upbit-krw': upbit, 'upbit-btc': btc, 'upbit-usdt': usdt, 'binance-spot': binance }
  const [instrumentId, setInstrumentId] = useState('')
  const [query, setQuery] = useState('')
  const [average, setAverage] = useState('')
  const [quantity, setQuantity] = useState('')
  const [editing, setEditing] = useState<Position | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === PORTFOLIO_KEY || event.key === null) {
        setStore(readPortfolio()); setEditing(null); setDeleting(null); setAverage(''); setQuantity(''); setInstrumentId(''); setMessage('')
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  const reset = () => { setEditing(null); setAverage(''); setQuantity(''); setInstrumentId(''); setQuery('') }
  const commit = (positions: Position[], success: string) => {
    try { setStore(writePortfolio(positions, store.raw)); setMessage(success); return true }
    catch { setMessage(t.error); return false }
  }
  const save = () => {
    try {
      const instrument = catalogs[venue].catalog?.instruments.find(i => i.id === instrumentId)
      const position = editing ? { ...editing, averagePrice: Number(average), quantity: Number(quantity) }
        : instrument ? positionFor(instrument, venue, Number(average), Number(quantity), crypto.randomUUID()) : null
      if (!position) throw new Error('selection')
      if (commit([...store.positions.filter(p => p.id !== editing?.id), position], t.saved)) reset()
    } catch { setMessage(t.error) }
  }
  const catalog = catalogs[venue]
  const options = catalog.catalog?.instruments.filter(i => `${i.symbol} ${i.name} ${i.koreanName ?? ''} ${i.quoteCurrency}`.toLowerCase().includes(query.toLowerCase())) ?? []
  return <main className={styles.page}>
    <header><h1>{t.title}</h1><p>{t.help}</p></header>
    <nav className={styles.actions}><strong>{t.coins}</strong><Link to="/market">{language === 'ko' ? '관심종목 · 마켓' : 'Watchlists · Market'}</Link></nav>
    {store.error && <p role="alert">{t.storage}</p>}
    <button type="button" onClick={() => { setStore(readPortfolio()); reset(); setDeleting(null); setMessage('') }}>{t.reload}</button>
    <form className={styles.form} onSubmit={e => { e.preventDefault(); save() }}>
      <label>{t.venue}<select disabled={!!editing} value={venue} onChange={e => { setVenue(e.target.value as CoinVenue); setInstrumentId(''); setQuery('') }}>{coinVenues.map(v => <option key={v}>{v}</option>)}</select></label>
      {!editing && <label>{t.search}<input value={query} onChange={e => { setQuery(e.target.value); setInstrumentId('') }} /></label>}
      <label>{t.asset}{editing ? <strong>{editing.symbol} · {editing.quoteCurrency}</strong> : <select required value={instrumentId} onChange={e => setInstrumentId(e.target.value)}><option value="">{t.select}</option>{options.map(i => <option key={i.id} value={i.id}>{i.displaySymbol ?? i.symbol} · {i.name} · {i.quoteCurrency}</option>)}</select>}</label>
      {!editing && (catalog.loading || catalog.error) && <p role="status">{catalog.loading ? t.loading : t.unavailable}</p>}
      <label>{t.average}<input required type="number" min="0" step="any" value={average} onChange={e => setAverage(e.target.value)} /></label>
      <label>{t.quantity}<input required type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
      <div className={styles.actions}><button disabled={!!store.error} type="submit">{t.save}</button>{editing && <button type="button" onClick={reset}>{t.cancel}</button>}</div>
    </form>
    <p role="status">{message}</p><p>{t.notice}</p>
    <button type="button" onClick={() => setRetry(n => n + 1)}>{t.refresh}</button>
    {!store.error && store.positions.length === 0 && <p>{t.empty}</p>}
    <div className={styles.positions}>{store.positions.map(p => {
      const state = catalogs[p.venue]
      const instrument = state.catalog?.instruments.find(i => i.id === p.instrumentId && i.quoteCurrency === p.quoteCurrency)
      const result = valuation(p, instrument?.lastPrice ?? null)
      return <article key={p.id}>
        <h2>{p.symbol}</h2><p>{p.exchange} · {p.venue} · {p.quoteCurrency}</p>
        <p>{state.loading ? t.loading : !result ? t.unavailable : state.catalog?.source === 'mock' ? t.mock : t.live}{result && state.catalog && ` · ${new Date(state.catalog.fetchedAt).toLocaleString()}`}</p>
        <dl><div><dt>{t.average}</dt><dd>{number(p.averagePrice)} {p.quoteCurrency}</dd></div><div><dt>{t.quantity}</dt><dd>{number(p.quantity)}</dd></div><div><dt>{t.cost}</dt><dd>{number(p.averagePrice * p.quantity)} {p.quoteCurrency}</dd></div><div><dt>{t.value}</dt><dd>{result ? `${number(result.value)} ${p.quoteCurrency}` : '—'}</dd></div><div><dt>{t.profit}</dt><dd>{result ? `${number(result.profit)} ${p.quoteCurrency}` : '—'}</dd></div><div><dt>{t.rate}</dt><dd>{result ? `${number(result.percent)}%` : '—'}</dd></div></dl>
        <div className={styles.actions}><Link to={`/my-analysis?${new URLSearchParams({ instrumentId: p.instrumentId, positionId: p.id })}`}>{t.analyze}</Link><button onClick={() => { setEditing(p); setVenue(p.venue); setAverage(String(p.averagePrice)); setQuantity(String(p.quantity)); setMessage('') }}>{t.edit}</button><button onClick={() => setDeleting(p.id)}>{t.remove}</button></div>
        {deleting === p.id && <div role="group" aria-label={t.confirm}><p>{t.confirm}</p><button onClick={() => { if (commit(store.positions.filter(item => item.id !== p.id), t.deleted)) { setDeleting(null); if (editing?.id === p.id) reset() } }}>{t.remove}</button><button onClick={() => setDeleting(null)}>{t.cancel}</button></div>}
      </article>
    })}</div>
  </main>
}
