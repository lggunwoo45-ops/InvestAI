import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { SimpleWorkspace } from '@/components/simple/SimpleWorkspace'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useLanguage } from '@/i18n/useLanguage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PositionPlan } from '@/components/portfolio/PositionPlan'
import { TradeLedgerPanel } from '@/components/portfolio/TradeLedgerPanel'
import { PortfolioBackupPanel } from '@/components/portfolio/PortfolioBackupPanel'
import { HoldingAnalysis } from '@/components/portfolio/HoldingAnalysis'
import { useHoldingAnalysis } from '@/hooks/useHoldingAnalysis'
import { currentHoldingResult } from '@/services/portfolio/holdingAnalysis'
import { ScenarioBoard } from '@/components/scenarios/ScenarioBoard'
import { mergePortfolioBackup } from '@/services/portfolio/portfolioBackup'
import { realizedByCurrency } from '@/services/portfolio/tradeLedger'
import { portfolioNumber as number, portfolioPercent } from '@/utils/formatPortfolio'
import { summarizePortfolio } from '@/services/portfolio/portfolioReview'
import { coinVenues, PORTFOLIO_KEY, positionFor, readPortfolio, valuation, writePortfolio, type CoinVenue, type Position } from '@/services/portfolio/portfolioStorage'
import styles from './PortfolioPage.module.css'
import { CLOUD_RECORDS_CHANGED, cloudSignedIn } from '@/services/cloud/cloudClient'

const copy = {
  ko: { title: '내 투자', coins: '내 코인', help: '관심종목과 별도로 이 브라우저에 저장됩니다. 브라우저 데이터 삭제 시 사라지며 기기 간 동기화되지 않습니다.', venue: '거래소 · 마켓', asset: '종목 · 기준통화', average: '평단가', quantity: '수량', save: '저장', edit: '수정', remove: '삭제', confirm: '이 보유 기록을 삭제할까요?', cancel: '취소', analyze: '내 종목 분석', empty: '저장한 코인이 없습니다.', select: '종목 선택', loading: '시세 불러오는 중', unavailable: '시세 이용 불가', mock: '모의 시세', live: '조회 시세', value: '평가금액', profit: '평가손익', rate: '수익률', refresh: '시세 새로고침', error: '변경하지 못했습니다. 유효한 양수를 입력하세요. 저장공간 제한 또는 다른 탭의 변경도 확인해주세요.', storage: '저장 데이터를 읽을 수 없어 변경을 중지했습니다. 기존 데이터는 보존됩니다.', reload: '저장 데이터 다시 읽기', saved: '저장했습니다.', deleted: '삭제했습니다.', notice: '현물 보유 기준 · 수수료/세금/환율 미반영. 서로 다른 기준통화를 합산하지 않습니다. 시세는 조회 시점 기준입니다.', search: '종목 검색', cost: '매입금액' },
  en: { title: 'My Investments', coins: 'My Coins', help: 'Saved separately from watchlists in this browser. Clearing browser data removes positions; no device sync.', venue: 'Exchange · market', asset: 'Instrument · quote currency', average: 'Average price', quantity: 'Quantity', save: 'Save', edit: 'Edit', remove: 'Delete', confirm: 'Delete this position?', cancel: 'Cancel', analyze: 'My Instrument Analysis', empty: 'No saved coins.', select: 'Select instrument', loading: 'Loading quotes', unavailable: 'Quote unavailable', mock: 'Mock quote', live: 'Fetched quote', value: 'Market value', profit: 'Unrealized P/L', rate: 'Return', refresh: 'Refresh quotes', error: 'Change failed. Enter valid positive values. Check storage availability or changes in another tab.', storage: 'Stored data could not be read. Changes are blocked and existing data is preserved.', reload: 'Reload stored data', saved: 'Saved.', deleted: 'Deleted.', notice: 'Spot holdings only. Excludes fees, taxes and FX. Different currencies are never summed. Quotes reflect the time fetched.', search: 'Search instruments', cost: 'Cost' },
}
const planCopy = {
  ko: { summary: '내 투자 요약', add: '코인 추가', edit: '보유 기록 수정', target: '목표가 (선택)', stop: '손절 기준가 (선택)', help: '기준가는 종목의 기준통화로 입력하세요. 비워두면 설정하지 않습니다. 둘 다 입력하면 손절 기준가는 목표가보다 낮아야 합니다.', error: '목표가와 손절 기준가는 유효한 양수여야 하며, 손절 기준가는 목표가보다 낮아야 합니다.', coverage: '시세 확인', incomplete: '시세가 없는 기록이 있어 전체 평가손익을 표시하지 않습니다.', range: '계산 범위를 초과해 합계를 표시할 수 없습니다.', records: '보유 기록', quote: '현재가', subtitle: '저장한 코인 전체의 손익과 지금 확인할 내용을 한곳에서 보세요.', plan: '투자 기준 (선택)' },
  en: { summary: 'Investment overview', add: 'Add coin', edit: 'Edit position', target: 'Target price (optional)', stop: 'Stop reference price (optional)', help: 'Use the instrument’s quote currency. Leave blank to omit. When both are set, the stop reference must be below the target.', error: 'Target and stop must be valid positive prices, with the stop below the target.', coverage: 'Quotes available', incomplete: 'Some quotes are missing. Total valuation is withheld.', range: 'Totals exceed the supported numeric range.', records: 'Positions', quote: 'Current price', subtitle: 'Your holdings, returns and next review criteria in one place.', plan: 'Investment criteria (optional)' },
}

