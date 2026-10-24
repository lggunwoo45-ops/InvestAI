import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useScenarios } from '@/hooks/useScenarios'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { readObservations } from '@/services/research/researchJournal'
import { cancelMonitor, readMonitor, registerMonitor, type MonitorConfig, type MonitorRule, type MonitorState, type Outcome } from '@/services/research/monitorClient'
import { reviewSource, scenarioSource, type MonitorSource } from '@/services/research/monitorSources'
import { signalLabels, type Signal } from '@/services/research/researchModel'
import styles from './ResearchPage.module.css'
import { localMonitorAvailable } from '@/services/research/monitorAvailability'
import { LocalMonitorNotice } from './LocalMonitorNotice'

const label: Record<Outcome, string> = { entry: '진입 구간 관측', target: '목표 가격 관측', stop: '손절 가격 관측', timeout: '관찰 기간 종료', expired: '진입 대기 만료', unresolved: '관측 공백·판정 불가', cancelled: '사용자 종료' }
const delivery = { off: '외부 발송 안 함', pending: '발송 대기', sent: '발송 확인', uncertain: '발송 여부 미확인 · 자동 재발송 안 함' }
const time = (at?: number | null) => at ? new Date(at).toLocaleString('ko-KR') : '아직 없음'
const number = (n?: number | null) => n == null ? '판정 불가' : n.toLocaleString('ko-KR', { maximumFractionDigits: 6 })
const venue = { upbit: 'Upbit 현물', 'binance-spot': 'Binance 현물', 'binance-futures': 'Binance USDT 선물 마크가격' }
const conditionLabel = (signal: string) => signalLabels[signal as Signal] ?? ({ buy: '매수 우세', sell: '매도 우세', neutral: '중립' } as Record<string, string>)[signal] ?? signal

function Registration({ source, ready, channel, onSaved }: { source: MonitorSource; ready: boolean; channel: boolean; onSaved: (state: MonitorState) => void }) {
  const simple = useDisplayMode().displayMode === 'simple'
  const [low, setLow] = useState(String(source.entry[0])), [high, setHigh] = useState(String(source.entry[1]))
  const [target, setTarget] = useState(source.target == null ? '' : String(source.target)), [stop, setStop] = useState(source.stop == null ? '' : String(source.stop))
  const [side, setSide] = useState<'long' | 'short'>('long'), [hours, setHours] = useState('24'), [cost, setCost] = useState('0.1'), [notify, setNotify] = useState(false)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const pending = useRef<{ body: string; id: string } | null>(null)
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    const fields = { instrument: source.instrument, source: source.source, side, entry: [Number(low), Number(high)] as [number, number], target: Number(target), stop: Number(stop), horizonHours: Number(hours), costPercent: Number(cost), notify }
    const body = JSON.stringify(fields)
    if (pending.current?.body !== body) pending.current = { body, id: crypto.randomUUID() }
    try { onSaved(await registerMonitor({ ...fields, requestId: pending.current.id })); setMessage('등록했습니다. 원래 근거와 관측 결과를 아래 기록에서 확인하세요.') }
    catch (e) { setMessage(e instanceof Error ? e.message : '등록하지 못했습니다. 다시 시도할 수 있습니다.') }
    finally { setBusy(false) }
  }
  return <form onSubmit={save} className={styles.subpanel} aria-label="서버 감시 등록">
    {simple && <h3>2. 어떤 가격이 되면 다시 확인할까요?</h3>}
    <p><b>{venue[source.instrument.venue]} · {source.instrument.asset}/{source.instrument.quote}</b><br />{simple ? '선택한 기록' : '원래 검토'}: {time(source.source.at)} · {number(source.source.price)} {source.instrument.quote}</p>
    <p>{source.source.note || '저장한 메모 없음'}</p>
    {simple && <p>진입 구간은 관심을 두고 기다릴 가격 범위예요. 목표와 손절은 이후 확인할 위·아래 가격을 뜻해요. 실제 주문은 하지 않아요.</p>}
    <div className={styles.form}>
      <label>진입 구간 하단<input required type="number" step="any" min="0.00000001" value={low} onChange={e => setLow(e.target.value)} /></label>
      <label>진입 구간 상단<input required type="number" step="any" min="0.00000001" value={high} onChange={e => setHigh(e.target.value)} /></label>
      <label>목표 가격<input required type="number" step="any" min="0.00000001" value={target} onChange={e => setTarget(e.target.value)} /></label>
      <label>손절 가격<input required type="number" step="any" min="0.00000001" value={stop} onChange={e => setStop(e.target.value)} /></label>
    </div>
    <details open={!simple || !hours || !cost || Number(hours) < 0.01 || Number(hours) > 720 || Number(cost) < 0 || Number(cost) > 10}><summary>방향·기간·비용 설정 · {side === 'long' ? '롱·매수' : '숏'} · {hours || '미입력'}시간 · 비용 {cost || '미입력'}%</summary><div className={styles.form}>
      <label>감시 방향<select value={side} disabled={source.instrument.venue !== 'binance-futures'} onChange={e => setSide(e.target.value as MonitorConfig['side'])}><option value="long">롱·매수</option><option value="short">숏</option></select></label>
      <label>대기·진입 후 각각 최대 시간<input required type="number" step="any" min="0.01" max="720" value={hours} onChange={e => setHours(e.target.value)} /></label>
      <label>왕복 수수료·슬리피지 가정 (%)<input required type="number" step="any" min="0" max="10" value={cost} onChange={e => setCost(e.target.value)} /></label>
    </div></details>
    <p>가격 단위는 {source.instrument.quote}입니다. 검토 가격은 현재가가 아니므로 진입 범위와 목표·손절을 직접 확인하세요. 비용 기본값 0.1%는 수정 가능한 가정이며 펀딩·레버리지는 반영하지 않습니다.</p>
    <label className={styles.check}><input type="checkbox" checked={notify} disabled={!channel} onChange={e => setNotify(e.target.checked)} />이 감시의 변화를 연결된 Telegram으로 보내기{!channel && ' (채널 미설정)'}</label>
    <div className={styles.actions}><button type="submit" disabled={!ready || busy}>{busy ? '등록 중…' : '이 조건으로 서버 감시 등록'}</button></div>
    <p role="status">{message}</p>
  </form>
}

