import { EmptyState } from '@/components/EmptyState/EmptyState'
import { Icon } from '@/components/Icon/Icon'
import { useUiStore } from '@/hooks/useUiStore'
import styles from './AiCopilot.module.css'

export function AiCopilot() {
  const { toggleAiCopilot } = useUiStore()

  return (
    <aside className={styles.copilot} aria-label="AI Copilot">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.aiIcon}><Icon name="sparkles" size={15} /></span>
          <div><strong>AI Copilot</strong><span>Investment intelligence</span></div>
        </div>
        <button type="button" onClick={toggleAiCopilot} aria-label="Close AI Copilot">×</button>
      </div>

      <div className={styles.contextBar}>
        <span>Context</span>
        <strong>No market selected</strong>
      </div>

      <div className={styles.content}>
        <EmptyState
          title="Your AI Copilot is ready"
          description="Select a market or asset to prepare an explainable investment context."
        />
      </div>

      <div className={styles.composer}>
        <div className={styles.composerInput}>
          <span>AI models are not configured</span>
          <button type="button" disabled aria-label="Send message"><Icon name="arrowUpRight" size={15} /></button>
        </div>
        <p>AI confidence and explanations require human judgment.</p>
      </div>
    </aside>
  )
}
