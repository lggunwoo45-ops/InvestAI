import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { marketDataService } from '@/services/market/marketDataService'
import { localAiCall } from '@/services/ai/localAiClient'
import { notificationPermission, notificationPreference, setNotificationPreference } from '@/services/scenarios/browserNotifications'
import styles from './SettingsPage.module.css'

export function SettingsPage() {
  const { language, setLanguage } = useLanguage()
  const ko = language === 'ko'
  const { displayMode, setDisplayMode } = useDisplayMode()
  const { marketDataMode, setMarketDataMode } = useMarketWorkspace()
  const { result: news, refresh } = useNewsProviderMode()
  const [connection, setConnection] = useState('')
  const [busy, setBusy] = useState(false)
  const [permission, setPermission] = useState(notificationPermission)
  const [preference, setPreference] = useState(notificationPreference)
  const [notice, setNotice] = useState('')
  const [notificationBusy, setNotificationBusy] = useState(false)
  const [ai, setAi] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const aiController = useRef<AbortController | null>(null)
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  useEffect(() => {
    const update = () => { setPreference(notificationPreference()); setPermission(notificationPermission()) }
    window.addEventListener('storage', update); window.addEventListener('focus', update)
    return () => { controller.current?.abort(); aiController.current?.abort(); window.removeEventListener('storage', update); window.removeEventListener('focus', update) }
  }, [])
  const check = async () => {
    controller.current?.abort()
    const current = new AbortController(); controller.current = current
    const timer = setTimeout(() => current.abort(), 12_000)
    setBusy(true); setConnection('')
    try {
      const catalog = await marketDataService.getMarketCatalog('upbit-krw', 'live', true, current.signal)
      if (controller.current === current) setConnection(catalog.source === 'live' && catalog.instruments.length ? (ko ? `업비트 연결 확인 · ${catalog.instruments.length}개 종목 · ${new Date(catalog.fetchedAt).toLocaleTimeString()}` : `Upbit connected · ${catalog.instruments.length} instruments`) : (ko ? '실제 목록을 확인하지 못했어요.' : 'Live catalog not verified.'))
    } catch { if (controller.current === current) setConnection(ko ? '연결을 확인하지 못했어요. 다시 시도해주세요.' : 'Connection could not be verified. Please retry.') }
    finally { clearTimeout(timer); if (controller.current === current) setBusy(false) }
  }
  const checkAi = async () => {
    if (!local) return
    aiController.current?.abort()
    const current = new AbortController(); aiController.current = current
    const timer = setTimeout(() => current.abort(), 5_000)
    setAiBusy(true)
    try {
      const health = await localAiCall('health', undefined, current.signal) as { enabled?: unknown }
      setAi(health?.enabled === true ? (ko ? '로컬 AI 서버 설정 확인. 실제 요청은 자료·비용 확인 후 직접 실행해요.' : 'Local AI configured. Review evidence and cost before each manual request.') : (ko ? 'AI 서버가 꺼져 있거나 아직 설정되지 않았어요.' : 'AI is disabled or not configured.'))
    } catch { setAi(ko ? 'AI 서버에 연결되지 않았어요. 아래 설정 안내를 확인해주세요.' : 'AI server unavailable. Review setup below.') }
    finally { clearTimeout(timer); setAiBusy(false) }
  }
  const toggleNotifications = async () => {
    if (notificationBusy) return
    setNotificationBusy(true); setNotice('')
    try {
      if (preference.enabled) setNotificationPreference(false)
      else {
        const granted = await Notification.requestPermission()
        setPermission(granted)
        if (granted !== 'granted') { setNotice(ko ? '브라우저에서 알림을 허용해야 해요. 화면 안 알림은 계속 사용할 수 있어요.' : 'Browser permission is required. In-app alerts remain available.'); return }
        setNotificationPreference(true)
      }
      setPreference(notificationPreference())
    } catch { setNotice(ko ? '설정을 저장하지 못했어요. 브라우저의 알림·저장 권한을 확인해주세요.' : 'Could not save. Check browser notification and storage permissions.') }
    finally { setNotificationBusy(false) }
  }
  return <div className={styles.page}>
    <h1>{ko ? '설정과 연결 상태' : 'Settings and connections'}</h1>
    <p>{ko ? '화면을 내게 맞추고, 실제로 연결된 기능을 확인하세요.' : 'Choose your view and check which services are connected.'}</p>
    <div className={styles.grid}>
      <section className={styles.card}><h2>{ko ? '내 화면' : 'My view'}</h2>
        <label>{ko ? '설명 수준' : 'Detail'}<select value={displayMode} onChange={e => setDisplayMode(e.target.value as 'simple' | 'expert')}><option value="simple">{ko ? '쉽게 보기' : 'Simple'}</option><option value="expert">{ko ? '자세히 보기' : 'Expert'}</option></select></label>
        <label>{ko ? '언어' : 'Language'}<select value={language} onChange={e => setLanguage(e.target.value as 'ko' | 'en')}><option value="ko">한국어</option><option value="en">English</option></select></label>
        <label>{ko ? '시세 모드' : 'Quote mode'}<select value={marketDataMode} onChange={e => setMarketDataMode(e.target.value as 'live' | 'mock')}><option value="live">{ko ? '실제 시세' : 'Live'}</option><option value="mock">{ko ? '예시 시세' : 'Demo'}</option></select></label>
        <p>{ko ? '보유 내역은 이 브라우저에 저장돼요. 기기를 바꾸기 전 내 투자에서 백업해주세요.' : 'Holdings stay in this browser. Export a backup before switching devices.'}</p><Link to="/portfolio">{ko ? '내 투자·백업 열기 →' : 'Holdings and backup →'}</Link>
      </section>
      <section className={styles.card}><h2>{ko ? '시세와 뉴스' : 'Quotes and news'}</h2>
        <button type="button" disabled={busy} onClick={() => void check()}>{busy ? (ko ? '확인 중…' : 'Checking…') : (ko ? '업비트 연결 확인' : 'Check Upbit')}</button><p role="status">{connection}</p>
        <p>{ko ? '뉴스' : 'News'}: {news?.articles.filter(a => !a.isMock).length ?? 0}{ko ? '개 실제 기사' : ' real articles'} · {news?.source ?? (ko ? '연결 확인 중' : 'Checking')}</p>
        <button type="button" onClick={() => refresh?.()} disabled={!refresh}>{ko ? '뉴스 다시 불러오기' : 'Refresh news'}</button><Link to="/news">{ko ? '뉴스 보기 →' : 'News →'}</Link>
      </section>
      <section className={styles.card}><h2>{ko ? '가격 변화 알림' : 'Price-change notifications'}</h2>
        <p>{ko ? '내 투자에 저장한 시나리오를 감시해요. 이 탭이 화면에 보이는 동안만 작동하며, 앱 종료·다른 탭·절전 중에는 알리지 못해요.' : 'Monitors saved scenarios while this tab is visible. Closed apps, hidden tabs and sleep are not monitored.'}</p>
        <p>{ko ? '브라우저 알림' : 'Browser notifications'}: {permission === 'unsupported' ? (ko ? '지원하지 않음' : 'Unsupported') : preference.enabled && permission === 'granted' ? (ko ? '사용 중' : 'On') : (ko ? '꺼짐' : 'Off')}</p>
        <button type="button" disabled={notificationBusy || permission === 'unsupported' || preference.error} onClick={() => void toggleNotifications()}>{preference.enabled ? (ko ? '브라우저 알림 끄기' : 'Turn off notifications') : (ko ? '브라우저 알림 허용' : 'Enable notifications')}</button>
        <p role="status">{preference.error ? (ko ? '저장 설정을 읽지 못해 변경을 중지했어요.' : 'Stored preferences could not be read; changes are blocked.') : notice}</p><Link to="/portfolio">{ko ? '감시할 시나리오 관리 →' : 'Manage monitored scenarios →'}</Link>
      </section>
      <section className={styles.card}><h2>{ko ? 'AI 연결' : 'AI connection'}</h2>
        <p>{ko ? '가격 분석·자료 질문은 현재 자료와 규칙으로 작동해요. 자유 대화 AI는 아직 연결되지 않았어요.' : 'Price analysis and evidence questions use data and rules. Free-form conversational AI is not connected.'}</p>
        {local && <button type="button" disabled={aiBusy} onClick={() => void checkAi()}>{aiBusy ? (ko ? '확인 중…' : 'Checking…') : (ko ? '로컬 AI 연결 확인' : 'Check local AI')}</button>}<p role="status">{ai}</p>
        <details><summary>{ko ? '연결에 필요한 것' : 'What setup requires'}</summary><p>{ko ? 'AI 서비스 계정·API 키·월 지출 한도를 서버에 설정해야 해요. 키를 이 화면이나 채팅에 입력하지 마세요. 현재 PC용 연결은 마켓의 AI 패널에서 비용 확인 후 실행할 수 있어요. 공개 사이트의 자유 대화는 사용자 인증과 서버 비용 제한을 추가해야 제공할 수 있어요.' : 'Configure an AI account, API key and budget on the server. Never enter secrets here or in chat. The PC gateway supports manual explanations after cost review. Public conversational AI still needs authentication and per-user limits.'}</p></details>
      </section>
    </div>
    <section className={styles.card}><h2>{ko ? '가격 계획과 과거 검증' : 'Planning and historical checks'}</h2>
      <p>{ko ? '자동 주문 없이 가격 계획의 손익을 계산하고, 과거 일봉으로 단순 전략을 시험해보세요.' : 'Calculate a price plan and test a simple rule against historical daily bars.'}</p>
      <Link to="/trading">{ko ? '매수 계획 계산 →' : 'Plan a purchase →'}</Link><Link to="/strategies">{ko ? '과거 데이터로 시험 →' : 'Historical strategy test →'}</Link>
    </section>
  </div>
}
