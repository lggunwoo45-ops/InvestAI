import { Link } from 'react-router-dom'

import type { Language } from '@/i18n/translations'
import styles from './ModeSwitcher.module.css'

interface ModeSwitcherProps {
  activeMode: 'simple' | 'expert'
  language: Language
}

const copy = {
  en: { label: 'Analysis view mode', simple: 'Simple', simpleLabel: 'Simple Mode — easy view for beginners', expert: 'Expert', expertLabel: 'Expert Mode — detailed evidence and controls' },
  ko: { label: '분석 보기 모드', simple: '간편모드', simpleLabel: '간편모드 — 초보자를 위한 쉬운 보기', expert: '전문가모드', expertLabel: '전문가모드 — 상세 근거와 설정 보기' },
} as const

export function ModeSwitcher({ activeMode, language }: ModeSwitcherProps) {
  const t = copy[language]
  return <nav className={styles.switcher} aria-label={t.label}>
    <Link to="/simple" aria-label={t.simpleLabel} aria-current={activeMode === 'simple' ? 'page' : undefined}>{t.simple}</Link>
    <Link to="/ai-analysis" aria-label={t.expertLabel} aria-current={activeMode === 'expert' ? 'page' : undefined}>{t.expert}</Link>
  </nav>
}
