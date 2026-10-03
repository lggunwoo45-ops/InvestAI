import { Outlet } from 'react-router-dom'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { BetaRouteBanner } from '@/components/demo/BetaRouteBanner/BetaRouteBanner'
import { useUiStore } from '@/hooks/useUiStore'
import { classNames } from '@/utils/classNames'
import { AiCopilot } from '../AiCopilot/AiCopilot'
import { Header } from '../Header/Header'
import { Sidebar } from '../Sidebar/Sidebar'
import styles from './AppShell.module.css'

export function AppShell() {
  const { isAiCopilotOpen, isSidebarPinned } = useUiStore()
  const { displayMode } = useDisplayMode()

  return (
    <div className={classNames(styles.shell, !isSidebarPinned && styles.sidebarUnpinned)} data-display-mode={displayMode}>
      <Sidebar />
      <div className={styles.workspace}>
        <Header />
        <div className={classNames(styles.body, !isAiCopilotOpen && styles.aiCopilotClosed)}>
          <main className={styles.main}>
            <BetaRouteBanner />
            <Outlet />
          </main>
          {isAiCopilotOpen && <AiCopilot />}
        </div>
      </div>
    </div>
  )
}
