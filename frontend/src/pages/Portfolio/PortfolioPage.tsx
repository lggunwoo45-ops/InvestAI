import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useLanguage } from '@/i18n/useLanguage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PositionPlan } from '@/components/portfolio/PositionPlan'
import { TradeLedgerPanel } from '@/components/portfolio/TradeLedgerPanel'
import { PortfolioBackupPanel } from '@/components/portfolio/PortfolioBackupPanel'
import { mergePortfolioBackup } from '@/services/portfolio/portfolioBackup'
import { realizedByCurrency } from '@/services/portfolio/tradeLedger'
import { portfolioNumber as number, portfolioPercent } from '@/utils/formatPortfolio'
import { summarizePortfolio } from '@/services/portfolio/portfolioReview'
import { coinVenues, PORTFOLIO_KEY, positionFor, readPortfolio, valuation, writePortfolio, type CoinVenue, type Position } from '@/services/portfolio/portfolioStorage'
import styles from './PortfolioPage.module.css'

const copy = {
  ko: { title: '내 투자', coins: '내 코인', help: '관심종목과 별도로 이 브라우저에 저장됩니다. 브라우저 데이터 삭제 시 사라지며 기기 간 동기화되지 않습니다.', venue: '거래소 · 마켓', asset: '종목 · 기준통화', average: '평단가', quantity: '수량', save: '저장', edit: '수정', remove: '삭제', confirm: '이 보유 기록을 삭제할까요?', cancel: '취소', analyze: '내 종목 분석', empty: '저장한 코인이 없습니다.', select: '종목 선택', loading: '시세 불러오는 중', unavailable: '시세 이용 불가', mock: '모의 시세', live: '조회 시세', value: '평가금액', profit: '평가손익', rate: '수익률', refresh: '시세 새로고침', error: '변경하지 못했습니다. 유효한 양수를 입력하세요. 저장공간 제한 또는 다른 탭의 변경도 확인해주세요.', storage: '저장 데이터를 읽을 수 없어 변경을 중지했습니다. 기존 데이터는 보존됩니다.', reload: '저장 데이터 다시 읽기', saved: '저장했습니다.', deleted: '삭제했습니다.', notice: '현물 보유 기준 · 수수료/세금/환율 미반영. 서로 다른 기준통화를 합산하지 않습니다. 시세는 조회 시점 기준입니다.', search: '종목 검색', cost: '매입금액' },
  en: { title: 'My Investments', coins: 'My Coins', help: 'Saved separately from watchlists in this browser. Clearing browser data removes positions; no device sync.', venue: 'Exchange · market', asset: 'Instrument · quote currency', average: 'Average price', quantity: 'Quantity', save: 'Save', edit: 'Edit', remove: 'Delete', confirm: 'Delete this position?', cancel: 'Cancel', analyze: 'My Instrument Analysis', empty: 'No saved coins.', select: 'Select instrument', loading: 'Loading quotes', unavailable: 'Quote unavailable', mock: 'Mock quote', live: 'Fetched quote', value: 'Market value', profit: 'Unrealized P/L', rate: 'Return', refresh: 'Refresh quotes', error: 'Change failed. Enter valid positive values. Check storage availability or changes in another tab.', storage: 'Stored data could not be read. Changes are blocked and existing data is preserved.', reload: 'Reload stored data', saved: 'Saved.', deleted: 'Deleted.', notice: 'Spot holdings only. Excludes fees, taxes and FX. Different currencies are never summed. Quotes reflect the time fetched.', search: 'Search instruments', cost: 'Cost' },
}
const planCopy = {
  ko: { summary: '내 투자 요약', add: '코인 추가', edit: '보유 기록 수정', target: '목표가 (선택)', stop: '손절 기준가 (선택)', help: '기준가는 종목의 기준통화로 입력하세요. 비워두면 설정하지 않습니다. 둘 다 입력하면 손절 기준가는 목표가보다 낮아야 합니다.', error: '목표가와 손절 기준가는 유효한 양수여야 하며, 손절 기준가는 목표가보다 낮아야 합니다.', coverage: '시세 확인', incomplete: '시세가 없는 기록이 있어 전체 평가손익을 표시하지 않습니다.', range: '계산 범위를 초과해 합계를 표시할 수 없습니다.', records: '보유 기록', quote: '현재가', subtitle: '내 코인의 손익과 다음 확인 기준을 한곳에서.', plan: '투자 기준 (선택)' },
  en: { summary: 'Investment overview', add: 'Add coin', edit: 'Edit position', target: 'Target price (optional)', stop: 'Stop reference price (optional)', help: 'Use the instrument’s quote currency. Leave blank to omit. When both are set, the stop reference must be below the target.', error: 'Target and stop must be valid positive prices, with the stop below the target.', coverage: 'Quotes available', incomplete: 'Some quotes are missing. Total valuation is withheld.', range: 'Totals exceed the supported numeric range.', records: 'Positions', quote: 'Current price', subtitle: 'Your holdings, returns and next review criteria in one place.', plan: 'Investment criteria (optional)' },
}