export function PortfolioPage() {
  const simple = useDisplayMode().displayMode === 'simple'
  const { language } = useLanguage()
  const t = copy[language]
  const pt = planCopy[language]
  useDocumentTitle(t.title)
  const { marketDataMode } = useMarketWorkspace()
  const [store, setStore] = useState(readPortfolio)
  const review = useHoldingAnalysis(store.positions, marketDataMode === 'live')
  const activeCount = store.positions.filter(p => p.quantity > 0).length
  const [visibleCount, setVisibleCount] = useState(6)
  const [revision, setRevision] = useState(0)
  const [venue, setVenue] = useState<CoinVenue>('upbit-krw')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!activeCount || marketDataMode !== 'live') return
    const refresh = () => { if (document.visibilityState === 'visible') setRetry(n => n + 1) }
    const timer = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [activeCount, marketDataMode])
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
      if (!cloudSignedIn() && (event.key === PORTFOLIO_KEY || event.key === null)) {
        setRevision(n => n + 1)
        setStore(readPortfolio()); setEditing(null); setDeleting(null); setAverage(''); setQuantity(''); setTarget(''); setStop(''); setInstrumentId(''); setMessage('')
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  useEffect(() => {
    const remote = () => {
      if (!cloudSignedIn()) return
      const next = readPortfolio()
      if (next.raw === store.raw && next.error === store.error) return
      if (editing || formOpen) { setMessage(language === 'ko' ? '다른 기기에서 기록이 바뀌었습니다. 작성 중인 입력은 유지했습니다. 저장 데이터를 다시 읽고 변경 내용을 확인해주세요.' : 'Another device changed these holdings. Your input is retained. Reload saved data before saving.'); return }
      setStore(next); setRevision(n => n + 1); setDeleting(null)
    }
    window.addEventListener(CLOUD_RECORDS_CHANGED, remote)
    return () => window.removeEventListener(CLOUD_RECORDS_CHANGED, remote)
  }, [store.raw, store.error, editing, formOpen, language])
  const reset = () => { setEditing(null); setAverage(''); setQuantity(''); setTarget(''); setStop(''); setInstrumentId(''); setQuery(''); setFormOpen(false) }
  const commit = (positions: Position[], success: string) => {
    try { setStore(writePortfolio(positions, store.raw)); setRevision(n => n + 1); setMessage(cloudSignedIn() ? (language === 'ko' ? '변경을 반영했습니다. 서버 저장 상태는 위의 계정 표시에서 확인하세요.' : 'Changes queued. Check the account bar for server sync status.') : success); return true }
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
    const analyzed = currentHoldingResult(review.reviews[position.id], review.now)
    const fetchedAt = state.catalog?.fetchedAt
    const fresh = state.catalog?.source === marketDataMode && (marketDataMode === 'mock' || (fetchedAt !== undefined && Number.isFinite(fetchedAt) && review.now - fetchedAt <= 90_000 && fetchedAt <= review.now + 5000))
    return { position, state, quotedAt: analyzed?.analyzedAt ?? fetchedAt, price: analyzed?.decision.price ?? (state.loading || state.error || !fresh ? null : instrument?.lastPrice ?? null) }
  })
  const totals = summarizePortfolio(entries.filter(entry => entry.position.quantity > 0))
  const realized = realizedByCurrency(store.positions)
  const ledgerText = language === 'ko'
    ? { realized: '기록된 실현손익', closed: '보유 종료', locked: '평단가와 수량은 거래 기록에서 자동 계산됩니다. 정정하려면 마지막 거래부터 취소하세요.', delete: '이 기록의 거래 내역과 실현손익도 함께 삭제됩니다.', notice: '현물 보유 기준 · 기록한 수수료 반영 · 세금/환율 미반영. 서로 다른 기준통화를 합산하지 않습니다. 시세는 조회 시점 기준입니다.' }
    : { realized: 'Recorded realized P/L', closed: 'Closed holding', locked: 'Average and quantity are calculated from the ledger. Correct entries by undoing from the last trade.', delete: 'The trade history and realized P/L of this holding will also be removed.', notice: 'Spot holdings. Includes recorded fees; excludes taxes and FX. Different currencies are never summed. Quotes reflect the time fetched.' }
  const content = <main className={simple ? styles.simple : styles.page} data-portfolio-experience={simple ? 'simple' : 'expert'}>
    {!simple && <header className={styles.heading}><span>MY INVESTMENTS</span><h1>{t.title}</h1><p>{pt.subtitle}</p></header>}
    <nav className={styles.actions}><strong>{t.coins}</strong>{!simple && <Link to="/research?mode=position">{language === 'ko' ? '선물 포지션 연결·위험 알림' : 'Connect perpetual positions'}</Link>}<Link to="/market">{language === 'ko' ? '관심종목 · 마켓' : 'Watchlists · Market'}</Link>{store.positions.length > 0 && <button type="button" aria-expanded={formOpen || !!editing} aria-controls="portfolio-form" onClick={() => { reset(); setFormOpen(true) }}>{pt.add}</button>}<button type="button" onClick={() => setRetry(n => n + 1)}>{t.refresh}</button></nav>
    {store.error && <p role="alert">{t.storage}</p>}
    {totals.length > 0 && <section aria-label={pt.summary} className={styles.overview}>
      <div className={styles.sectionHeading}><h2>{pt.summary}</h2><span>{marketDataMode === 'mock' ? t.mock : t.live}</span></div>
      <div className={styles.totals}>{totals.map(total => <section key={total.currency} aria-label={`${pt.summary} ${total.currency}`} className={styles.total}>
        <header><strong>{total.currency}</strong><span>{pt.records} {total.count} · {pt.coverage} {total.pricedCount}/{total.count}</span></header>
        <dl><div><dt>{t.value}</dt><dd className={styles.totalValue}>{total.value === null ? '—' : number(total.value)}</dd></div>
          {!simple && <div><dt>{t.cost}</dt><dd>{total.cost === null ? '—' : number(total.cost)}</dd></div>}
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
      <details className={styles.planDisclosure} open={!simple || !!editing?.targetPrice || !!editing?.stopPrice}><summary>{pt.plan}</summary><fieldset className={styles.planFields}><legend>{pt.plan}</legend><p id="plan-help">{pt.help}</p><div>
        <label>{pt.target}<input aria-describedby="plan-help" type="number" min="0" step="any" value={target} onChange={e => setTarget(e.target.value)} /></label>
        <label>{pt.stop}<input aria-describedby="plan-help" type="number" min="0" step="any" value={stop} onChange={e => setStop(e.target.value)} /></label>
      </div></fieldset></details>
      <div className={styles.actions}><button disabled={!!store.error} type="submit">{t.save}</button>{(editing || formOpen) && <button type="button" onClick={reset}>{t.cancel}</button>}</div>
    </form>
    {message && <p role="status" className={styles.message}>{message}</p>}
    <p className={styles.notice}>{ledgerText.notice}</p>
    {!store.error && store.positions.length === 0 && <p>{t.empty}</p>}
    {activeCount > 0 && <section className={styles.reviewHeading} aria-label={language === 'ko' ? '보유 코인 전체 분석' : 'Analyze all holdings'}>
      <div><h2>{language === 'ko' ? '내 코인, 지금 어떤가요?' : 'How are my holdings doing?'}</h2><p>{language === 'ko' ? `보유 중인 ${activeCount}개 기록의 흐름과 주의할 가격을 확인하세요.` : `Review the trends and risk levels of ${activeCount} open holdings.`}</p></div>
      {review.status === 'running' ? <button type="button" onClick={review.stop}>{language === 'ko' ? '분석 중지' : 'Stop analysis'}</button> : <button type="button" disabled={marketDataMode !== 'live'} onClick={() => { void review.start() }}>{language === 'ko' ? '보유 코인 전체 분석' : 'Analyze all holdings'}</button>}
      <p role="status">{marketDataMode !== 'live' ? (language === 'ko' ? '예시 모드에서는 실제 보유 분석을 제공하지 않아요.' : 'Live holding analysis is unavailable in demo mode.') : review.status !== 'idle' ? `${language === 'ko' ? review.status === 'running' ? '분석 중' : review.status === 'stopped' ? '중지됨' : review.status === 'error' ? '분석 연결 실패 · 다시 시도해주세요' : '분석 완료' : review.status} · ${Object.keys(review.reviews).length}/${activeCount}` : (language === 'ko' ? '버튼을 누를 때 분석해요. 결과가 먼저 나온 코인부터 볼 수 있어요.' : 'Analysis starts when you ask. Results appear as each holding finishes.')}</p>
      <details><summary>{language === 'ko' ? '분석 범위와 시점' : 'Scope and freshness'}</summary><p>{language === 'ko' ? '저장한 현물 보유 종목 전체를 두 종목씩 확인해요. 같은 종목의 여러 보유 기록은 분석을 공유해요. 시세 수신 후 90초가 지나면 분석을 다시 요청해야 해요. 자료가 부족한 종목도 목록에 남기며, 화면을 나가면 진행 중인 분석은 중지돼요.' : 'All saved spot holdings are checked, two assets at a time. Duplicate lots share market analysis. Results expire 90 seconds after quote receipt. Missing-data holdings remain visible. Leaving this page stops the run.'}</p></details>
    </section>}
    <div className={styles.positions}>{entries.slice(0, visibleCount).map(({ position: p, state, price, quotedAt }) => {
      const result = valuation(p, price)
      const quoteLabel = state.loading ? t.loading : !result ? (state.catalog ? language === 'ko' ? '시세 새로고침이 필요해요' : 'Refresh quotes to update' : t.unavailable) : state.catalog?.source === 'mock' ? t.mock : t.live
      return <article key={p.id} aria-label={`${p.symbol} · ${p.venue}`}>
        <h2>{p.symbol}</h2><p>{p.exchange} · {p.venue} · {p.quoteCurrency}</p>
        <p>{p.quantity === 0 ? ledgerText.closed : quoteLabel}{result && quotedAt !== undefined && ` · ${new Date(quotedAt).toLocaleString()}`}</p>
        {simple ? <div className={styles.simpleHolding}><div><span>{t.profit}</span><strong>{result ? `${number(result.profit)} ${p.quoteCurrency}` : '—'}</strong><b>{result ? portfolioPercent(result.percent) : t.unavailable}</b></div><details><summary>{language === 'ko' ? '얼마나 보유하고 있나요?' : 'Holding amounts'}</summary>        <dl className={styles.positionMetrics}><div><dt>{t.average}</dt><dd>{number(p.averagePrice)} {p.quoteCurrency}</dd></div><div><dt>{t.quantity}</dt><dd>{number(p.quantity)}</dd></div><div><dt>{t.cost}</dt><dd>{number(p.averagePrice * p.quantity)} {p.quoteCurrency}</dd></div><div><dt>{t.value}</dt><dd>{result ? `${number(result.value)} ${p.quoteCurrency}` : '—'}</dd></div></dl></details></div> : <dl className={styles.positionMetrics}><div><dt>{t.average}</dt><dd>{number(p.averagePrice)} {p.quoteCurrency}</dd></div><div><dt>{t.quantity}</dt><dd>{number(p.quantity)}</dd></div><div><dt>{t.cost}</dt><dd>{number(p.averagePrice * p.quantity)} {p.quoteCurrency}</dd></div><div><dt>{t.value}</dt><dd>{result ? `${number(result.value)} ${p.quoteCurrency}` : '—'}</dd></div><div data-direction={result && result.profit !== 0 ? result.profit > 0 ? 'positive' : 'negative' : undefined}><dt>{t.profit}</dt><dd>{result ? `${number(result.profit)} ${p.quoteCurrency}` : '—'}</dd></div><div><dt>{t.rate}</dt><dd>{result ? portfolioPercent(result.percent) : '—'}</dd></div></dl>}
        {p.quantity > 0 && <HoldingAnalysis position={p} review={review.reviews[p.id]} now={review.now} running={review.status === 'running'} language={language} />}
        <details className={styles.recordDetails}><summary>{language === 'ko' ? '거래 내역·목표가 관리' : 'Manage trades and price targets'}</summary>
        <TradeLedgerPanel key={`${p.id}:${revision}`} position={p} language={language} disabled={!!store.error} onSave={next => { const saved = commit(store.positions.map(item => item.id === p.id ? next : item), t.saved); if (saved) reset(); return saved }} />
        {p.quantity > 0 && <PositionPlan position={p} price={price} language={language} quoteLabel={quoteLabel} />}
        </details>
        <div className={styles.actions}><button onClick={() => { setEditing(p); setVenue(p.venue); setAverage(String(p.averagePrice)); setQuantity(String(p.quantity)); setTarget(p.targetPrice === undefined ? '' : String(p.targetPrice)); setStop(p.stopPrice === undefined ? '' : String(p.stopPrice)); setMessage(''); formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) }}>{t.edit}</button><button onClick={() => setDeleting(p.id)}>{t.remove}</button></div>
        {deleting === p.id && <div role="group" aria-label={t.confirm}><p>{t.confirm}</p>{p.ledger && <p>{ledgerText.delete}</p>}<button onClick={() => { if (commit(store.positions.filter(item => item.id !== p.id), t.deleted)) { setDeleting(null); if (editing?.id === p.id) reset() } }}>{t.remove}</button><button onClick={() => setDeleting(null)}>{t.cancel}</button></div>}
      </article>
    })}</div>
    {entries.length > visibleCount && <button type="button" onClick={() => setVisibleCount(n => n + 6)}>{language === 'ko' ? `보유 기록 더 보기 (${entries.length - visibleCount}개 남음)` : `More holdings (${entries.length - visibleCount} remaining)`}</button>}
    <details className={styles.management}><summary>{language === 'ko' ? '저장한 가격 기준·변화 확인' : 'Saved price plans and changes'}</summary><ScenarioBoard /></details>
    <details className={styles.management}><summary>{language === 'ko' ? '백업과 저장 안내' : 'Backup and storage'}</summary>
    <PortfolioBackupPanel key={revision} store={store} language={language} onRestore={(incoming, expectedRaw) => {
      try {
        if (store.raw !== expectedRaw) return false
        const merged = mergePortfolioBackup(store.positions, incoming)
        const saved = commit(merged.positions, t.saved)
        if (saved) { reset(); setDeleting(null) }
        return saved
      } catch { return false }
    }} />
    <footer className={styles.storage}><p>{cloudSignedIn() ? (language === 'ko' ? '보유·거래 기록과 목표/손절 기준을 현재 계정으로 동기화합니다. 기존 브라우저 자료는 계정 설정에서 확인 후 가져올 수 있습니다.' : 'Holdings, trades and price criteria sync to this account. Import existing browser records from account settings after reviewing them.') : t.help}</p><button type="button" onClick={() => { setStore(readPortfolio()); setRevision(n => n + 1); reset(); setDeleting(null); setMessage('') }}>{t.reload}</button></footer></details>
  </main>
  return <SimpleWorkspace enabled={simple} title={language === 'ko' ? '내 종목, 지금 어떤가요?' : 'How are my holdings doing?'} description={language === 'ko' ? '손익을 확인하고 보유 코인 분석을 눌러 다음에 확인할 가격을 알아보세요.' : 'Check your returns, then analyze your holdings for the next price to review.'}>{content}</SimpleWorkspace>
}
