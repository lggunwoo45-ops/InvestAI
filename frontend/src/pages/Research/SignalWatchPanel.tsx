import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { explorerSignals, validExplorerConfig, type ExplorerConfig } from '@/services/research/signalExplorer'
import { readMonitor, registerSignalWatch, stopSignalWatch, type MonitorState, type SignalWatchConfig } from '@/services/research/monitorClient'
import styles from './SignalExplorer.module.css'
import { localMonitorAvailable } from '@/services/research/monitorAvailability'
import { LocalMonitorNotice } from './LocalMonitorNotice'
const labels = { pending: '다음 봉 대기', entered: '이후 가격 관찰 중', up: '상단 먼저 도달', down: '하단 먼저 도달', timeout: '기간 종료', ambiguous: '양쪽 도달·순서 불명', unresolved: '자료 공백·판정 불가', cancelled: '감시 종료' }
const delivery = { off: '외부 발송 안 함', pending: '발송 대기', sent: '발송 확인', uncertain: '발송 여부 미확인' }
export function SignalWatchPanel({ asset, config, name, ledger = false }: { asset: string; config?: ExplorerConfig; name?: string; ledger?: boolean }) {
  return localMonitorAvailable() ? <LocalSignalWatchPanel asset={asset} config={config} name={name} ledger={ledger} /> : <LocalMonitorNotice kind="signals" asset={asset} />
}

