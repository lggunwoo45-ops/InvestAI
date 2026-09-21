import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useLanguage } from '@/i18n/useLanguage'
import { buildCryptoWatchCandidates } from '@/services/ai/cryptoWatchCandidateEngine'
import { buildStockWatchCandidates } from '@/services/ai/stockWatchCandidateEngine'
import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import type { MarketInstrument } from '@/types/market'
import type { AnalysisIntent } from '@/types/myAnalysis'
import { formatMarketChange, formatMarketPrice } from '@/utils/formatMarketValue'
import styles from './MyAnalysisPage.module.css'

const copy = {
  en: {
    eyebrow: 'PERSONAL RESEARCH WORKSPACE', title: 'My Instrument Analysis', description: 'Select one instrument and organize what is known, what is missing, and what to review next.',
    search: 'Search instrument', searchPlaceholder: 'Search symbol, Korean name, or English name', empty: 'Search and select an instrument to begin.', noResults: 'No matching instrument in the connected catalogs.', loading: 'Loading market catalogs…', unavailable: 'The requested instrument is not available in the current catalogs.',
    intent: 'My intent', intents: { watching: 'Watching', holding: 'Holding', longTerm: 'Long-term review', swing: 'Swing review', shortTerm: 'Short-term review' }, note: 'My note (optional)', notePlaceholder: 'Personal context only — not treated as market evidence', average: 'Average price (optional)', analyze: 'Analysis context', simple: 'Simple view', expert: 'Expert view', switchExpert: 'Switch to Expert view', switchSimple: 'Switch to Simple view', input: 'Input summary', yourInputs: 'Your inputs', market: 'Open in Market', quality: 'Evidence quality', noItems: 'Nothing available yet.', selected: 'Selected instrument', source: 'Source', levels: { available: 'Available', context: 'Context', demo: 'Demo', missing: 'Missing' },
  },
  ko: {
    eyebrow: '개인 리서치 작업공간', title: '내 종목 분석', description: '종목 하나를 선택하고 확인된 내용, 부족한 근거, 다음 검토 항목을 정리합니다.',
    search: '종목 검색', searchPlaceholder: '심볼·한국어 이름·영어 이름 검색', empty: '분석을 시작하려면 종목을 검색하고 선택하세요.', noResults: '연결된 카탈로그에서 일치하는 종목이 없습니다.', loading: '시장 카탈로그를 불러오는 중…', unavailable: '요청한 종목을 현재 카탈로그에서 찾을 수 없습니다.',
    intent: '나의 목적', intents: { watching: '관찰 중', holding: '보유 중', longTerm: '장기 검토', swing: '스윙 검토', shortTerm: '단기 검토' }, note: '내 메모 (선택)', notePlaceholder: '개인 참고 맥락이며 시장 근거로 취급하지 않습니다', average: '평균 가격 (선택)', analyze: '분석 맥락', simple: '간편 보기', expert: '전문가 보기', switchExpert: '전문가 보기로 전환', switchSimple: '간편 보기로 전환', input: '입력 요약', yourInputs: '내 입력값', market: '마켓에서 열기', quality: '근거 품질', noItems: '아직 확인된 항목이 없습니다.', selected: '선택 종목', source: '출처', levels: { available: '사용 가능', context: '참고', demo: '데모', missing: '부족' },
  },
} as const

const intents: readonly AnalysisIntent[] = ['watching', 'holding', 'longTerm', 'swing', 'shortTerm']

