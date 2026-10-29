import { useEffect, useRef, useState } from 'react'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { OpportunityBoard, ScanPoolControl } from '@/components/crypto-analysis/OpportunityPlans'
import { SimpleScanResults } from '@/components/simple/SimpleScanResults'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { marketDataService } from '@/services/market/marketDataService'
import { upbitRelayBase } from '@/services/market/providers/upbitRelay'
import { matchesScan, scanCandidates, SCAN_LIMIT, selectScanPool, type ScanCriteria, type ScanResult, type ScanPoolMode } from '@/services/cryptoAnalysis/liveCandidateScan'
import type { MarketVenue } from '@/types/market'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import { decisionGuide, easyDirection } from '@/services/cryptoAnalysis/decisionGuide'
import styles from './LiveCandidateSearch.module.css'

const venues = ['upbit-krw', 'upbit-btc', 'upbit-usdt', 'binance-spot', 'binance-futures'] as const
const venueLabels = ['Upbit · KRW', 'Upbit · BTC', 'Upbit · USDT', 'Binance · Spot · USDT', 'Binance · Futures · USDT']
const initialCriteria: ScanCriteria = { direction: 'all', minimumVolumeRatio: 0, minimumRewardRisk: 0, excludeExtended: false }

export function LiveCandidateSearch() {
  const { marketDataMode } = useMarketWorkspace()
  return <SearchSession key={marketDataMode} marketDataMode={marketDataMode} />
}

