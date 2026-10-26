import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { primaryNavigation, secondaryNavigation, utilityNavigation } from '@/app/navigation'
import { GlobalSearch } from '@/components/GlobalSearch/GlobalSearch'
import { ModeSwitcher } from '@/components/mode/ModeSwitcher/ModeSwitcher'
import { useUiStore } from '@/hooks/useUiStore'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText, type Language } from '@/i18n/translations'
import styles from './SimpleHeader.module.css'

export function SimpleHeader({ hideCopilotToggle, copilotOpen, onToggleCopilot }: { hideCopilotToggle: boolean; copilotOpen?: boolean; onToggleCopilot?: () => void }) {
  const { language, setLanguage } = useLanguage()
  const { isAiCopilotOpen: storedCopilotOpen, toggleAiCopilot: toggleStoredCopilot } = useUiStore()
  const isAiCopilotOpen = copilotOpen ?? storedCopilotOpen
  const toggleAiCopilot = onToggleCopilot ?? toggleStoredCopilot
  const location = useLocation()
  const menu = useRef<HTMLDetailsElement>(null)
  const ko = language === 'ko'
  const labels = ko ? ['홈', '종목 분석', '내 투자', '종목 찾기'] : ['Home', 'Instrument Analysis', 'My Investments', 'Find Assets']
  useEffect(() => { if (menu.current) menu.current.open = false }, [location])
  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && menu.current) {
        event.preventDefault()
        menu.current.open = true
        menu.current.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
      }
    }
    window.addEventListener('keydown', openSearch)
    return () => window.removeEventListener('keydown', openSearch)
  }, [])

  return <header className={styles.header}>
    <Link to="/dashboard" className={styles.brand} aria-label={ko ? 'InvestAI 홈' : 'InvestAI home'}>Invest<span>AI</span></Link>
    <nav className={styles.navigation} aria-label="Primary navigation">
      {primaryNavigation.map((item, index) => <NavLink key={item.path} to={item.path}>{labels[index]}</NavLink>)}
    </nav>
    <div className={styles.actions}>
      <ModeSwitcher />
      <details className={styles.more} ref={menu} onKeyDown={event => {
        if (event.key === 'Escape' && menu.current?.open) {
          menu.current.open = false
          menu.current.querySelector('summary')?.focus()
        }
      }}>
        <summary>{ko ? '더 보기' : 'More'}</summary>
        <div className={styles.menu}>
          <GlobalSearch compact />
          <nav aria-label={ko ? '시장·자료·설정' : 'Markets, resources and settings'}>
            {[...secondaryNavigation, ...utilityNavigation].map(item => <NavLink key={item.path} to={item.path}>{item.path === '/research' ? (ko ? '시장·기록' : 'Market & Reviews') : uiText[language].navigation[item.icon]}</NavLink>)}
          </nav>
          {!hideCopilotToggle && <button className={styles.mobileCopilot} type="button" onClick={event => { toggleAiCopilot(); const details = event.currentTarget.closest('details'); if (details) details.open = false }} aria-pressed={isAiCopilotOpen}>{ko ? '도움말 열기·닫기' : 'Toggle assistant'}</button>}
          <label>{ko ? '언어' : 'Language'}<select aria-label="Language" value={language} onChange={event => setLanguage(event.target.value as Language)}><option value="ko">한국어</option><option value="en">English</option></select></label>
        </div>
      </details>
      {!hideCopilotToggle && <button className={styles.copilot} type="button" onClick={toggleAiCopilot} aria-label="Toggle AI Copilot" aria-pressed={isAiCopilotOpen}>{ko ? '도움말' : 'Assistant'}</button>}
    </div>
  </header>
}
