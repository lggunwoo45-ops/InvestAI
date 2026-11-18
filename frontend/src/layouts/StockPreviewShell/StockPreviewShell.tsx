import { NavLink, Outlet } from 'react-router-dom'
import { ModeSwitcher } from '@/components/mode/ModeSwitcher/ModeSwitcher'
import { useLanguage } from '@/i18n/useLanguage'
import styles from './StockPreviewShell.module.css'

/** Separate local product entry; shares existing chart, analysis and disclosure components. */
export function StockPreviewShell() {
  const { language, setLanguage } = useLanguage(), ko = language === 'ko'
  return <div className={styles.shell}>
    <header className={styles.header}><div><small>MARKET COPILOT · STOCK WORKSPACE</small><strong>{ko ? '주식 워크스페이스' : 'Stock workspace'}</strong></div><ModeSwitcher /><button type="button" onClick={() => setLanguage(ko ? 'en' : 'ko')}>{ko ? 'English' : '한국어'}</button></header>
    <nav className={styles.navigation} aria-label={ko ? '주식 메뉴' : 'Stock navigation'}>{[['/market', ko ? '시세·차트' : 'Prices & charts'], ['/my-analysis', ko ? '종목·공시 분석' : 'Analysis & disclosures'], ['/ai-analysis', ko ? '관찰 후보' : 'Watch candidates'], ['/news', ko ? '시장 뉴스' : 'Market news']].map(([to, title]) => <NavLink key={to} to={to}>{title}</NavLink>)}</nav>
    <aside className={styles.notice}><strong>{ko ? '개발용 미리보기 · 실제 주식 시세 미연결' : 'Development preview · live stock quotes not connected'}</strong><p>{ko ? '기존 종목 목록·차트·분석·공시 기능을 보존한 별도 작업 공간입니다. 시세는 모의값이며, 공시는 별도 OpenDART 연결이 있을 때만 표시됩니다. 투자 판단용으로 사용할 수 없습니다.' : 'Reuses the existing catalog, chart, analysis and disclosure code. Quotes are simulated. Disclosures require a separate OpenDART connection. Not for investment decisions.'}</p></aside>
    <main className={styles.content}><Outlet /></main>
  </div>
}
