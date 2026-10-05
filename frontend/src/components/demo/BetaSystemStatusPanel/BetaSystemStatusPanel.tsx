import type { Language } from '@/i18n/translations'
import type { DartHealthUiState, DependencyHealthId, DependencyHealthItem, DependencyHealthStatus } from '@/services/health/dependencyHealth'
import styles from './BetaSystemStatusPanel.module.css'

interface BetaSystemStatusPanelProps {
  items: readonly DependencyHealthItem[]
  language: Language
  dartHealthState: DartHealthUiState
}

const copy: Record<Language, {
  eyebrow: string
  title: string
  note: string
  labels: Record<DependencyHealthId, string>
  statuses: Record<DependencyHealthStatus, string>
  dart: { proxyChecking: string; proxyReady: string; proxyUnavailable: string; keyConfigured: string; keyNotConfigured: string; keyNotChecked: string }
}> = {
  en: {
    eyebrow: 'OBSERVED DEPENDENCIES', title: 'Beta system status', note: 'DART status follows the local proxy health check; no OpenDART request is made.',
    labels: { 'market-data': 'Market data', 'news-proxy': 'News proxy', 'dart-proxy': 'DART proxy', 'dart-api-key': 'DART API key', 'real-ai': 'Real AI', trading: 'Trading' },
    statuses: { ready: 'Ready', disabled: 'Disabled', unavailable: 'Unavailable', limited: 'Limited', unknown: 'Configuration needed' },
    dart: { proxyChecking: 'Checking', proxyReady: 'Ready', proxyUnavailable: 'Unavailable', keyConfigured: 'Configured', keyNotConfigured: 'Not configured', keyNotChecked: 'Not checked' },
  },
  ko: {
    eyebrow: '확인된 의존성', title: '베타 시스템 상태', note: 'DART 상태는 로컬 프록시 health 확인 결과를 따르며, OpenDART를 직접 호출하지 않습니다.',
    labels: { 'market-data': '시장 데이터', 'news-proxy': '뉴스 프록시', 'dart-proxy': 'DART 프록시', 'dart-api-key': 'DART API 키', 'real-ai': '실제 AI', trading: '거래' },
    statuses: { ready: '준비됨', disabled: '비활성화', unavailable: '사용 불가', limited: '제한됨', unknown: '설정 필요' },
    dart: { proxyChecking: '확인 중', proxyReady: '사용 가능', proxyUnavailable: '사용 불가', keyConfigured: '설정됨', keyNotConfigured: '미설정', keyNotChecked: '확인 전' },
  },
}

function resolvedStatus(item: DependencyHealthItem, dartHealthState: DartHealthUiState): DependencyHealthStatus {
  if (item.id === 'dart-proxy') {
    if (dartHealthState === 'unavailable') return 'unavailable'
    if (dartHealthState === 'checking') return 'unknown'
    return 'ready'
  }
  if (item.id === 'dart-api-key') {
    if (dartHealthState === 'ready') return 'ready'
    if (dartHealthState === 'notConfigured') return 'disabled'
    return 'unknown'
  }
  return item.status
}

function statusLabel(item: DependencyHealthItem, language: Language, dartHealthState: DartHealthUiState): string {
  const t = copy[language]
  if (item.id === 'dart-proxy') {
    if (dartHealthState === 'checking') return t.dart.proxyChecking
    if (dartHealthState === 'unavailable') return t.dart.proxyUnavailable
    return t.dart.proxyReady
  }
  if (item.id === 'dart-api-key') {
    if (dartHealthState === 'ready') return t.dart.keyConfigured
    if (dartHealthState === 'notConfigured') return t.dart.keyNotConfigured
    return t.dart.keyNotChecked
  }
  return t.statuses[item.status]
}

export function BetaSystemStatusPanel({ items, language, dartHealthState }: BetaSystemStatusPanelProps) {
  const t = copy[language]
  return <section className={styles.panel} aria-labelledby="beta-system-status-title">
    <header><span>{t.eyebrow}</span><h2 id="beta-system-status-title">{t.title}</h2></header>
    <ul aria-live="polite">{items.map((item) => <li key={item.id} data-status={resolvedStatus(item, dartHealthState)}><i aria-hidden="true" /><span>{t.labels[item.id]}</span><strong>{statusLabel(item, language, dartHealthState)}</strong></li>)}</ul>
    <p>{t.note}</p>
  </section>
}