function LocalSignalWatchPanel({ asset, config, name, ledger = false }: { asset: string; config?: ExplorerConfig; name?: string; ledger?: boolean }) {
  const [state, setState] = useState<MonitorState | null>(null), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const [notify, setNotify] = useState(false), [purpose, setPurpose] = useState<'opportunity' | 'opposition'>('opportunity'), [holdingSide, setHoldingSide] = useState<'long' | 'short'>('long')
  const request = useRef<{ body: string; id: string } | null>(null), version = useRef(0)
  useEffect(() => {
    let alive = true
    const load = async () => { const n = ++version.current; try { const next = await readMonitor(); if (alive && n === version.current) { setState(next); setError('') } } catch (e) { if (alive && n === version.current) setError(e instanceof Error ? e.message : '감시 연결을 확인해주세요.') } }
    void load(); const timer = setInterval(load, 15000)
    return () => { alive = false; clearInterval(timer) }
  }, [])
  const apply = (next: MonitorState) => { version.current++; setState(next); setError('') }
  const ready = !!state?.running && !state.error && !error
  const save = async () => {
    if (!config || !validExplorerConfig(config)) return
    setBusy(true); setMessage('')
    const fields = { asset, config, name: name?.trim() || `${asset} ${config.timeframe} 신호 조합`, notify, purpose, holdingSide: purpose === 'opposition' ? holdingSide : null }
    const body = JSON.stringify(fields)
    if (request.current?.body !== body) request.current = { body, id: crypto.randomUUID() }
    try { apply(await registerSignalWatch({ ...fields, requestId: request.current.id } as SignalWatchConfig)); setMessage('신호 감시를 등록했어요. 첫 조회를 기준으로 잡고, 이후 새로 충족된 조건부터 기록합니다.') } catch (e) { setMessage(e instanceof Error ? e.message : '등록하지 못했습니다.') } finally { setBusy(false) }
  }
  const rules = (state?.signals ?? []).filter(r => ledger || r.config.asset === asset)
  return <section className={styles.signalWatch} aria-label="신호 감시와 관측 결과">
    <h3>{ledger ? '저장한 신호, 이후에는 어떻게 됐을까요?' : '다시 나타나면 알려주세요'}</h3>
    <p>PC와 감시 프로그램이 켜져 있는 동안 완료된 봉을 확인합니다. 같은 조건이 계속 유지될 때는 반복 기록하지 않아요.</p>
    {error && <p className={styles.watchError}>{error}</p>}{state?.error && <p className={styles.watchError}>{state.error}</p>}
    {config && <><label>감시 목적<select value={purpose} onChange={e => setPurpose(e.target.value as 'opportunity' | 'opposition')}><option value="opportunity">시장 조건이 새로 나타날 때</option><option value="opposition">내 보유 방향의 반대 신호</option></select></label>{purpose === 'opposition' && <label>내가 입력한 보유 방향<select value={holdingSide} onChange={e => setHoldingSide(e.target.value as 'long' | 'short')}><option value="long">롱·매수</option><option value="short">숏</option></select></label>}<label className={styles.notify}><input type="checkbox" checked={notify} disabled={!state?.channelConfigured} onChange={e => setNotify(e.target.checked)} />Telegram으로도 받기{!state?.channelConfigured && ' · 채널 미설정'}</label><button className={styles.primary} disabled={!ready || busy || !validExplorerConfig(config)} onClick={save}>{busy ? '등록 중…' : '선택한 신호 감시 시작'}</button></>}
    {message && <p role="status">{message}</p>}
    {ledger && <><div className={styles.watchSummary}><div><b>{rules.filter(r => r.active).length}</b><span>감시 중</span></div><div><b>{rules.reduce((n, r) => n + r.events.length, 0)}</b><span>발생한 신호</span></div><div><b>{rules.reduce((n, r) => n + r.events.filter(e => !['pending', 'entered'].includes(e.outcome)).length, 0)}</b><span>종료된 관찰</span></div></div>
      {!rules.length && <p>아직 등록한 신호가 없어요. <Link to={`/research?asset=${asset}&mode=setups`}>신호 탐색에서 조건을 고르고 감시를 시작</Link>하세요.</p>}
      {[...rules].reverse().map(rule => <article key={rule.id} className={styles.watchRule}><header><div><b>{rule.config.name}</b><p>{rule.config.asset} · {rule.config.config.timeframe} · {rule.config.purpose === 'opposition' ? `${rule.config.positionRef ? '연결 포지션의' : '입력한'} ${rule.config.holdingSide} 보유 방향의 반대 신호` : '시장 조건 감시'}</p></div><span>{rule.active ? '감시 중' : '종료됨'}</span></header><p>{rule.config.config.signals.map(id => explorerSignals.find(s => s.id === id)?.name ?? id).join(' + ')}</p><small>최근 완료 봉: {rule.lastAt ? new Date(rule.lastAt).toLocaleString('ko-KR') : '첫 조회 대기'} · {rule.matched ? '조건 충족 유지 중' : '조건 대기'}</small>{rule.issue && <p className={styles.watchError}>{rule.issue}</p>}
        {rule.active && <button disabled={!ready || busy} onClick={async () => { setBusy(true); try { apply(await stopSignalWatch(rule.id)) } catch (e) { setMessage(e instanceof Error ? e.message : '종료하지 못했습니다.') } finally { setBusy(false) } }}>신호 감시 종료</button>}
        <details><summary>발생 기록과 이후 결과 {rule.events.length}건</summary>{!rule.events.length && <p>새로 충족된 신호가 아직 없어요.</p>}{[...rule.events].reverse().map(e => <div key={e.id} className={styles.watchEvent}><b>{labels[e.outcome]}</b><span>{new Date(e.at).toLocaleString('ko-KR')} 봉 · 종가 {e.price.toLocaleString()} USDT</span><span>다음 봉 시가 {e.entry?.toLocaleString() ?? '미관측'} · 비용 반영 변화 {e.net === null ? '—' : `${e.net.toFixed(2)}%`}</span><small>{delivery[e.delivery.status]}</small></div>)}<p>조건 버전 {rule.config.version} · 목표 폭 {rule.config.config.target}% · {rule.config.config.horizon}봉 · 비용 {rule.config.config.cost}%</p><p className={styles.hash}>원본 조건 식별값 {rule.hash}</p></details>
      </article>)}<p>봉의 가격 범위로 관찰한 결과이며 실제 주문이나 계좌 수익률이 아닙니다. 등록 이후 화면 조건을 바꿔도 이 감시의 원본은 바뀌지 않아요.</p></>}
    {!ledger && <Link to={`/research?asset=${asset}&mode=alerts`}>감시 중인 조건과 결과 보기 →</Link>}
  </section>
}
