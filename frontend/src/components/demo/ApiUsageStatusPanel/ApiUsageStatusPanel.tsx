import type { Language } from '@/i18n/translations'
import type { ApiUsageId, ApiUsageItem, ApiUsageStatus } from '@/services/health/dependencyHealth'
import styles from './ApiUsageStatusPanel.module.css'

interface ApiUsageStatusPanelProps {
  items: readonly ApiUsageItem[]
  language: Language
}

const copy: Record<Language, {
  title: string
  description: string
  privacy: string
  labels: Record<ApiUsageId, string>
  statuses: Record<ApiUsageStatus, string>
}> = {
  en: {
    title: 'API usage status',
    description: 'Private exchange APIs, brokerage APIs, and real AI APIs are not used. DART_API_KEY is used only by the server-side proxy.',
    privacy: 'Key value is never displayed.',
    labels: { 'news-proxy': 'News proxy', 'dart-proxy': 'DART proxy', 'dart-api-key': 'DART API key', 'real-ai': 'Real AI', trading: 'Trading' },
    statuses: { active: 'Active', notConfigured: 'Not configured', disabled: 'Disabled', unavailable: 'Unavailable', unknown: 'Unknown' },
  },
  ko: {
    title: 'API 사용 상태',
    description: '현재 개인 거래소 API, 증권사 API, 실제 AI API는 사용하지 않습니다. DART API 키는 서버 프록시에서만 사용됩니다.',
    privacy: '키 값은 표시하지 않습니다.',
    labels: { 'news-proxy': '뉴스 프록시', 'dart-proxy': 'DART 프록시', 'dart-api-key': 'DART API 키', 'real-ai': '실제 AI', trading: '거래 기능' },
    statuses: { active: '사용 중', notConfigured: '미설정', disabled: '비활성화', unavailable: '연결 불가', unknown: '확인 전' },
  },
}

export function ApiUsageStatusPanel({ items, language }: ApiUsageStatusPanelProps) {
  const t = copy[language]
  return <section className={styles.panel} aria-labelledby="api-usage-status-title">
    <header>
      <div><span>API VISIBILITY</span><h2 id="api-usage-status-title">{t.title}</h2></div>
      <small>{t.privacy}</small>
    </header>
    <p>{t.description}</p>
    <ul aria-live="polite">{items.map((item) => <li key={item.id} data-status={item.status}>
      <span>{t.labels[item.id]}</span>
      <strong><i aria-hidden="true" />{t.statuses[item.status]}</strong>
    </li>)}</ul>
  </section>
}
