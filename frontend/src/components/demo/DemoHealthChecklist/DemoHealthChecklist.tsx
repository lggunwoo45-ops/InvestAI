import type { Language } from '@/i18n/translations'
import styles from './DemoHealthChecklist.module.css'

interface DemoHealthChecklistProps { language: Language }

const copy = {
  en: { title: 'Demo health checklist', note: 'Manual presenter checklist · no automatic terminal or service probing', items: ['News proxy running', 'Frontend running', 'Open /dashboard', 'Open /ai-analysis', 'Open /news', 'Open /demo', 'Confirm language switch', 'Confirm no AI buttons are active', 'Confirm no trading action is active'] },
  ko: { title: '데모 상태 체크리스트', note: '발표자 수동 확인용 · 터미널이나 서비스를 자동 검사하지 않음', items: ['뉴스 프록시 실행 확인', '프런트엔드 실행 확인', '/dashboard 열기', '/ai-analysis 열기', '/news 열기', '/demo 열기', '언어 전환 확인', 'AI 버튼이 활성화되지 않았는지 확인', '거래 작업이 활성화되지 않았는지 확인'] },
} as const

export function DemoHealthChecklist({ language }: DemoHealthChecklistProps) {
  const t = copy[language]
  return <section className={styles.checklist} aria-labelledby="demo-health-title"><header><h2 id="demo-health-title">{t.title}</h2><span>MANUAL</span></header><p>{t.note}</p><ul>{t.items.map((item) => <li key={item}>□ <span>{item}</span></li>)}</ul></section>
}

