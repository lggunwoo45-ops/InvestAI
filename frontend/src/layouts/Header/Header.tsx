import { GlobalSearch } from '@/components/GlobalSearch/GlobalSearch'
import { Icon } from '@/components/Icon/Icon'
import { MarketStatusStrip } from '@/components/MarketStatusStrip/MarketStatusStrip'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { useCurrentTime } from '@/hooks/useCurrentTime'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useUiStore } from '@/hooks/useUiStore'
import { uiText, type Language } from '@/i18n/translations'
import { useLanguage } from '@/i18n/useLanguage'
import { formatDate, formatTime } from '@/utils/formatDateTime'
import styles from './Header.module.css'

export function Header() {
  const now = useCurrentTime()
  const { isAiCopilotOpen, toggleAiCopilot } = useUiStore()
  const { activeMarketState } = useMarketWorkspace()
  const { language, setLanguage } = useLanguage()
  const text = uiText[language]
  const connectionStatus = activeMarketState?.connection.status
  const connectionHealth = connectionStatus === 'live' || connectionStatus === 'mock'
    ? 'online'
    : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
      ? 'degraded'
      : connectionStatus === 'disconnected'
        ? 'offline'
        : 'unconfigured'

  return (
    <header className={styles.header}>
      <GlobalSearch />

      <div className={styles.actions}>
        <div className={styles.statuses}>
          <StatusBadge label={text.market} health={connectionHealth} />
          <span className={styles.divider} />
          <StatusBadge label={text.publicApi} health={activeMarketState?.snapshot ? 'online' : 'unconfigured'} />
        </div>
        <MarketStatusStrip now={now} />
        <select className={styles.languageSelect} aria-label="Language" title={text.language} value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
          <option value="en">English</option>
          <option value="ko">한국어</option>
        </select>
        <div className={styles.clock}>
          <strong>{formatTime(now)}</strong>
          <span>{formatDate(now)}</span>
        </div>
        <button className={styles.iconButton} type="button" onClick={toggleAiCopilot} aria-pressed={isAiCopilotOpen} aria-label="Toggle AI Copilot">
          <Icon name="panel" size={18} />
        </button>
        <button className={styles.userMenu} type="button" aria-label="Open user menu">
          <span className={styles.avatar}>IA</span>
          <span className={styles.userText}><strong>{text.operator}</strong><small>{text.workspaceOwner}</small></span>
          <Icon name="chevronDown" size={14} />
        </button>
      </div>
    </header>
  )
}
