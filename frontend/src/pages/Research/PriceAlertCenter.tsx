import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import { useCloud } from '@/services/cloud/useCloud'
import { cloudRequest, type TelegramStatus } from '@/services/cloud/cloudClient'
import { readPriceAlerts, stopPriceAlert, setPriceAlertNotification, alertInstrumentId, alertVenueLabel, type PriceAlert } from '@/services/cloud/priceAlerts'
import styles from '@/components/product/InvestmentWorkflow.module.css'

export function PriceAlertCenter({ instrumentId, simple = false }: { instrumentId?: string | null; simple?: boolean }) {
  const cloud = useCloud(), { language } = useLanguage(), ko = language === 'ko'
  if (!cloud.user) return <section className={styles.tile}><h2>{ko ? '화면을 닫아도 확인하는 가격 알림' : 'Price alerts while you are away'}</h2><p>{ko ? '분석에서 확인할 가격을 골라 저장하면, 서버가 계속 확인하고 감지 기록을 남깁니다. 로그인 후 사용할 수 있어요.' : 'Save a level from analysis and the server will monitor and record crossings. Sign in to use it.'}</p><Link to="/settings">{ko ? '로그인·계정 설정' : 'Sign in and account settings'} →</Link></section>
  return <MemberPriceAlerts key={cloud.user.id} instrumentId={instrumentId} simple={simple} />
}

