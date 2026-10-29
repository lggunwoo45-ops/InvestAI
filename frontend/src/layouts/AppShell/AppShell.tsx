import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState, type CSSProperties } from 'react'
import { usePanelSize, useWorkspaceSize } from '@/components/workspace/usePanelSize'
import { ResizeHandle } from '@/components/workspace/ResizeHandle'
import { useLanguage } from '@/i18n/useLanguage'

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
  const ko = useLanguage().language === 'ko'
  const [bodyRef, size] = useWorkspaceSize<HTMLDivElement>()
  const market = pathname.replace(/\/$/, '') === '/market'
  const floatingCopilot = compact || displayMode === 'simple' || (market && size.width > 0 && size.width < 1650)
  const [copilotWidth, setCopilotWidth] = usePanelSize(`investai.market.panels.${displayMode}.v1.copilot`, 340, 280, 480)
  const effectiveWidth = Math.min(copilotWidth, size.width || copilotWidth)
  useEffect(() => {
    const reset = (e: Event) => { if ((e as CustomEvent).detail === displayMode) setCopilotWidth(340) }
    window.addEventListener('investai-market-layout-reset', reset)
    return () => window.removeEventListener('investai-market-layout-reset', reset)
  }, [displayMode, setCopilotWidth])
  const [mobileCopilotOpen, setMobileCopilotOpen] = useState(false)
  const isExplore = pathname.replace(/\/$/, '') === '/ai-analysis'
  // Analysis has its own contextual question panel; avoid two competing explanations.
  const focusedAnalysis = isExplore || ['/my-analysis', '/dashboard', '/portfolio', '/settings', '/trading', '/strategies', '/research'].includes(pathname.replace(/\/$/, ''))
  const showCopilot = (floatingCopilot ? mobileCopilotOpen : isAiCopilotOpen) && !focusedAnalysis

  return (
    <div className={classNames(styles.shell, !isSidebarPinned && styles.sidebarUnpinned)} data-display-mode={displayMode} data-explore={isExplore || undefined}>
      {displayMode === 'expert' && !compact && <Sidebar />}
      <div className={styles.workspace}>
        {displayMode === 'simple' || compact ? <SimpleHeader hideCopilotToggle={focusedAnalysis} copilotOpen={mobileCopilotOpen} onToggleCopilot={() => setMobileCopilotOpen(open => !open)} /> : <Header hideCopilotToggle={focusedAnalysis} copilotOpen={showCopilot} onToggleCopilot={floatingCopilot ? () => setMobileCopilotOpen(open => !open) : undefined} />}
        <div ref={bodyRef} style={market ? { '--market-copilot-width': `${effectiveWidth}px` } as CSSProperties : undefined} className={classNames(styles.body, !showCopilot && styles.aiCopilotClosed, market && styles.marketBody, market && showCopilot && (floatingCopilot ? styles.floatingCopilot : styles.dockedCopilot))}>
          <main className={styles.main}>
            <BetaRouteBanner />
            <MemberAccount compact={displayMode === 'simple'} />
            <Outlet />
          </main>
          {market && showCopilot && !compact && <div className={styles.copilotDivider}><ResizeHandle label={ko ? '보조 창 너비 조절' : 'Resize copilot'} value={effectiveWidth} min={280} max={Math.min(480, size.width || 480)} reverse onChange={setCopilotWidth} onReset={() => setCopilotWidth(340)} /></div>}
          {showCopilot && <AiCopilot onClose={floatingCopilot ? () => setMobileCopilotOpen(false) : undefined} />}
        </div>
      </div>
    </div>
  )
}
