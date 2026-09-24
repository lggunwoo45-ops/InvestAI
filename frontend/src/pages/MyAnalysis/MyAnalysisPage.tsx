import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { ActionReadinessCard } from '@/components/my-analysis/ActionReadinessCard/ActionReadinessCard'
import { MyAnalysisReportSummary } from '@/components/my-analysis/MyAnalysisReportSummary/MyAnalysisReportSummary'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useLanguage } from '@/i18n/useLanguage'
import { buildCryptoWatchCandidates } from '@/services/ai/cryptoWatchCandidateEngine'
import { buildStockWatchCandidates } from '@/services/ai/stockWatchCandidateEngine'
import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import type { MarketGroup, MarketInstrument } from '@/types/market'
import type { AnalysisIntent } from '@/types/myAnalysis'
import { formatMarketChange, formatMarketPrice } from '@/utils/formatMarketValue'
import styles from './MyAnalysisPage.module.css'

const copy = {
  en: {
    eyebrow: 'PERSONAL RESEARCH WORKSPACE', title: 'My Instrument Analysis', description: 'Select one instrument and organize what is known, what is missing, and what to review next.',
    search: 'Search instrument', searchPlaceholder: 'Search by symbol, Korean name, or English name', searchResults: 'Search results', emptyTitle: 'Start by selecting a coin or stock.', emptyCopy: 'Search by symbol, Korean name, or English name. This page reviews available evidence and missing data. It does not give buy or sell signals.', emptySteps: ['Search an asset', 'Choose review intent', 'Read Simple or Expert result'], noResults: 'No matching instrument in the loaded catalogs.', loading: 'Loading market catalogs…', unavailable: 'The requested instrument is not available in the loaded catalogs.', catalogLimit: 'Catalog limitation', catalogError: 'Some market catalogs could not be loaded. Search results may be incomplete.', topResults: 'Showing top matching results only.', loadedCatalogs: 'Loaded catalogs', openedFromMarket: 'Opened from Market workspace.',
    filters: { all: 'All', crypto: 'Crypto', korea: 'Korea', us: 'US' }, groups: { crypto: 'Crypto', korea: 'Korea Stocks', us: 'US Stocks' }, qualities: { live: 'Live', mock: 'Mock', limited: 'Limited', unavailable: 'Unavailable' },
    intent: 'My intent', intentHelp: 'Review intent changes checklist wording only.', intents: { watching: 'Watching', holding: 'Holding', longTerm: 'Long-term review', swing: 'Swing review', shortTerm: 'Short-term review' }, note: 'My note (optional)', notePlaceholder: 'Personal context only — not treated as market evidence', average: 'Average price (optional)', analyze: 'Analysis context', simple: 'Simple view', expert: 'Expert view', switchExpert: 'Switch to Expert view', switchSimple: 'Switch to Simple view', optionalContext: 'Optional personal context', userContextNotice: 'User-provided context only. Not market evidence.', yourInputs: 'Your inputs', market: 'Open in Market', quality: 'Data quality', noItems: 'Nothing available yet.', selected: 'Selected instrument', source: 'Source', type: 'Evidence type', availableData: 'Available data', missingData: 'Missing data', evidence: 'Evidence board', missing: 'Missing evidence', checklist: 'Review checklist', nextChecks: 'Next checks', detailedReport: 'Detailed evidence report', ruleBasis: 'Rule basis', assetTypes: { crypto: 'Crypto', stock: 'Stock' }, levels: { available: 'Available', context: 'Context', demo: 'Demo', missing: 'Missing' },
  },
  ko: {
    eyebrow: '개인 리서치 작업공간', title: '내 종목 분석', description: '종목 하나를 선택하고 확인된 내용, 부족한 근거, 다음 검토 항목을 정리합니다.',
    search: '종목 검색', searchPlaceholder: '심볼, 한국어 이름, 영어 이름으로 검색', searchResults: '검색 결과', emptyTitle: '코인이나 주식을 선택해 분석을 시작하세요.', emptyCopy: '심볼, 한국어 이름, 영어 이름으로 검색할 수 있습니다. 이 화면은 확인 가능한 근거와 부족한 데이터를 정리하며, 매수·매도 신호를 제공하지 않습니다.', emptySteps: ['종목 검색', '검토 목적 선택', '간편/전문 결과 확인'], noResults: '불러온 카탈로그에서 일치하는 종목이 없습니다.', loading: '시장 카탈로그를 불러오는 중…', unavailable: '요청한 종목을 불러온 카탈로그에서 찾을 수 없습니다.', catalogLimit: '카탈로그 제한', catalogError: '일부 시장 카탈로그를 불러오지 못했습니다. 검색 결과가 일부 누락될 수 있습니다.', topResults: '일부 상위 검색 결과만 표시됩니다.', loadedCatalogs: '불러온 카탈로그', openedFromMarket: '마켓 작업공간에서 이동했습니다.',
    filters: { all: '전체', crypto: '가상자산', korea: '한국', us: '미국' }, groups: { crypto: '가상자산', korea: '한국 주식', us: '미국 주식' }, qualities: { live: '실시간', mock: '모의', limited: '제한됨', unavailable: '이용 불가' },
    intent: '나의 목적', intentHelp: '검토 목적은 체크리스트 문구만 바꿉니다.', intents: { watching: '관찰 중', holding: '보유 중', longTerm: '장기 검토', swing: '스윙 검토', shortTerm: '단기 검토' }, note: '내 메모 (선택)', notePlaceholder: '개인 참고 맥락이며 시장 근거로 취급하지 않습니다', average: '평균 가격 (선택)', analyze: '분석 맥락', simple: '간편 보기', expert: '전문가 보기', switchExpert: '전문가 보기로 전환', switchSimple: '간편 보기로 전환', optionalContext: '선택 개인 참고 정보', userContextNotice: '사용자 입력 참고값입니다. 시장 근거가 아닙니다.', yourInputs: '내 입력값', market: '마켓에서 열기', quality: '데이터 품질', noItems: '아직 확인된 항목이 없습니다.', selected: '선택 종목', source: '출처', type: '근거 유형', availableData: '사용 가능한 데이터', missingData: '부족한 데이터', evidence: '근거 보드', missing: '부족한 근거', checklist: '검토 체크리스트', nextChecks: '다음 확인 항목', detailedReport: '상세 근거 리포트', ruleBasis: '규칙 근거', assetTypes: { crypto: '가상자산', stock: '주식' }, levels: { available: '사용 가능', context: '참고', demo: '데모', missing: '부족' },
  },
} as const

