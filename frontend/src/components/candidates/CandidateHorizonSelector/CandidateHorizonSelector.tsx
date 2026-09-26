import type { Language } from '@/i18n/translations'
import { candidateHorizons, getCandidateHorizonProfile } from '@/services/ai/candidateHorizonProfiles'
import type { WatchCandidateHorizon } from '@/types/watchCandidate'
import styles from './CandidateHorizonSelector.module.css'

interface CandidateHorizonSelectorProps {
  horizon: WatchCandidateHorizon
  language: Language
  onChange: (horizon: WatchCandidateHorizon) => void
}

const labels: Record<Language, Record<WatchCandidateHorizon, string>> = {
  en: { short: 'Short-term', swing: 'Swing', long: 'Long-term' },
  ko: { short: '단타', swing: '스윙', long: '장기' },
}

export function CandidateHorizonSelector({ horizon, language, onChange }: CandidateHorizonSelectorProps) {
  const profile = getCandidateHorizonProfile(horizon, language)
  return <section className={styles.selector} aria-label={language === 'ko' ? '후보 검토 기간' : 'Candidate review horizon'}>
    <div className={styles.tabs} role="tablist" aria-label={language === 'ko' ? '후보 기간' : 'Candidate horizon'}>
      {candidateHorizons.map((item) => <button key={item} type="button" role="tab" aria-selected={horizon === item} onClick={() => onChange(item)}>{labels[language][item]}</button>)}
    </div>
    <div className={styles.guidance} role="status"><strong>{profile.reviewCadence}</strong><span>{profile.description}</span></div>
  </section>
}
