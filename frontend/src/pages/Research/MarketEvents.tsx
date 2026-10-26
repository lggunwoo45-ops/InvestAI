import { useCallback, useEffect, useState } from 'react'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { researchNow } from '@/services/research/researchClock'
import { economicSourceLinks, nyFedCalendarLink, fetchEconomicCalendar, fetchLiquidations, simpleCalendarTitles, upcomingEvents, type EconomicEvent } from '@/services/research/marketEvents'
import styles from './MarketEvents.module.css'

const money = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const kst = (at: number) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(at)
const shortTime = (at: number) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(at)
function eventTime(event: EconomicEvent) { return event.at !== null ? `${kst(event.at)} · 한국 시간` : `${event.date}${event.endDate !== event.date ? ` ~ ${event.endDate}` : ''} · 미국 동부 회의일` }

function usePublicFeed<T extends object>(loader: (signal: AbortSignal) => Promise<T>, interval: number) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0)
  const [, tick] = useState(0)
  useEffect(() => {
    const clock = window.setInterval(() => tick(n => n + 1), 5000)
    return () => window.clearInterval(clock)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>, busy = false
    const load = async () => {
      if (busy || controller.signal.aborted) return
      clearTimeout(timer); busy = true; setLoading(true)
      try { const value = await loader(controller.signal); if (!controller.signal.aborted) { setData(value); setError('') } }
      catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '자료를 불러오지 못했습니다.') }
      finally { busy = false; if (!controller.signal.aborted) { setLoading(false); timer = setTimeout(() => { if (document.visibilityState === 'visible') void load() }, interval) } }
    }
    const visible = () => { if (document.visibilityState === 'visible') void load() }
    void load(); document.addEventListener('visibilitychange', visible)
    return () => { controller.abort(); clearTimeout(timer); document.removeEventListener('visibilitychange', visible) }
  }, [loader, interval, revision])
  return { data, error, loading, refresh: () => setRevision(n => n + 1) }
}

