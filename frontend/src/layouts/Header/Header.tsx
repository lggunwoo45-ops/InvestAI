import { Icon } from '@/components/Icon/Icon'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { useCurrentTime } from '@/hooks/useCurrentTime'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useUiStore } from '@/hooks/useUiStore'
import { formatDate, formatTime } from '@/utils/formatDateTime'
import styles from './Header.module.css'

export function Header() {
  const now = useCurrentTime()
  const { isAiCopilotOpen, toggleAiCopilot } = useUiStore()
  const { activeMarketState } = useMarketWorkspace()
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
      <label className={styles.search}>
        <Icon name="search" size={17} />
        <input type="search" placeholder="Search markets, assets, or commands" aria-label="Global search" />
        <kbd>⌘ K</kbd>
      </label>

      <div className={styles.actions}>
        <div className={styles.statuses}>
          <StatusBadge label="Market" health={connectionHealth} />
          <span className={styles.divider} />
          <StatusBadge label="Public API" health={activeMarketState?.snapshot ? 'online' : 'unconfigured'} />
        </div>
        <div className={styles.clock}>
          <strong>{formatTime(now)}</strong>
          <span>{formatDate(now)}</span>
        </div>
        <button className={styles.iconButton} type="button" onClick={toggleAiCopilot} aria-pressed={isAiCopilotOpen} aria-label="Toggle AI Copilot">
          <Icon name="panel" size={18} />
        </button>
        <button className={styles.userMenu} type="button" aria-label="Open user menu">
          <span className={styles.avatar}>IA</span>
          <span className={styles.userText}><strong>Operator</strong><small>Workspace owner</small></span>
          <Icon name="chevronDown" size={14} />
        </button>
      </div>
    </header>
  )
}