function Record({ rule, enabled, onCancel }: { rule: MonitorRule; enabled: boolean; onCancel: (id: string) => Promise<void> }) {
  const simple = useDisplayMode().displayMode === 'simple'
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false)
  const c = rule.config
  return <article className={styles.monitorCard}>
    <header className={styles.actions}><h3>{c.instrument.asset}/{c.instrument.quote} · {c.side === 'long' ? '롱·매수' : '숏'}</h3><strong>{rule.result ? label[rule.result.kind] : rule.phase === 'tracking' ? '진입 관측 후 추적 중' : '진입 구간 대기'}</strong></header>
    <small>{venue[c.instrument.venue]} · 등록 {time(rule.createdAt)}</small>
    <p>진입 {number(c.entry[0])}–{number(c.entry[1])} · 목표 {number(c.target)} · 손절 {number(c.stop)} {c.instrument.quote}</p>
    <p>최근 관측: {number(rule.last?.price)} {c.instrument.quote} · 거래소 시각 {time(rule.last?.at)}</p>
    {rule.issue && <p className={styles.notice}>{rule.issue}</p>}
    {rule.result && <p><b>관측 가격 기준 비용 반영 변화율: {rule.result.netPercent === null ? '산출하지 않음' : `${number(rule.result.netPercent)}%`}</b><br /><small>실제 계좌 수익률이 아닙니다. 비용 가정 {c.costPercent}%, 펀딩·레버리지 미반영.</small></p>}
    {rule.phase !== 'closed' && (!confirm ? <button disabled={!enabled} onClick={() => setConfirm(true)}>감시 종료</button> : <div className={styles.actions}><span>조건과 결과 기록을 보관하고 종료합니다.</span><button disabled={busy || !enabled} onClick={async () => { setBusy(true); try { await onCancel(rule.id); setConfirm(false) } finally { setBusy(false) } }}>종료 확인</button><button onClick={() => setConfirm(false)}>계속 감시</button></div>)}
    <details open={!simple}><summary>등록 당시 근거·알림·결과</summary>
      <p>{c.source.kind === 'scenario' ? '저장된 시나리오' : '저장된 검토'} · {time(c.source.at)} · 당시 가격 {number(c.source.price)} {c.instrument.quote}<br />{c.source.note || '메모 없음'}<br />조건: {c.source.signals.map(conditionLabel).join(' · ') || '없음'}</p>
      {c.source.metrics && <p>당시 펀딩률 {c.source.metrics.funding === null ? '미확인' : `${number(c.source.metrics.funding * 100)}%`} · 미결제약정 {number(c.source.metrics.interest)} · 시간 변동성 {number(c.source.metrics.volatility)}%</p>}
      {c.source.positionId && <p><Link to="/portfolio">내 보유 기록</Link>에서 만든 시나리오입니다.</p>}
      <p>진입 대기 {c.horizonHours}시간, 진입 관측 후 {c.horizonHours}시간 · 대기 중 관측 공백 {rule.gaps}회</p>
      <small>등록·점검 시각은 PC, 가격 시각은 거래소 기준이어서 차이가 날 수 있습니다.</small>
      {rule.events.length ? <ol>{rule.events.map(e => <li key={e.id}><b>{label[e.kind]}</b> · {number(e.price)} {c.instrument.quote}<br /><small>{time(e.at)} · 거래소 시각 {time(e.sourceAt)} · {delivery[e.delivery.status]}</small>{e.detail && <p>{e.detail}</p>}</li>)}</ol> : <p>아직 관측 이벤트가 없습니다. 첫 시세는 기준으로만 저장하며 이후 새 시세부터 진입을 확인합니다.</p>}
      <details><summary>기록 식별정보</summary><p className={styles.digest}>근거 식별값: {rule.hash}<br />원본 버전: {c.source.revision}</p></details>
    </details>
  </article>
}

