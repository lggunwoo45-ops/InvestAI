import type { Language } from '@/i18n/translations'
import styles from './BetaLimitationsPanel.module.css'

interface BetaLimitationsPanelProps { language: Language }
const copy = {
  en: { title: 'Not included in this beta', help: 'The current review workflow remains available while these capabilities stay intentionally disabled.', items: ['Automated trading', 'Order execution', 'Full live stock data integration', 'Real AI summarization', 'Profit guarantees', 'Portfolio storage', 'Paid subscription', 'Account sync'] },
  ko: { title: '현재 베타에서 제공하지 않는 것', help: '아래 기능은 의도적으로 비활성화되어 있으며, 현재의 검토 흐름은 계속 사용할 수 있습니다.', items: ['자동매매', '주문 실행', '실시간 주식 데이터 전체 연동', '실제 AI 요약', '수익 보장', '개인 포트폴리오 저장', '유료 결제', '계정 동기화'] },
} as const

export function BetaLimitationsPanel({ language }: BetaLimitationsPanelProps) {
  const t = copy[language]
  return <details className={styles.panel}><summary><strong>{t.title}</strong><span>{t.help}</span></summary><ul>{t.items.map((item) => <li key={item}>{item}</li>)}</ul></details>
}
