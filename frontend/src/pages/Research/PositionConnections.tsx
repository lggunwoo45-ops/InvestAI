import { cloudSignedIn } from '@/services/cloud/cloudClient'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { researchAssets } from '@/services/research/researchModel'
import { defaultExplorerConfig } from '@/services/research/signalExplorer'
import { connectPositions, connectPrivatePositions, pausePositionConnection, removePositionConnection, positionBreaches, positionEventLabels, positionRiskValues, readMonitor, registerSignalWatch, type MonitorState, type PositionConnection, type PositionVenue, type PublicPosition } from '@/services/research/monitorClient'
import { CredentialVaultPanel } from './CredentialVaultPanel'
import { localMonitorAvailable } from '@/services/research/monitorAvailability'
import { LocalMonitorNotice } from './LocalMonitorNotice'
import styles from './PositionConnections.module.css'

const fmt = (n: number | null, digits = 2) => n === null ? '미제공' : n.toLocaleString('ko-KR', { maximumFractionDigits: digits })
const venueNames = { binance: 'Binance', bybit: 'Bybit', hyperliquid: 'Hyperliquid', lighter: 'Lighter' }
const privateVenue = (v: PositionVenue) => v === 'binance' || v === 'bybit'
const quoteFor = (v: PositionVenue) => privateVenue(v) ? 'USDT' : 'USDC'
const stamp = (n: number | null | undefined) => n ? new Date(n).toLocaleString('ko-KR') : '아직 확인 전'
const delivery = { off: '앱에만 기록', pending: '외부 발송 대기', sent: '외부 발송 확인', uncertain: '외부 발송 여부 미확인' }
const ruleNames = { distance: '청산 거리', loss: '진입금액 대비 손실', leverage: '설정 레버리지' }