export function PortfolioPage() {
  const { language } = useLanguage()
  const t = copy[language]
  const pt = planCopy[language]
  useDocumentTitle(t.title)
  const { marketDataMode } = useMarketWorkspace()
  const [store, setStore] = useState(readPortfolio)
  const [revision, setRevision] = useState(0)
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
  const [target, setTarget] = useState('')
  const [stop, setStop] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (editing || formOpen) formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [editing, formOpen])
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === PORTFOLIO_KEY || event.key === null) {
        setRevision(n => n + 1)
        setStore(readPortfolio()); setEditing(null); setDeleting(null); setAverage(''); setQuantity(''); setTarget(''); setStop(''); setInstrumentId(''); setMessage('')
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  const reset = () => { setEditing(null); setAverage(''); setQuantity(''); setTarget(''); setStop(''); setInstrumentId(''); setQuery(''); setFormOpen(false) }
  const commit = (positions: Position[], success: string) => {
    try { setStore(writePortfolio(positions, store.raw)); setRevision(n => n + 1); setMessage(success); return true }
    catch { setMessage(t.error); return false }
  }
  const save = () => {
    try {
      const instrument = catalogs[venue].catalog?.instruments.find(i => i.id === instrumentId)
      const position = editing ? { ...editing, averagePrice: Number(average), quantity: Number(quantity) }
        : instrument ? positionFor(instrument, venue, Number(average), Number(quantity), crypto.randomUUID()) : null
      if (!position) throw new Error('selection')
      const targetPrice = target.trim() ? Number(target) : undefined
      const stopPrice = stop.trim() ? Number(stop) : undefined
      if ([targetPrice, stopPrice].some(price => price !== undefined && (!Number.isFinite(price) || price <= 0 || valuation({ ...position, quantity: position.quantity || 1 }, price) === null))
        || (targetPrice !== undefined && stopPrice !== undefined && stopPrice >= targetPrice)) { setMessage(pt.error); return }
      const next = { ...position, targetPrice, stopPrice }
      if (commit(editing ? store.positions.map(p => p.id === editing.id ? next : p) : [...store.positions, next], t.saved)) reset()
    } catch { setMessage(t.error) }
  }
  const catalog = catalogs[venue]
  const options = catalog.catalog?.instruments.filter(i => `${i.symbol} ${i.name} ${i.koreanName ?? ''} ${i.quoteCurrency}`.toLowerCase().includes(query.toLowerCase())) ?? []
  const entries = store.positions.map(position => {
    const state = catalogs[position.venue]
    const instrument = state.catalog?.instruments.find(i => i.id === position.instrumentId && i.quoteCurrency === position.quoteCurrency)
    return { position, state, price: state.loading || state.error ? null : instrument?.lastPrice ?? null }
  })
  const totals = summarizePortfolio(entries.filter(entry => entry.position.quantity > 0))
  const realized = realizedByCurrency(store.positions)
  const ledgerText = language === 'ko'
    ? { realized: '기록된 실현손익', closed: '보유 종료', locked: '평단가와 수량은 거래 기록에서 자동 계산됩니다. 정정하려면 마지막 거래부터 취소하세요.', delete: '이 기록의 거래 내역과 실현손익도 함께 삭제됩니다.', notice: '현물 보유 기준 · 기록한 수수료 반영 · 세금/환율 미반영. 서로 다른 기준통화를 합산하지 않습니다. 시세는 조회 시점 기준입니다.' }
    : { realized: 'Recorded realized P/L', closed: 'Closed holding', locked: 'Average and quantity are calculated from the ledger. Correct entries by undoing from the last trade.', delete: 'The trade history and realized P/L of this holding will also be removed.', notice: 'Spot holdings. Includes recorded fees; excludes taxes and FX. Different currencies are never summed. Quotes reflect the time fetched.' }
  return <main className={styles.page}>
    <header className={styles.heading}><span>MY INVESTMENTS</span><h1>{t.title}</h1><p>{pt.subtitle}</p></header>
    <nav className={styles.actions}><strong>{t.coins}</strong><Link to="/market">{language === 'ko' ? '관심종목 · 마켓' : 'Watchlists · Market'}</Link>{store.positions.length > 0 && <button type="button" aria-expanded={formOpen || !!editing} aria-controls="portfolio-form" onClick={() => { reset(); setFormOpen(true) }}>{pt.add}</button>}<button type="button" onClick={() => setRetry(n => n + 1)}>{t.refresh}</button></nav>
    {store.error && <p role="alert">{t.storage}</p>}
    {totals.length > 0 && <section aria-label={pt.summary} className={styles.overview}>
      <div className={styles.sectionHeading}><h2>{pt.summary}</h2><span>{marketDataMode === 'mock' ? t.mock : t.live}</span></div>
      <div className={styles.totals}>{totals.map(total => <section key={total.currency} aria-label={`${pt.summary} ${total.currency}`} className={styles.total}>
        <header><strong>{total.currency}</strong><span>{pt.records} {total.count} · {pt.coverage} {total.pricedCount}/{total.count}</span></header>
        <dl><div><dt>{t.value}</dt><dd className={styles.totalValue}>{total.value === null ? '—' : number(total.value)}</dd></div>
          <div><dt>{t.cost}</dt><dd>{total.cost === null ? '—' : number(total.cost)}</dd></div>
          <div data-direction={total.profit === null || total.profit === 0 ? undefined : total.profit > 0 ? 'positive' : 'negative'}><dt>{t.profit}</dt><dd>{total.profit === null ? '—' : number(total.profit)}</dd></div>
          <div><dt>{t.rate}</dt><dd>{total.percent === null ? '—' : portfolioPercent(total.percent)}</dd></div></dl>
        {total.value === null && <p role="status">{total.pricedCount < total.count ? pt.incomplete : pt.range}</p>}
      </section>)}</div>
    </section>}
    {realized.length > 0 && <section className={styles.realized} aria-label={ledgerText.realized}><h2>{ledgerText.realized}</h2>{realized.map(item => <div key={item.currency}><span>{item.currency}</span><strong>{item.realized === null ? '—' : number(item.realized)}</strong></div>)}</section>}
    <form id="portfolio-form" hidden={!formOpen && !editing && store.positions.length > 0} ref={formRef} className={styles.form} onSubmit={e => { e.preventDefault(); save() }}>
      <h2 className={styles.formTitle}>{editing ? pt.edit : pt.add}</h2>
      <label>{t.venue}<select disabled={!!editing} value={venue} onChange={e => { setVenue(e.target.value as CoinVenue); setInstrumentId(''); setQuery('') }}>{coinVenues.map(v => <option key={v}>{v}</option>)}</select></label>
      {!editing && <label>{t.search}<input value={query} onChange={e => { setQuery(e.target.value); setInstrumentId('') }} /></label>}
      <label>{t.asset}{editing ? <strong>{editing.symbol} · {editing.quoteCurrency}</strong> : <select required value={instrumentId} onChange={e => setInstrumentId(e.target.value)}><option value="">{t.select}</option>{options.map(i => <option key={i.id} value={i.id}>{i.displaySymbol ?? i.symbol} · {i.name} · {i.quoteCurrency}</option>)}</select>}</label>
      {!editing && (catalog.loading || catalog.error) && <p role="status">{catalog.loading ? t.loading : t.unavailable}</p>}
      <label>{t.average}<input required readOnly={!!editing?.ledger} type="number" min="0" step="any" value={average} onChange={e => setAverage(e.target.value)} /></label>
      <label>{t.quantity}<input required readOnly={!!editing?.ledger} type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
      {editing?.ledger && <p className={styles.formTitle}>{ledgerText.locked}</p>}
      <fieldset className={styles.planFields}><legend>{pt.plan}</legend><p id="plan-help">{pt.help}</p><div>
        <label>{pt.target}<input aria-describedby="plan-help" type="number" min="0" step="any" value={target} onChange={e => setTarget(e.target.value)} /></label>
        <label>{pt.stop}<input aria-describedby="plan-help" type="number" min="0" step="any" value={stop} onChange={e => setStop(e.target.value)} /></label>
      </div></fieldset>
      <div className={styles.actions}><button disabled={!!store.error} type="submit">{t.save}</button>{(editing || formOpen) && <button type="button" onClick={reset}>{t.cancel}</button>}</div>
    </form>
    {message && <p role="status" className={styles.message}>{message}</p>}
    <p className={styles.notice}>{ledgerText.notice}</p>
    {!store.error && store.positions.length === 0 && <p>{t.empty}</p>}
    <div className={styles.positions}>{entries.map(({ position: p, state, price }) => {
      const result = valuation(p, price)
      const quoteLabel = state.loading ? t.loading : !result ? t.unavailable : state.catalog?.source === 'mock' ? t.mock : t.live
      return <article key={p.id} aria-label={`${p.symbol} · ${p.venue}`}>
        <h2>{p.symbol}</h2><p>{p.exchange} · {p.venue} · {p.quoteCurrency}</p>
        <p>{p.quantity === 0 ? ledgerText.closed : quoteLabel}{result && state.catalog && ` · ${new Date(state.catalog.fetchedAt).toLocaleString()}`}</p>
        <dl className={styles.positionMetrics}><div><dt>{t.average}</dt><dd>{number(p.averagePrice)} {p.quoteCurrency}</dd></div><div><dt>{t.quantity}</dt><dd>{number(p.quantity)}</dd></div><div><dt>{t.cost}</dt><dd>{number(p.averagePrice * p.quantity)} {p.quoteCurrency}</dd></div><div><dt>{t.value}</dt><dd>{result ? `${number(result.value)} ${p.quoteCurrency}` : '—'}</dd></div><div data-direction={result && result.profit !== 0 ? result.profit > 0 ? 'positive' : 'negative' : undefined}><dt>{t.profit}</dt><dd>{result ? `${number(result.profit)} ${p.quoteCurrency}` : '—'}</dd></div><div><dt>{t.rate}</dt><dd>{result ? portfolioPercent(result.percent) : '—'}</dd></div></dl>
        <TradeLedgerPanel key={`${p.id}:${revision}`} position={p} language={language} disabled={!!store.error} onSave={next => { const saved = commit(store.positions.map(item => item.id === p.id ? next : item), t.saved); if (saved) reset(); return saved }} />
        {p.quantity > 0 && <PositionPlan position={p} price={price} language={language} quoteLabel={quoteLabel} />}
        <div className={styles.actions}>{p.quantity > 0 && <Link to={`/my-analysis?${new URLSearchParams({ instrumentId: p.instrumentId, positionId: p.id })}`}>{t.analyze}</Link>}<button onClick={() => { setEditing(p); setVenue(p.venue); setAverage(String(p.averagePrice)); setQuantity(String(p.quantity)); setTarget(p.targetPrice === undefined ? '' : String(p.targetPrice)); setStop(p.stopPrice === undefined ? '' : String(p.stopPrice)); setMessage(''); formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) }}>{t.edit}</button><button onClick={() => setDeleting(p.id)}>{t.remove}</button></div>
        {deleting === p.id && <div role="group" aria-label={t.confirm}><p>{t.confirm}</p>{p.ledger && <p>{ledgerText.delete}</p>}<button onClick={() => { if (commit(store.positions.filter(item => item.id !== p.id), t.deleted)) { setDeleting(null); if (editing?.id === p.id) reset() } }}>{t.remove}</button><button onClick={() => setDeleting(null)}>{t.cancel}</button></div>}
      </article>
    })}</div>
    <PortfolioBackupPanel key={revision} store={store} language={language} onRestore={(incoming, expectedRaw) => {
      try {
        if (store.raw !== expectedRaw) return false
        const merged = mergePortfolioBackup(store.positions, incoming)
        const saved = commit(merged.positions, t.saved)
        if (saved) { reset(); setDeleting(null) }
        return saved
      } catch { return false }
    }} />
    <footer className={styles.storage}><p>{t.help}</p><button type="button" onClick={() => { setStore(readPortfolio()); setRevision(n => n + 1); reset(); setDeleting(null); setMessage('') }}>{t.reload}</button></footer>
  </main>
}
