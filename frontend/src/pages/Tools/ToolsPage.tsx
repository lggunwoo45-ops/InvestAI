import { Link, useSearchParams } from 'react-router-dom'
import { findTools, toolGroups, toolText } from '@/app/productTools'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { useLanguage } from '@/i18n/useLanguage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import styles from '@/components/product/ProductPages.module.css'

export function ToolsPage() {
  const { language } = useLanguage(), ko = language === 'ko'
  const expert = useDisplayMode().displayMode === 'expert'
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? '', group = toolGroups.some(g => g.id === params.get('group')) ? params.get('group')! : ''
  const found = findTools(query, group)
  useDocumentTitle(ko ? '도구함' : 'Tools')
  const change = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: true }) }
  return <div className={styles.page}>
    <header className={styles.heading}><span className={styles.eyebrow}>INVESTAI · TOOLKIT</span><h1>{ko ? '도구함' : 'Tools'}</h1><p>{ko ? '어떤 판단을 도와드릴까요? 필요한 도구를 용도별로 찾아보세요.' : 'What would help your decision? Find a tool by the job it does.'}</p></header>
    <section className={styles.start}><div><strong>{ko ? '처음이라면, 한 종목부터.' : 'Start with one asset.'}</strong><p>{ko ? '종목을 찾고, 근거를 확인하고, 정한 가격을 저장하세요. 그다음 알림과 결과를 이어볼 수 있어요.' : 'Find an asset, review its evidence and save your price criteria. Then follow alerts and results.'}</p></div><Link to="/ai-analysis">{ko ? '종목 찾기' : 'Discover'} →</Link></section>
    <div className={styles.filters}><label className={styles.search}>{ko ? '필요한 도구 검색' : 'Search tools'}<input type="search" value={query} onChange={e => change('q', e.target.value)} placeholder={ko ? '예: ETF, 손절, 수수료, 알림' : 'ETF, stop, fees, alerts…'} /></label><div role="group" aria-label={ko ? '도구 분류' : 'Tool category'} className={styles.categories}>{[{ id: '', title: { ko: '전체', en: 'All' } }, ...toolGroups].map(g => <button key={g.id} type="button" aria-pressed={group === g.id} onClick={() => change('group', g.id)}>{toolText(g.title, language)}</button>)}</div></div>
    <p role="status" className={styles.count}>{ko ? `${found.length}개 도구 · 같은 기능을 간편·전문가 화면에서 이어서 사용합니다.` : `${found.length} tools · Keep the same destinations in Simple and Expert views.`}</p>
    {toolGroups.map(g => { const tools = found.filter(t => t.group === g.id); return tools.length > 0 && <section key={g.id} aria-labelledby={`tools-${g.id}`}><header className={styles.groupHeading}><h2 id={`tools-${g.id}`}>{toolText(g.title, language)}</h2><p>{toolText(g.description, language)}</p></header><div className={styles.grid}>{tools.map(tool => <article key={tool.id} className={styles.card}><span className={styles.scope}>{toolText(tool.scope, language)}</span><h3><Link to={tool.href}>{toolText(tool.title, language)} <span aria-hidden="true">↗</span></Link></h3><p>{toolText(tool.purpose, language)}</p><details key={`${tool.id}-${expert}`} open={expert}><summary>{ko ? '사용 전에 알아둘 점' : 'Before using this tool'}</summary><p>{toolText(tool.note, language)}</p></details></article>)}</div></section> })}
    {!found.length && <section className={styles.empty}><h2>{ko ? '맞는 도구를 찾지 못했어요' : 'No matching tools'}</h2><p>{ko ? '다른 단어로 찾거나 분류를 전체로 바꿔보세요.' : 'Try another word or search all categories.'}</p><button type="button" onClick={() => { const next = new URLSearchParams(params); next.delete('q'); next.delete('group'); setParams(next, { replace: true }) }}>{ko ? '전체 도구 보기' : 'Show all tools'}</button></section>}
  </div>
}
