import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { BetaRouteBanner } from '@/components/demo/BetaRouteBanner/BetaRouteBanner'
import { useUiStore } from '@/hooks/useUiStore'
import { classNames } from '@/utils/classNames'
import { AiCopilot } from '../AiCopilot/AiCopilot'
import { Header } from '../Header/Header'
import { SimpleHeader } from '../Header/SimpleHeader'
import { Sidebar } from '../Sidebar/Sidebar'
import styles from './AppShell.module.css'
import { useCompactLayout } from '@/hooks/useCompactLayout'
import { MemberAccount } from '@/components/cloud/MemberAccount'

export function AppShell() {
  const { isAiCopilotOpen, isSidebarPinned } = useUiStore()
  const { displayMode } = useDisplayMode()
  const { pathname } = useLocation()
  const compact = useCompactLayout()
  const [mobileCopilotOpen, setMobileCopilotOpen] = useState(false)
  const isExplore = pathname.replace(/\/$/, '') === '/ai-analysis'
  // Analysis has its own contextual question panel; avoid two competing explanations.
  const focusedAnalysis = isExplore || ['/my-analysis', '/dashboard', '/portfolio', '/settings', '/trading', '/strategies', '/research'].includes(pathname.replace(/\/$/, ''))
  const showCopilot = (compact || displayMode === 'simple' ? mobileCopilotOpen : isAiCopilotOpen) && !focusedAnalysis

  return (
    <div className={classNames(styles.shell, !isSidebarPinned && styles.sidebarUnpinned)} data-display-mode={displayMode} data-explore={isExplore || undefined}>
      {displayMode === 'expert' && !compact && <Sidebar />}
      <div className={styles.workspace}>
        {displayMode === 'simple' || compact ? <SimpleHeader hideCopilotToggle={focusedAnalysis} copilotOpen={mobileCopilotOpen} onToggleCopilot={() => setMobileCopilotOpen(open => !open)} /> : <Header hideCopilotToggle={focusedAnalysis} />}
        <div className={classNames(styles.body, !showCopilot && styles.aiCopilotClosed)}>
          <main className={styles.main}>
            <BetaRouteBanner />
            <MemberAccount compact={displayMode === 'simple'} />
            <Outlet />
          </main>
          {showCopilot && <AiCopilot onClose={compact || displayMode === 'simple' ? () => setMobileCopilotOpen(false) : undefined} />}
        </div>
      </div>
    </div>
  )
}