export function LiquidationPanel({ asset }: { asset: string }) {
  const simple = useDisplayMode().displayMode === 'simple'
  const loader = useCallback((signal: AbortSignal) => fetchLiquidations(asset, signal), [asset])
  const { data, error, loading, refresh } = usePublicFeed(loader, 10_000)
  const [minutes, setMinutes] = useState(5)
  const now = researchNow(data), aged = !!data && now - data.fetchedAt > 30_000
  const live = !!data && !error && !aged && data.status === 'live' && data.lastMessageAt !== null && now - data.lastMessageAt <= 60_000
  const window = data?.windows.find(w => w.minutes === minutes), observed = data?.startedAt !== null && data?.startedAt !== undefined
  const status = error || aged || data?.status === 'disconnected' ? '연결 확인 필요' : live ? '관측 중' : '연결 준비 중'
  return <section className={styles.panel} aria-labelledby="liquidation-title">
    <header className={styles.header}><div><span className={styles.eyebrow}>BYBIT · {asset} / USDT</span><h2 id="liquidation-title">{simple ? '강제로 끝난 선물 거래가 있나요?' : '실시간 청산 관측'}</h2></div><span className={live ? styles.live : styles.waiting}>{status}</span></header>
    <p className={styles.intro}>{simple ? '맡긴 돈이 부족해 거래소가 포지션을 강제로 정리한 기록이에요. 상승에 건 롱과 하락에 건 숏을 나눠 볼 수 있어요.' : 'Bybit USDT 선형 선물 공개 스트림 · 서버에서 받은 청산 기록을 10초마다 갱신합니다.'}</p>
    {error && <p role="status" className={styles.notice}>{error}</p>}
    <div className={styles.toolbar}><div className={styles.segments} role="group" aria-label="청산 관측 구간">{[1, 5, 15].map(n => <button key={n} aria-pressed={n === minutes} onClick={() => setMinutes(n)}>최근 {n}분</button>)}</div><button disabled={loading} onClick={refresh}>청산 다시 확인</button></div>
    {!observed || !window ? <div className={styles.empty}><strong>{error ? '청산 기록을 확인할 수 없어요' : '거래소 연결을 확인하고 있어요'}</strong><p>연결이 확인되면 관측한 기록을 표시합니다.</p></div> : <>
      {!live && <p className={styles.notice}>실시간 연결을 확인할 수 없습니다. 아래는 {kst(data.fetchedAt)}에 확인한 과거 관측 기록입니다.</p>}
      {(!window.complete || !live) && <p className={styles.notice}>일부 구간만 관측했어요. 수집 시작·연결 공백 때문에 최근 {minutes}분 전체를 포함하지 않을 수 있습니다.</p>}
      {simple ? <div className={styles.story}><div className={styles.total}><span>최근 {minutes}분 동안 관측한 {asset} 청산</span><strong>{money(window.long + window.short)} <small>USDT</small></strong><span>{window.count.toLocaleString('ko-KR')}건 · 파산가격으로 환산한 규모</span></div><div className={styles.sides}><article><span>상승에 건 거래 · 롱</span><strong>{money(window.long)} USDT</strong></article><article><span>하락에 건 거래 · 숏</span><strong>{money(window.short)} USDT</strong></article></div><p>{window.count === 0 ? '이 관측 구간에 받은 기록이 없어요. 시장 전체에서 청산이 없었다는 뜻은 아니에요.' : '거래가 강제로 정리된 규모예요. 다음 가격 방향이나 매수·매도 시점을 알려주는 신호는 아니에요.'}</p></div> : <>
        <div className={styles.stats}><article><span>롱 청산 환산액</span><strong>{money(window.long)} USDT</strong></article><article><span>숏 청산 환산액</span><strong>{money(window.short)} USDT</strong></article><article><span>관측 건수</span><strong>{window.count}건</strong></article></div>
        <div className={styles.tableWrap}><table><caption>최근 {minutes}분 관측 기록 · 최대 50건 · 시각은 한국 시간</caption><thead><tr><th>시각</th><th>청산 방향</th><th>수량 ({asset})</th><th>파산가격 (USDT)</th><th>환산액 (USDT)</th></tr></thead><tbody>{data.events.filter(e => e.at > data.fetchedAt - minutes * 60_000).map(e => <tr key={e.id}><td>{shortTime(e.at)}</td><td>{e.side === 'long' ? '롱' : '숏'}</td><td>{money(e.size)}</td><td>{money(e.bankruptcyPrice)}</td><td>{money(e.notional)}</td></tr>)}</tbody></table>{!window.count && <p className={styles.empty}>선택한 구간에 수신한 청산 기록이 없습니다.</p>}</div>
        <p className={styles.caption}>수집 시작 {data.startedAt !== null ? kst(data.startedAt) : '미확인'} · 연속 연결 {data.continuousSince !== null ? kst(data.continuousSince) : '끊김'} · 재연결 {data.reconnects}회</p>
      </>}
    </>}
    <footer className={styles.caption}>Bybit 한 거래소의 관측값입니다. 금액은 수량 × 파산가격이며 실제 체결금액과 다를 수 있습니다. 최대 15분 보관하며 서버 재시작 전 기록은 복원하지 않습니다. <a href="https://bybit-exchange.github.io/docs/v5/websocket/public/all-liquidation" target="_blank" rel="noreferrer">데이터 기준</a></footer>
  </section>
}

