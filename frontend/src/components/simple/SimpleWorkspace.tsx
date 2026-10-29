import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { useLanguage } from '@/i18n/useLanguage'
import styles from './SimpleWorkspace.module.css'

export function SimpleWorkspace({ title, description, children, actions, enabled = true, wide = false }: { title: string; description: string; children: ReactNode; actions?: ReactNode; enabled?: boolean; wide?: boolean }) {
  const { setDisplayMode } = useDisplayMode()
  const ko = useLanguage().language === 'ko'
  return <div className={enabled ? `${styles.page} ${wide ? styles.wide : ''}` : undefined} data-simple-workspace={enabled || undefined}>
    {enabled && <header className={styles.heading}><div><span className={styles.eyebrow}>{ko ? 'INVESTAI · 쉽게, 하나씩' : 'INVESTAI · ONE STEP AT A TIME'}</span><h1>{title}</h1><p>{description}</p></div>
      <button type="button" onClick={() => setDisplayMode('expert')}>{ko ? '전문가 화면' : 'Expert view'} ↗</button></header>}
    {enabled && actions && <nav className={styles.actions}>{actions}</nav>}
    {children}
  </div>
}

/** One task at a time, keeping mounted forms alive when changing tasks. */
export function SimpleTasks({ label, tasks, all = false, initial }: { label: string; tasks: readonly { id: string; title: string; description?: string; content: ReactNode }[]; all?: boolean; initial?: string }) {
  const [selected, setSelected] = useState(initial ?? tasks[0]?.id)
  const active = tasks.some(task => task.id === selected) ? selected : tasks[0]?.id
  return <section className={styles.tasks} aria-label={label}>
    {!all && <div className={styles.choices} role="group" aria-label={label}>{tasks.map(task => <button key={task.id} type="button" aria-pressed={active === task.id} onClick={() => setSelected(task.id)}><strong>{task.title}</strong>{task.description && <small>{task.description}</small>}</button>)}</div>}
    {tasks.map(task => <div key={task.id} hidden={!all && task.id !== active} className={styles.taskContent}>{task.content}</div>)}
  </section>
}

export function SimpleFeatureLinks() {
  const ko = useLanguage().language === 'ko'
  const tasks = [
    ['/my-analysis', '궁금한 종목 확인', '지금 살펴볼 가격과 주의할 점', 'Review an asset', 'Price areas and cautions'],
    ['/market', '코인·주식 찾아보기', '이름으로 찾고 관심종목에 담기', 'Browse markets', 'Search and save an asset'],
    ['/research?mode=check', '시장·계산 도구', '시장 흐름, 손익, 거래 비용', 'Market tools', 'Context, profit and costs'],
    ['/research?mode=journal', '내 생각 기록', '지난 판단과 지금을 비교하기', 'My journal', 'Compare past and current views'],
    ['/news', '뉴스 읽기', '출처와 함께 시장 배경 확인', 'Read news', 'Market context and sources'],
    ['/trading', '매수 금액 계산', '쓰기 전에 이익과 손실 계산', 'Plan a purchase', 'Estimate cost and outcomes'],
    ['/strategies', '과거 전략 시험', '같은 규칙을 과거 가격에 적용', 'Test a strategy', 'Apply a rule to history'],
    ['/demo', '사용법 익히기', '순서대로 기능 둘러보기', 'Get started', 'Explore the app step by step'],
  ]
  return <div className={styles.featureGrid}>{tasks.map(([to, title, hint, enTitle, enHint]) => <Link key={to} to={to}><strong>{ko ? title : enTitle}<span aria-hidden>↗</span></strong><p>{ko ? hint : enHint}</p></Link>)}</div>
}
