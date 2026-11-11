import type { Language } from '@/i18n/translations'
import styles from './InvestmentWorkflow.module.css'

export function ReviewSteps({ language, current }: { language: Language; current: number }) {
  const labels = language === 'ko' ? ['종목 고르기', '판단 확인', '가격 알림', '결과 확인'] : ['Choose', 'Review', 'Price alerts', 'Results']
  return <ol className={styles.steps} aria-label={language === 'ko' ? '검토 순서' : 'Review steps'}>{labels.map((label, i) => <li key={label} aria-current={i === current ? 'step' : undefined}><b>{String(i + 1).padStart(2, '0')}</b>{label}</li>)}</ol>
}
