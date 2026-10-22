import { Outlet, useLocation } from 'react-router-dom'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { BetaRouteBanner } from '@/components/demo/BetaRouteBanner/BetaRouteBanner'
import { useUiStore } from '@/hooks/useUiStore'
import { classNames } from '@/utils/classNames'
import { AiCopilot } from '../AiCopilot/AiCopilot'
import { Header } from '../Header/Header'
import { SimpleHeader } from '../Header/SimpleHeader'
import { Sidebar } from '../Sidebar/Sidebar'
import styles from './AppShell.module.css'

export function AppShell() {
  const { isAiCopilotOpen, isSidebarPinned } = useUiStore()
  const { displayMode } = useDisplayMode()
  const { pathname } = useLocation()
  const isExplore = pathname.replace(/\/$/, '') === '/ai-analysis'
  // Analysis has its own contextual question panel; avoid two competing explanations.
  const focusedAnalysis = isExplore || ['/my-analysis', '/dashboard', '/portfolio', '/settings', '/trading', '/strategies'].includes(pathname.replace(/\/$/, ''))
  const showCopilot = isAiCopilotOpen && !focusedAnalysis

  return (
    <div className={classNames(styles.shell, !isSidebarPinned && styles.sidebarUnpinned)} data-display-mode={displayMode} data-explore={isExplore || undefined}>
      {displayMode === 'expert' && <Sidebar />}
      <div className={styles.workspace}>
        {displayMode === 'simple' ? <SimpleHeader hideCopilotToggle={focusedAnalysis} /> : <Header hideCopilotToggle={focusedAnalysis} />}
        <div className={classNames(styles.body, !showCopilot && styles.aiCopilotClosed)}>
          <main className={styles.main}>
            <BetaRouteBanner />
            <Outlet />
          </main>
          {showCopilot && <AiCopilot />}
        </div>
      </div>
    </div>
  )
}