function SearchSession({ marketDataMode }: { marketDataMode: 'live' | 'mock' }) {
  const simple = useDisplayMode().displayMode === 'simple'
  const { language } = useLanguage()
  const ko = language === 'ko'
  const [venue, setVenue] = useState<MarketVenue>('upbit-krw')
  const [poolMode, setPoolMode] = useState<ScanPoolMode>('liquidity')
  const [view, setView] = useState<'opportunities' | 'trend'>('opportunities')
  const [criteria, setCriteria] = useState(initialCriteria)
  const [visibleCount, setVisibleCount] = useState(4)
  const updateCriteria = (next: ScanCriteria) => { setCriteria(next); setVisibleCount(4) }
  const [results, setResults] = useState<ScanResult[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'scanning' | 'done' | 'cancelled' | 'error'>('idle')
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [clock, setClock] = useState(Date.now)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [])
  const changeVenue = (next: MarketVenue) => {
    controller.current?.abort(); setVenue(next); setStatus('idle'); setResults([]); setVisibleCount(4); setProgress({ completed: 0, total: 0 })
  }
  const changePool = (next: ScanPoolMode) => { controller.current?.abort(); setPoolMode(next); setStatus('idle'); setResults([]); setProgress({ completed: 0, total: 0 }) }
  const running = status === 'loading' || status === 'scanning'
  const relayRequired = venue.startsWith('upbit-') && !upbitRelayBase()
  const start = async () => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setStatus('loading'); setResults([]); setVisibleCount(4); setProgress({ completed: 0, total: 0 }); setClock(Date.now())
    try {
      const catalog = await marketDataService.getMarketCatalog(venue, 'live', true, current.signal)
      if (current.signal.aborted) return
      if (catalog.source !== 'live' || !Number.isFinite(catalog.fetchedAt) || Date.now() - catalog.fetchedAt > 60_000 || catalog.fetchedAt > Date.now() + 5000) throw new Error('catalog_unavailable')
      const pool = selectScanPool(catalog.instruments, venue, poolMode)
      setProgress({ completed: 0, total: pool.length }); setStatus('scanning')
      await scanCandidates(pool, { signal: current.signal, onResult: (result, completed, total) => {
        if (current.signal.aborted) return
        setResults(previous => [...previous, result]); setProgress({ completed, total }); setClock(Date.now())
      } })
      if (!current.signal.aborted) setStatus('done')
    } catch { if (!current.signal.aborted) setStatus('error') }
  }
  const cancel = () => { controller.current?.abort(); setStatus('cancelled') }
  const direction = easyDirection[language]
  const issue = ko ? { loading: '시세 준비 지연', mock: '모의 데이터', disconnected: '연결 지연', stale: '시세 갱신 지연', history: '완료 봉 부족', gaps: '원본 봉 공백', range: '변동 범위 부족' } : { loading: 'Awaiting quotes', mock: 'Mock data', disconnected: 'Disconnected', stale: 'Stale data', history: 'Too few closed bars', gaps: 'Source candle gap', range: 'Insufficient range' }
  const shown = results.filter(result => matchesScan(result, criteria, clock)).sort((a, b) => b.instrument.volume24h - a.instrument.volume24h)
  const excluded = results.filter(result => result.decision.direction === 'unavailable')
  const expired = results.filter(result => clock > result.expiresAt).length
  const format = (value: number) => formatAnalysisPrice(value, language)
  if (simple) return <SimpleScanResults results={results} now={clock} venue={venue} onVenue={changeVenue} poolMode={poolMode} onPoolMode={changePool} status={status} progress={progress} disabled={marketDataMode !== 'live' || relayRequired} onStart={() => { void start() }} onCancel={cancel} />
  return <section className={styles.panel} aria-label={ko ? '실시간 조건 검색' : 'Live condition search'}>
    <header><div><h1>{ko ? '살펴볼 코인 찾기' : 'Find coins to review'}</h1><p>{ko ? `거래가 활발한 ${SCAN_LIMIT}개 코인의 흐름과 확인할 가격을 한 번에 살펴봐요.` : `Review the trends and price levels of ${SCAN_LIMIT} actively traded coins.`}</p></div><strong>{ko ? '실제 가격으로 계산해요' : 'Calculated from real prices'}</strong></header>
    <div className={styles.controls}>
      <label>{ko ? '거래소·마켓' : 'Venue'}<select value={venue} disabled={running} onChange={event => changeVenue(event.target.value as MarketVenue)}>{venues.map((value, index) => <option key={value} value={value}>{venueLabels[index]}</option>)}</select></label>
      <ScanPoolControl value={poolMode} onChange={changePool} disabled={running} language={language} />
      <label>{ko ? '결과 보기' : 'Result view'}<select value={view} onChange={e=>setView(e.target.value as typeof view)}><option value="opportunities">{ko ? '전략별 기회' : 'Strategy opportunities'}</option><option value="trend">{ko ? '기존 추세 기준' : 'Trend scan'}</option></select></label>
      {view === 'trend' && <label>{ko ? '어떤 흐름을 볼까요?' : 'Direction'}<select value={criteria.direction} onChange={event => updateCriteria({ ...criteria, direction: event.target.value as ScanCriteria['direction'] })}><option value="all">{ko ? '모두 보기' : 'All'}</option>{(['buy', 'sell', 'neutral'] as const).map(value => <option key={value} value={value}>{direction[value]}</option>)}</select></label>}
      {running ? <button type="button" onClick={cancel}>{ko ? '검색 중지' : 'Stop scan'}</button> : <button type="button" disabled={marketDataMode !== 'live' || relayRequired} onClick={() => { void start() }}>{ko ? '코인 찾기' : 'Scan live data'}</button>}
      {view === 'trend' && <details className={styles.moreFilters}><summary>{ko ? '조건 더 고르기' : 'More filters'}{(criteria.minimumVolumeRatio > 0 || criteria.minimumRewardRisk > 0 || criteria.excludeExtended) && <span>{ko ? ' · 적용 중' : ' · active'}</span>}</summary><div>
        <label>{ko ? '거래가 얼마나 활발한가요?' : 'Volume ratio'}<select value={criteria.minimumVolumeRatio} onChange={event => updateCriteria({ ...criteria, minimumVolumeRatio: Number(event.target.value) })}><option value="0">{ko ? '제한 없음' : 'Any'}</option><option value="1">{ko ? '평소 이상' : 'At least average'}</option><option value="1.5">{ko ? '평소의 1.5배 이상' : 'At least 1.5× average'}</option></select></label>
        <label className={styles.check}><input type="checkbox" checked={criteria.minimumRewardRisk > 0} onChange={event => updateCriteria({ ...criteria, minimumRewardRisk: event.target.checked ? 1.5 : 0 })} />{ko ? '예상 상승 폭이 하락 위험의 1.5배 이상' : 'Reward/risk ≥ 1.5'}</label>
        <label className={styles.check}><input type="checkbox" checked={criteria.excludeExtended} onChange={event => updateCriteria({ ...criteria, excludeExtended: event.target.checked })} />{ko ? '가격이 너무 오른 종목 제외' : 'Exclude extended moves'}</label>
      </div></details>}
    </div>
    {marketDataMode !== 'live' && <p role="status">{ko ? '실시간 데이터 모드에서 검색할 수 있습니다.' : 'Switch to live market data to scan.'}</p>}
    {relayRequired && <p role="status">{ko ? '빠른 시세 서버 연결이 필요한 기능입니다. 일반 종목 분석은 계속 사용할 수 있습니다.' : 'This scan requires the market relay. Individual analysis remains available.'}</p>}
    <div className={styles.progress} role="status" aria-live="polite">
      {status === 'idle' ? (ko ? '거래소를 고르고 ‘코인 찾기’를 눌러주세요.' : 'Choose a venue and start a scan.')
        : status === 'loading' ? (ko ? '최신 종목 목록을 가져오는 중…' : 'Loading the current catalog…')
          : status === 'error' ? (ko ? '목록을 가져오지 못했습니다. 다시 검색해주세요.' : 'Catalog unavailable. Try again.')
            : `${ko ? status === 'scanning' ? '검사 중' : status === 'cancelled' ? '검색 중지됨' : '검사 완료' : status === 'scanning' ? 'Scanning' : status === 'cancelled' ? 'Stopped' : 'Complete'} ${progress.completed}/${progress.total} ${view === 'trend' ? ` · ${shown.length} ${ko ? '개 추세 필터 일치' : 'trend matches'}` : ''}`}
      {running && progress.total > 0 && <progress max={progress.total} value={progress.completed} />}
    </div>
    {view === 'opportunities' && results.length > 0 && <OpportunityBoard results={results} now={clock} language={language} />}
    {view === 'trend' && <>
    {expired > 0 && <p className={styles.notice}>{ko ? `${expired}개 결과의 시세 확인 시간이 지나 가격 표시에서 제외했습니다. 다시 검색해주세요.` : `${expired} results have expired. Rescan for current price criteria.`}</p>}
    {status === 'done' && shown.length === 0 && expired === 0 && <p>{ko ? '현재 조건에 맞는 종목이 없습니다. 필터를 완화하거나 제외 사유를 확인하세요.' : 'No assets match. Adjust the filters or review the excluded results.'}</p>}
    <div className={styles.results}>{shown.slice(0, visibleCount).map(({ instrument, decision, analyzedAt }) => <article key={instrument.id}>
      <div className={styles.resultHead}><div><h2>{instrument.displaySymbol ?? instrument.symbol}</h2><small>{instrument.koreanName && ko ? instrument.koreanName : instrument.name}</small></div><strong data-direction={decision.direction}>{direction[decision.direction]}</strong></div>
      <h3 className={styles.action}>{decisionGuide(decision, language).title}</h3>
      <p className={styles.reason}>{decisionGuide(decision, language).reason}</p>
      {decision.plan && <div className={styles.watchPrice}><span>{ko ? decision.direction === 'sell' ? '상승 돌파 확인선' : '지지 구간' : decision.direction === 'sell' ? 'Upside breakout threshold' : 'Support zone'}</span><strong>{decision.direction === 'sell' ? format(decision.plan.sellInvalidation) : decision.plan.entry.map(format).join('–')} {instrument.quoteCurrency}</strong><p>{ko ? decision.direction === 'sell' ? `${decision.plan.frame === '1D' ? '일' : decision.plan.frame === '4H' ? '4시간' : '1시간'}봉이 이 가격 위에서 마감하면 하락 판단을 재검토합니다.` : '이 가격에 와도 바로 사기보다 하락이 멈추는지 봐요.' : decision.direction === 'sell' ? `Watch for a ${decision.plan.frame} close above this level.` : 'Check that the price holds; touching this area is not enough.'}</p></div>}
      <details className={styles.cardDetails}><summary>{ko ? '가격과 분석 근거 더 보기' : 'More prices and evidence'}</summary>
      <p>{ko ? '확인한 시간 흐름' : 'Timeframe coverage'} {decision.coverage}/3 · {decision.frames.filter(frame => !frame.issue).map(frame => `${frame.frame} ${direction[frame.direction]}`).join(' · ')}</p>
      {decision.plan ? <dl>{decision.direction === 'sell' ? <>
        <div><dt>{ko ? '반등 저항 구간' : 'Rebound resistance'}</dt><dd>{decision.plan.resistance.map(format).join('–')} {instrument.quoteCurrency}</dd></div>
        <div><dt>{ko ? '매도 우세 재검토 기준' : 'Sell-bias reassessment'}</dt><dd>{format(decision.plan.sellInvalidation)} {instrument.quoteCurrency} · {decision.plan.frame} {ko ? '종가 회복 시' : 'close above'}</dd></div>
      </> : <>
        <div><dt>{ko ? '매수 관심 구간' : 'Buy watch zone'}</dt><dd>{decision.plan.entry.map(format).join('–')} {instrument.quoteCurrency}</dd></div>
        <div><dt>{ko ? '목표 기준 / 매수 관점 손익비' : 'Target / long reward-risk'}</dt><dd>{format(decision.plan.target)} {instrument.quoteCurrency} · {decision.plan.rewardRisk.toFixed(2)}</dd></div>
      </>}</dl> : <p>{ko ? '확인할 가격을 정하기에는 자료가 부족해요.' : 'Insufficient structure for a price plan.'}</p>}
      </details>
      <footer><time dateTime={new Date(analyzedAt).toISOString()}>{new Date(analyzedAt).toLocaleTimeString(ko ? 'ko-KR' : 'en-US')} {ko ? '검사 기준' : 'snapshot'}</time><Link to={`/my-analysis?instrumentId=${encodeURIComponent(instrument.id)}`}>{ko ? '현재 분석 열기' : 'Open current analysis'} →</Link></footer>
    </article>)}</div>
    {shown.length > visibleCount && <button type="button" className={styles.moreResults} onClick={() => setVisibleCount(count => count + 4)}>{ko ? `코인 더 보기 (${shown.length - visibleCount}개 남음)` : `Show more coins (${shown.length - visibleCount} remaining)`}</button>}
    {expired > 0 && <details className={styles.excluded}><summary>{ko ? '이전 검사 기록 · 현재 판단에 사용하지 않음' : 'Earlier scan records · not current guidance'}</summary><ul>{results.filter(result => clock > result.expiresAt).map(result => <li key={result.instrument.id}>
      {result.instrument.symbol} · {new Date(result.analyzedAt).toLocaleTimeString(ko ? 'ko-KR' : 'en-US')} · {direction[result.decision.direction]}{' '}
      <Link to={`/my-analysis?instrumentId=${encodeURIComponent(result.instrument.id)}`}>{ko ? '현재 분석 확인' : 'Check current analysis'}</Link>
    </li>)}</ul></details>}
    {excluded.length > 0 && <details className={styles.excluded}><summary>{ko ? '데이터 부족으로 제외' : 'Excluded for insufficient data'} {excluded.length}</summary><ul>{excluded.map(result => <li key={result.instrument.id}><strong>{result.instrument.symbol}</strong> · {result.decision.frames.filter(frame => frame.issue).map(frame => `${frame.frame}: ${issue[frame.issue!]}`).join(' / ')}{result.timedOut && (ko ? ' · 제한 시간 종료' : ' · timed out')}</li>)}</ul></details>}
    </>}
    <details className={styles.note}><summary>{ko ? '검색 범위와 계산 방법' : 'Search scope and calculation'}</summary><p>{ko ? '거래대금 우선은 거래 금액이 큰 12개, 상대 강세 우선은 거래 금액 상위 48개 중 24시간 등락률이 높은 종목을 먼저 검사합니다. 가능하면 BTC 비교 표본을 포함해 최대 12개를 확인하며 스테이블코인은 제외합니다. 1시간·4시간·하루의 가격 기록으로 계산하며 수익을 보장하지 않아요. 기존 추세 기준의 손익비 필터는 구간 중간값을 쓰며 비용을 제외합니다. 전략별 기회는 별도의 비용 차감 계산을 사용합니다. 결과는 시세를 받은 뒤 90초 동안 유효해요.' : 'Liquidity scans the top 12 by turnover. Relative strength scans the top 24h movers among the 48 most liquid, including a BTC benchmark when available, up to 12 assets. Stablecoins are excluded. Direction is not a profit probability. Reward/risk filters use the buy-zone midpoint and exclude fees, taxes and slippage. Results expire 90 seconds after quote receipt.'}</p></details>
  </section>
}
