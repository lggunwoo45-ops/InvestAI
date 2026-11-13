import { useEffect, useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CryptoExpertOverview } from '@/components/crypto-analysis/CryptoExpertOverview'
import { PriceScenarioPanel } from '@/components/price-scenarios/PriceScenarioPanel'
import { MajorSupportPanel } from '@/components/price-scenarios/MajorSupportPanel'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useTechnicalLevelData } from '@/hooks/useTechnicalLevelData'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useLanguage } from '@/i18n/useLanguage'
import { MarketWorkspaceProvider } from '@/store/MarketWorkspaceProvider'
import { buildCryptoDecision } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { decisionGuide, easyDirection } from '@/services/cryptoAnalysis/decisionGuide'
import { buildCryptoPriceScenarios } from '@/services/myAnalysis/priceScenarios'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import { matchesInstrumentSearch } from '@/services/market/instrumentSearch'
import { buildPreviewReport, previewPlan, previewView, type PreviewReport, type PreviewView } from './previewModel'
import styles from './LaunchPreviewPage.module.css'

// A separate market workspace leaves the real account, selected market and display preferences alone.
export function LaunchPreviewPage() {
  return <MarketWorkspaceProvider><PreviewWorkspace /></MarketWorkspaceProvider>
}

function PreviewWorkspace() {
  const { language: preferredLanguage } = useLanguage()
  const [params, setParams] = useSearchParams()
  const language = params.get('lang') === 'ko' ? 'ko' : params.get('lang') === 'en' ? 'en' : preferredLanguage
  const ko = language === 'ko'
  const t = (korean: string, english: string) => ko ? korean : english
  const plan = previewPlan(params.get('plan')), premium = plan === 'premium'
  const view = previewView(params.get('view'))
  const selectedId = params.get('asset') ?? 'upbit-btc'
  const [query, setQuery] = useState(''), [retry, setRetry] = useState(0)
  const [expert, setExpert] = useState(false)
  const [priceView, setPriceView] = useState<'overview' | 'downside' | 'upside'>('overview')
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [report, setReport] = useState<PreviewReport | null>(null)
  const searchId = useId()
  const { catalog, loading, error } = useMarketCatalog('upbit-krw', 'live', retry)
  const instruments = catalog?.source === 'live' ? catalog.instruments : []
  const instrument = instruments.find(item => item.id === selectedId) ?? null
  const searchResults = query.trim() ? instruments.filter(item => matchesInstrumentSearch(item, query)) : []
  const hourly = useTechnicalLevelData(instrument, '1H')
  const fourHourly = useTechnicalLevelData(instrument, '4H')
  const daily = useTechnicalLevelData(instrument, '1D')
  const [clock, setClock] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 10_000); return () => clearInterval(timer) }, [])
  const now = Math.max(clock, hourly.updatedAt ?? 0, fourHourly.updatedAt ?? 0, daily.updatedAt ?? 0)
  const decision = buildCryptoDecision({ '1H': hourly, '4H': fourHourly, '1D': daily }, now)
  const ready = instrument !== null && decision.direction !== 'unavailable'
  const guide = decisionGuide(decision, language)
  const currentReport = report?.instrumentId === instrument?.id ? report : null
  const price = (value: number) => `${formatAnalysisPrice(value, language)} KRW`
  const title = premium ? t('프리미엄', 'Premium') : t('무료', 'Free')
  useDocumentTitle(t(`${title} 출시 화면 미리보기`, `${title} launch preview`))
  const changeParams = (values: Record<string, string>) => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => next.set(key, value))
    setParams(next)
  }
  const selectAsset = (id: string) => { changeParams({ asset: id, view: 'analysis' }); setQuery(''); setNotice(''); setPriceView('overview') }
  const openReport = () => {
    if (!premium || !instrument) return
    const snapshot = buildPreviewReport(instrument, decision, language, now)
    if (!snapshot) return
    setReport(snapshot); changeParams({ view: 'report' })
  }
  const toggleWatch = () => {
    if (!instrument) return
    const saved = watchlist.includes(instrument.id)
    setWatchlist(ids => saved ? ids.filter(id => id !== instrument.id) : [...ids, instrument.id])
    setNotice(t(saved ? '미리보기 관심종목에서 뺐어요.' : '미리보기 관심종목에 담았어요. 실제 계정 기록은 바뀌지 않습니다.', saved ? 'Removed from the preview watchlist.' : 'Saved in this preview only. Your real account records are unchanged.'))
  }
  const views: { id: PreviewView; icon: string; label: string }[] = [
    { id: 'analysis', icon: '◈', label: t('종목 분석', 'Asset analysis') },
    { id: 'watchlist', icon: '☆', label: t('관심종목', 'Watchlist') },
    { id: 'report', icon: '✧', label: t('AI 리포트', 'AI reports') },
    { id: 'plans', icon: '▦', label: t('이용 플랜', 'Plans') },
  ]
  const aiCard = <section className={`${styles.aiCard} ${premium ? styles.premiumCard : ''}`} aria-label={t('AI 분석 이용 안내', 'AI analysis access')}>
    <div className={styles.cardTop}><span className={styles.eyebrow}>MARKET COPILOT AI</span><span className={styles.badge}>{premium ? t('프리미엄 화면', 'Premium preview') : t('프리미엄 기능', 'Premium feature')}</span></div>
    <h2>{t('숫자 다음에는,\n이해할 수 있는 설명.', 'Beyond the numbers,\nan explanation you can use.')}</h2>
    <p>{t('흐름의 이유, 반대 근거, 다시 확인할 조건을 한 편의 리포트로 읽는 화면입니다.', 'Preview a report that brings the trend, opposing evidence and review conditions together.')}</p>
    <ul><li>{t('현재 흐름을 쉬운 문장으로', 'The current trend in plain language')}</li><li>{t('지지·저항을 살펴볼 이유', 'Reasons to review support and resistance')}</li><li>{t('놓치기 쉬운 위험과 부족한 자료', 'Risks and missing evidence')}</li></ul>
    {premium ? <>
      <div className={styles.usage}><div><span>{t('이번 달 AI 분석', 'Monthly AI analyses')}</span><strong>{t('예시 0 / 100회', 'Example 0 / 100')}</strong></div><div className={styles.usageTrack}><span /></div><small>{t('사용량 표시 예시입니다. 리포트를 열어도 차감되지 않아요.', 'Illustrative usage. Opening the preview does not consume quota.')}</small></div>
      <button type="button" className={styles.primary} disabled={!ready} onClick={openReport}>{t('AI 리포트 화면 예시 열기', 'Open AI report preview')} ↗</button>
      {!ready && <p className={styles.small}>{t('현재 종목의 유효한 시세가 준비되면 예시를 열 수 있어요.', 'The report preview becomes available when this asset has valid market data.')}</p>}
    </> : <><div className={styles.price}><strong>14,900</strong><span>{t('원 / 월 · 부가세 포함', 'KRW / month · VAT included')}</span></div><button type="button" className={styles.primary} onClick={() => changeParams({ plan: 'premium' })}>{t('프리미엄 화면 체험하기', 'Try the Premium view')} →</button><p className={styles.small}>{t('화면만 전환하며 결제되거나 가입되지 않습니다.', 'Only changes the preview. No purchase or subscription.')}</p></>}
    <p className={styles.exampleNote}>{t('AI 연결 준비 중 · 아래 예시는 기존 규칙 분석을 리포트 형태로 보여줍니다. 실제 AI가 생성한 결과가 아닙니다.', 'AI integration is in preparation. The example formats existing rule-based analysis as a report; it is not an AI-generated result.')}</p>
  </section>

  return <div className={styles.preview} data-preview-plan={plan} lang={language}>
    <div className={styles.previewBar}>
      <div><strong>{t('출시 화면 미리보기', 'Launch preview')}</strong><span>{t('광고·AI는 예시 · 결제 없음', 'Example ads and AI · No payment')}</span></div>
      <div className={styles.planSwitch} role="group" aria-label={t('체험할 요금제', 'Preview plan')}>
        <button type="button" aria-pressed={!premium} onClick={() => changeParams({ plan: 'free' })}>{t('무료 화면', 'Free view')}</button>
        <button type="button" aria-pressed={premium} onClick={() => changeParams({ plan: 'premium' })}>{t('프리미엄 화면', 'Premium view')}</button>
      </div>
      <select className={styles.language} aria-label={t('미리보기 언어', 'Preview language')} value={language} onChange={event => changeParams({ lang: event.target.value })}><option value="ko">한국어</option><option value="en">English</option></select>
      <Link to="/dashboard">{t('미리보기 나가기', 'Exit preview')} ↗</Link>
    </div>
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to={`/preview?${new URLSearchParams({ plan, asset: selectedId, lang: language })}`} className={styles.brand}><span>MC</span> Market Copilot</Link>
        <span className={styles.workspaceLabel}>{t('나의 투자 공간', 'YOUR WORKSPACE')}</span>
        <nav aria-label={t('미리보기 메뉴', 'Preview navigation')}>{views.map(item => <button type="button" key={item.id} aria-current={view === item.id ? 'page' : undefined} onClick={() => changeParams({ view: item.id })}><span aria-hidden="true">{item.icon}</span>{item.label}{item.id === 'report' && <small>AI</small>}</button>)}</nav>
        <div className={styles.sidebarBottom}><span className={styles.avatar}>ME</span><div><strong>{t('체험 중인 회원', 'Preview member')}</strong><span>{title} {t('화면', 'view')}</span></div></div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.header}><div><span className={styles.mobileBrand}>Market Copilot</span><span className={`${styles.membership} ${premium ? styles.paid : ''}`}>{premium ? 'PREMIUM' : 'FREE'}</span><span className={styles.headerHint}>{premium ? t('광고 없이, 분석에 집중하세요', 'More room for your research') : t('기본 분석을 무료로 시작하세요', 'Start with free core analysis')}</span></div><div className={styles.modeSwitch} role="group" aria-label={t('분석 화면 상세도', 'Analysis detail')}><button type="button" aria-pressed={!expert} onClick={() => setExpert(false)}>{t('간편', 'Simple')}</button><button type="button" aria-pressed={expert} onClick={() => setExpert(true)}>{t('전문가', 'Expert')}</button></div></header>
        <main className={styles.main}>
          <div className={styles.intro}><div><span className={styles.eyebrow}>{t('가격을 보고, 근거를 이해하고', 'PRICE. EVIDENCE. CONTEXT.')}</span><h1>{view === 'analysis' ? t('내 코인, 지금 무엇을 볼까요?', 'What matters for your asset?') : views.find(item => item.id === view)?.label}</h1><p>{t('현재의 흐름과 다음에 확인할 가격을 한곳에서 살펴보세요.', 'Review the current trend and the price levels to revisit in one place.')}</p></div><span className={styles.betaBadge}>BETA PREVIEW</span></div>
          {view !== 'plans' && <section className={styles.assetBar} aria-label={t('분석할 코인 선택', 'Select a coin')}>
            <div className={styles.search}><label htmlFor={searchId}>{t('종목 검색', 'Search assets')}</label><input id={searchId} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('비트코인, BTC처럼 검색', 'Search Bitcoin, BTC…')} autoComplete="off" />
              {query.trim() && <div className={styles.searchResults} aria-label={t('검색 결과', 'Search results')}>{searchResults.slice(0, 8).map(item => <button type="button" key={item.id} onClick={() => selectAsset(item.id)}><strong>{item.koreanName ?? item.name}</strong><span>{item.symbol}</span></button>)}{!loading && !searchResults.length && <p>{t('일치하는 업비트 원화 종목이 없어요.', 'No matching Upbit KRW asset.')}</p>}</div>}
            </div>
            <div className={styles.quickAssets}>{['upbit-btc', 'upbit-eth', 'upbit-sol'].map(id => { const item = instruments.find(asset => asset.id === id); return item && <button type="button" key={id} aria-pressed={selectedId === id} onClick={() => selectAsset(id)}>{item.symbol.replace('/KRW', '')}</button> })}</div>
            <span className={styles.venue}>Upbit · {t('현물', 'Spot')} · KRW</span>
          </section>}
          {view !== 'plans' && (loading || error || !instrument) && <div className={styles.dataNotice} role="status"><strong>{loading ? t('업비트 종목을 불러오고 있어요', 'Loading Upbit assets') : error ? t('종목 목록을 불러오지 못했어요', 'Unable to load assets') : t('선택한 종목을 찾지 못했어요', 'Selected asset is unavailable')}</strong><p>{t('실제 자료가 준비되기 전에는 임의의 시세나 분석 결과를 채우지 않습니다.', 'Prices and analysis are not fabricated when live data is missing.')}</p>{!loading && <button type="button" onClick={() => { setRetry(value => value + 1); changeParams({ asset: 'upbit-btc' }) }}>{t('BTC로 다시 불러오기', 'Reload BTC')}</button>}</div>}
          <p role="status" className={styles.status}>{notice}</p>

          {view === 'analysis' && <div className={styles.columns}><div className={styles.analysisColumn}>
            <section className={styles.quoteCard} aria-label={t('선택 종목 요약', 'Selected asset summary')}>
              <div className={styles.quoteHeader}><div><span className={styles.coinIcon}>{instrument?.symbol.slice(0, 1) ?? '·'}</span><div><h2>{instrument?.koreanName ?? instrument?.name ?? '—'}</h2><span>{instrument?.displaySymbol ?? instrument?.symbol ?? 'Upbit · KRW'}</span></div></div><button type="button" className={styles.saveButton} disabled={!instrument} aria-pressed={watchlist.includes(selectedId)} onClick={toggleWatch}>{watchlist.includes(selectedId) ? '★' : '☆'} {t('관심종목', 'Watchlist')}</button></div>
              <div className={styles.quote}><strong>{decision.price === null || !instrument ? '—' : price(decision.price)}</strong><span className={styles.dataTag}>{ready ? t('실제 시세 기반', 'Based on live data') : t('자료 확인 중', 'Checking data')}</span></div>
              <p className={styles.small}>{t('분석 기준: 업비트 원화 현물 · 1시간 / 4시간 / 일봉', 'Source: Upbit KRW spot · 1H / 4H / 1D')}</p>
              <div className={styles.analysisSummary} data-direction={decision.direction}><span>{easyDirection[language][decision.direction]}</span><h3>{guide.title}</h3><p>{guide.reason}</p></div>
              {expert ? <CryptoExpertOverview decision={decision} language={language} quoteCurrency="KRW" /> : <PriceTrace decision={decision} language={language} />}
            </section>
            <section className={styles.levelCard} aria-label={t('확인할 가격', 'Price levels')}>
              <div className={styles.cardTop}><h2>{t('다음에 확인할 가격', 'Prices to revisit')}</h2><span className={styles.badge}>{t('무료 제공', 'Included free')}</span></div>
              <div className={styles.priceTabs} role="group" aria-label={t('가격 분석 선택', 'Price analysis')}>
                {(['overview', 'downside', 'upside'] as const).map(value => <button type="button" key={value} aria-pressed={priceView === value} onClick={() => setPriceView(value)}>{value === 'overview' ? t('핵심 가격', 'Key levels') : value === 'downside' ? t('어디까지 떨어질까?', 'Downside levels') : t('어디까지 올라갈까?', 'Upside levels')}</button>)}
              </div>
              {priceView === 'overview' ? ready && decision.plan ? <><dl className={styles.levels}><div><dt>{t('최근 지지 구간', 'Recent support zone')}</dt><dd>{price(decision.plan.entry[0])}<br />~ {price(decision.plan.entry[1])}</dd><small>{t('최근 가격 구조에서 살펴볼 구간', 'A zone in the recent price structure')}</small></div><div><dt>{t('최근 저항 구간', 'Recent resistance zone')}</dt><dd>{price(decision.plan.resistance[0])}<br />~ {price(decision.plan.resistance[1])}</dd><small>{t('상승이 막히거나 쉬어갈 수 있는 구간', 'Where an advance may pause')}</small></div></dl><p className={styles.nextCheck}>{guide.next}</p><p className={styles.small}>{t('장기 핵심 지지대는 ‘어디까지 떨어질까?’에서 따로 확인하세요. 가격 구간은 보장된 바닥이나 목표가가 아닙니다.', 'Open Downside levels for long-term support. Zones are not guaranteed floors or targets.')}</p></> : <p className={styles.empty}>{t('유효한 시간대 2개 이상과 최신 시세가 확보되면 가격 기준이 나타납니다.', 'Price levels require at least two valid timeframes and a fresh quote.')}</p> : instrument && (priceView === 'downside' ? <MajorSupportPanel instrument={instrument} quote={hourly} now={now} language={language} expert={expert} onEvidence={() => { setExpert(true); setPriceView('overview') }} /> : <PriceScenarioPanel model={buildCryptoPriceScenarios(instrument, decision)} side="upside" language={language} expert={expert} onEvidence={() => { setExpert(true); setPriceView('overview') }} />)}
            </section>
            {!premium && <AdPreview language={language} />}
          </div><aside className={styles.rightColumn}>{aiCard}<section className={styles.tipCard}><span className={styles.eyebrow}>{t('내가 정하는 투자 기준', 'YOUR REVIEW ROUTINE')}</span><h3>{t('가격보다 먼저, 확인할 조건.', 'Start with a condition to check.')}</h3><p>{t('왜 이 구간을 보는지 이해하고, 조건이 바뀌면 분석을 다시 확인하세요.', 'Understand the reference zone and review again when the conditions change.')}</p><Link to={`/my-analysis?instrumentId=${encodeURIComponent(selectedId)}`}>{t('기존 분석 화면에서 이어보기', 'Continue in the existing analysis')} ↗</Link></section></aside></div>}

          {view === 'watchlist' && <section className={styles.quoteCard}><div className={styles.cardTop}><h2>{t('다시 살펴볼 코인', 'Assets to revisit')}</h2><span className={styles.badge}>{watchlist.length}</span></div><p>{t('이 미리보기에서 담은 종목입니다. 새로고침하면 사라지며 실제 계정에 저장되지 않습니다.', 'Preview-only selections. Refreshing clears them; nothing is saved to your account.')}</p>{watchlist.length ? <div className={styles.watchRows}>{watchlist.map(id => { const item = instruments.find(asset => asset.id === id); return <button type="button" key={id} onClick={() => selectAsset(id)}><strong>{item?.koreanName ?? item?.name ?? id}</strong><span>{item?.symbol ?? 'KRW'}</span><span>{t('분석 보기', 'Analyze')} →</span></button> })}</div> : <div className={styles.empty}><span>☆</span><h3>{t('관심 있는 코인부터 담아보세요', 'Start with an asset you follow')}</h3><p>{t('분석 화면의 별을 누르면 여기에 모입니다.', 'Use the star on the analysis screen to add a coin.')}</p><button type="button" onClick={() => changeParams({ view: 'analysis' })}>{t('종목 살펴보기', 'Explore assets')} →</button></div>}</section>}

          {view === 'report' && <div className={styles.columns}><section className={styles.reportSheet} aria-label={t('리포트 미리보기', 'Report preview')}>
            {!premium ? <div className={styles.empty}><span>✧</span><h2>{t('AI 리포트는 프리미엄에서', 'AI reports with Premium')}</h2><p>{t('기본 종목 분석은 무료로 이용하고, AI 설명이 추가된 화면을 여기서 비교할 수 있어요.', 'Core analysis is free. Compare the presentation of an added AI report here.')}</p><button className={styles.primary} type="button" onClick={() => changeParams({ plan: 'premium' })}>{t('프리미엄 화면 체험하기', 'Try the Premium view')} →</button></div> : currentReport ? <>
              <div className={styles.cardTop}><span className={styles.eyebrow}>MARKET COPILOT / RESEARCH NOTE</span><span className={styles.badge}>{t('AI 미연결 · 규칙 기반 예시', 'AI disconnected · Rule-based example')}</span></div>
              <h2>{currentReport.symbol}<br />{t('흐름과 가격 기준 리포트', 'Trend and price-level report')}</h2><p>{currentReport.venue} · {currentReport.currency} · {t('예시를 연 시각', 'Preview opened')} {new Date(currentReport.openedAt).toLocaleString(language)}</p>
              <p className={styles.exampleNote}>{t('현재 계산된 근거를 리포트 형식으로 배치한 화면 예시입니다. 실제 AI 분석이나 새로운 추천은 아닙니다. 새 시세가 들어와도 이 예시는 자동으로 바뀌지 않습니다.', 'A report layout populated from existing calculated evidence, not a real AI analysis or a new recommendation. This snapshot does not update with new quotes.')}</p>
              <article><span>01</span><div><h3>{t('한 문장으로 보는 흐름', 'The trend in one sentence')}</h3><strong>{currentReport.title}</strong><p>{currentReport.reason}</p></div></article>
              <article><span>02</span><div><h3>{t('다음 확인 조건', 'What to review next')}</h3><p>{currentReport.next}</p>{currentReport.reassess !== null && <p>{t('판단 재검토 기준', 'Reassessment reference')}: {price(currentReport.reassess)}</p>}</div></article>
              <article><span>03</span><div><h3>{t('아직 설명하지 못하는 부분', 'What this example cannot explain')}</h3><p>{t('가격 기록에서 계산한 내용만 포함합니다. 뉴스의 원인 해석, 개인 투자 상황, 미래 수익률은 포함하지 않습니다. 실제 AI 연결 후 결과 품질을 별도로 검증해야 합니다.', 'Only price-derived calculations are included. News causality, personal circumstances and future returns are not covered. Actual AI output needs separate quality validation.')}</p></div></article>
              <footer>{currentReport.basisAt !== null && <p>{t('포함된 최신 완료 봉', 'Latest included closed bar')}: {new Date(currentReport.basisAt).toLocaleString(language)}</p>}<button type="button" disabled={!ready} onClick={openReport}>{t('현재 자료로 예시 다시 열기', 'Refresh this example from current evidence')}</button></footer>
            </> : <div className={styles.empty}><span>✧</span><h2>{t('내 종목의 설명을 한 편으로', 'Your asset, in one report')}</h2><p>{t('오른쪽 버튼으로 리포트 화면 예시를 열어보세요. 실제 AI 호출이나 횟수 차감은 없습니다.', 'Open a report example using the adjacent button. No AI request or quota charge is made.')}</p></div>}
          </section><aside className={styles.rightColumn}>{aiCard}</aside></div>}

          {view === 'plans' && <section aria-label={t('출시 예정 요금제', 'Planned launch plans')}><p className={styles.exampleNote}>{t('아래는 출시 예정 구성입니다. 현재는 판매 전이며, 체험 버튼은 화면만 바꿉니다. 월 요금은 부가세 포함입니다.', 'Planned launch packages, not currently on sale. Preview buttons change only the screen. Monthly prices include VAT.')}</p><div className={styles.planCards}>{[
            { name: t('무료', 'Free'), amount: '0', description: t('기본 분석부터 시작', 'Start with core analysis'), features: [t('기본 종목 분석·가격 기준', 'Core analysis and price levels'), t('간편·전문가 화면 모두', 'Simple and Expert views'), t('광고 표시', 'Advertising'), t('유료 AI 분석 미포함', 'Paid AI analysis excluded')], action: 'free' },
            { name: t('광고 제거', 'Ad-free'), amount: '4,900', description: t('익숙한 기능을 광고 없이', 'The same core tools, without ads'), features: [t('무료의 기본 분석 기능', 'The same free core analysis'), t('광고 제거', 'No advertising'), t('유료 AI 분석 미포함', 'Paid AI analysis excluded')], action: null },
            { name: t('프리미엄', 'Premium'), amount: '14,900', description: t('광고 제거 + AI 설명', 'Ad-free plus AI explanations'), features: [t('기본 분석 기능과 광고 제거', 'Core analysis without ads'), t('AI 분석 월 100회 예정', '100 AI analyses per month planned'), t('리포트 사용 흐름 미리보기', 'Preview the report workflow')], action: 'premium' },
          ].map(item => <article key={item.amount} className={item.action === 'premium' ? styles.featuredPlan : ''}><span className={styles.eyebrow}>{item.name}</span><h2>{item.description}</h2><p className={styles.price}><strong>{item.amount}</strong>{t('원 / 월', 'KRW / month')}</p><ul>{item.features.map(feature => <li key={feature}>{feature}</li>)}</ul>{item.action ? <button type="button" onClick={() => changeParams({ plan: item.action!, view: 'analysis' })}>{t('이 화면 체험하기', 'Preview this plan')} →</button> : <span className={styles.small}>{t('무료 기능에서 광고만 빠지는 구성입니다.', 'Same free features with ads removed.')}</span>}</article>)}</div></section>}
          <footer className={styles.pageFooter}><span>Market Copilot · {t('무료 / 프리미엄 출시 미리보기', 'Free / Premium launch preview')}</span><span>{t('시세·기본 분석: 실제 자료 / 광고·AI·사용량: 화면 예시', 'Quotes and core analysis: live data / Ads, AI and quota: UI examples')}</span><Link to="/plans">{t('현재 베타 이용 범위', 'Current beta coverage')} ↗</Link></footer>
        </main>
      </div>
    </div>
  </div>
}

