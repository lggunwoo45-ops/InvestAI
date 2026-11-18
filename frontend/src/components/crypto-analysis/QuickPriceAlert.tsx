import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Language } from '@/i18n/translations'
import type { MarketInstrument } from '@/types/market'
import { useCloud } from '@/services/cloud/useCloud'
import { cloudRequest, cloudSessionGeneration, type TelegramStatus } from '@/services/cloud/cloudClient'
import { alertInstrument, savePriceAlert, alertVenueLabel } from '@/services/cloud/priceAlerts'
import styles from './QuickPriceAlert.module.css'

interface Props { instrument: MarketInstrument; threshold: number; direction: 'above' | 'below'; language: Language; valid: boolean }
export function QuickPriceAlert(props: Props) {
  const cloud = useCloud()
  return <PriceReminder key={cloud.user?.id ?? 'guest'} {...props} />
}
function PriceReminder({ instrument, threshold, direction, language, valid }: Props) {
  const ko = language === 'ko', cloud = useCloud(), identity = alertInstrument(instrument)
  const [open, setOpen] = useState(false), [value, setValue] = useState(''), [side, setSide] = useState(direction)
  const [notify, setNotify] = useState(false), [connected, setConnected] = useState(false), [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false), [error, setError] = useState('')
  const pending = useRef<{ body: string; id: string } | null>(null), saving = useRef(false)
  const userId = cloud.user?.id
  useEffect(() => {
    if (!open || !userId) return
    let alive = true
    void cloudRequest<TelegramStatus>('/telegram').then(s => { if (alive) setConnected(s.connected) }).catch(() => { if (alive) setConnected(false) })
    return () => { alive = false }
  }, [open, userId])
  if (!identity) return null
  const save = async () => {
    if (saving.current || !cloud.user || !valid || !value.trim() || !Number.isFinite(Number(value)) || Number(value) <= 0) return
    const fields = { instrument: identity, above: side === 'above' ? Number(value) : null, below: side === 'below' ? Number(value) : null, notify: notify && connected }
    const body = JSON.stringify(fields), generation = cloudSessionGeneration()
    if (pending.current?.body !== body) pending.current = { body, id: crypto.randomUUID() }
    saving.current = true; setBusy(true); setError('')
    try { await savePriceAlert({ ...fields, requestId: pending.current.id }); if (generation === cloudSessionGeneration()) setSaved(true) }
    catch (e) { if (generation === cloudSessionGeneration()) setError(e instanceof Error ? e.message : ko ? '저장하지 못했어요. 다시 시도해주세요.' : 'Could not save. Please retry.') }
    finally { saving.current = false; setBusy(false) }
  }
  return <section className={styles.panel} aria-label={ko ? '다시 확인할 가격 알림' : 'Price reminder'}>
    {!open ? <button className={styles.primary} type="button" disabled={!valid} onClick={() => { setValue(String(Number(threshold.toPrecision(8)))); setSide(direction); setSaved(false); setOpen(true) }}>{ko ? '이 가격에 알림 받기' : 'Alert me at this price'}</button> : saved ? <div role="status"><strong>{ko ? '서버에 가격 알림을 저장했어요.' : 'Price alert saved on the server.'}</strong><p>{ko ? '첫 시세를 기준으로 삼고, 이후 설정 가격을 통과하면 기록합니다. 화면을 닫아도 확인합니다.' : 'The first quote establishes a baseline. Later crossings are recorded even when this page is closed.'}</p><Link to={`/review-alerts?instrumentId=${encodeURIComponent(instrument.id)}`}>{ko ? '내 알림·감지 기록 확인' : 'Open my alerts and observations'} →</Link></div> : <form onSubmit={e => { e.preventDefault(); void save() }}>
      <h4>{ko ? '언제 다시 볼까요?' : 'When should we remind you?'}</h4>
      <p>{alertVenueLabel(identity, ko)} · {identity.asset}/{identity.quote}</p>
      <div className={styles.fields}><label>{ko ? '확인할 가격' : 'Price'} ({identity.quote})<input type="number" min="0.00000001" step="any" required value={value} disabled={busy} onChange={e => setValue(e.target.value)} /></label><label>{ko ? '알림 조건' : 'Condition'}<select value={side} disabled={busy} onChange={e => setSide(e.target.value as 'above' | 'below')}><option value="above">{ko ? '이 가격 위로 통과' : 'Crosses above'}</option><option value="below">{ko ? '이 가격 아래로 통과' : 'Crosses below'}</option></select></label></div>
      <p>{ko ? '가격 통과만 알려드립니다. 봉 마감·거래량까지 확인한 매매 신호는 아닙니다. 같은 거래소·거래쌍의 기존 단일 가격 알림은 종료하고 교체합니다.' : 'This observes a price crossing, not a candle-close or volume-confirmed trade signal. It replaces the existing price alert for this venue and pair.'}</p>
      {cloud.user ? <><label className={styles.check}><input type="checkbox" checked={notify && connected} disabled={!connected || busy} onChange={e => setNotify(e.target.checked)} />{ko ? '내 텔레그램으로도 받기' : 'Also send to my Telegram'}</label>{!connected && <p>{ko ? cloud.telegramAvailable ? '텔레그램 연결 후 휴대폰으로 받을 수 있어요. 지금은 앱에 감지 기록을 남깁니다.' : '휴대폰 발송은 서비스 연결 준비 중입니다. 지금은 서버가 확인하고 앱에 기록합니다.' : 'Phone delivery is not connected. The server can still record crossings in the app.'} <Link to="/settings">{ko ? '알림 연결 설정' : 'Notification settings'}</Link></p>}<button className={styles.primary} type="submit" disabled={busy || !valid}>{busy ? ko ? '저장 중…' : 'Saving…' : ko ? '가격 알림 저장' : 'Save price alert'}</button></> : <p>{ko ? '로그인하면 화면을 닫아도 가격을 확인하고 계정에 기록합니다.' : 'Sign in to monitor prices after closing the page and save observations to your account.'} <Link to="/settings">{ko ? '로그인하고 알림 저장' : 'Sign in to save an alert'} →</Link></p>}
      {!valid && <p role="status">{ko ? '최신 분석 자료를 기다리고 있어요. 자료가 확인되면 저장할 수 있습니다.' : 'Wait for fresh analysis before saving.'}</p>}
      <button type="button" disabled={busy} onClick={() => setOpen(false)}>{ko ? '닫기' : 'Close'}</button>
      {error && <p role="alert">{error}</p>}
    </form>}
  </section>
}