function MemberPriceAlerts({ instrumentId, simple }: { instrumentId?: string | null; simple: boolean }) {
  const { language } = useLanguage(), ko = language === 'ko'
  const [now, setNow] = useState(Date.now)
  const [rules, setRules] = useState<PriceAlert[]>([]), [channel, setChannel] = useState<TelegramStatus | null>(null)
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [filter, setFilter] = useState<'active' | 'all'>('active'), revision = useRef(0), mutating = useRef(false), alive = useRef(true)
  const load = useCallback(async () => {
    if (mutating.current) return
    const version = ++revision.current
    try { const [data, telegram] = await Promise.all([readPriceAlerts(), cloudRequest<TelegramStatus>('/telegram')]); if (alive.current && version === revision.current) { setRules(data.rules); setChannel(telegram); setError('') } }
    catch (e) { if (alive.current && version === revision.current) setError(e instanceof Error ? e.message : 'Could not load alerts.') }
    finally { if (alive.current && version === revision.current) { setLoading(false); setNow(Date.now()) } }
  }, [])
  // The initial load synchronizes with the server; all state updates occur after the request resolves.
  // oxlint-disable-next-line react/set-state-in-effect -- Initial synchronization with the external member server.
  useEffect(() => { alive.current = true; void load(); const timer = setInterval(() => void load(), 15_000); return () => { alive.current = false; clearInterval(timer) } }, [load])
  const change = async (work: () => Promise<{ rules: PriceAlert[] }>) => {
    if (mutating.current) return
    mutating.current = true; revision.current++; setBusy(true); setMessage('')
    try { const result = await work(); if (alive.current) { setRules(result.rules); setError(''); setMessage(ko ? '알림 설정을 반영했어요.' : 'Alert settings updated.') } }
    catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Could not update alerts.') }
    finally { mutating.current = false; if (alive.current) setBusy(false) }
  }
  const matching = rules.filter(r => !instrumentId || alertInstrumentId(r.instrument) === instrumentId)
  const visible = matching.filter(r => filter === 'all' || r.active)
  const delivery = ko ? { off: '앱에 기록', pending: '발송 대기', sending: '발송 확인 중', sent: '텔레그램 접수 확인', uncertain: '발송 여부 미확인' } : { off: 'Recorded in app', pending: 'Queued', sending: 'Sending', sent: 'Accepted by Telegram', uncertain: 'Delivery uncertain' }
  return <section aria-label={ko ? '내 가격 알림' : 'My price alerts'}>
    <div className={styles.head}><h2>{ko ? '내 가격 알림' : 'My price alerts'}</h2><button type="button" disabled={busy} onClick={() => void load()}>{ko ? '새로고침' : 'Refresh'}</button></div>
    {simple ? <p>{ko ? '설정한 가격에 도착했는지, 휴대폰으로 발송됐는지 먼저 확인하세요. 화면을 닫아도 서버가 확인해요.' : 'See whether your level was crossed and whether a phone notification was sent. The server checks while the app is closed.'}</p> : <p>{ko ? '서버가 약 15초마다 확인합니다. 첫 시세와 연결 복구 직후에는 알림을 만들지 않고, 이후 가격 통과부터 기록합니다.' : 'The server checks about every 15 seconds. First quotes and quotes after gaps establish a baseline; subsequent crossings create events.'}</p>}
    <p>{channel?.connected ? ko ? '텔레그램 연결됨 · 알림별로 휴대폰 발송을 켤 수 있어요.' : 'Telegram connected · enable delivery per alert.' : ko ? channel?.available ? '휴대폰으로 받으려면 내 텔레그램을 연결하세요. 앱 감지 기록은 계속 남습니다.' : '휴대폰 발송 연결 준비 중 · 앱에서 감지 기록을 확인할 수 있어요.' : 'Phone delivery is not connected. Observations remain available here.'} <Link to="/settings">{ko ? '연결·테스트 알림' : 'Connect and test delivery'} →</Link></p>
    <div className={styles.actions}><button type="button" aria-pressed={filter === 'active'} onClick={() => setFilter('active')}>{ko ? '진행 중' : 'Active'} ({matching.filter(r => r.active).length})</button><button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{ko ? '종료 기록 포함' : 'Include ended alerts'}</button>{instrumentId && <Link to="/review-alerts">{ko ? '모든 종목 알림' : 'All assets'}</Link>}</div>
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status">{message}</p>}
    {loading ? <p role="status">{ko ? '저장한 알림 확인 중…' : 'Loading saved alerts…'}</p> : !visible.length && !error && <article className={styles.tile}><h3>{ko ? '표시할 가격 알림이 없어요' : 'No price alerts to show'}</h3><p>{ko ? '종목 분석에서 ‘이 가격에 알림 받기’를 눌러 시작하세요. 예전에 저장한 가격 기준은 아래에서 계속 확인할 수 있어요.' : 'Start with “Alert me at this price” in asset analysis. Previously saved plans remain available below.'}</p><Link to={instrumentId ? `/my-analysis?instrumentId=${encodeURIComponent(instrumentId)}` : '/my-analysis'}>{ko ? '종목 분석으로' : 'Open analysis'} →</Link></article>}
    <div className={styles.alertList}>{visible.map(rule => {
      const i = rule.instrument, latest = rule.events.at(-1), stale = rule.active && rule.checkedAt !== null && now - rule.checkedAt > 90_000
      const price = (n: number) => `${n.toLocaleString(language, { maximumSignificantDigits: 9 })} ${i.quote}`
      return <article key={rule.id} className={styles.tile}>
        <div className={styles.head}><h3>{i.asset}/{i.quote}</h3><span className={styles.tag}>{!rule.active ? ko ? '종료됨' : 'Ended' : rule.issue || stale ? ko ? '시세 확인 지연' : 'Quote delayed' : rule.checkedAt ? ko ? '확인 중' : 'Monitoring' : ko ? '첫 시세 대기' : 'Awaiting first quote'}</span></div>
        <small>{alertVenueLabel(i, ko)}</small>
        {simple ? <><p>{rule.above !== null && (ko ? `${price(rule.above)} 위로 오르면 알림` : `Alert above ${price(rule.above)}`)}</p><p>{rule.below !== null && (ko ? `${price(rule.below)} 아래로 내리면 알림` : `Alert below ${price(rule.below)}`)}</p><p><strong>{latest ? (ko ? '가격을 통과한 기록이 있어요' : 'A price crossing was recorded') : (ko ? '아직 가격 통과 기록이 없어요' : 'No price crossing recorded yet')}</strong></p></> : <p>{rule.above !== null && `↑ ${price(rule.above)} `}{rule.below !== null && `↓ ${price(rule.below)}`}</p>}
        <details open={!simple || !!rule.issue || stale}><summary>{ko ? '감시 상태·마지막 확인 시각' : 'Monitoring status and last check'}</summary><p>{ko ? '최근 서버 확인' : 'Last server check'} · {rule.checkedAt ? new Date(rule.checkedAt).toLocaleString(language) : ko ? '아직 없음' : 'Not yet'}{rule.issue && ` · ${rule.issue}`}</p><p>{ko ? '약 15초마다 확인하며 첫 시세·연결 복구 직후에는 비교 기준만 잡아요. 그다음 가격 통과부터 기록합니다.' : 'Checks about every 15 seconds. First quotes and quotes after gaps set a baseline; subsequent crossings are recorded.'}</p></details>
        {latest && <p><strong>{ko ? '최근 감지' : 'Latest observation'}</strong> · {new Date(latest.at).toLocaleString(language)} · {latest.kind === 'above' ? '↑' : '↓'} {price(latest.threshold)} · {delivery[latest.delivery]}</p>}
        <div className={styles.actions}><Link to={`/my-analysis?instrumentId=${encodeURIComponent(alertInstrumentId(i))}`}>{ko ? '같은 종목 다시 분석' : 'Reanalyse this asset'} →</Link>{rule.active && <><button disabled={busy || !channel?.connected && !rule.notify} onClick={() => void change(() => setPriceAlertNotification(rule.id, !rule.notify))}>{ko ? rule.notify ? '휴대폰 발송 끄기' : '휴대폰 발송 켜기' : rule.notify ? 'Disable phone delivery' : 'Enable phone delivery'}</button><button disabled={busy} onClick={() => void change(() => stopPriceAlert(rule.id))}>{ko ? '알림 종료' : 'End alert'}</button></>}</div>
        <details><summary>{ko ? `가격 통과 기록 ${rule.events.length}건` : `${rule.events.length} crossing observations`}</summary>{rule.events.length ? <ul>{[...rule.events].reverse().map(e => <li key={e.id}>{new Date(e.at).toLocaleString(language)} · {e.kind === 'above' ? '↑' : '↓'} {price(e.threshold)} · {ko ? '관측 가격' : 'Observed'} {price(e.price)} · {delivery[e.delivery]}</li>)}</ul> : <p>{ko ? '아직 가격 통과를 관측하지 않았어요.' : 'No crossing observed yet.'}</p>}<p>{ko ? '가격 통과는 봉 마감·전략 조건 충족·실제 체결을 뜻하지 않습니다. 휴대폰 발송을 켜면 이후 발생한 알림부터 전달합니다.' : 'Crossings do not confirm candle closes, strategy conditions or executed trades. Enabling delivery applies to future events.'}</p></details>
      </article>
    })}</div>
  </section>
}
