import { Outlet } from 'react-router-dom'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { useUiStore } from '@/hooks/useUiStore'
import { classNames } from '@/utils/classNames'
import { AiCopilot } from '../AiCopilot/AiCopilot'
import { Header } from '../Header/Header'
import { Sidebar } from '../Sidebar/Sidebar'
import styles from './AppShell.module.css'

export function AppShell() {
  const { isAiCopilotOpen, isSidebarCollapsed } = useUiStore()
  const { displayMode } = useDisplayMode()

  return (
    <div className={classNames(styles.shell, isSidebarCollapsed && styles.sidebarCollapsed)} data-display-mode={displayMode}>
      <Sidebar />
      <div className={styles.workspace}>
        <Header />
        <div className={classNames(styles.body, !isAiCopilotOpen && styles.aiCopilotClosed)}>
          <main className={styles.main}>
            <Outlet />
          </main>
          {isAiCopilotOpen && <AiCopilot />}
        </div>
      </div>
    </div>
  )
}
