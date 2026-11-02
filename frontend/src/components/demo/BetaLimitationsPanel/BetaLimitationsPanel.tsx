import type { Language } from '@/i18n/translations'
import styles from './BetaLimitationsPanel.module.css'

interface BetaLimitationsPanelProps { language: Language }
const copy = {
  en: { title: 'Limits of this free beta', help: 'Analysis, saved portfolios and member sync are available. Server-dependent features are listed separately below.', items: ['No automated trading or order execution', 'Stock coverage depends on the connected data provider', 'No hosted conversational AI; current explanations use rules', 'Simulated outcomes are not verified account returns', 'No paid subscription or checkout'] },
  ko: { title: '무료 베타의 이용 범위와 한계', help: '분석·포트폴리오 저장·회원 동기화를 제공합니다. 서버 연결이 필요한 기능의 현재 상태는 아래에서 확인할 수 있습니다.', items: ['자동매매·주문 실행은 제공하지 않습니다.', '주식 데이터 범위는 연결된 제공처에 따라 다릅니다.', '공개 서비스의 설명은 규칙 기반이며 대화형 AI가 연결되지 않았습니다.', '가상 검증 결과는 실제 계좌 수익률이나 검증된 수익성을 뜻하지 않습니다.', '유료 구독·결제는 아직 제공하지 않습니다.'] },
} as const

export function BetaLimitationsPanel({ language }: BetaLimitationsPanelProps) {
  const t = copy[language]
  return <details className={styles.panel}><summary><strong>{t.title}</strong><span>{t.help}</span></summary><ul>{t.items.map((item) => <li key={item}>{item}</li>)}</ul></details>
}
