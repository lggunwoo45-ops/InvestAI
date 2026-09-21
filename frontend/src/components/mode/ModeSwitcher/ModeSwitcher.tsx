import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { uiText } from '@/i18n/translations'
import { useLanguage } from '@/i18n/useLanguage'
import type { DisplayModeOption } from '@/types/displayMode'
import styles from './ModeSwitcher.module.css'

export function ModeSwitcher() {
  const { language } = useLanguage()
  const { displayMode, setDisplayMode } = useDisplayMode()
  const text = uiText[language].displayMode
  const options: DisplayModeOption[] = [
    { mode: 'simple', label: text.simpleMode, shortLabel: text.simple, description: text.simpleDescription },
    { mode: 'expert', label: text.expertMode, shortLabel: text.expert, description: text.expertDescription },
  ]

  return <div className={styles.switcher} role="group" aria-label={text.label}>
    {options.map((option) => <button key={option.mode} type="button" aria-label={`${option.label} — ${option.description}`} aria-pressed={displayMode === option.mode} title={option.description} onClick={() => setDisplayMode(option.mode)}>{option.shortLabel}</button>)}
  </div>
}
