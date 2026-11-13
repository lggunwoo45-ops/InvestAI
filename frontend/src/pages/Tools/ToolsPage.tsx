import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { productPageNames } from '@/app/navigation'
import { findTools, toolGroups, toolText } from '@/app/productTools'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { useLanguage } from '@/i18n/useLanguage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import styles from '@/components/product/ProductPages.module.css'

export function ToolsPage() {
  const { language } = useLanguage(), ko = language === 'ko'
  const expert = useDisplayMode().displayMode === 'expert'
  const [params, setParams] = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  const [search, setSearch] = useState({ source: urlQuery, value: urlQuery })
  if (search.source !== urlQuery) setSearch({ source: urlQuery, value: urlQuery })
  const query = search.source === urlQuery ? search.value : urlQuery
  const setQuery = (value: string) => setSearch({ source: urlQuery, value })
  const composing = useRef(false)
  // Input state must update synchronously. Navigating on every IME keystroke
  // restores an older URL value and interrupts the browser's composition.
  const group = toolGroups.some(g => g.id === params.get('group')) ? params.get('group')! : ''
  const allMatches = findTools(query, '')
  const found = group ? allMatches.filter(tool => tool.group === group) : allMatches
  const title = productPageNames.tools[language]
  useDocumentTitle(title)

  const applySearch = (value = query, category = group) => {
    const next = new URLSearchParams(params)
    if (value) next.set('q', value); else next.delete('q')
    if (category) next.set('group', category); else next.delete('group')
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }
  const chooseQuery = (value: string) => { setQuery(value); applySearch(value, '') }

  return <div className={styles.page}>
    <header className={styles.heading}>
      <span className={styles.eyebrow}>MARKET COPILOT · ANALYSIS</span>
      <h1>{title}</h1>
      <p>{ko ? '종목 분석부터 손익 계산까지, 필요한 기능을 찾아보세요.' : 'Find the right feature, from asset research to risk calculations.'}</p>
    </header>

    <div className={styles.filters}>
      <form role="search" aria-label={ko ? '분석 도구 검색' : 'Find analysis tools'} onSubmit={event => { event.preventDefault(); if (!composing.current) applySearch() }}>
        <label className={styles.search} htmlFor="tool-search">{ko ? '필요한 도구 검색' : 'Search tools'}</label>
        <div className={styles.searchRow}>
          <input id="tool-search" type="search" value={query}
            onChange={event => setQuery(event.target.value)}
            onCompositionStart={() => { composing.current = true }}
            onCompositionEnd={event => { composing.current = false; setQuery(event.currentTarget.value) }}
            onKeyDown={event => { if (event.key === 'Enter' && (composing.current || event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault() }}
            onBlur={() => { if (!composing.current) applySearch() }}
            placeholder={ko ? '예: 손절, 수수료, ETF' : 'Stop loss, fees, ETF…'} />
          <button type="submit">{ko ? '검색' : 'Search'}</button>
        </div>
      </form>
      <div className={styles.querySuggestions} role="group" aria-label={ko ? '검색 예시' : 'Search examples'}>
        <span>{ko ? '빠른 검색' : 'Quick search'}</span>
        {(ko ? ['손절', '수수료', 'ETF', '알림'] : ['stop', 'fees', 'ETF', 'alerts']).map(word => <button type="button" key={word} onClick={() => chooseQuery(word)}>{word}</button>)}
      </div>
      <div role="group" aria-label={ko ? '도구 분류' : 'Tool category'} className={styles.categories}>
        {[{ id: '', title: { ko: '전체', en: 'All' } }, ...toolGroups].map(g => <button key={g.id} type="button" aria-pressed={group === g.id} onClick={() => applySearch(query, g.id)}>{toolText(g.title, language)} <span aria-hidden="true">{g.id ? allMatches.filter(tool => tool.group === g.id).length : allMatches.length}</span></button>)}
      </div>
    </div>
    <div className={styles.resultBar}>
      <p role="status">{ko ? `${found.length}개 기능${query.trim() ? ` · “${query.trim()}” 검색 결과` : ''}` : `${found.length} tools${query.trim() ? ` matching “${query.trim()}”` : ''}`}</p>
      {(query || group) && <button type="button" onClick={() => chooseQuery('')}>{ko ? '검색 초기화' : 'Clear filters'}</button>}
    </div>
    {!query && !group && <nav className={styles.quickLinks} aria-label={ko ? '목적별 바로가기' : 'Start with a task'}>
      <Link to="/my-analysis"><strong>{ko ? '이 종목, 어떤 상태일까?' : 'Review an asset'} <span aria-hidden="true">↗</span></strong><span>{ko ? '가격 흐름·지지·저항 확인' : 'Trend, support and resistance'}</span></Link>
      <Link to="/trading"><strong>{ko ? '손절하면 얼마를 잃을까?' : 'Estimate my downside'} <span aria-hidden="true">↗</span></strong><span>{ko ? '매수가·수량으로 예상 손익 계산' : 'Estimate outcomes from entry and size'}</span></Link>
      <Link to="/results"><strong>{ko ? '저장한 후보는 어떻게 됐을까?' : 'Follow a saved candidate'} <span aria-hidden="true">↗</span></strong><span>{ko ? '진입 여부·가상 결과·자료 부족 확인' : 'Entries, modeled outcomes and missing data'}</span></Link>
    </nav>}
    {toolGroups.map(g => {
      const tools = found.filter(t => t.group === g.id)
      return tools.length > 0 && <section key={g.id} aria-labelledby={`tools-${g.id}`}>
        <header className={styles.groupHeading}><h2 id={`tools-${g.id}`}>{toolText(g.title, language)}</h2><p>{toolText(g.description, language)}</p></header>
        <div className={styles.grid}>{tools.map(tool => <article key={tool.id} className={styles.card}>
          <span className={styles.scope}>{toolText(tool.scope, language)}</span>
          <h3><Link to={tool.href}>{toolText(tool.title, language)} <span aria-hidden="true">↗</span></Link></h3>
          <dl className={styles.toolDetails}><div><dt>{ko ? '입력·선택' : 'Choose or enter'}</dt><dd>{toolText(tool.input, language)}</dd></div><div><dt>{ko ? '확인할 내용' : 'What you get'}</dt><dd>{toolText(tool.purpose, language)}</dd></div></dl>
          <details key={`${tool.id}-${expert}`} open={expert}><summary>{ko ? '지원 범위와 주의점' : 'Coverage and limitations'}</summary><p>{toolText(tool.note, language)}</p></details>
        </article>)}</div>
      </section>
    })}
    {!found.length && <section className={styles.empty}>
      <h2>{ko ? '맞는 도구를 찾지 못했어요' : 'No matching tools'}</h2>
      <p>{group && allMatches.length ? (ko ? `다른 분류에 ${allMatches.length}개 기능이 있습니다. 검색어를 유지하고 전체 분류에서 찾아보세요.` : `${allMatches.length} matching tools are in other categories. Keep your search and view all categories.`) : (ko ? '손절·펀딩·김프처럼 짧은 단어로 다시 찾아보세요.' : 'Try a short term such as stop, funding or premium.')}</p>
      {group && allMatches.length > 0 && <button type="button" onClick={() => applySearch(query, '')}>{ko ? '다른 분류에서 찾기' : 'Search all categories'}</button>}
      <button type="button" onClick={() => chooseQuery('')}>{ko ? '전체 도구 보기' : 'Show all tools'}</button>
    </section>}
  </div>
}
