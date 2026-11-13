import { productPageNames } from '@/app/navigation'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import styles from './SimpleWorkspace.module.css'

export function SimpleWorkspace({ title, description, children, actions, enabled = true, wide = false, compactHeading = false }: { title: string; description: string; children: ReactNode; actions?: ReactNode; enabled?: boolean; wide?: boolean; compactHeading?: boolean }) {
  const ko = useLanguage().language === 'ko'
  return <div className={enabled ? `${styles.page} ${wide ? styles.wide : ''}` : undefined} data-simple-workspace={enabled || undefined} data-compact-heading={compactHeading || undefined}>
    {enabled && <header className={styles.heading}><div><span className={styles.eyebrow}>{ko ? 'MARKET COPILOT · 쉽게, 하나씩' : 'MARKET COPILOT · ONE STEP AT A TIME'}</span><h1>{title}</h1><p>{description}</p></div></header>}
    {enabled && actions && <nav className={styles.actions}>{actions}</nav>}
    {children}
  </div>
}

/** Open tools on demand, then keep their forms alive across task and mode changes. */
export function SimpleTasks({ label, tasks, all = false, initial }: { label: string; tasks: readonly { id: string; title: string; description?: string; content: ReactNode }[]; all?: boolean; initial?: string }) {
  const [selected, setSelected] = useState(initial ?? tasks[0]?.id)
  const active = tasks.some(task => task.id === selected) ? selected : tasks[0]?.id
  const [visited, setVisited] = useState<string[]>([])
  const needed = all ? tasks.map(task => task.id) : active ? [active] : []
  if (needed.some(id => !visited.includes(id))) setVisited([...new Set([...visited, ...needed])])
  return <section className={styles.tasks} aria-label={label}>
    {!all && <div className={styles.choices} role="group" aria-label={label}>{tasks.map(task => <button key={task.id} type="button" aria-pressed={active === task.id} onClick={() => setSelected(task.id)}><strong>{task.title}</strong>{task.description && <small>{task.description}</small>}</button>)}</div>}
    {tasks.filter(task => visited.includes(task.id) || needed.includes(task.id)).map(task => <div key={task.id} hidden={!all && task.id !== active} className={styles.taskContent}>{task.content}</div>)}
  </section>
}

export function SimpleFeatureLinks() {
  const { language } = useLanguage(), ko = language === 'ko'
  return <div className={styles.featureGrid}><Link to="/tools"><strong>{productPageNames.tools[language]}<span aria-hidden>↗</span></strong><p>{ko ? '시장 지표·포지션·비용·신호·기록을 용도별로 찾으세요.' : 'Find indicators, position sizing, costs, signals and records by purpose.'}</p></Link><Link to="/demo"><strong>{ko ? '사용 가이드' : 'Guide'}<span aria-hidden>↗</span></strong><p>{ko ? '종목 선택부터 근거 확인과 기록까지 순서대로 안내해요.' : 'Follow the steps from choosing an asset to evidence and records.'}</p></Link></div>
}