export function MonitorWorkspace({ asset }: { asset: string }) {
  return localMonitorAvailable() ? <LocalMonitorWorkspace asset={asset} /> : <LocalMonitorNotice asset={asset} />
}

function LocalMonitorWorkspace({ asset }: { asset: string }) {
  const simple = useDisplayMode().displayMode === 'simple'
  const scenarios = useScenarios(), [params] = useSearchParams()
  const reviews = useMemo(() => readObservations().filter(r => r.asset === asset), [asset])
  const sources = useMemo(() => [...scenarios.scenarios.map(scenarioSource), ...reviews.map(reviewSource)], [scenarios.scenarios, reviews])
  const [chosen, setChosen] = useState(() => params.get('scenario') ? `scenario:${params.get('scenario')}` : params.get('review') ? `review:${params.get('review')}` : '')
  const selected = sources.find(s => s.key === chosen) ?? (chosen ? undefined : sources[0])
  const [state, setState] = useState<MonitorState | null>(null), [error, setError] = useState(''), [filter, setFilter] = useState('all')
  const [registered, setRegistered] = useState(false)
  const requestVersion = useRef(0)
  useEffect(() => {
    let alive = true
    const reload = async () => {
      const version = ++requestVersion.current
      try { const result = await readMonitor(); if (alive && version === requestVersion.current) { setState(result); setError('') } }
      catch (e) { if (alive && version === requestVersion.current) setError(e instanceof Error ? e.message : '감시 연결을 확인하세요.') }
    }
    void reload(); const timer = window.setInterval(() => { void reload() }, 5000)
    return () => { alive = false; clearInterval(timer) }
  }, [])
  const apply = (next: MonitorState) => { requestVersion.current++; setState(next); setError('') }
  const stop = async (id: string) => { try { apply(await cancelMonitor(id)) } catch (e) { setError(e instanceof Error ? e.message : '종료하지 못했습니다.') } }
  const ready = !!state?.running && !error
  const exportLedger = () => {
    if (!state) return
    const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, rules: state.rules }, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'investai-monitor-ledger.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const rules = [...(state?.rules ?? [])].reverse().filter(r => filter === 'all' || (filter === 'active' ? r.phase !== 'closed' : r.phase === 'closed'))
  return <section className={[styles.panel, simple ? styles.simpleMonitor : ''].join(' ')} aria-label="서버 감시와 결과 기록">
    <span className={styles.eyebrow}>{simple ? '알림·결과' : 'REVIEW → MONITOR → RESULT'}</span><h2>{simple ? '정해둔 가격, 그 뒤는 어땠을까요?' : '검토를 감시로, 감시를 결과 기록으로'}</h2>
    <p>{simple ? '저장한 생각에 가격 조건을 붙이면, 조건에 닿았는지 이곳에서 다시 볼 수 있어요. PC와 감시 프로그램이 켜져 있어야 계속 확인할 수 있어요.' : '저장한 근거와 가격 조건을 이 PC의 감시 프로그램에 등록합니다. 브라우저를 닫아도 PC와 프로그램이 실행 중이면 감시가 이어집니다.'}</p>
    <div className={styles.monitorStatus}><b>{ready ? '감시 프로그램 연결됨' : error || state?.error ? '감시 연결·저장 상태 확인 필요' : '감시 프로그램 확인 중…'}</b>{!simple && <><span>최근 점검: {time(state?.lastCycleAt)}</span><span>Telegram: {state?.channelConfigured ? '설정됨 · 등록별 발송 선택' : '미설정'}</span></>}</div>
    {(error || state?.error) && <p role="alert" className={styles.notice}>{error || state?.error}</p>}
    <p>{simple ? '조건에 닿은 가격을 기록합니다. 실제 주문은 하지 않으며, 감시가 끊기면 결과를 판정하지 않습니다.' : '약 15초 주기로 공개 가격을 확인합니다. 진입 후 90초 이상 공백이 생기면 판정 불가로 종료합니다. 두 관측 사이의 가격 경로·실제 체결·목표와 손절의 최초 도달 순서는 보장하지 않습니다.'}</p>
    <details className={styles.registration} open={!simple || registered || !!params.get('review') || !!params.get('scenario') || !state?.rules.length}><summary>새 감시 등록</summary>
    <h3>{simple ? '1. 어떤 기록을 이어볼까요?' : '1. 저장한 근거 선택'}</h3>
    {scenarios.error && <p role="alert">시나리오 저장소를 읽지 못했습니다. 검토 기록은 별도로 선택할 수 있습니다.</p>}
    {sources.length ? <label>감시로 연결할 검토·시나리오<select value={selected?.key ?? ''} onChange={e => setChosen(e.target.value)}>{chosen && !selected && <option value="">원래 기록을 찾을 수 없습니다. 다시 선택해주세요.</option>}{sources.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label> : <p>먼저 <Link to={`/research?asset=${asset}&mode=journal`}>검토 기준을 저장</Link>하거나 <Link to="/my-analysis">종목 분석에서 시나리오를 저장</Link>하세요.</p>}
    {selected && <Registration key={`${selected.key}:${selected.source.revision}`} source={selected} ready={ready} channel={state?.channelConfigured ?? false} onSaved={next => { setRegistered(true); apply(next) }} />}
    <p><small>등록한 근거는 별도로 보관합니다. 이후 원래 시나리오를 수정·삭제하거나 일시정지해도 서버 감시에는 반영되지 않습니다. 아래에서 종료한 뒤 새 조건으로 등록하세요.</small></p>
    </details>
    <div className={styles.actions}><h3>감시·결과 기록</h3><label>기록 표시<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">전체</option><option value="active">진행 중</option><option value="closed">종료됨</option></select></label><button disabled={!state || !!error} onClick={exportLedger}>기록 파일 내려받기</button></div>
    <p>진행 중 {state?.rules.filter(r => r.phase !== 'closed').length ?? 0}/10개 · 전체 보관 {state?.rules.length ?? 0}/200개</p>
    <div className={styles.monitorList}>{rules.map(r => <Record key={r.id} rule={r} enabled={ready} onCancel={stop} />)}</div>
    {!rules.length && <p>표시할 감시 기록이 없습니다.</p>}
    <details><summary>감시 기준·보관·외부 알림 안내</summary><p>약 15초마다 가격을 확인합니다. 진입 후 90초 이상 관측 공백이 생기면 판정 불가로 종료합니다. 수집 사이의 가격 경로나 실제 체결, 목표·손절의 최초 도달 순서는 보장하지 않습니다.</p><p>이 PC의 파일에 등록 조건과 결과를 저장합니다. 다른 기기나 배포 사이트와 동기화되지 않습니다. 원래 조건은 덮어쓰지 않지만, 파일 자체는 사용자가 변경할 수 있어 외부 인증 원장이 아닙니다. Telegram은 서버 설정과 등록 시 발송 선택이 모두 필요하며, 발송 여부가 불확실한 메시지는 중복 방지를 위해 자동 재발송하지 않습니다.</p></details>
  </section>
}
