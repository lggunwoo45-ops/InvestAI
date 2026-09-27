import type { Language } from '@/i18n/translations'
import styles from './BetaReadinessChecklist.module.css'

interface BetaReadinessChecklistProps { language: Language }
const copy = {
  en: { eyebrow: 'INTERNAL RELEASE VIEW', title: 'Beta readiness', ready: 'Available', conditional: 'Optional / configured', disabled: 'Intentionally disabled', items: [['ready', 'Candidate snapshots fixed'], ['ready', 'Practical decision card available'], ['ready', 'Review ranges available'], ['ready', 'My Analysis available'], ['conditional', 'DART evidence available for Korean stocks when configured'], ['conditional', 'News proxy optional'], ['disabled', 'Trading disabled'], ['disabled', 'Real AI disabled'], ['disabled', 'Payment disabled'], ['disabled', 'Auth disabled']] },
  ko: { eyebrow: '내부 릴리스 확인', title: '베타 준비 상태', ready: '사용 가능', conditional: '선택 / 설정 필요', disabled: '의도적으로 비활성화', items: [['ready', '후보 스냅샷 고정'], ['ready', '지금 판단 카드 사용 가능'], ['ready', '검토 범위 사용 가능'], ['ready', '내 종목 분석 사용 가능'], ['conditional', '설정 시 한국 주식 DART 근거 사용 가능'], ['conditional', '뉴스 프록시는 선택 사항'], ['disabled', '거래 비활성화'], ['disabled', '실제 AI 비활성화'], ['disabled', '결제 비활성화'], ['disabled', '인증 비활성화']] },
} as const

export function BetaReadinessChecklist({ language }: BetaReadinessChecklistProps) {
  const t = copy[language]
  const statusLabel = { ready: t.ready, conditional: t.conditional, disabled: t.disabled }
  return <section className={styles.panel} aria-labelledby="beta-readiness"><header><span>{t.eyebrow}</span><h2 id="beta-readiness">{t.title}</h2></header><ul>{t.items.map(([status, item]) => <li key={item} data-status={status}><i aria-hidden="true" /><span>{item}</span><small>{statusLabel[status]}</small></li>)}</ul></section>
}
