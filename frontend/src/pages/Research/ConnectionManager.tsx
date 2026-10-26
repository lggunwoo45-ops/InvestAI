import { useState } from 'react'
import { cloudSignedIn } from '@/services/cloud/cloudClient'
import { refreshPositionConnection, replacePositionCredentials, updatePositionConnection, type MonitorState, type PositionConnection, type PositionThresholds } from '@/services/research/monitorClient'
import styles from './PositionConnections.module.css'

const names = { distance: '청산 거리', loss: '진입금액 대비 손실', leverage: '설정 레버리지' }
const stamp = (value?: number) => value ? new Date(value).toLocaleString('ko-KR') : '아직 없음'
type Draft = { revision: number; label: string; notify: boolean; thresholds: Record<keyof PositionThresholds, string> }
export function ConnectionManager({ connection: c, disabled, unlocked, channelConfigured, act }: {
  connection: PositionConnection; disabled: boolean; unlocked: boolean; channelConfigured: boolean
  act: (work: () => Promise<MonitorState>, success: string) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<Draft | null>(null), [rotation, setRotation] = useState<number | null>(null)
  const [apiKey, setApiKey] = useState(''), [apiSecret, setApiSecret] = useState(''), [consent, setConsent] = useState(false)
  const privateAccount = c.config.venue === 'binance' || c.config.venue === 'bybit', revision = c.revision ?? 0
  const changed = draft !== null && draft.revision !== revision || rotation !== null && rotation !== revision
  const clearKeys = () => { setApiKey(''); setApiSecret(''); setConsent(false) }
  const edit = () => {
    setRotation(null); clearKeys()
    setDraft({ revision, label: c.config.label, notify: c.config.notify, thresholds: { distance: c.config.thresholds.distance?.toString() ?? '', loss: c.config.thresholds.loss?.toString() ?? '', leverage: c.config.thresholds.leverage?.toString() ?? '' } })
  }
  const save = async () => {
    if (!draft || changed) return
    const thresholds: PositionThresholds = { distance: draft.thresholds.distance === '' ? null : Number(draft.thresholds.distance), loss: draft.thresholds.loss === '' ? null : Number(draft.thresholds.loss), leverage: c.config.venue === 'lighter' || draft.thresholds.leverage === '' ? null : Number(draft.thresholds.leverage) }
    if (await act(() => updatePositionConnection(c.id, draft.revision, { label: draft.label.trim(), notify: draft.notify, thresholds }), '연결 설정을 저장했어요. 바뀐 위험 기준은 다음 조회부터 적용됩니다.')) setDraft(null)
  }
  const replace = async () => {
    if (rotation === null || !consent || changed) return
    try {
      if (await act(() => replacePositionCredentials(c.id, rotation, { apiKey, apiSecret }, consent), '새 키의 읽기 권한을 확인하고 교체했어요. 기존 기록은 남기고 반대 신호 감시는 종료했습니다.')) setRotation(null)
    } finally { clearKeys() }
  }
  return <section className={styles.connectionManager} aria-label={`${c.config.label} 연결 관리`}>
    <div className={styles.checkTimes}><span>마지막 정상 조회 <b>{stamp(c.snapshot?.receivedAt)}</b></span><span>최근 조회 시도 <b>{stamp(c.lastAttemptAt ?? c.snapshot?.receivedAt)}</b></span>{c.credentialsUpdatedAt && <span>키 교체 <b>{stamp(c.credentialsUpdatedAt)}</b></span>}</div>
    <div className={styles.manageActions}>
      <button disabled={disabled || !c.active || privateAccount && !unlocked} onClick={() => void act(() => refreshPositionConnection(c.id, revision), '조회 요청을 마쳤어요. 연결 상태와 마지막 정상 조회 시각을 확인해주세요.')}>지금 다시 조회</button>
      <button disabled={disabled} aria-expanded={draft !== null} onClick={edit}>연결 설정 수정</button>
      {privateAccount && <button disabled={disabled || !unlocked} aria-expanded={rotation !== null} onClick={() => { setDraft(null); clearKeys(); setRotation(revision) }}>API 키 교체</button>}
      <small>{!c.active ? '조회하려면 갱신을 다시 시작하세요.' : '직접 조회는 30초마다 가능합니다.'}</small>
    </div>
    {changed && <p role="alert" className={styles.warning}>다른 화면에서 연결이 변경됐습니다. 취소한 뒤 다시 열어 최신 설정으로 수정해주세요.</p>}
    {draft && <form className={styles.editConnection} aria-label="연결 설정 수정" onSubmit={e => { e.preventDefault(); void save() }}>
      <h4>연결 설정</h4><p>이름과 위험 기준을 바꿔도 기존 포지션 기록은 유지됩니다. 비워둔 기준은 사용하지 않습니다.</p>
      <label>연결 이름 수정<input required maxLength={40} value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} /></label>
      <div className={styles.editLimits}>{(Object.keys(names) as (keyof PositionThresholds)[]).filter(k => c.config.venue !== 'lighter' || k !== 'leverage').map(k => <label key={k}>{names[k]} {k === 'leverage' ? '(배 이상)' : k === 'distance' ? '(% 이하)' : '(% 이상)'}<input aria-label={`${names[k]} 수정`} type="number" min="0.01" max={k === 'loss' ? 1000 : k === 'leverage' ? 200 : 100} step="any" placeholder="사용 안 함" value={draft.thresholds[k]} onChange={e => setDraft({ ...draft, thresholds: { ...draft.thresholds, [k]: e.target.value } })} /></label>)}</div>
      <label className={styles.check}><input type="checkbox" checked={draft.notify} disabled={!channelConfigured && !draft.notify} onChange={e => setDraft({ ...draft, notify: e.target.checked })} />이 연결의 Telegram 알림{!channelConfigured && <small>Telegram 연결 필요</small>}</label>
      <small>알림을 끄면 대기 중인 포지션 알림도 취소합니다. 이미 전송을 시작한 알림과 별도로 등록한 신호 감시는 영향을 받지 않습니다.</small>
      <div className={styles.manageActions}><button type="submit" disabled={disabled || changed}>변경 저장</button><button type="button" disabled={disabled} onClick={() => setDraft(null)}>수정 취소</button></div>
    </form>}
    {rotation !== null && <form className={styles.editConnection} aria-label="API 키 교체" onSubmit={e => { e.preventDefault(); void replace() }}>
      <h4>새 조회 전용 키로 교체</h4><p>새 키의 읽기 전용 권한과 포지션 조회가 모두 확인된 뒤 교체합니다. 실패하면 기존 키를 유지합니다. 기존 기록은 남고, 연결된 반대 신호 감시는 종료되므로 새 포지션에서 다시 등록해주세요.</p>
      <label>새 API 키<input required type="password" autoComplete="off" minLength={16} maxLength={256} value={apiKey} onChange={e => setApiKey(e.target.value)} /></label>
      <label>새 API 비밀 키<input required type="password" autoComplete="off" minLength={16} maxLength={256} value={apiSecret} onChange={e => setApiSecret(e.target.value)} /></label>
      <label className={styles.check}><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />새 키를 {cloudSignedIn() ? '내 계정의 서버에' : '이 PC에'} 암호화해 보관하고 거래소 조회에 사용하는 데 동의합니다.</label>
      <small>InvestAI의 키 교체·삭제는 거래소에서 발급한 키 자체를 폐기하지 않습니다. 이전 키가 필요 없으면 거래소에서도 직접 삭제하세요.</small>
      <div className={styles.manageActions}><button type="submit" disabled={disabled || !unlocked || !consent || changed}>확인 후 키 교체</button><button type="button" disabled={disabled} onClick={() => { clearKeys(); setRotation(null) }}>교체 취소</button></div>
    </form>}
  </section>
}