export function MyAnalysisPage() {
  const { language } = useLanguage()
  const { displayMode, setDisplayMode } = useDisplayMode()
  const { marketDataMode, selectInstrument } = useMarketWorkspace()
  const { result: newsResult } = useNewsProviderMode()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(params.get('instrumentId'))
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
  const selected = instruments.find((instrument) => instrument.id === selectedId) ?? null
  const normalized = query.trim().toLocaleLowerCase()
  const results = useMemo(() => normalized.length < 1 ? [] : instruments.filter((instrument) => `${instrument.symbol} ${instrument.displaySymbol ?? ''} ${instrument.name} ${instrument.koreanName ?? ''} ${instrument.englishName ?? ''}`.toLocaleLowerCase().includes(normalized)).slice(0, 30), [instruments, normalized])
  const cryptoInstruments = useMemo(() => [upbit, upbitBtc, upbitUsdt, binanceSpot, binanceFutures].flatMap((state) => state.catalog?.instruments ?? []), [binanceFutures, binanceSpot, upbit, upbitBtc, upbitUsdt])
  const cryptoCandidates = useMemo(() => buildCryptoWatchCandidates({ instruments: cryptoInstruments, newsResult, language, limit: 10 }), [cryptoInstruments, language, newsResult])
  const koreaCandidates = useMemo(() => buildStockWatchCandidates({ instruments: [...(kospi.catalog?.instruments ?? []), ...(kosdaq.catalog?.instruments ?? [])], region: 'korea', newsResult, language, limit: 10 }), [kosdaq.catalog?.instruments, kospi.catalog?.instruments, language, newsResult])
  const usCandidates = useMemo(() => buildStockWatchCandidates({ instruments: [...(nasdaq.catalog?.instruments ?? []), ...(nyse.catalog?.instruments ?? [])], region: 'us', newsResult, language, limit: 10 }), [language, nasdaq.catalog?.instruments, newsResult, nyse.catalog?.instruments])
  const candidate = [...cryptoCandidates, ...koreaCandidates, ...usCandidates].find((entry) => entry.instrumentId === selectedId)
  const parsedAverage = averagePrice.trim() === '' ? null : Number(averagePrice)
  const analysis = selected ? buildMyInstrumentAnalysis({ instrument: selected, intent, userNote: note, averagePrice: parsedAverage !== null && Number.isFinite(parsedAverage) ? parsedAverage : null, catalogSource: sourceById.get(selected.id) ?? null, candidate, newsResult, language }) : null

  const choose = (instrument: MarketInstrument) => {
    setSelectedId(instrument.id)
    setParams({ instrumentId: instrument.id }, { replace: true })
  }
  const openMarket = () => {
    if (selected) selectInstrument(selected)
  }

  return <main className={styles.page}>
    <header className={styles.header}><div><span>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.description}</p></div><div className={styles.mode} aria-label={t.analyze}><span>{displayMode === 'simple' ? t.simple : t.expert}</span><button type="button" onClick={() => setDisplayMode(displayMode === 'simple' ? 'expert' : 'simple')}>{displayMode === 'simple' ? t.switchExpert : t.switchSimple}</button></div></header>
    <section className={styles.searchPanel} aria-label={t.search}>
      <label><span>{t.search}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} /></label>
      {normalized && <div className={styles.results} aria-label={t.search}>{results.map((instrument) => <button type="button" aria-pressed={selectedId === instrument.id} key={instrument.id} onClick={() => choose(instrument)}><strong>{instrument.displaySymbol ?? instrument.symbol}</strong><span>{instrument.koreanName ?? instrument.name} · {instrument.englishName ?? instrument.name}</span><em>{instrument.marketType?.toUpperCase() ?? instrument.marketId}</em></button>)}{!loading && results.length === 0 && <p>{t.noResults}</p>}</div>}
      {!normalized && !selected && <p className={styles.empty}>{loading ? t.loading : t.empty}</p>}
      {selectedId && !selected && !loading && <p className={styles.warning} role="alert">{t.unavailable}</p>}
    </section>
    {selected && analysis && <>
      <section className={styles.instrumentHeader} aria-label={t.selected}><div><span>{selected.marketType?.toUpperCase() ?? selected.marketId}</span><h2>{selected.displaySymbol ?? selected.symbol}</h2><p>{selected.koreanName ?? selected.name} · {selected.englishName ?? selected.name}</p></div><div className={styles.quote}><strong>{formatMarketPrice(selected)}</strong><span data-direction={selected.change24hPercent >= 0 ? 'positive' : 'negative'}>{formatMarketChange(selected.change24hPercent)}</span></div><div className={styles.quality}><small>{t.quality}</small><b data-quality={analysis.dataQuality}>{analysis.dataQualityLabel}</b></div></section>
      <section className={styles.inputs}><h2>{t.input}</h2><div className={styles.inputGrid}><label><span>{t.intent}</span><select value={intent} onChange={(event) => setIntent(event.target.value as AnalysisIntent)}>{intents.map((value) => <option key={value} value={value}>{t.intents[value]}</option>)}</select></label><label><span>{t.average}</span><input type="number" min="0" value={averagePrice} onChange={(event) => setAveragePrice(event.target.value)} /></label><label className={styles.note}><span>{t.note}</span><textarea maxLength={500} placeholder={t.notePlaceholder} value={note} onChange={(event) => setNote(event.target.value)} /></label></div></section>
      <section className={styles.userContext} aria-label={t.yourInputs}><h2>{t.yourInputs}</h2><dl><div><dt>{t.intent}</dt><dd>{analysis.userContext.intent}</dd></div>{analysis.userContext.userNote && <div><dt>{t.note}</dt><dd>{analysis.userContext.userNote}</dd></div>}{analysis.userContext.averagePrice && <div><dt>{t.average}</dt><dd>{analysis.userContext.averagePrice}</dd></div>}</dl><p>{analysis.userContext.notice}</p><small>{analysis.userContext.intentNotice}</small></section>
      <section className={styles.analysis} data-mode={displayMode}><div className={styles.analysisHeading}><div><span>{displayMode === 'simple' ? t.simple : t.expert}</span><h2>{t.analyze}</h2><p>{analysis.summary}</p></div><Link to="/market" onClick={openMarket}>{t.market} →</Link></div>
        {displayMode === 'simple' ? <div className={styles.sections}>{analysis.simpleModeSections.map((section) => <article key={section.title}><h3>{section.title}</h3>{section.items.length ? <ul>{section.items.map((entry) => <li key={entry}>{entry}</li>)}</ul> : <p>{t.noItems}</p>}</article>)}</div>
          : <div className={styles.expertGrid}><article><h3>{analysis.expertModeSections[0].title}</h3><div className={styles.evidenceList}>{analysis.evidence.map((entry) => <div key={entry.id} className={styles.evidenceItem}><header><strong>{entry.label}</strong><span data-level={entry.level}>{t.levels[entry.level]}</span></header><p>{entry.detail}</p><small>{t.source}: {entry.source}</small></div>)}</div></article><article><h3>{analysis.expertModeSections[1].title}</h3><div className={styles.evidenceList}>{analysis.missingEvidence.map((entry) => <div key={entry.id} className={styles.evidenceItem}><header><strong>{entry.label}</strong><span data-level={entry.level}>{t.levels[entry.level]}</span></header><p>{entry.detail}</p><small>{t.source}: {entry.source}</small></div>)}</div></article><article><h3>{analysis.expertModeSections[2].title}</h3><ul>{analysis.expertModeSections[2].items.map((entry) => <li key={entry}>{entry}</li>)}</ul></article></div>}
        <footer>{analysis.disclaimer}</footer></section>
    </>}
  </main>
}
