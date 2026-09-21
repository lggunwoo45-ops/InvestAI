import { Link } from 'react-router-dom'

import type { Language } from '@/i18n/translations'
import styles from './ModeSwitcher.module.css'

interface ModeSwitcherProps {
  activeMode: 'simple' | 'expert'
  language: Language
}

const copy = {
  en: { label: 'Analysis view mode', simple: 'Simple Mode', simpleHelp: 'Easy view for beginners', expert: 'Expert Mode', expertHelp: 'Detailed evidence and controls' },
  ko: { label: '분석 보기 모드', simple: '간편모드', simpleHelp: '초보자를 위한 쉬운 보기', expert: '전문가모드', expertHelp: '상세 근거와 설정 보기' },
} as const

export function ModeSwitcher({ activeMode, language }: ModeSwitcherProps) {
  const t = copy[language]
  return <nav className={styles.switcher} aria-label={t.label}>
    <Link to="/simple" aria-current={activeMode === 'simple' ? 'page' : undefined}><strong>{t.simple}</strong><small>{t.simpleHelp}</small></Link>
    <Link to="/ai-analysis" aria-current={activeMode === 'expert' ? 'page' : undefined}><strong>{t.expert}</strong><small>{t.expertHelp}</small></Link>
  </nav>
}
