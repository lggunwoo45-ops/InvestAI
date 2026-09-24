import type { Language } from '@/i18n/translations'
import styles from './ReviewModeSelector.module.css'

export type MyAnalysisReviewMode = 'interest' | 'position'

interface ReviewModeSelectorProps {
  language: Language
  mode: MyAnalysisReviewMode
  onChange: (mode: MyAnalysisReviewMode) => void
}

const copy = { en: { label: 'Review mode', interest: 'New interest review', position: 'Position review' }, ko: { label: '검토 모드', interest: '신규 관심 종목 검토', position: '보유 종목 점검' } } as const

export function ReviewModeSelector({ language, mode, onChange }: ReviewModeSelectorProps) {
  const t = copy[language]
  return <section className={styles.selector} aria-label={t.label}>
    <strong>{t.label}</strong>
    <div role="group" aria-label={t.label}>
      <button type="button" aria-pressed={mode === 'interest'} onClick={() => onChange('interest')}>{t.interest}</button>
      <button type="button" aria-pressed={mode === 'position'} onClick={() => onChange('position')}>{t.position}</button>
    </div>
  </section>
}
