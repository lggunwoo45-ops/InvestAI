import type { Language } from '@/i18n/translations'
import type { DependencyHealthId, DependencyHealthItem, DependencyHealthStatus } from '@/services/health/dependencyHealth'
import styles from './BetaSystemStatusPanel.module.css'

interface BetaSystemStatusPanelProps {
  items: readonly DependencyHealthItem[]
  language: Language
}

const copy: Record<Language, {
  eyebrow: string
  title: string
  note: string
  labels: Record<DependencyHealthId, string>
  statuses: Record<DependencyHealthStatus, string>
  dart: { proxyReady: string; proxyNotChecked: string; keyConfigured: string; keyNotConfigured: string; keyNotChecked: string }
}> = {
  en: {
    eyebrow: 'OBSERVED DEPENDENCIES', title: 'Beta system status', note: 'DART status follows the local proxy health check; no OpenDART request is made.',
    labels: { 'market-data': 'Market data', 'news-proxy': 'News proxy', 'dart-proxy': 'DART proxy', 'dart-api-key': 'DART API key', 'real-ai': 'Real AI', trading: 'Trading' },
    statuses: { ready: 'Ready', disabled: 'Disabled', unavailable: 'Unavailable', limited: 'Limited', unknown: 'Configuration needed' },
    dart: { proxyReady: 'Ready', proxyNotChecked: 'Not checked', keyConfigured: 'Configured', keyNotConfigured: 'Not configured', keyNotChecked: 'Not checked' },
  },
  ko: {
    eyebrow: '확인된 의존성', title: '베타 시스템 상태', note: 'DART 상태는 로컬 프록시 health 확인 결과를 따르며, OpenDART를 직접 호출하지 않습니다.',
    labels: { 'market-data': '시장 데이터', 'news-proxy': '뉴스 프록시', 'dart-proxy': 'DART 프록시', 'dart-api-key': 'DART API 키', 'real-ai': '실제 AI', trading: '거래' },
    statuses: { ready: '준비됨', disabled: '비활성화', unavailable: '사용 불가', limited: '제한됨', unknown: '설정 필요' },
    dart: { proxyReady: '사용 가능', proxyNotChecked: '확인 전', keyConfigured: '설정됨', keyNotConfigured: '미설정', keyNotChecked: '확인 전' },
  },
}

function statusLabel(item: DependencyHealthItem, language: Language): string {
  const t = copy[language]
  if (item.id === 'dart-proxy' && item.status === 'ready') return t.dart.proxyReady
  if (item.id === 'dart-proxy' && item.status === 'unknown') return t.dart.proxyNotChecked
  if (item.id === 'dart-api-key') {
    if (item.status === 'ready') return t.dart.keyConfigured
    if (item.status === 'disabled') return t.dart.keyNotConfigured
    if (item.status === 'unknown') return t.dart.keyNotChecked
  }
  return t.statuses[item.status]
}

export function BetaSystemStatusPanel({ items, language }: BetaSystemStatusPanelProps) {
  const t = copy[language]
  return <section className={styles.panel} aria-labelledby="beta-system-status-title">
    <header><span>{t.eyebrow}</span><h2 id="beta-system-status-title">{t.title}</h2></header>
    <ul>{items.map((item) => <li key={item.id} data-status={item.status}><i aria-hidden="true" /><span>{t.labels[item.id]}</span><strong>{statusLabel(item, language)}</strong></li>)}</ul>
    <p>{t.note}</p>
  </section>
}
