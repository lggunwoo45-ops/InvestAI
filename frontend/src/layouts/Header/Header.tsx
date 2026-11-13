import { useNavigate } from 'react-router-dom'
import { GlobalSearch } from '@/components/GlobalSearch/GlobalSearch'
import { Icon } from '@/components/Icon/Icon'
import { ModeSwitcher } from '@/components/mode/ModeSwitcher/ModeSwitcher'
import { useUiStore } from '@/hooks/useUiStore'
import { uiText, type Language } from '@/i18n/translations'
import { useLanguage } from '@/i18n/useLanguage'
import styles from './Header.module.css'

export function Header({ hideCopilotToggle = false, copilotOpen, onToggleCopilot }: { hideCopilotToggle?: boolean; copilotOpen?: boolean; onToggleCopilot?: () => void }) {
  const navigate = useNavigate()
  const { isAiCopilotOpen, toggleAiCopilot } = useUiStore()
  const { language, setLanguage } = useLanguage()
  const text = uiText[language]

  return (
    <header className={styles.header}>
      <GlobalSearch />

      <div className={styles.actions}>
        <ModeSwitcher />
        <select className={styles.languageSelect} aria-label="Language" title={text.language} value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
          <option value="en">English</option>
          <option value="ko">한국어</option>
        </select>
        {!hideCopilotToggle && <button className={styles.iconButton} type="button" onClick={onToggleCopilot ?? toggleAiCopilot} aria-pressed={copilotOpen ?? isAiCopilotOpen} aria-label="Toggle AI Copilot">
          <Icon name="panel" size={18} />
        </button>}
        <button className={styles.userMenu} type="button" aria-label="Open user menu" onClick={() => navigate('/settings')}>
          <span className={styles.avatar}>MC</span>
          <span className={styles.userText}><strong>{language === 'ko' ? '계정·설정' : 'Account & settings'}</strong></span>
          <Icon name="chevronDown" size={14} />
        </button>
      </div>
    </header>
  )
}
