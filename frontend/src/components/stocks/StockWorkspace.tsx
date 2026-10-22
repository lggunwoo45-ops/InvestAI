import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStockSnapshot } from '@/hooks/useStockSnapshot'
import { useLanguage } from '@/i18n/useLanguage'
import { stockTrend, stockValuation } from '@/services/stocks/stockData'
import { stockMoney, stockErrorText } from '@/services/stocks/stockCopy'
import { readStockHoldings, STOCK_HOLDINGS_KEY, validStockHolding, writeStockHoldings } from '@/services/stocks/stockHoldings'
import type { MarketInstrument } from '@/types/market'
import type { Candle } from '@/types/marketDetail'
import styles from './Stocks.module.css'

function DailyChart({ candles, ko }: { candles: Candle[]; ko: boolean }) {
  if (!candles.length) return null
  const closes = candles.map(c => c.close), min = Math.min(...closes), max = Math.max(...closes), span = max - min || max * 0.01
  const points = candles.map((c, i) => `${20 + i / Math.max(1, candles.length - 1) * 760},${165 - (c.close - min) / span * 140}`).join(' ')
  return <figure className={styles.chart}><figcaption>{ko ? '일별 종가 · 수정주가' : 'Daily close · adjusted prices'} <span>{stockMoney(min)} – {stockMoney(max)}</span></figcaption>
    <svg viewBox="0 0 800 190" role="img" aria-label={ko ? `일별 종가 차트, ${candles.length}거래일, 마지막 종가 ${stockMoney(closes.at(-1)!)}` : `Daily closes, ${candles.length} sessions, latest ${stockMoney(closes.at(-1)!)}`}><path d="M20 25H780M20 95H780M20 165H780" className={styles.grid} /><polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg>
    <div className={styles.between}><small>{new Date(candles[0].timestamp).toISOString().slice(0, 10)}</small><small>{new Date(candles.at(-1)!.timestamp).toISOString().slice(0, 10)}</small></div>
  </figure>
}
export function StockWorkspace({ instrument, positionId, expert = false }: { instrument: MarketInstrument; positionId?: string; expert?: boolean }) {
  const { language } = useLanguage(), ko = language === 'ko'
  const { data, loading, error, refresh, checkedAt } = useStockSnapshot(instrument.symbol)
  const [store, setStore] = useState(() => readStockHoldings())
  const [editingId, setEditingId] = useState(positionId)
  const saved = store.holdings.find(row => row.id === editingId && row.symbol === instrument.symbol)
  const [average, setAverage] = useState(saved ? String(saved.average) : '')
  const [quantity, setQuantity] = useState(saved ? String(saved.quantity) : '')
  const [message, setMessage] = useState('')
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === STOCK_HOLDINGS_KEY || event.key === null) { setStore(readStockHoldings()); setMessage(ko ? '다른 탭에서 기록이 바뀌었어요. 입력값을 확인하고 저장해 주세요.' : 'Holdings changed in another tab. Check inputs before saving.') } }
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync)
  }, [ko])
  const usable = data && !error && checkedAt - data.quote.fetchedAt < 120_000
  const trend = usable && !data.historyError ? stockTrend(data.candles, checkedAt) : null
  const valuation = usable ? stockValuation(Number(average), Number(quantity), data.quote.price) : null
  const titles = ko ? { above: '최근 완료 일봉은 평균보다 높게 마감했어요', below: '최근 완료 일봉은 평균보다 낮게 마감했어요', near: '최근 완료 일봉은 평균 부근에 마감했어요' } : { above: 'Last completed close: above average', below: 'Last completed close: below average', near: 'Last completed close: near average' }
  const guidance = ko ? { above: '추가 매수 전, 최근 20거래일 평균과 가격 차이가 얼마나 벌어졌는지 확인하세요.', below: '추가 매수 전, 최근 20거래일 평균을 회복하는지 확인하세요.', near: '방향이 뚜렷하지 않아요. 다음 완료 일봉과 기업 소식을 함께 확인하세요.' } : { above: 'Before adding, check the distance from the recent 20-session average.', below: 'Before adding, check whether the price recovers its recent 20-session average.', near: 'The direction is unclear. Review the next completed daily bar and company news.' }
  const save = () => {
    const row = { id: editingId ?? crypto.randomUUID(), symbol: instrument.symbol, name: instrument.koreanName ?? instrument.name, venue: instrument.marketType, average: Number(average), quantity: Number(quantity) }
    if (!validStockHolding(row)) { setMessage(ko ? '평단가는 양수, 수량은 1주 이상의 정수로 입력해 주세요.' : 'Enter a positive average price and a whole number of shares.'); return }
    if (editingId && !saved) { setMessage(ko ? '수정할 보유 기록을 찾을 수 없어요. 내 주식에서 다시 열어 주세요.' : 'Saved holding not found. Reopen it from My Stocks.'); return }
    const next = writeStockHoldings([...store.holdings.filter(item => item.id !== row.id), row], store.raw)
    if (!next) { setMessage(ko ? '저장하지 못했어요. 저장 공간이나 다른 탭의 변경을 확인해 주세요. 기존 기록은 유지됩니다.' : 'Save failed. Check storage or changes in another tab. Existing records are preserved.'); return }
    setStore(next); setEditingId(row.id); setMessage(ko ? '내 주식에 저장했어요.' : 'Saved to My Stocks.')
  }
  return <section className={styles.workspace} aria-label={ko ? '국내 주식 조회·분석' : 'Domestic stock overview'}>
    <header className={styles.between}><div><span className={styles.eyebrow}>{instrument.marketType?.toUpperCase()} · {instrument.symbol}</span><h2>{ko ? instrument.koreanName ?? instrument.name : instrument.name}</h2><p>{ko ? '가격과 최근 흐름, 내 보유 손익을 한곳에서 확인하세요.' : 'Price, recent trend and your holding return in one place.'}</p></div><button type="button" disabled={loading} onClick={refresh}>{loading ? (ko ? '조회 중…' : 'Loading…') : (ko ? '다시 확인' : 'Refresh')}</button></header>
    {loading && !data && <p role="status">{ko ? '현재 가격과 일봉을 불러오고 있어요. 응답이 없으면 20초 안에 안내해 드려요.' : 'Loading the quote and daily bars. A timeout is reported within 20 seconds.'}</p>}
    {error && <div className={styles.notice} role="status"><strong>{stockErrorText(error.code, ko)}</strong>{data && <p>{ko ? '아래는 이전 조회 자료예요. 연결이 복구될 때까지 분석과 손익 계산을 멈춥니다.' : 'Previous data is shown below. Analysis and valuation are paused until the connection recovers.'}</p>}</div>}
    {data && <>
      <div className={styles.quote}><span>{usable ? (ko ? '조회 가격' : 'Fetched price') : (ko ? '이전 조회 가격' : 'Previous price')}</span><strong>{stockMoney(data.quote.price)}</strong><span data-sign={data.quote.changePercent >= 0 ? 'up' : 'down'}>{data.quote.changePercent >= 0 ? '+' : ''}{data.quote.changePercent.toFixed(2)}% {ko ? '전일 대비' : 'vs. previous session'}</span><small>{ko ? '조회 시각' : 'Fetched'} {new Date(data.quote.fetchedAt).toLocaleTimeString(language)} · KIS / KRX</small></div>
      {usable && <div className={styles.summary}><span className={styles.eyebrow}>{ko ? '지금 확인할 내용' : 'What to check'}</span><h3>{trend ? titles[trend.direction as keyof typeof titles] : ko ? '최근 흐름을 판단할 자료가 부족해요' : 'Not enough recent history for a trend'}</h3><p>{trend ? guidance[trend.direction as keyof typeof guidance] : ko ? '완료 일봉 20개 이상이 필요해요. 자료를 확인하기 전에는 매수·매도 판단을 붙이지 않습니다.' : 'At least 20 completed daily bars are required before describing the trend.'}</p>{trend && <small>{ko ? '분석 기준' : 'As of'} {new Date(trend.asOf).toISOString().slice(0, 10)} · {ko ? '완료 일봉 20거래일 평균' : '20 completed daily closes'} {stockMoney(trend.average)}</small>}</div>}
      {data.historyError ? <p role="status">{ko ? '가격은 확인했지만 일봉 조회에 실패했어요. 차트 분석은 잠시 보류합니다.' : 'Quote available, but daily history failed. Chart analysis is paused.'}</p> : <DailyChart candles={data.candles} ko={ko} />}
    </>}
    <details className={styles.card} open={Boolean(positionId)}><summary>{ko ? '이미 갖고 있어요 · 내 평단가로 확인' : 'I own this · use my average price'}</summary>
      <p>{ko ? '내 코인·관심종목과 별도로 이 브라우저에 저장돼요. 기기 간 동기화되지 않으며 브라우저 데이터를 지우면 사라집니다.' : 'Saved separately from coins and watchlists in this browser. No device sync; clearing browser data removes these records.'}</p>
      {positionId && !saved && <p role="alert">{ko ? '보유 기록을 찾을 수 없어요. 내 주식에서 다시 열어 주세요.' : 'Holding not found. Reopen from My Stocks.'}</p>}
      {store.error && <p role="alert">{ko ? '저장 자료를 읽을 수 없어 변경을 중지했어요. 기존 자료는 보존됩니다.' : 'Stored records cannot be read. Changes are blocked and existing data is preserved.'}</p>}
      <form onSubmit={event => { event.preventDefault(); save() }}><div className={styles.inputs}><label>{ko ? '평단가 (원)' : 'Average price (KRW)'}<input type="number" min="0.000001" step="any" required value={average} onChange={event => setAverage(event.target.value)} /></label><label>{ko ? '수량 (주)' : 'Quantity (shares)'}<input type="number" min="1" step="1" required value={quantity} onChange={event => setQuantity(event.target.value)} /></label></div>
        {valuation && <div className={styles.metrics}><div><small>{ko ? '평가금액' : 'Market value'}</small><strong>{stockMoney(valuation.value)}</strong></div><div><small>{ko ? '평가손익' : 'Unrealized P/L'}</small><strong data-sign={valuation.profit >= 0 ? 'up' : 'down'}>{stockMoney(valuation.profit)} ({valuation.percent.toFixed(2)}%)</strong></div></div>}
        <div className={styles.actions}><button type="submit" disabled={store.error}>{editingId ? (ko ? '보유 기록 수정' : 'Update holding') : (ko ? '내 주식에 저장' : 'Save to My Stocks')}</button><Link to="/portfolio?asset=stocks">{ko ? '내 주식 모두 보기 →' : 'All my stocks →'}</Link></div><p role="status">{message}</p>
      </form>
      <small>{ko ? '수수료·세금 제외. 액면분할·병합 등은 평단가와 수량을 직접 수정해야 합니다.' : 'Excludes fees and taxes. Adjust your average price and quantity manually after splits or other corporate actions.'}</small>
    </details>
    <details className={styles.card} open={expert}><summary>{ko ? '자료 기준과 상세 가격' : 'Data basis and detailed prices'}</summary><p>{ko ? '한국투자증권의 KRX 조회 시세입니다. 화면을 보고 있는 동안 30초 간격으로 확인하며 실시간 체결 스트리밍은 아닙니다. 장 마감·휴장·거래 정지 시에는 마지막 제공 가격일 수 있어요. 조회 시각은 체결 시각이 아닙니다.' : 'KIS KRX snapshots refresh every 30 seconds while visible, not a trade stream. Closed markets or halted stocks may return the last available price. Fetch time is not trade time.'}</p><p>{ko ? '차트는 최근 최대 100개 수정 일봉입니다. 오늘 일봉은 흐름 분석에서 제외합니다. 기업 실적·공시·뉴스와 매수/매도 주문은 연결하지 않았습니다.' : 'Up to 100 adjusted daily bars. Today is excluded from trend calculations. Fundamentals, disclosures, news and order execution are not connected here.'}</p>
      {data && <div className={styles.table}><table><caption>{ko ? '최근 10거래일' : 'Last 10 sessions'}</caption><thead><tr>{(ko ? ['일자', '시가', '고가', '저가', '종가'] : ['Date', 'Open', 'High', 'Low', 'Close']).map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.candles.slice(-10).reverse().map(c => <tr key={c.timestamp}><td>{new Date(c.timestamp).toISOString().slice(0, 10)}</td>{[c.open, c.high, c.low, c.close].map((v, i) => <td key={i}>{stockMoney(v)}</td>)}</tr>)}</tbody></table></div>}
    </details>
  </section>
}