function exportConnection(c: PositionConnection) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = `investai-position-${c.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function PositionConnections({ ledger = false }: { ledger?: boolean }) {
  return localMonitorAvailable() ? <LocalPositionConnections ledger={ledger} /> : <LocalMonitorNotice kind="positions" />
}

function LocalPositionConnections({ ledger = false }: { ledger?: boolean }) {
  const { displayMode, setDisplayMode } = useDisplayMode(), simple = displayMode === 'simple'
  const [state, setState] = useState<MonitorState | null>(null), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const [venue, setVenue] = useState<PositionVenue>('hyperliquid'), [account, setAccount] = useState(''), [label, setLabel] = useState(''), [notify, setNotify] = useState(false)
  const [apiKey, setApiKey] = useState(''), [apiSecret, setApiSecret] = useState(''), [consent, setConsent] = useState(false)
  const privateAccount = privateVenue(venue)
  const [limits, setLimits] = useState({ distance: '5', loss: '10', leverage: '20' }), [enabled, setEnabled] = useState({ distance: true, loss: true, leverage: false })
  const [removeId, setRemoveId] = useState<string | null>(null)
  const request = useRef<{ body: string; id: string } | null>(null), version = useRef(0), alive = useRef(true)
  useEffect(() => {
    alive.current = true
    const load = async () => { const n = ++version.current; try { const next = await readMonitor(); if (alive.current && n === version.current) { setState(next); setError('') } } catch (e) { if (alive.current && n === version.current) setError(e instanceof Error ? e.message : '포지션 연결 상태를 확인할 수 없습니다.') } }
    void load(); const timer = setInterval(load, 10000)
    return () => { alive.current = false; clearInterval(timer) }
  }, [])
  const act = async (work: () => Promise<MonitorState>, success: string) => {
    version.current++; setBusy(true); setMessage('')
    try { const next = await work(); if (alive.current) { version.current++; setState(next); setError(''); setMessage(success) } }
    catch (e) { if (alive.current) setMessage(e instanceof Error ? e.message : '변경하지 못했습니다.') }
    finally { if (alive.current) setBusy(false) }
  }
  const ready = !!state?.running && !state.error && !error
  const connections = state?.connections ?? []
  const fresh = (c: PositionConnection) => ready && c.active && !c.issue && (!privateVenue(c.config.venue) || state?.vault?.unlocked) && !!c.snapshot && state!.now - c.snapshot.receivedAt <= 90000
  const positions = connections.flatMap(c => c.snapshot?.positions ?? [])
  const atRisk = connections.filter(fresh).flatMap(c => c.snapshot!.positions.filter(p => positionBreaches(p, c.config.thresholds).length)).length
  const save = async () => {
    const thresholds = { distance: enabled.distance ? Number(limits.distance) : null, loss: enabled.loss ? Number(limits.loss) : null, leverage: venue !== 'lighter' && enabled.leverage ? Number(limits.leverage) : null }
    if (venue === 'binance' || venue === 'bybit') {
      if (!state?.vault?.unlocked || !consent || busy) return
      try { await act(() => connectPrivatePositions({ requestId: crypto.randomUUID(), venue, label: label.trim() || `${venueNames[venue]} 연결`, notify, thresholds, credentials: { apiKey, apiSecret }, consent }), '읽기 전용 권한과 포지션을 확인하고 키를 암호화해 저장했어요.') }
      finally { setApiKey(''); setApiSecret(''); setConsent(false) }
      return
    }
    const fields = { venue, account: account.trim(), label: label.trim() || `${venueNames[venue]} 연결`, notify, thresholds }
    const body = JSON.stringify(fields)
    if (request.current?.body !== body) request.current = { body, id: crypto.randomUUID() }
    await act(() => connectPositions({ ...fields, requestId: request.current!.id }), '연결을 등록했어요. 첫 조회가 끝나면 포지션을 보여드립니다.')
  }
  const watch = (c: PositionConnection, p: PublicPosition) => {
    const side = p.side === 'long' ? 'short' : 'long'
    void act(() => registerSignalWatch({ requestId: crypto.randomUUID(), name: `${p.asset} 연결 포지션 반대 추세`, asset: p.asset, notify: c.config.notify, purpose: 'opposition', holdingSide: p.side, positionRef: { connectionId: c.id, key: p.key }, config: { ...defaultExplorerConfig, signals: [`ema-${side}`], side, timeframe: '1h', window: 1 } }), '연결 포지션의 반대 추세 감시를 시작했어요. 포지션 종료·방향 변경 시 자동 종료됩니다.')
  }
  const positionActions = (c: PositionConnection, p: PublicPosition) => {
    const supported = (researchAssets as readonly string[]).includes(p.asset)
    const watched = state?.signals?.some(r => r.active && r.config.positionRef?.connectionId === c.id && r.config.positionRef.key === p.key)
    return <div className={styles.positionActions}>{supported ? <><button disabled={!fresh(c) || busy || watched} onClick={() => watch(c, p)}>{watched ? '반대 추세 감시 중' : '반대 추세 감시 시작'}</button><Link to={`/research?asset=${p.asset}&mode=setups`}>신호 직접 탐색 ↗</Link></> : <small>이 종목의 신호 분석은 아직 지원하지 않습니다.</small>}</div>
  }
  const limitInputs = (['distance', 'loss', 'leverage'] as const).filter(k => venue !== 'lighter' || k !== 'leverage').map(k => <div className={styles.limit} key={k}><label><input type="checkbox" checked={enabled[k]} onChange={e => setEnabled({ ...enabled, [k]: e.target.checked })} />{ruleNames[k]}</label><div><input aria-label={`${ruleNames[k]} 기준`} disabled={!enabled[k]} type="number" min="0.01" max={k === 'loss' ? 1000 : k === 'leverage' ? 200 : 100} step="any" required={enabled[k]} value={limits[k]} onChange={e => setLimits({ ...limits, [k]: e.target.value })} /><span>{k === 'leverage' ? '배 이상' : k === 'distance' ? '% 이하' : '% 이상'}</span></div></div>)
  return <section className={`${styles.workspace} ${simple ? styles.simple : styles.expert}`} aria-label="연결 포지션과 위험 알림">
    <header className={styles.hero}><div><span className={styles.eyebrow}>INVESTAI / POSITION DESK</span><h2>{ledger ? '포지션에서 생긴 변화를 모아봅니다.' : simple ? '내 포지션, 지금 무엇을 확인할까요?' : '연결한 포지션을 하나의 작업대로.'}</h2><p>{simple ? '내 거래소 계정을 연결하면 보유 방향과 확인할 위험을 함께 보여드려요.' : '읽기 전용 포지션 동기화 · 청산 거리 / 손실 기준 · 반대 방향 신호'}</p></div><div className={styles.modeSwitch} aria-label="포지션 표시 방식"><button aria-pressed={simple} onClick={() => setDisplayMode('simple')}>심플</button><button aria-pressed={!simple} onClick={() => setDisplayMode('expert')}>전문가</button></div></header>
    {(error || state?.error) && <p role="alert" className={styles.warning}>{error || state?.error}</p>}{message && <p role="status" className={styles.message}>{message}</p>}
    <div className={styles.summary}><div><span>연결한 계정</span><strong>{connections.length}<small>개</small></strong></div><div><span>마지막 조회의 포지션</span><strong>{positions.length}<small>개</small></strong></div><div><span>최신 조회에서 기준 도달</span><strong>{connections.some(fresh) ? atRisk : '—'}<small>{connections.some(fresh) ? '개' : '조회 대기'}</small></strong></div><div><span>동기화</span><strong>30<small>초마다</small></strong><small>{cloudSignedIn() ? '회원 서버에서 계속 확인' : 'PC와 프로그램 실행 중'}</small></div></div>
    {!ledger && <div className={styles.connectGrid}><form className={styles.form} onSubmit={e => { e.preventDefault(); void save() }}><div className={styles.cardTitle}><span>01</span><div><h3>포지션 계정 연결</h3><p>거래소를 고르면 필요한 연결 방법을 안내해드려요.</p></div></div>
      <div className={styles.providers}>{(Object.keys(venueNames) as PositionVenue[]).map(v => <button type="button" key={v} disabled={busy} aria-pressed={venue === v} onClick={() => { setVenue(v); setAccount(''); setApiKey(''); setApiSecret(''); setConsent(false) }}><b>{venueNames[v]}</b>{' '}<small>{privateVenue(v) ? '읽기 전용 API · USDT 무기한' : v === 'hyperliquid' ? '공개 주소 · 기본 USDC 무기한' : '계정 번호 · 무기한'}</small></button>)}</div>
      {privateAccount ? <>
        <CredentialVaultPanel vault={state?.vault} disabled={!ready || busy} act={act} />
        <div className={styles.keyIntro}><span className={styles.eyebrow}>02 / 읽기 권한 확인</span><h4>{venueNames[venue]} API 연결</h4><p>HMAC 방식의 읽기 전용 키를 준비해주세요. {venue === 'binance' ? '거래·출금·이체 권한을 모두 꺼야 합니다. 해당 키로 선물 조회가 거절되면 연결을 지원할 수 없습니다.' : '읽기 전용으로 발급하고 계약 포지션 조회 권한을 선택해주세요.'}</p></div>
        <fieldset className={styles.keyFields} disabled={!state?.vault?.unlocked || busy}>
          <label>API 키<input required type="password" autoComplete="off" spellCheck={false} minLength={16} maxLength={256} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="거래소에서 발급한 API key" /></label>
          <label>API 비밀 키<input required type="password" autoComplete="off" spellCheck={false} minLength={16} maxLength={256} value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder="발급 시 함께 받은 Secret key" /></label>
          <label className={styles.check}><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />{cloudSignedIn() ? '내 회원 계정의 서버 보관함에 키를 암호화해 보관하고 해당 거래소에 포지션을 조회하는 데 동의합니다.' : '이 PC에 키를 암호화해 보관하고 해당 거래소에 포지션을 조회하는 데 동의합니다.'}</label>
        </fieldset>
        <p className={styles.privacy}>권한 확인에 실패하면 키를 저장하지 않습니다. 입력값은 처리 후 비웁니다. 로그인 비밀번호나 복구 문구를 입력하지 마세요.</p>
      </> : <label>{venue === 'hyperliquid' ? '연결할 공개 지갑 주소' : 'Lighter 계정 번호'}<input required autoComplete="off" spellCheck={false} value={account} onChange={e => setAccount(e.target.value)} pattern={venue === 'hyperliquid' ? '0x[0-9a-fA-F]{40}' : '(0|[1-9][0-9]{0,14})'} placeholder={venue === 'hyperliquid' ? '0x로 시작하는 공개 주소' : '거래소에 표시된 Account index'} maxLength={venue === 'hyperliquid' ? 42 : 15} /></label>}
      <label>연결 이름 <small>선택</small><input value={label} onChange={e => setLabel(e.target.value)} placeholder="예: 장기 보유 계정" maxLength={40} /></label>
      <details open={!simple}><summary>알림 기준 조정 <small>기본: 청산 거리 5% · 손실 10%</small></summary><div className={styles.limits}>{limitInputs}</div><p>손실은 진입금액 대비 미실현 손실입니다. 청산 거리는 거래소가 제공한 청산가와 평가가격의 차이예요. 기준은 연결할 때 저장됩니다.</p></details>
      <label className={styles.check}><input type="checkbox" checked={notify} disabled={!state?.channelConfigured} onChange={e => setNotify(e.target.checked)} />Telegram으로도 받기{!state?.channelConfigured && <small>채널 미설정</small>}</label><p className={styles.privacy}>{cloudSignedIn() ? '연결 식별자·포지션·감시 결과는 내 계정의 서버 저장소에 보관됩니다. 삭제하면 계좌 연결과 보관한 키를 함께 지웁니다.' : privateAccount ? '연결하면 조회한 포지션과 알림 기록도 이 PC에 저장합니다. 보관함 비밀번호는 저장하지 않습니다.' : '연결하면 공개 식별자·포지션·알림 기록을 이 PC에 저장하고 해당 거래소에 조회합니다. 비밀번호·개인 키는 입력하지 않습니다.'}</p><button className={styles.primary} disabled={!ready || busy || privateAccount && (!state?.vault?.unlocked || !consent || !apiKey || !apiSecret)} type="submit">{busy ? '처리 중…' : privateAccount ? '읽기 권한 확인하고 연결하기' : '연결하고 위험 확인하기'}</button>
    </form><aside className={styles.walkthrough}><div className={styles.orbit} aria-hidden="true"><i /><span>↗</span><i /></div><span className={styles.eyebrow}>한 번 연결한 뒤에는</span><h3>조회에서 끝나지 않도록.</h3><ol><li><b>보유 상황을 확인해요</b><p>첫 조회는 기준으로 남기고, 이후 수량·방향의 변화를 기록합니다.</p></li><li><b>정한 위험 기준을 살펴봐요</b><p>청산가가 없거나 조회가 끊기면 해당 판정을 보류합니다.</p></li><li><b>반대 흐름까지 이어서 봐요</b><p>포지션별로 반대 추세 감시를 켤 수 있어요. 종료·방향 전환 시 감시도 종료됩니다.</p></li></ol><small>Binance·Bybit는 읽기 전용 API의 USDT 무기한, Hyperliquid·Lighter는 공개 계정 범위를 조회합니다. API 키 보관함은 프로그램 재시작 시 잠깁니다.</small></aside></div>}
    {!connections.length && <div className={styles.empty}><span aria-hidden="true">◎</span><h3>연결한 포지션이 여기에 모입니다.</h3><p>연결 전에는 보유 수량이나 위험 상태를 임의로 표시하지 않아요.</p>{ledger && <Link to="/research?mode=position">포지션 연결하러 가기 →</Link>}</div>}
    {connections.map(c => <article className={styles.connection} key={c.id}><header className={styles.connectionHeader}><div><span className={styles.eyebrow}>{venueNames[c.config.venue]} · {quoteFor(c.config.venue)}</span><h3>{c.config.label}</h3><small>{c.config.venue === 'hyperliquid' ? `${c.config.account.slice(0, 6)}…${c.config.account.slice(-4)}` : privateVenue(c.config.venue) ? '읽기 전용 API' : `계정 #${c.config.account}`} · {c.snapshot?.sourceAt ? `거래소 기준 ${stamp(c.snapshot.sourceAt)}` : `응답 수신 ${stamp(c.snapshot?.receivedAt)}`}</small></div><span className={fresh(c) ? styles.status : styles.paused}>{fresh(c) ? '갱신 중' : c.active ? '판정 대기' : '갱신 정지'}</span></header>
      {!fresh(c) && <p className={styles.warning}>{c.issue || '최신 포지션을 확인할 때까지 위험 판정을 보류합니다.'}{c.snapshot && ' 아래 수치는 마지막으로 확인한 값입니다.'}</p>}
      {c.snapshot && !c.snapshot.positions.length && <p className={styles.emptyPositions}>마지막 조회에서 이 연결 범위의 열린 무기한 포지션이 없었습니다.</p>}
      {!ledger && c.snapshot && (simple ? <div className={styles.positionCards}>{c.snapshot.positions.map(p => { const risk = positionRiskValues(p), breaches = positionBreaches(p, c.config.thresholds); return <section className={styles.positionCard} key={p.key}><header><h4>{p.asset} <span>{p.side === 'long' ? '오르면 이익 · 롱' : '내리면 이익 · 숏'}</span></h4><b className={p.unrealizedPnl < 0 ? styles.negative : styles.positive}>{p.unrealizedPnl >= 0 ? '+' : ''}{fmt(p.unrealizedPnl)} <small>{p.quote}</small></b></header><p>거래소 제공 미실현 손익</p><div className={styles.riskStory}><b>{!fresh(c) ? '현재 위험 판정 대기' : breaches.length ? `${breaches.map(k => ruleNames[k]).join(' · ')} 기준에 도달했어요` : '설정한 알림 기준에 도달하지 않았어요'}</b><p>{risk.distance === null ? '거래소가 청산가를 주지 않아 청산 거리 판정은 제외됩니다.' : `평가가격에서 청산가까지 ${fmt(risk.distance)}% · 거래소 청산가 ${fmt(p.liquidationPrice, 6)}`}</p></div><dl><div><dt>보유 수량</dt><dd>{fmt(Math.abs(p.size), 8)} {p.asset}</dd></div><div><dt>평균 진입가</dt><dd>{fmt(p.entryPrice, 6)}</dd></div></dl>{positionActions(c, p)}</section> })}</div> : <div className={styles.tableWrap}><table><caption>거래소 제공 포지션 · {quoteFor(c.config.venue)} 기준</caption><thead><tr><th>종목 / 방향</th><th>수량</th><th>진입 / 평가가격</th><th>청산가 / 거리</th><th>미실현 손익</th><th>레버리지 / 증거금</th><th>분석 연결</th></tr></thead><tbody>{c.snapshot.positions.map(p => <tr key={p.key}><td><b>{p.asset}</b><small>{p.side === 'long' ? 'LONG' : 'SHORT'}</small></td><td>{fmt(Math.abs(p.size), 8)}</td><td>{fmt(p.entryPrice, 6)}<small>{fmt(p.currentPrice, 6)}</small></td><td>{fmt(p.liquidationPrice, 6)}<small>{fmt(positionRiskValues(p).distance)}{p.liquidationPrice === null ? '' : '%'}</small></td><td className={p.unrealizedPnl < 0 ? styles.negative : styles.positive}>{fmt(p.unrealizedPnl)}</td><td>{p.leverage === null ? '미제공' : `${fmt(p.leverage)}배`}<small>{p.marginType === 'unknown' ? '방식 미확인' : p.marginType === 'cross' ? '교차' : '격리'}</small></td><td>{positionActions(c, p)}</td></tr>)}</tbody></table></div>)}
      <div className={styles.connectionFoot}><p>저장한 기준: {(['distance', 'loss', 'leverage'] as const).filter(k => c.config.thresholds[k] !== null).map(k => `${ruleNames[k]} ${c.config.thresholds[k]}${k === 'leverage' ? '배 이상' : k === 'distance' ? '% 이하' : '% 이상'}`).join(' · ') || '위험 알림 사용 안 함'}</p><p>{privateVenue(c.config.venue) ? 'USDT 무기한 계약만 포함하며 현물·인버스·만기 선물·USDC·포트폴리오 마진 전용 계정은 포함하지 않습니다. 평가가격은 거래소 마크 가격입니다. 교차 청산가는 계정 상태에 따라 바뀔 수 있습니다.' : c.config.venue === 'hyperliquid' ? '기본 무기한 시장만 포함합니다. HIP-3·현물·다른 하위 계정과 통합 증거금 전체 위험은 포함하지 않습니다.' : '계정 번호 하나만 조회합니다. 응답 수신 시각을 표시하며 포지션 자체의 갱신 시각은 제공되지 않습니다. 레버리지·증거금 방식은 판정에서 제외합니다.'}</p><details><summary>반대 추세 감시 기준 보기</summary><p>Binance USDT 선물의 완료된 1시간봉에서 EMA 9·21이 보유 방향의 반대로 교차하는지 확인합니다. 연결 거래소의 계약과 가격 차이가 있을 수 있어요. 첫 조회 이후 새 교차부터 기록하며, 이후 가격 결과는 24봉·상하 2%·비용 0.2% 가정입니다. 실제 계좌 손익과 별개입니다.</p></details></div>
      <details className={styles.events} open={ledger}><summary>변경·위험 기록 <b>{c.events.length}건</b></summary>{!c.events.length && <p>첫 조회 이후 확인한 내용이 여기에 쌓입니다.</p>}{[...c.events].reverse().map(e => <div className={styles.event} key={e.id}><span className={['liquidation', 'loss', 'leverage'].includes(e.kind) ? styles.riskDot : styles.dot} /><div><b>{e.position?.asset} {positionEventLabels[e.kind]}</b><p>{e.detail}</p><small>{stamp(e.at)} · {delivery[e.delivery.status]}</small></div></div>)}</details>
      <div className={styles.management}><button disabled={!ready || busy} onClick={() => void act(() => pausePositionConnection(c.id, c.active), c.active ? '갱신을 멈췄어요. 기록은 남아 있습니다.' : '다음 조회부터 갱신을 이어갑니다.')}>{c.active ? '갱신 일시 정지' : '갱신 다시 시작'}</button><button onClick={() => exportConnection(c)}>연결 기록 내보내기</button><button disabled={!ready || busy} onClick={() => setRemoveId(c.id)}>연결 삭제</button><small>{privateVenue(c.config.venue) ? '내보내기에 API 키는 포함되지 않습니다.' : '내보내기에 공개 식별자가 포함됩니다.'}</small></div>{removeId === c.id && <div className={styles.deleteConfirm}><p>{cloudSignedIn() ? '내 계정의 연결 정보·저장된 API 키·포지션 기록을 서버에서 삭제합니다.' : '이 PC의 연결 정보·저장된 API 키·포지션 기록을 삭제합니다.'} 연결된 반대 신호 감시는 종료되고 신호 결과는 별도로 남습니다.</p><button disabled={busy} onClick={() => void act(() => removePositionConnection(c.id), '연결과 포지션 기록을 삭제했어요.')}>연결과 기록 삭제</button><button onClick={() => setRemoveId(null)}>취소</button></div>}
    </article>)}
    <p className={styles.note}>평가가격은 Binance·Bybit의 마크 가격, 공개 계정은 포지션 금액 ÷ 보유 수량을 사용합니다. 조회 사이의 거래를 모두 복원하지는 않습니다. 새로 보인 포지션과 사라진 포지션은 관측 기록이며 주문·확정 손익 내역이 아닙니다.</p>
  </section>
}