function AdPreview({ language }: { language: 'ko' | 'en' }) {
  const ko = language === 'ko'
  return <aside className={styles.ad} aria-label={ko ? '광고 위치 예시' : 'Example advertisement placement'}><div><span>AD · {ko ? '광고 예시' : 'EXAMPLE'}</span><strong>{ko ? '분석은 넓게, 광고는 따로.' : 'Research first. Advertising in its own space.'}</strong><p>{ko ? '무료 회원에게 보일 광고 자리입니다. 실제 광고를 불러오거나 클릭 수익을 발생시키지 않습니다.' : 'A placement for the free plan. No ad network is loaded and no advertising revenue is generated.'}</p></div><div className={styles.adArtwork} aria-hidden="true"><i /><i /><i /></div></aside>
}

function PriceTrace({ decision, language }: { decision: ReturnType<typeof buildCryptoDecision>; language: 'ko' | 'en' }) {
  const frame = decision.frames.find(row => row.frame === '4H' && !row.issue) ?? decision.frames.find(row => !row.issue)
  const values = frame?.candles.slice(-45) ?? []
  const low = Math.min(...values.map(value => value.close)), high = Math.max(...values.map(value => value.close))
  const span = high - low || 1
  const points = values.map((value, index) => `${index / Math.max(values.length - 1, 1) * 600},${140 - (value.close - low) / span * 120}`).join(' ')
  return <figure className={styles.trace}><figcaption>{language === 'ko' ? '최근 완료 봉의 가격 흐름' : 'Recent completed-candle prices'}{frame && ` · ${frame.frame}`}</figcaption>{values.length > 1 ? <><svg viewBox="0 0 600 160" role="img" aria-label={language === 'ko' ? '실제 완료 봉 종가 차트' : 'Actual closed-candle price chart'}><path d="M0 20H600 M0 80H600 M0 140H600" className={styles.chartGrid} /><polyline points={points} /></svg><div><span>{new Date(values[0].timestamp).toLocaleDateString(language)}</span><span>{new Date(values.at(-1)!.timestamp).toLocaleDateString(language)}</span></div></> : <p>{language === 'ko' ? '검증된 가격 기록이 준비되면 차트가 나타납니다.' : 'The chart appears when validated price history is available.'}</p>}</figure>
}
