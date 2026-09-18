import { primaryNavigation, utilityNavigation } from '@/app/navigation'
import { BrandMark } from '@/components/BrandMark/BrandMark'
import { Icon } from '@/components/Icon/Icon'
import { SidebarNavItem } from '@/components/SidebarNavItem/SidebarNavItem'
import { useUiStore } from '@/hooks/useUiStore'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import styles from './Sidebar.module.css'

export function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useUiStore()
  const { language } = useLanguage()
  const text = uiText[language]

  return (
    <aside className={styles.sidebar} aria-label="Application sidebar">
      <div className={styles.brandRow}>
        <BrandMark compact={isSidebarCollapsed} />
        {!isSidebarCollapsed && (
          <button className={styles.collapseButton} type="button" onClick={toggleSidebar} aria-label={text.collapseSidebar}>
            <Icon name="menu" size={17} />
          </button>
        )}
      </div>

      {isSidebarCollapsed && (
        <button className={styles.expandButton} type="button" onClick={toggleSidebar} aria-label={text.expandSidebar}>
          <Icon name="menu" size={17} />
        </button>
      )}

      <nav className={styles.navigation} aria-label="Primary navigation">
        {!isSidebarCollapsed && <span className={styles.sectionLabel}>{text.workspace}</span>}
        <div className={styles.navigationList}>
          {primaryNavigation.map((item) => <SidebarNavItem key={item.path} item={item} label={text.navigation[item.icon]} compact={isSidebarCollapsed} />)}
        </div>
      </nav>

      <div className={styles.footer}>
        <div className={styles.navigationList}>
          {utilityNavigation.map((item) => <SidebarNavItem key={item.path} item={item} label={text.navigation[item.icon]} compact={isSidebarCollapsed} />)}
        </div>
        {!isSidebarCollapsed && (
          <div className={styles.environment}>
            <span className={styles.environmentDot} />
            <span>{text.localEnvironment}</span>
            <span className={styles.version}>v0.6.2</span>
          </div>
        )}
      </div>
    </aside>
  )
}
