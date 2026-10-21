import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useTechnicalLevelData } from '@/hooks/useTechnicalLevelData'
import { runDailyBacktest, type BacktestResult } from '@/services/cryptoAnalysis/strategyLab'
import { seriesMarketTime } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { MarketInstrument, MarketVenue } from '@/types/market'
import styles from '@/pages/Settings/SettingsPage.module.css'
export function StrategiesPage() {
  const { language } = useLanguage(), ko = language === 'ko'
  const { marketDataMode } = useMarketWorkspace()
  const [venue, setVenue] = useState<MarketVenue>('upbit-krw')
  const [selected, setSelected] = useState('')
  const [retry, setRetry] = useState(0)
  const { catalog, loading, error } = useMarketCatalog(venue, marketDataMode, retry)
  const instrument = catalog?.instruments.find(i => i.id === selected) ?? null
  return <div className={styles.page}><h1>{ko ? '과거 데이터로 전략 시험' : 'Historical strategy test'}</h1>
    <p>{ko ? '20일 평균 가격이 50일 평균보다 높으면 보유하고, 낮아지면 현금으로 기다리는 단순 규칙을 시험해요.' : 'Test a simple rule: hold when the 20-day average exceeds the 50-day average, otherwise hold cash.'}</p>
    <section className={styles.card}><label>{ko ? '거래소' : 'Venue'}<select value={venue} onChange={e => { setVenue(e.target.value as MarketVenue); setSelected('') }}><option value="upbit-krw">Upbit KRW</option><option value="binance-spot">Binance Spot USDT</option></select></label>
      <label>{ko ? '종목' : 'Instrument'}<select value={selected} disabled={loading || !catalog} onChange={e => setSelected(e.target.value)}><option value="">{loading ? (ko ? '목록 불러오는 중…' : 'Loading…') : (ko ? '시험할 종목을 선택하세요' : 'Choose an instrument')}</option>{catalog?.instruments.filter(i => i.quoteCurrency === (venue === 'upbit-krw' ? 'KRW' : 'USDT')).map(i => <option key={i.id} value={i.id}>{i.symbol}</option>)}</select></label>
      {error && <p role="alert">{ko ? '목록을 불러오지 못했어요.' : 'Catalog unavailable.'}<button type="button" onClick={() => setRetry(n => n + 1)}>{ko ? '다시 시도' : 'Retry'}</button></p>}
    </section>
    {instrument && <HistoricalTest key={`${instrument.id}:${marketDataMode}`} instrument={instrument} />}
    <Link to="/settings">{ko ? '설정으로 돌아가기' : 'Back to settings'}</Link>
  </div>
}
function HistoricalTest({ instrument }: { instrument: MarketInstrument }) {
  const { language } = useLanguage(), ko = language === 'ko'
  const data = useTechnicalLevelData(instrument, '1D')
  const [capital, setCapital] = useState('1000000'), [fee, setFee] = useState('0.05'), [slippage, setSlippage] = useState('0.1')
  const [result, setResult] = useState<BacktestResult | null>(null), [error, setError] = useState('')
  const change = (setter: (value: string) => void, value: string) => { setter(value); setResult(null); setError('') }
  const test = () => {
    setResult(null); setError('')
    const now = Date.now()
    if (data.dataQuality !== 'live' || data.connectionStatus !== 'live' || !data.updatedAt || now - data.updatedAt > 90_000 || data.updatedAt > now + 60_000) { setError(ko ? '실제 가격 기록의 연결을 먼저 확인해주세요.' : 'Verify a fresh live connection first.'); return }
    try { setResult(runDailyBacktest(data.candles, seriesMarketTime(data, now), Number(capital), Number(fee), Number(slippage))) }
    catch { setError(ko ? '연속된 완료 일봉 80개 이상과 올바른 입력이 필요해요. 누락된 가격은 채우지 않아요.' : 'Requires at least 80 contiguous closed daily bars and valid settings. Missing prices are not filled.') }
  }
  return <div className={styles.grid}><section className={styles.card}><h2>{instrument.symbol}</h2>
    <label>{ko ? '시작 금액' : 'Starting capital'} ({instrument.quoteCurrency})<input type="number" min="1" max="1000000000000" value={capital} onChange={e => change(setCapital, e.target.value)} /></label>
    <label>{ko ? '한 번 거래 수수료 (%)' : 'Fee per side (%)'}<input type="number" step="0.01" min="0" max="5" value={fee} onChange={e => change(setFee, e.target.value)} /></label>
    <label>{ko ? '불리한 체결 차이 (%)' : 'Slippage per side (%)'}<input type="number" step="0.01" min="0" max="5" value={slippage} onChange={e => change(setSlippage, e.target.value)} /></label>
    <button type="button" disabled={data.isLoading || data.dataQuality !== 'live'} onClick={test}>{data.isLoading ? (ko ? '가격 기록 불러오는 중…' : 'Loading history…') : (ko ? '이 기록으로 시험하기' : 'Run historical test')}</button>
    {data.dataQuality === 'mock' && <p>{ko ? '예시 시세에서는 실행하지 않아요. 설정에서 실제 시세를 선택해주세요.' : 'Switch to live quotes to test.'}</p>}
    <p role="alert">{error}</p>
  </section><section className={styles.card}><h2>{ko ? '시험 결과' : 'Test result'}</h2>
    {result ? <><div className={styles.result}><span>{ko ? '전략 수익률 · 비용 포함' : 'Strategy return after costs'}</span><strong>{result.returnPercent.toFixed(2)}%</strong><span>{ko ? '같은 기간 계속 보유' : 'Buy and hold, same period'}: {result.buyHoldPercent.toFixed(2)}%</span><span>{ko ? '최대 하락 폭 · 일봉 종가 기준' : 'Maximum drawdown at daily closes'}: {result.drawdownPercent.toFixed(2)}%</span><span>{ko ? '완료 거래' : 'Closed trades'}: {result.trades.length}</span><span>{new Date(result.from).toLocaleDateString(language)} – {new Date(result.to).toLocaleDateString(language)}</span></div>
      <details><summary>{ko ? '계산·거래 내역' : 'Calculation and trades'}</summary><p>{ko ? `원본 ${result.bars}개 일봉 중 첫 50개는 준비 기간입니다. 수수료 ${result.feePercent}%, 체결 차이 ${result.slippagePercent}%를 양쪽에 적용합니다.` : `${result.bars} daily bars, first 50 for warm-up. Fee ${result.feePercent}% and slippage ${result.slippagePercent}% per side.`}</p>{result.trades.map((t, i) => <p key={i}>{new Date(t.entryAt).toLocaleDateString(language)} → {new Date(t.exitAt).toLocaleDateString(language)} · {t.pnl.toLocaleString(language, { maximumFractionDigits: 2 })} {instrument.quoteCurrency}</p>)}</details></> : <p>{ko ? '종목과 비용을 확인한 뒤 시험을 실행해주세요.' : 'Choose an instrument and costs, then run the test.'}</p>}
    <p>{ko ? '전날까지의 가격만 보고 다음 날 시작 가격으로 거래한 것으로 계산해요. 마지막 보유분은 마지막 종가에 정리해요. 전체 내역이 아닌 불러온 구간만 시험하며, 미래 수익·현재 종목 분석의 적중률을 뜻하지 않아요. 실제 주문이나 보유 기록은 생기지 않아요.' : 'Uses previous closes, fills at the next open, and liquidates at the final close. Tests only loaded history, not future performance or the accuracy of the main analysis. No real orders or holding records are created.'}</p>
  </section></div>
}
