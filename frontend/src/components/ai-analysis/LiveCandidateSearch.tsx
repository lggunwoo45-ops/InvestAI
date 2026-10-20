import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { marketDataService } from '@/services/market/marketDataService'
import { upbitRelayBase } from '@/services/market/providers/upbitRelay'
import { matchesScan, scanCandidates, SCAN_LIMIT, selectScanPool, type ScanCriteria, type ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import type { MarketVenue } from '@/types/market'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import styles from './LiveCandidateSearch.module.css'

const venues = ['upbit-krw', 'upbit-btc', 'upbit-usdt', 'binance-spot', 'binance-futures'] as const
const venueLabels = ['Upbit · KRW', 'Upbit · BTC', 'Upbit · USDT', 'Binance · Spot · USDT', 'Binance · Futures · USDT']
const initialCriteria: ScanCriteria = { direction: 'all', minimumVolumeRatio: 0, minimumRewardRisk: 0, excludeExtended: false }

export function LiveCandidateSearch() {
  const { marketDataMode } = useMarketWorkspace()
  return <SearchSession key={marketDataMode} marketDataMode={marketDataMode} />
}

function SearchSession({ marketDataMode }: { marketDataMode: 'live' | 'mock' }) {
  const { language } = useLanguage()
  const ko = language === 'ko'
  const [venue, setVenue] = useState<MarketVenue>('upbit-krw')
  const [criteria, setCriteria] = useState(initialCriteria)
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
    controller.current?.abort(); setVenue(next); setStatus('idle'); setResults([]); setProgress({ completed: 0, total: 0 })
  }
  const running = status === 'loading' || status === 'scanning'
  const relayRequired = venue.startsWith('upbit-') && !upbitRelayBase()
  const start = async () => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setStatus('loading'); setResults([]); setProgress({ completed: 0, total: 0 }); setClock(Date.now())
    try {
      const catalog = await marketDataService.getMarketCatalog(venue, 'live', true, current.signal)
      if (current.signal.aborted) return
      if (catalog.source !== 'live' || !Number.isFinite(catalog.fetchedAt) || Date.now() - catalog.fetchedAt > 60_000 || catalog.fetchedAt > Date.now() + 5000) throw new Error('catalog_unavailable')
      const pool = selectScanPool(catalog.instruments, venue)
      setProgress({ completed: 0, total: pool.length }); setStatus('scanning')
      await scanCandidates(pool, { signal: current.signal, onResult: (result, completed, total) => {
        if (current.signal.aborted) return
        setResults(previous => [...previous, result]); setProgress({ completed, total }); setClock(Date.now())
      } })
      if (!current.signal.aborted) setStatus('done')
    } catch { if (!current.signal.aborted) setStatus('error') }
  }
  const cancel = () => { controller.current?.abort(); setStatus('cancelled') }
  const direction = ko ? { buy: '매수 우세', sell: '매도 우세', neutral: '중립', unavailable: '분석 제외' } : { buy: 'Buy-side strength', sell: 'Sell-side strength', neutral: 'Neutral', unavailable: 'Excluded' }
  const issue = ko ? { loading: '시세 준비 지연', mock: '모의 데이터', disconnected: '연결 지연', stale: '시세 갱신 지연', history: '완료 봉 부족', gaps: '원본 봉 공백', range: '변동 범위 부족' } : { loading: 'Awaiting quotes', mock: 'Mock data', disconnected: 'Disconnected', stale: 'Stale data', history: 'Too few closed bars', gaps: 'Source candle gap', range: 'Insufficient range' }
  const shown = results.filter(result => matchesScan(result, criteria, clock)).sort((a, b) => b.instrument.volume24h - a.instrument.volume24h)
  const excluded = results.filter(result => result.decision.direction === 'unavailable')
  const expired = results.filter(result => clock > result.expiresAt).length
  const format = (value: number) => formatAnalysisPrice(value, language)
  return <section className={styles.panel} aria-label={ko ? '실시간 조건 검색' : 'Live condition search'}>
    <header><div><span>LIVE MARKET SCAN</span><h1>{ko ? 'AI 탐색' : 'AI Explore'}</h1><p>{ko ? `선택한 시장의 거래대금 상위 ${SCAN_LIMIT}개를 실제 1시간·4시간·일봉으로 검사합니다. 검색 버튼을 눌렀을 때만 데이터를 조회합니다.` : `Inspect the top ${SCAN_LIMIT} assets by turnover in one market using real 1h, 4h and daily candles. Scans run only when requested.`}</p></div><strong>{ko ? '실제 데이터 · 규칙 기반' : 'Real data · rule based'}</strong></header>
    <div className={styles.controls}>
      <label>{ko ? '거래소·마켓' : 'Venue'}<select value={venue} disabled={running} onChange={event => changeVenue(event.target.value as MarketVenue)}>{venues.map((value, index) => <option key={value} value={value}>{venueLabels[index]}</option>)}</select></label>
      <label>{ko ? '방향' : 'Direction'}<select value={criteria.direction} onChange={event => setCriteria({ ...criteria, direction: event.target.value as ScanCriteria['direction'] })}><option value="all">{ko ? '전체' : 'All'}</option>{(['buy', 'sell', 'neutral'] as const).map(value => <option key={value} value={value}>{direction[value]}</option>)}</select></label>
      <label>{ko ? '거래량 확인' : 'Volume ratio'}<select value={criteria.minimumVolumeRatio} onChange={event => setCriteria({ ...criteria, minimumVolumeRatio: Number(event.target.value) })}><option value="0">{ko ? '제한 없음' : 'Any'}</option><option value="1">{ko ? '평균 이상' : 'At least average'}</option><option value="1.5">{ko ? '평균의 1.5배 이상' : 'At least 1.5× average'}</option></select></label>
      <label className={styles.check}><input type="checkbox" checked={criteria.minimumRewardRisk > 0} onChange={event => setCriteria({ ...criteria, minimumRewardRisk: event.target.checked ? 1.5 : 0 })} />{ko ? '손익비 1.5 이상' : 'Reward/risk ≥ 1.5'}</label>
      <label className={styles.check}><input type="checkbox" checked={criteria.excludeExtended} onChange={event => setCriteria({ ...criteria, excludeExtended: event.target.checked })} />{ko ? '과열 주의 제외' : 'Exclude extended moves'}</label>
      {running ? <button type="button" onClick={cancel}>{ko ? '검색 중지' : 'Stop scan'}</button> : <button type="button" disabled={marketDataMode !== 'live' || relayRequired} onClick={() => { void start() }}>{ko ? '실제 데이터로 검색' : 'Scan live data'}</button>}
    </div>
    {marketDataMode !== 'live' && <p role="status">{ko ? '실시간 데이터 모드에서 검색할 수 있습니다.' : 'Switch to live market data to scan.'}</p>}
    {relayRequired && <p role="status">{ko ? '빠른 시세 서버 연결이 필요한 기능입니다. 일반 종목 분석은 계속 사용할 수 있습니다.' : 'This scan requires the market relay. Individual analysis remains available.'}</p>}
    <div className={styles.progress} role="status" aria-live="polite">
      {status === 'idle' ? (ko ? '검색 조건을 선택한 뒤 시작하세요.' : 'Choose your filters and start a scan.')
        : status === 'loading' ? (ko ? '최신 종목 목록을 가져오는 중…' : 'Loading the current catalog…')
          : status === 'error' ? (ko ? '목록을 가져오지 못했습니다. 다시 검색해주세요.' : 'Catalog unavailable. Try again.')
            : `${ko ? status === 'scanning' ? '검사 중' : status === 'cancelled' ? '검색 중지됨' : '검사 완료' : status === 'scanning' ? 'Scanning' : status === 'cancelled' ? 'Stopped' : 'Complete'} ${progress.completed}/${progress.total} · ${shown.length} ${ko ? '개 조건 일치' : 'matches'}`}
      {running && progress.total > 0 && <progress max={progress.total} value={progress.completed} />}
    </div>
    {expired > 0 && <p className={styles.notice}>{ko ? `${expired}개 결과의 시세 확인 시간이 지나 가격 표시에서 제외했습니다. 다시 검색해주세요.` : `${expired} results have expired. Rescan for current price criteria.`}</p>}
    {status === 'done' && shown.length === 0 && expired === 0 && <p>{ko ? '현재 조건에 맞는 종목이 없습니다. 필터를 완화하거나 제외 사유를 확인하세요.' : 'No assets match. Adjust the filters or review the excluded results.'}</p>}
    <div className={styles.results}>{shown.map(({ instrument, decision, analyzedAt }) => <article key={instrument.id}>
      <div className={styles.resultHead}><div><h2>{instrument.displaySymbol ?? instrument.symbol}</h2><small>{instrument.koreanName && ko ? instrument.koreanName : instrument.name}</small></div><strong data-direction={decision.direction}>{direction[decision.direction]}</strong></div>
      <p>{ko ? '시간대 확인' : 'Timeframe coverage'} {decision.coverage}/3 · {decision.frames.filter(frame => !frame.issue).map(frame => `${frame.frame} ${direction[frame.direction]}`).join(' · ')}</p>
      {decision.plan ? <dl>{decision.direction === 'sell' ? <>
        <div><dt>{ko ? '반등 저항 구간' : 'Rebound resistance'}</dt><dd>{decision.plan.resistance.map(format).join('–')} {instrument.quoteCurrency}</dd></div>
        <div><dt>{ko ? '매도 우세 재검토 기준' : 'Sell-bias reassessment'}</dt><dd>{format(decision.plan.sellInvalidation)} {instrument.quoteCurrency} · {decision.plan.frame} {ko ? '종가 회복 시' : 'close above'}</dd></div>
      </> : <>
        <div><dt>{ko ? '매수 관심 구간' : 'Buy watch zone'}</dt><dd>{decision.plan.entry.map(format).join('–')} {instrument.quoteCurrency}</dd></div>
        <div><dt>{ko ? '목표 기준 / 매수 관점 손익비' : 'Target / long reward-risk'}</dt><dd>{format(decision.plan.target)} {instrument.quoteCurrency} · {decision.plan.rewardRisk.toFixed(2)}</dd></div>
      </>}</dl> : <p>{ko ? '가격 구간을 산출할 구조가 충분하지 않습니다.' : 'Insufficient structure for a price plan.'}</p>}
      <footer><time dateTime={new Date(analyzedAt).toISOString()}>{new Date(analyzedAt).toLocaleTimeString(ko ? 'ko-KR' : 'en-US')} {ko ? '검사 기준' : 'snapshot'}</time><Link to={`/my-analysis?instrumentId=${encodeURIComponent(instrument.id)}`}>{ko ? '현재 분석 열기' : 'Open current analysis'} →</Link></footer>
    </article>)}</div>
    {expired > 0 && <details className={styles.excluded}><summary>{ko ? '이전 검사 기록 · 현재 판단에 사용하지 않음' : 'Earlier scan records · not current guidance'}</summary><ul>{results.filter(result => clock > result.expiresAt).map(result => <li key={result.instrument.id}>
      {result.instrument.symbol} · {new Date(result.analyzedAt).toLocaleTimeString(ko ? 'ko-KR' : 'en-US')} · {direction[result.decision.direction]}{' '}
      <Link to={`/my-analysis?instrumentId=${encodeURIComponent(result.instrument.id)}`}>{ko ? '현재 분석 확인' : 'Check current analysis'}</Link>
    </li>)}</ul></details>}
    {excluded.length > 0 && <details className={styles.excluded}><summary>{ko ? '데이터 부족으로 제외' : 'Excluded for insufficient data'} {excluded.length}</summary><ul>{excluded.map(result => <li key={result.instrument.id}><strong>{result.instrument.symbol}</strong> · {result.decision.frames.filter(frame => frame.issue).map(frame => `${frame.frame}: ${issue[frame.issue!]}`).join(' / ')}{result.timedOut && (ko ? ' · 제한 시간 종료' : ' · timed out')}</li>)}</ul></details>}
    <small className={styles.note}>{ko ? '선택 시장 상위 12개만 검색하며 전체 상장 종목 전수 검사가 아닙니다. 우세는 수익 확률이 아닙니다. 손익비 필터는 매수 관심 구간 중간값 기준이며 수수료·세금·슬리피지는 제외합니다. 검색 결과는 수신 시점부터 90초 동안 유효합니다.' : 'Search covers the top 12 in the selected venue, not every listed asset. Direction is not a profit probability. Reward/risk filters use the buy-zone midpoint and exclude fees, taxes and slippage. Results expire 90 seconds after quote receipt.'}</small>
  </section>
}
