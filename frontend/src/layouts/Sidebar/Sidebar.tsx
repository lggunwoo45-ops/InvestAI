import { useEffect, useRef, useState } from 'react'

import { primaryNavigation, secondaryNavigation, utilityNavigation, navigationLabel } from '@/app/navigation'
import { BrandMark } from '@/components/BrandMark/BrandMark'
import { Icon } from '@/components/Icon/Icon'
import { SidebarNavItem } from '@/components/SidebarNavItem/SidebarNavItem'
import { useUiStore } from '@/hooks/useUiStore'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import styles from './Sidebar.module.css'

const narrowSidebarQuery = '(max-width: 1024px)'

function useNarrowSidebar(): boolean {
  const [isNarrow, setIsNarrow] = useState(() => (
    typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(narrowSidebarQuery).matches
  ))

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined

    const query = window.matchMedia(narrowSidebarQuery)
    const handleChange = (event: MediaQueryListEvent) => setIsNarrow(event.matches)
    query.addEventListener('change', handleChange)

    return () => query.removeEventListener('change', handleChange)
  }, [])

  return isNarrow
}

export function Sidebar() {
  const { isSidebarPinned, toggleSidebarPin } = useUiStore()
  const { language } = useLanguage()
  const text = uiText[language]
  const isNarrow = useNarrowSidebar()
  const [isHovered, setIsHovered] = useState(false)
  const [hasFocus, setHasFocus] = useState(false)
  const [isManuallyOpen, setIsManuallyOpen] = useState(false)
  const ignoreTouchClick = useRef(false)
  const supportsPinnedLayout = !isNarrow
  const isExpanded = (supportsPinnedLayout && isSidebarPinned) || isHovered || hasFocus || isManuallyOpen
  const canTemporarilyOpen = !isSidebarPinned || isNarrow

  const closeTransientWorkspace = () => {
    setIsHovered(false)
    setHasFocus(false)
    setIsManuallyOpen(false)
  }

  return (
    <aside
      className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.rail}`}
      aria-label="Application sidebar"
      data-expanded={isExpanded}
      data-pinned={isSidebarPinned}
      onPointerEnter={(event) => {
        if (canTemporarilyOpen && event.pointerType !== 'touch') setIsHovered(true)
      }}
      onPointerLeave={() => {
        if (canTemporarilyOpen) {
          setIsHovered(false)
          setIsManuallyOpen(false)
        }
      }}
      onFocusCapture={() => {
        if (canTemporarilyOpen) setHasFocus(true)
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setHasFocus(false)
          setIsManuallyOpen(false)
        }
      }}
      onClickCapture={(event) => {
        if (canTemporarilyOpen && (event.target as Element).closest('a')) {
          closeTransientWorkspace()
        }
      }}
    >
      <div className={styles.brandRow}>
        <BrandMark compact={!isExpanded} />
        {isExpanded && (
          <button
            className={styles.pinButton}
            type="button"
            onClick={toggleSidebarPin}
            aria-label={isSidebarPinned ? text.unpinSidebar : text.pinSidebar}
            aria-pressed={isSidebarPinned}
          >
            <Icon name="panel" size={17} />
          </button>
        )}
      </div>

      {canTemporarilyOpen && (
        <button
          className={styles.workspaceButton}
          type="button"
          onPointerDown={(event) => {
            if (event.pointerType === 'touch' && !isExpanded) {
              ignoreTouchClick.current = true
              setIsManuallyOpen(true)
            }
          }}
          onClick={(event) => {
            if (ignoreTouchClick.current) {
              ignoreTouchClick.current = false
              return
            }

            if (isExpanded) {
              closeTransientWorkspace()
              event.currentTarget.blur()
              return
            }

            setIsManuallyOpen(true)
          }}
          aria-label={isExpanded ? text.closeWorkspace : text.openWorkspace}
          aria-expanded={isExpanded}
          aria-controls="primary-navigation"
        >
          <Icon name="menu" size={17} />
        </button>
      )}

      <div className={styles.navigation}>
        <nav id="primary-navigation" aria-label="Primary navigation" className={styles.navigationList}>
          {isExpanded && <span className={styles.sectionLabel}>{language === 'ko' ? '내 투자 흐름' : 'My workflow'}</span>}
          {primaryNavigation.map(item => <SidebarNavItem key={item.path} item={item} label={navigationLabel(item, language)} compact={!isExpanded} />)}
        </nav>
        <nav aria-label={language === 'ko' ? '도구와 자료' : 'Tools and resources'} className={styles.resources}>
          {isExpanded && <span className={styles.sectionLabel}>{language === 'ko' ? '도구와 자료' : 'Tools and resources'}</span>}
          {secondaryNavigation.map(item => <SidebarNavItem key={item.path} item={item} label={navigationLabel(item, language)} compact={!isExpanded} />)}
        </nav>
      </div>

      <div className={styles.footer}>
        <div className={styles.navigationList}>
          {utilityNavigation.map((item) => <SidebarNavItem key={item.path} item={item} label={navigationLabel(item, language)} compact={!isExpanded} />)}
        </div>
        {isExpanded && (
          <div className={styles.environment}>
            <span className={styles.environmentDot} />
            <span>{language === 'ko' ? '내 워크스페이스' : 'My workspace'}</span>
            <span className={styles.version}>Beta Preview</span>
          </div>
        )}
      </div>
    </aside>
  )
}
