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
}> = {
  en: {
    eyebrow: 'OBSERVED DEPENDENCIES', title: 'Beta system status', note: 'This panel reports states already observed by the app. It does not run additional network checks.',
    labels: { 'market-data': 'Market data', 'news-proxy': 'News proxy', 'dart-proxy': 'DART proxy', 'dart-api-key': 'DART API key', 'real-ai': 'Real AI', trading: 'Trading' },
    statuses: { ready: 'Ready', disabled: 'Disabled', unavailable: 'Unavailable', limited: 'Limited', unknown: 'Configuration needed' },
  },
  ko: {
    eyebrow: '확인된 의존성', title: '베타 시스템 상태', note: '앱이 이미 확인한 상태만 표시하며 별도의 네트워크 점검을 실행하지 않습니다.',
    labels: { 'market-data': '시장 데이터', 'news-proxy': '뉴스 프록시', 'dart-proxy': 'DART 프록시', 'dart-api-key': 'DART API 키', 'real-ai': '실제 AI', trading: '거래' },
    statuses: { ready: '준비됨', disabled: '비활성화', unavailable: '사용 불가', limited: '제한됨', unknown: '설정 필요' },
  },
}

export function BetaSystemStatusPanel({ items, language }: BetaSystemStatusPanelProps) {
  const t = copy[language]
  return <section className={styles.panel} aria-labelledby="beta-system-status-title">
    <header><span>{t.eyebrow}</span><h2 id="beta-system-status-title">{t.title}</h2></header>
    <ul>{items.map((item) => <li key={item.id} data-status={item.status}><i aria-hidden="true" /><span>{t.labels[item.id]}</span><strong>{t.statuses[item.status]}</strong></li>)}</ul>
    <p>{t.note}</p>
  </section>
}
