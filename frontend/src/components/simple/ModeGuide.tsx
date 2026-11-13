import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { useLanguage } from '@/i18n/useLanguage'
import styles from './SimpleWorkspace.module.css'

/** Keep mode changes local to the current route and selected instrument. */
export function ModeGuide({ expert }: { expert: { ko: string; en: string } }) {
  const { displayMode, setDisplayMode } = useDisplayMode()
  const { language } = useLanguage()
  if (displayMode !== 'simple') return null
  return <aside className={styles.modeGuide}>
    <p>{expert[language]}</p>
    <button type="button" onClick={() => setDisplayMode('expert')}>{language === 'ko' ? '전문가모드로 자세히 보기' : 'See more in Expert mode'} →</button>
  </aside>
}