export function EconomicCalendarPanel() {
  const simple = useDisplayMode().displayMode === 'simple'
  const loader = useCallback((signal: AbortSignal) => fetchEconomicCalendar(signal), [])
  const { data, error, loading, refresh } = usePublicFeed(loader, 60_000)
  const [days, setDays] = useState(30), [source, setSource] = useState('all'), [expanded, setExpanded] = useState(false)
  const now = researchNow(data), aged = !!data && now - data.fetchedAt > 120_000
  const events = data ? upcomingEvents(data, now, simple ? 30 : days, simple ? 'all' : source).filter(e => !simple || e.source === 'fed' || simpleCalendarTitles.has(e.originalTitle)) : []
  const stale = !!error || aged || data?.sources.some(s => s.status !== 'available')
  const saved = data?.sources.find(s => s.via === 'nyfed')
  const coverageDate = saved?.coverageEnd ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' }).format(saved.coverageEnd) : null
  return <section className={styles.panel} aria-labelledby="calendar-title">
    <header className={styles.header}><div><span className={styles.eyebrow}>OFFICIAL CALENDAR · 미국 경제</span><h2 id="calendar-title">{simple ? '다가오는 경제 일정을 확인하세요' : '주요 경제 일정'}</h2></div><button disabled={loading} onClick={refresh}>일정 다시 확인</button></header>
    <p className={styles.intro}>{simple ? '주요 물가·고용 발표와 미국 금리 회의를 모았어요. 앞으로 30일 중 가까운 일정부터 보여드려요.' : 'BLS 발표 일정과 FOMC 회의 일정 · 발표 시각은 한국 시간(KST), 회의일은 미국 동부 기준입니다.'}</p>
    {saved && <p className={styles.caption}>물가·고용 일정은 <a href={nyFedCalendarLink} target="_blank" rel="noreferrer">뉴욕 연준 경제 일정</a>에 게시된 BLS 주요 7종을 기준으로 합니다. {coverageDate}까지 공개된 월별 일정을 확인했으며, 이후 일정은 아직 포함하지 않습니다.</p>}
    {error && <p role="status" className={styles.notice}>{error}</p>}
    {data && stale && <p className={styles.notice}>일부 일정의 최신 상태를 확인하지 못했습니다. 마지막 확인 자료는 변경됐을 수 있으니 공식 일정을 확인해주세요.</p>}
    {!simple && <div className={styles.toolbar}><label>조회 기간 <select value={days} onChange={e => setDays(Number(e.target.value))}><option value={7}>앞으로 7일</option><option value={30}>앞으로 30일</option><option value={90}>앞으로 90일</option></select></label><label>발표 기관 <select value={source} onChange={e => setSource(e.target.value)}><option value="all">전체 기관</option><option value="bls">BLS · 물가·고용</option><option value="fed">FOMC · 금리 회의</option></select></label></div>}
    {!data ? <p className={styles.empty}>{loading ? '공식 일정을 불러오고 있어요.' : '공식 일정을 확인할 수 없습니다.'}</p> : !events.length ? <p className={styles.empty}>{data.sources.some(s => s.status === 'unavailable') ? '불러오지 못한 기관이 있어 일정이 비어 있을 수 있습니다.' : '선택한 기간에 공식 자료에서 확인된 일정이 없습니다.'}</p> : simple ? <><ol className={styles.agenda}>{events.slice(0, expanded ? 50 : 3).map(e => <li key={e.id}><span className={styles.sourceTag}>{e.source === 'fed' ? '금리 회의' : '물가·고용'}{data.sources.find(s => s.id === e.source)?.status === 'stale' ? ' · 이전 자료' : ''}</span><h3>{e.title}</h3><p>{eventTime(e)}</p>{e.at === null && <small>발표 시각은 공식 일정에 제공되지 않았어요.</small>}</li>)}</ol>{events.length > 3 && <button onClick={() => setExpanded(v => !v)}>{expanded ? '가까운 일정만 보기' : `30일 일정 ${events.length}개 보기`}</button>}</> : <div className={styles.tableWrap}><table><caption>예정된 발표·회의 · 일정은 변경될 수 있습니다</caption><thead><tr><th>일시</th><th>일정</th><th>기관</th></tr></thead><tbody>{events.map(e => <tr key={e.id}><td>{eventTime(e)}{e.at === null && <small className={styles.block}>발표 시각 미제공</small>}</td><td>{e.title}</td><td>{e.source === 'fed' ? 'FOMC' : 'BLS'}{data.sources.find(s => s.id === e.source)?.status === 'stale' && ' · 이전 자료'}</td></tr>)}</tbody></table></div>}
    <footer className={styles.caption}><p>{saved ? '뉴욕 연준 일정은 6시간마다 수집을 시도하며, FOMC는 한 시간마다 확인합니다.' : '공식 자료를 한 시간마다 확인합니다.'} BLS·FOMC 이외 기관의 일정, 예상치·발표값은 포함하지 않습니다.</p><div className={styles.sources}>{(['bls', 'fed'] as const).map(id => { const item = data?.sources.find(s => s.id === id); return <span key={id}><a href={item?.via === 'nyfed' ? nyFedCalendarLink : economicSourceLinks[id]} target="_blank" rel="noreferrer">{id === 'bls' ? item?.via === 'nyfed' ? 'BLS · 뉴욕 연준 경유' : 'BLS 공식 일정' : 'FOMC 공식 일정'}</a> · {item?.status === 'unavailable' ? '불러오기 실패' : item?.fetchedAt ? `${kst(item.fetchedAt)} ${item.via ? '수집' : '확인'}${item.status === 'stale' ? ' · 이전 자료' : ''}` : '확인 중'}</span> })}</div></footer>
  </section>
}
