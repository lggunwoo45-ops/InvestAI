import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cloudSignedIn } from '@/services/cloud/cloudClient'
import { localMonitorAvailable } from '@/services/research/monitorAvailability'
import { readMonitor, registerSignalWatch, stopSignalWatch, type MonitorState, type SignalWatch } from '@/services/research/monitorClient'
import { hasDerivativeFilters, timeframes, type ExplorerConfig, validExplorerConfig } from '@/services/research/signalExplorer'
import { summarizeTrial } from '@/services/research/forwardTrial'
import styles from './ResearchRecords.module.css'
const stamp = (n: number) => new Date(n).toLocaleString('ko-KR')
const pct = (n: number | null) => n === null ? '—' : `${n.toFixed(2)}%`
export function ForwardTrialPanel(props: { asset: string; config?: ExplorerConfig; ledger?: boolean }) {
  return localMonitorAvailable() ? <TrialPanel {...props} /> : <section className={`${styles.records} ${styles.card}`}><h3>조건을 고정하고 앞으로 검증하기</h3><p>공개 사이트에서는 로그인 후 서버에 검증을 등록할 수 있어요. PC용에서는 감시 프로그램이 실행 중이어야 합니다.</p></section>
}
function TrialPanel({ asset, config, ledger = false }: { asset: string; config?: ExplorerConfig; ledger?: boolean }) {
  const [state, setState] = useState<MonitorState | null>(null), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const [days, setDays] = useState<7 | 30 | 90>(30), [cost, setCost] = useState(String(config?.cost ?? .2)), [name, setName] = useState('')
  const request = useRef<{ key: string; id: string } | null>(null), sequence = useRef(0)
  useEffect(() => { let alive = true; const load = async () => { const n = ++sequence.current; try { const v = await readMonitor(); if (alive && n === sequence.current) { setState(v); setError('') } } catch (e) { if (alive && n === sequence.current) setError(String(e)) } }; void load(); const timer = setInterval(load, 15000); return () => { alive = false; clearInterval(timer) } }, [])
  const apply = (v: MonitorState) => { sequence.current++; setState(v); setError('') }
  const ready = !!state?.running && !state.error && !error, fixedCost = cost.trim() ? Number(cost) : NaN
  const enoughTime = !config || (config.horizon + 2) * timeframes[config.timeframe] < days * 86400000
  const start = async () => {
    if (!config || !ready || !enoughTime) return
    const fields = { asset, name: name.trim() || `${asset} 미래 검증`, config: { ...config, bars: 1000 as const, cost: fixedCost }, notify: false, purpose: 'validation' as const, holdingSide: null, trialDays: days }
    const key = JSON.stringify(fields); if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() }
    setBusy(true); setMessage('')
    try { apply(await registerSignalWatch({ ...fields, requestId: request.current.id })); request.current = null; setMessage('조건과 비용을 고정했어요. 첫 조회 이후 새로 완료되는 봉부터 관측합니다.') } catch (e) { setMessage(e instanceof Error ? e.message : '등록하지 못했습니다.') } finally { setBusy(false) }
  }
  const download = (rule: SignalWatch) => { const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 'forward-report-1', exportedAt: state?.now, rule, summary: summarizeTrial(rule) }, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `investai-${rule.config.asset}-forward.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  const rules = (state?.signals ?? []).filter(r => r.config.purpose === 'validation' && (ledger || r.config.asset === asset))
  return <section className={`${styles.records} ${styles.card}`} aria-label="조건 고정 미래 검증"><h3>조건을 고정하고 앞으로 검증하기</h3><p>{cloudSignedIn() ? '서버가 화면을 닫아도 관측합니다.' : '이 PC와 감시 프로그램이 켜져 있는 동안 관측합니다.'} 등록 전 과거 결과와 분리하며, 등록한 조건은 수정할 수 없습니다. 바꾸려면 별도 검증으로 등록하세요.</p>
    <p>실시간 조건 계산에는 최근 1,000봉을 사용합니다. 과거 비교에서 선택한 조회 범위와 별도이며, 신호·기간·방향·가격 폭은 현재 선택을 이어받습니다.</p>
    {config && <><label>검증 이름<input value={name} maxLength={60} placeholder={`${asset} 미래 검증`} onChange={e => setName(e.target.value)} /></label><label>앞으로 관측할 기간<select value={days} onChange={e => setDays(Number(e.target.value) as 7 | 30 | 90)}><option value={7}>7일</option><option value={30}>30일</option><option value={90}>90일</option></select></label><label>미래 검증의 고정 왕복 비용 (%)<input type="number" min="0" max="10" step="0.01" value={cost} onChange={e => setCost(e.target.value)} /></label><p>현재 선택한 {config.timeframe} 조건 · {config.side === 'long' ? '상승' : '하락'} 방향 · 가격 폭 {config.target}% · 관찰 {config.horizon}봉. 미래 검증은 위 고정 비용을 차감하며 실제 펀딩 정산·레버리지·강제 청산은 포함하지 않습니다.</p><button disabled={!ready || busy || !enoughTime || !validExplorerConfig({ ...config, cost: fixedCost }) || hasDerivativeFilters(config) && !state?.derivativeSignalsAvailable} onClick={() => void start()}>조건 고정하고 미래 검증 시작</button></>}
    {!enoughTime && <p role="alert">한 사례를 끝까지 관찰하려면 더 긴 검증 기간이 필요해요. 30·90일을 고르거나 관찰 봉 수를 줄여주세요.</p>}{error && <p role="alert">{error}</p>}{state?.error && <p role="alert">{state.error}</p>}{message && <p role="status">{message}</p>}
    {rules.length === 0 && <p>시작한 미래 검증이 없습니다. 결과를 미리 채우지 않고 실제 새 관측을 기다립니다.</p>}
    <ol className={styles.list}>{[...rules].reverse().map(rule => { const s = summarizeTrial(rule); return <li key={rule.id}><h3>{rule.config.name} · {rule.active ? '관측 중' : rule.endReason === 'period' ? '기간 종료' : rule.endReason === 'limit' ? '100건 보관 완료' : '중간 종료'}</h3><p>{rule.config.asset} · 시작 {stamp(rule.createdAt)} · 예정 종료 {stamp(s.end)}</p><p>마지막 확인 {rule.checkedAt ? stamp(rule.checkedAt) : '첫 조회 대기'} · 고정 왕복 비용 {rule.config.config.cost}%</p><div className={styles.metrics}><div><span>완료된 새 사례</span><b>{s.samples}건</b></div><div><span>비용 차감 후 평균 변화</span><b>{s.meanLow === s.meanHigh ? pct(s.meanLow) : `${pct(s.meanLow)} ~ ${pct(s.meanHigh)}`}</b></div><div><span>진행 중 / 제외</span><b>{s.pending} / {s.excluded}건</b></div></div><p>{s.samples < 30 ? '새 사례가 적어 아직 판단하기 어렵습니다.' : '완료된 새 사례의 평균이며 앞으로의 수익 확률이나 계좌 수익률이 아닙니다.'} 양쪽 가격에 같은 봉에서 닿은 {s.ambiguous}건은 손실~이익 범위로 포함합니다.</p>{rule.issue && <p>{rule.issue}</p>}<details><summary>고정 조건과 기록 근거</summary><p>{rule.config.config.signals.join(' + ')} · {rule.config.config.timeframe} · {rule.config.config.horizon}봉 · 목표 폭 {rule.config.config.target}% · {rule.config.config.side}</p><small>원본 조건 식별값 {rule.hash}</small><p>관찰 기간은 겹치지 않으며 최대 100건 보관합니다. 수집 공백과 중간 종료로 미완료된 결과는 성과에 넣지 않습니다. 일부만 관측했을 수 있으므로 전체 기간의 모든 신호를 뜻하지 않습니다.</p></details><div className={styles.actions}><button onClick={() => download(rule)}>미래 검증 기록 내려받기</button>{rule.active && <button disabled={!ready || busy} onClick={async () => { setBusy(true); try { apply(await stopSignalWatch(rule.id)) } catch (e) { setMessage(String(e)) } finally { setBusy(false) } }}>이 미래 검증 종료</button>}</div></li> })}</ol>
    {!ledger && <Link to={`/research?asset=${asset}&mode=alerts`}>모든 미래 검증 기록 보기 →</Link>}
  </section>
}
