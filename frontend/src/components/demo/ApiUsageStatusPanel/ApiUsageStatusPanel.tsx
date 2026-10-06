import { useEffect, useRef, useState } from 'react'

import type { Language } from '@/i18n/translations'
import { checkDartConnection as requestDartConnection, MANUAL_DART_HEALTH_ENDPOINT } from '@/services/dart/dartClient'
import type { ApiUsageId, ApiUsageItem, ApiUsageStatus } from '@/services/health/dependencyHealth'
import type { DartProxyHealthResult } from '@/types/dart'
import styles from './ApiUsageStatusPanel.module.css'

interface ApiUsageStatusPanelProps {
  items: readonly ApiUsageItem[]
  language: Language
  checkDartConnection?: () => Promise<DartProxyHealthResult>
}

type ManualDartState = 'idle' | 'checking' | 'ready' | 'notConfigured' | 'failed'

const copy: Record<Language, {
  title: string
  description: string
  privacy: string
  endpoint: string
  check: string
  idle: string
  checking: string
  labels: Record<ApiUsageId, string>
  statuses: Record<ApiUsageStatus, string>
  dart: { proxyReady: string; proxyFailed: string; keyConfigured: string; keyNotConfigured: string; keyFailed: string }
}> = {
  en: {
    title: 'API usage status',
    description: 'Private exchange APIs, brokerage APIs, and real AI APIs are not used. DART_API_KEY is used only by the server-side proxy.',
    privacy: 'Key value is never displayed.',
    endpoint: `Endpoint: ${MANUAL_DART_HEALTH_ENDPOINT}`,
    check: 'Check DART connection',
    idle: 'DART connection has not been checked yet.',
    checking: 'Checking DART connection...',
    labels: { 'news-proxy': 'News proxy', 'dart-proxy': 'DART proxy', 'dart-api-key': 'DART API key', 'real-ai': 'Real AI', trading: 'Trading' },
    statuses: { active: 'Active', notConfigured: 'Not configured', disabled: 'Disabled', unavailable: 'Unavailable', unknown: 'Unknown' },
    dart: { proxyReady: 'Ready', proxyFailed: 'Connection failed', keyConfigured: 'Configured', keyNotConfigured: 'Not configured', keyFailed: 'Could not be checked' },
  },
  ko: {
    title: 'API 사용 상태',
    description: '현재 개인 거래소 API, 증권사 API, 실제 AI API는 사용하지 않습니다. DART API 키는 서버 프록시에서만 사용됩니다.',
    privacy: '키 값은 표시하지 않습니다.',
    endpoint: `확인 경로: ${MANUAL_DART_HEALTH_ENDPOINT}`,
    check: 'DART 연결 확인',
    idle: 'DART 연결 상태를 아직 확인하지 않았습니다.',
    checking: 'DART 연결 확인 중...',
    labels: { 'news-proxy': '뉴스 프록시', 'dart-proxy': 'DART 프록시', 'dart-api-key': 'DART API 키', 'real-ai': '실제 AI', trading: '거래 기능' },
    statuses: { active: '사용 중', notConfigured: '미설정', disabled: '비활성화', unavailable: '연결 불가', unknown: '확인 전' },
    dart: { proxyReady: '사용 가능', proxyFailed: '연결 실패', keyConfigured: '설정됨', keyNotConfigured: '미설정', keyFailed: '확인 불가' },
  },
}

export function ApiUsageStatusPanel({ items, language, checkDartConnection = requestDartConnection }: ApiUsageStatusPanelProps) {
  const t = copy[language]
  const [dartState, setDartState] = useState<ManualDartState>('idle')
  const requestId = useRef(0)
  const staticItems = items.filter((item) => item.id !== 'dart-proxy' && item.id !== 'dart-api-key')

  useEffect(() => () => { requestId.current += 1 }, [])

  const runDartCheck = async () => {
    const currentRequest = ++requestId.current
    setDartState('checking')
    try {
      const result = await checkDartConnection()
      if (currentRequest !== requestId.current) return
      setDartState(result.status === 'ready' ? 'ready' : result.status === 'disabled' ? 'notConfigured' : 'failed')
    } catch {
      if (currentRequest === requestId.current) setDartState('failed')
    }
  }

  const showResult = dartState === 'ready' || dartState === 'notConfigured' || dartState === 'failed'
  const proxyText = dartState === 'failed' ? t.dart.proxyFailed : t.dart.proxyReady
  const keyText = dartState === 'ready' ? t.dart.keyConfigured : dartState === 'notConfigured' ? t.dart.keyNotConfigured : t.dart.keyFailed
  return <section className={styles.panel} aria-labelledby="api-usage-status-title">
    <header>
      <div><span>API VISIBILITY</span><h2 id="api-usage-status-title">{t.title}</h2></div>
      <small>{t.privacy}</small>
    </header>
    <p>{t.description}</p>
    <ul className={styles.apiItems}>{staticItems.map((item) => <li key={item.id} data-status={item.status}>
      <span>{t.labels[item.id]}</span>
      <strong><i aria-hidden="true" />{t.statuses[item.status]}</strong>
    </li>)}</ul>
    <div className={styles.dartCheck}>
      <header><div><b>DART</b><small>{t.endpoint}</small></div><button type="button" onClick={() => { void runDartCheck() }} disabled={dartState === 'checking'}>{t.check}</button></header>
      <div className={styles.dartResult} role="status" aria-live="polite" aria-atomic="true">
        {!showResult && <p>{dartState === 'checking' ? t.checking : t.idle}</p>}
        {showResult && <ul>
          <li data-status={dartState === 'failed' ? 'unavailable' : 'active'}><span>{`${t.labels['dart-proxy']}: `}</span><strong><i aria-hidden="true" />{proxyText}</strong></li>
          <li data-status={dartState === 'ready' ? 'active' : dartState === 'notConfigured' ? 'notConfigured' : 'unavailable'}><span>{`${t.labels['dart-api-key']}: `}</span><strong><i aria-hidden="true" />{keyText}</strong></li>
        </ul>}
      </div>
    </div>
  </section>
}