const intents: readonly AnalysisIntent[] = ['watching', 'holding', 'longTerm', 'swing', 'shortTerm']
type SearchFilter = 'all' | MarketGroup
const searchFilters: readonly SearchFilter[] = ['all', 'crypto', 'korea', 'us']
const groupOrder: readonly MarketGroup[] = ['crypto', 'korea', 'us']

function groupForInstrument(instrument: MarketInstrument): MarketGroup {
  if (instrument.marketId === 'korea-stock') return 'korea'
  if (instrument.marketId === 'us-stock') return 'us'
  return 'crypto'
}

function instrumentNames(instrument: MarketInstrument) {
  return [...new Set([instrument.koreanName, instrument.englishName, instrument.name].filter((value): value is string => Boolean(value)))]
}

export function MyAnalysisPage() {
  const { language } = useLanguage()
  const { displayMode, setDisplayMode } = useDisplayMode()
  const { marketDataMode, selectInstrument } = useMarketWorkspace()
  const { result: newsResult } = useNewsProviderMode()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [requestedInstrumentId] = useState<string | null>(() => params.get('instrumentId'))
  const [selectedId, setSelectedId] = useState<string | null>(requestedInstrumentId)
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all')
  const [intent, setIntent] = useState<AnalysisIntent>('watching')
  const [note, setNote] = useState('')
  const [averagePrice, setAveragePrice] = useState('')
  const t = copy[language]
  useDocumentTitle(t.title)

  const upbit = useMarketCatalog('upbit-krw', marketDataMode, 0)
  const upbitBtc = useMarketCatalog('upbit-btc', marketDataMode, 0)
  const upbitUsdt = useMarketCatalog('upbit-usdt', marketDataMode, 0)
  const binanceSpot = useMarketCatalog('binance-spot', marketDataMode, 0)
  const binanceFutures = useMarketCatalog('binance-futures', marketDataMode, 0)
  const kospi = useMarketCatalog('kospi', marketDataMode, 0)
  const kosdaq = useMarketCatalog('kosdaq', marketDataMode, 0)
  const nasdaq = useMarketCatalog('nasdaq', marketDataMode, 0)
  const nyse = useMarketCatalog('nyse', marketDataMode, 0)
  const states = useMemo(() => [upbit, upbitBtc, upbitUsdt, binanceSpot, binanceFutures, kospi, kosdaq, nasdaq, nyse], [binanceFutures, binanceSpot, kosdaq, kospi, nasdaq, nyse, upbit, upbitBtc, upbitUsdt])
  const instruments = useMemo(() => {
    const unique = new Map<string, MarketInstrument>()
    states.forEach((state) => state.catalog?.instruments.forEach((instrument) => unique.set(instrument.id, instrument)))
    return [...unique.values()]
  }, [states])
  const sourceById = useMemo(() => new Map(states.flatMap((state) => state.catalog?.instruments.map((instrument) => [instrument.id, state.catalog?.source ?? null] as const) ?? [])), [states])
  const loading = states.some((state) => state.loading)
  const catalogErrors = states.filter((state) => state.error !== null)
  const loadedCatalogCount = states.filter((state) => state.catalog !== null).length
  const selected = instruments.find((instrument) => instrument.id === selectedId) ?? null
  const normalized = query.trim().toLocaleLowerCase()
  const matchingResults = useMemo(() => normalized.length < 1 ? [] : instruments.filter((instrument) => {
    const matchesQuery = `${instrument.symbol} ${instrument.displaySymbol ?? ''} ${instrument.name} ${instrument.koreanName ?? ''} ${instrument.englishName ?? ''}`.toLocaleLowerCase().includes(normalized)
    return matchesQuery && (searchFilter === 'all' || groupForInstrument(instrument) === searchFilter)
  }), [instruments, normalized, searchFilter])
  const results = matchingResults.slice(0, 30)
  const groupedResults = useMemo(() => groupOrder.map((group) => ({ group, instruments: results.filter((instrument) => groupForInstrument(instrument) === group) })).filter((entry) => entry.instruments.length > 0), [results])
  const cryptoInstruments = useMemo(() => [upbit, upbitBtc, upbitUsdt, binanceSpot, binanceFutures].flatMap((state) => state.catalog?.instruments ?? []), [binanceFutures, binanceSpot, upbit, upbitBtc, upbitUsdt])
  const cryptoCandidates = useMemo(() => buildCryptoWatchCandidates({ instruments: cryptoInstruments, newsResult, language, limit: 10 }), [cryptoInstruments, language, newsResult])
  const koreaCandidates = useMemo(() => buildStockWatchCandidates({ instruments: [...(kospi.catalog?.instruments ?? []), ...(kosdaq.catalog?.instruments ?? [])], region: 'korea', newsResult, language, limit: 10 }), [kosdaq.catalog?.instruments, kospi.catalog?.instruments, language, newsResult])
  const usCandidates = useMemo(() => buildStockWatchCandidates({ instruments: [...(nasdaq.catalog?.instruments ?? []), ...(nyse.catalog?.instruments ?? [])], region: 'us', newsResult, language, limit: 10 }), [language, nasdaq.catalog?.instruments, newsResult, nyse.catalog?.instruments])
  const candidate = [...cryptoCandidates, ...koreaCandidates, ...usCandidates].find((entry) => entry.instrumentId === selectedId)
  const parsedAverage = averagePrice.trim() === '' ? null : Number(averagePrice)
  const analysis = selected ? buildMyInstrumentAnalysis({ instrument: selected, intent, userNote: note, averagePrice: parsedAverage !== null && Number.isFinite(parsedAverage) ? parsedAverage : null, catalogSource: sourceById.get(selected.id) ?? null, candidate, newsResult, language }) : null
  const expertTitles = analysis ? Object.fromEntries(analysis.expertModeSections.map((section) => [section.id, section.title])) : {}
  const selectedGroup = selected ? groupForInstrument(selected) : null
  const openedFromMarket = requestedInstrumentId !== null && selected?.id === requestedInstrumentId

  const choose = (instrument: MarketInstrument) => {
    setSelectedId(instrument.id)
    setParams({ instrumentId: instrument.id }, { replace: true })
  }
  const openMarket = () => {
    if (selected) selectInstrument(selected)
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><span>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.description}</p></div>
      <div className={styles.mode} aria-label={t.analyze}><span>{displayMode === 'simple' ? t.simple : t.expert}</span><button type="button" onClick={() => setDisplayMode(displayMode === 'simple' ? 'expert' : 'simple')}>{displayMode === 'simple' ? t.switchExpert : t.switchSimple}</button></div>
    </header>
    <section className={styles.searchPanel} aria-label={t.search}>
      <label><span>{t.search}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} /></label>
      <div className={styles.searchMeta}><span>{t.loadedCatalogs}: {loadedCatalogCount}/{states.length}</span>{normalized && <span aria-live="polite">{t.searchResults}: {matchingResults.length}</span>}</div>
      <div className={styles.filterChips} aria-label={t.searchResults}>{searchFilters.map((filter) => <button type="button" key={filter} aria-pressed={searchFilter === filter} onClick={() => setSearchFilter(filter)}>{t.filters[filter]}</button>)}</div>
      {catalogErrors.length > 0 && <div className={styles.catalogWarning} role="status" aria-label={t.catalogLimit}><strong>{t.catalogLimit}</strong><p>{t.catalogError}</p></div>}
      {normalized && <div className={styles.results} aria-label={t.searchResults}>
        {groupedResults.map(({ group, instruments: groupInstruments }) => <section className={styles.resultGroup} key={group} aria-labelledby={`result-group-${group}`}>
          <h2 id={`result-group-${group}`}>{t.groups[group]} <span>{groupInstruments.length}</span></h2>
          {groupInstruments.map((instrument) => {
            const displaySymbol = instrument.displaySymbol ?? instrument.symbol
            const names = instrumentNames(instrument)
            const venue = instrument.marketType?.toUpperCase() ?? instrument.marketId.toUpperCase()
            const sourceQuality = sourceById.get(instrument.id) ?? 'limited'
            return <button type="button" aria-label={`${displaySymbol} ${names.join(' ')} ${venue} ${t.qualities[sourceQuality]}`} aria-pressed={selectedId === instrument.id} key={instrument.id} onClick={() => choose(instrument)}>
              <span className={styles.resultIdentity}><strong>{displaySymbol}</strong><small>{names.join(' · ')}</small></span>
              <span className={styles.resultMarket}>{venue}</span>
              <em data-quality={sourceQuality}>{t.qualities[sourceQuality]}</em>
            </button>
          })}
        </section>)}
        {matchingResults.length > 30 && <p className={styles.resultNote}>{t.topResults}</p>}
        {!loading && results.length === 0 && <p>{t.noResults}</p>}
      </div>}
      {!normalized && !selected && <div className={styles.emptyState}>
        <div><h2>{loading ? t.loading : t.emptyTitle}</h2>{!loading && <p>{t.emptyCopy}</p>}</div>
        {!loading && <div className={styles.guidance}>{t.emptySteps.map((step, index) => <article key={step}><span>0{index + 1}</span><strong>{step}</strong></article>)}</div>}
      </div>}
      {selectedId && !selected && !loading && <p className={styles.warning} role="alert">{t.unavailable}</p>}
    </section>
    {selected && analysis && <>
      {openedFromMarket && <p className={styles.marketContext} role="status">{t.openedFromMarket}</p>}
      <section className={styles.instrumentHeader} aria-label={t.selected}>
        <div><span>{selected.marketType?.toUpperCase() ?? selected.marketId}</span><h2>{selected.displaySymbol ?? selected.symbol}</h2><p>{instrumentNames(selected).join(' · ')}</p><div className={styles.instrumentMeta}><b>{selectedGroup ? t.groups[selectedGroup] : t.assetTypes[analysis.assetType]}</b><small>{t.assetTypes[analysis.assetType]}</small></div></div>
        <div className={styles.quote}><small>{t.availableData}</small><strong>{Number.isFinite(selected.lastPrice) ? formatMarketPrice(selected) : t.qualities.unavailable}</strong>{Number.isFinite(selected.change24hPercent) && <span data-direction={selected.change24hPercent >= 0 ? 'positive' : 'negative'}>{formatMarketChange(selected.change24hPercent)}</span>}</div>
        <div className={styles.quality}><small>{t.quality}</small><b data-quality={analysis.dataQuality}>{analysis.dataQualityLabel}</b></div>
      </section>
      <MyAnalysisReportSummary analysis={analysis} language={language} mode={displayMode} symbol={selected.displaySymbol ?? selected.symbol} name={selected.name} />
      <ActionReadinessCard plan={analysis.actionReadiness} language={language} mode={displayMode} showRuleBasis={false} />
      <section className={styles.analysis} data-mode={displayMode}>
        <div className={styles.analysisHeading}><div><span>{displayMode === 'simple' ? t.simple : t.expert}</span><h2>{displayMode === 'simple' ? t.analyze : t.detailedReport}</h2>{displayMode === 'expert' && <small>{analysis.summary}</small>}</div><Link to="/market" onClick={openMarket}>{t.market} →</Link></div>
        {displayMode === 'simple' ? <div className={styles.sections}>
          {analysis.simpleModeSections.filter((section) => section.id !== 'simple-current').map((section) => <article key={section.id}><h3>{section.title}</h3>{section.items.length > 1 ? <ul>{section.items.slice(1, 3).map((entry) => <li key={entry}>{entry}</li>)}</ul> : <p>{t.noItems}</p>}</article>)}
          <article><h3>{t.nextChecks}</h3>{analysis.reviewChecklist.length > 1 ? <ul>{analysis.reviewChecklist.slice(1, 3).map((entry) => <li key={entry}>{entry}</li>)}</ul> : <p>{t.noItems}</p>}</article>
        </div> : <div className={styles.expertGrid}>
          <article><span className={styles.sectionLabel}>{t.availableData}</span><h3>{expertTitles.evidence ?? t.evidence}</h3><div className={styles.evidenceList}>{analysis.evidence.map((entry) => <div key={entry.id} className={styles.evidenceItem}><header><strong>{entry.label}</strong><span data-level={entry.level}>{t.levels[entry.level]}</span></header><small className={styles.evidenceType}>{t.type}: {entry.type}</small><p>{entry.detail}</p><p className={styles.reviewMeaning}>{entry.reviewMeaning}</p><small>{t.source}: {entry.source}</small></div>)}</div></article>
          <article><span className={styles.sectionLabel}>{t.missingData}</span><h3>{expertTitles.missing ?? t.missing}</h3><div className={styles.evidenceList}>{analysis.missingEvidence.map((entry) => <div key={entry.id} className={styles.evidenceItem}><header><strong>{entry.label}</strong><span data-level={entry.level}>{t.levels[entry.level]}</span></header><small className={styles.evidenceType}>{t.type}: {entry.type}</small><p>{entry.detail}</p><p className={styles.reviewMeaning}>{entry.reviewMeaning}</p><small>{t.source}: {entry.source}</small></div>)}</div></article>
          <article className={styles.ruleBasis} role="region" aria-label={t.ruleBasis}><span className={styles.sectionLabel}>{t.ruleBasis}</span><h3>{t.ruleBasis}</h3><dl>{analysis.actionReadiness.ruleBasis.map((item) => <div key={item.key}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></article>
          <article><span className={styles.sectionLabel}>{t.nextChecks}</span><h3>{expertTitles.checklist ?? t.checklist}</h3><ul>{analysis.reviewChecklist.map((entry) => <li key={entry}>{entry}</li>)}</ul></article>
        </div>}
      </section>
      <details className={styles.inputs} open>
        <summary>{t.optionalContext}</summary>
        <p className={styles.inputNotice}>{t.userContextNotice}</p>
        <div className={styles.inputGrid}>
          <label><span>{t.intent}</span><select value={intent} onChange={(event) => setIntent(event.target.value as AnalysisIntent)}>{intents.map((value) => <option key={value} value={value}>{t.intents[value]}</option>)}</select><small>{t.intentHelp}</small></label>
          <label><span>{t.average}</span><input type="number" min="0" value={averagePrice} onChange={(event) => setAveragePrice(event.target.value)} /></label>
          <label className={styles.note}><span>{t.note}</span><textarea maxLength={500} placeholder={t.notePlaceholder} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        </div>
      </details>
      <section className={styles.userContext} aria-label={t.yourInputs}><h2>{t.yourInputs}</h2><dl><div><dt>{t.intent}</dt><dd>{analysis.userContext.intent}</dd></div>{analysis.userContext.userNote && <div><dt>{t.note}</dt><dd>{analysis.userContext.userNote}</dd></div>}{analysis.userContext.averagePrice && <div><dt>{t.average}</dt><dd>{analysis.userContext.averagePrice}</dd></div>}</dl><p>{analysis.userContext.notice}</p><small>{analysis.userContext.intentNotice}</small></section>
      <footer className={styles.pageSafety}>{analysis.disclaimer}</footer>
    </>}
  </main>
}
