import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { SimpleCandidateCard } from '@/components/simple/SimpleCandidateCard/SimpleCandidateCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useOpenNewsInstrument } from '@/hooks/useOpenNewsInstrument'
import { uiText } from '@/i18n/translations'
import { useLanguage } from '@/i18n/useLanguage'
import { buildCryptoWatchCandidates } from '@/services/ai/cryptoWatchCandidateEngine'
import { buildStockWatchCandidates } from '@/services/ai/stockWatchCandidateEngine'
import { buildSimpleCandidates } from '@/services/simple/simpleCandidateEngine'
import type { SimpleCandidateDataQuality } from '@/types/simpleMode'
import styles from './SimpleModePage.module.css'

const copy = {
  en: {
    eyebrow: 'FOR BEGINNERS', title: 'Market Copilot Simple Mode', subtitle: 'A clear view of what needs attention, why it appeared, and what to check next.',
    safety: 'Simple Mode is for planning and review only. It is not investment advice, a buy/sell signal, or a guarantee of profit.',
    cryptoTitle: 'Crypto Watch Candidates', cryptoStatus: 'ACTIVE BETA · UP TO 3', cryptoOrder: 'Crypto candidates are shown first when available.', cryptoLoading: 'Preparing crypto watch candidates…', cryptoEmpty: 'No crypto candidates are available from the current catalog.',
    cryptoError: 'Crypto data could not be loaded. Stock beta preview is shown separately and should not replace crypto candidates.', retry: 'Retry crypto data', useMock: 'Use MOCK data',
    stockTitle: 'Stock Beta Preview', stockStatus: 'EARLY BETA · KOREA + US', stockOrder: 'Stock candidates are shown as early beta.', stockLoading: 'Preparing the stock beta preview…', stockEmpty: 'No stock beta candidates are available.', stockNotice: 'Price planning stays disabled for mock or limited stock data. Reliable real stock data is required before numeric planning can be considered.',
    how: 'How to read this screen', howItems: ['Attention level is a sorting aid, not a probability.', 'Percentage areas are fixed distances, not calculated support or resistance.', 'Check whether the movement continues before making any decision.', 'Open Expert Mode for the full evidence and controls.'],
    quick: 'Continue exploring', radar: 'Open Market Radar', news: 'Open News Center', demo: 'Open Demo', limitations: 'No real AI, trading, account, payment, or production backend is connected.',
  },
  ko: {
    eyebrow: '초보자용', title: 'Market Copilot 간편모드', subtitle: '무엇을 살펴볼지, 왜 보이는지, 다음에 무엇을 확인할지 쉽게 정리한 화면입니다.',
    safety: '간편모드는 계획과 검토를 위한 참고용입니다. 투자 조언, 매수·매도 신호, 수익 보장이 아닙니다.',
    cryptoTitle: '가상자산 관찰 후보', cryptoStatus: '활성 베타 · 최대 3개', cryptoOrder: '가상자산 후보가 있으면 먼저 표시됩니다.', cryptoLoading: '가상자산 관찰 후보를 준비하고 있습니다…', cryptoEmpty: '현재 카탈로그에서 표시할 가상자산 후보가 없습니다.',
    cryptoError: '가상자산 데이터를 불러오지 못했습니다. 주식 베타 미리보기는 별도로 표시되며, 가상자산 후보를 대체하지 않습니다.', retry: '가상자산 데이터 다시 시도', useMock: 'MOCK 데이터 사용',
    stockTitle: '주식 베타 미리보기', stockStatus: '초기 베타 · 한국 + 미국', stockOrder: '주식 후보는 초기 베타로 표시됩니다.', stockLoading: '주식 베타 미리보기를 준비하고 있습니다…', stockEmpty: '표시할 주식 베타 후보가 없습니다.', stockNotice: '모의·제한 주식 데이터에는 가격 계획이 계속 비활성화됩니다. 숫자 계획을 검토하려면 신뢰할 수 있는 실제 주식 데이터가 필요합니다.',
    how: '이 화면을 읽는 방법', howItems: ['관심도는 정렬 참고값이며 확률이 아닙니다.', '비율 구간은 고정 거리이며 계산된 지지선·저항선이 아닙니다.', '판단 전 움직임이 이어지는지 확인해야 합니다.', '전체 근거와 설정은 전문가모드에서 확인하세요.'],
    quick: '계속 살펴보기', radar: 'Market Radar 열기', news: '뉴스 센터 열기', demo: '데모 열기', limitations: '실제 AI, 거래, 계정, 결제 및 운영 백엔드는 연결되지 않았습니다.',
  },
} as const

export function SimpleModePage() {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { displayMode } = useDisplayMode()
  const { marketDataMode, setMarketDataMode } = useMarketWorkspace()
  const { result: newsResult } = useNewsProviderMode()
  const { openInstrument, canOpenInstrument } = useOpenNewsInstrument()
  const [cryptoRetry, setCryptoRetry] = useState(0)
  const cryptoCatalog = useMarketCatalog('upbit-krw', marketDataMode, cryptoRetry)
  const kospi = useMarketCatalog('kospi', marketDataMode, 0)
  const kosdaq = useMarketCatalog('kosdaq', marketDataMode, 0)
  const nasdaq = useMarketCatalog('nasdaq', marketDataMode, 0)
  const nyse = useMarketCatalog('nyse', marketDataMode, 0)
  const t = copy[language]
  useDocumentTitle(t.title)

  const cryptoInstruments = useMemo(() => cryptoCatalog.catalog?.instruments ?? [], [cryptoCatalog.catalog?.instruments])
  const koreaInstruments = useMemo(() => [...(kospi.catalog?.instruments ?? []), ...(kosdaq.catalog?.instruments ?? [])], [kosdaq.catalog?.instruments, kospi.catalog?.instruments])
  const usInstruments = useMemo(() => [...(nasdaq.catalog?.instruments ?? []), ...(nyse.catalog?.instruments ?? [])], [nasdaq.catalog?.instruments, nyse.catalog?.instruments])
  const cryptoCandidates = useMemo(() => buildCryptoWatchCandidates({ instruments: cryptoInstruments, newsResult, language, horizon: 'short', limit: 3 }), [cryptoInstruments, language, newsResult])
  const koreaCandidates = useMemo(() => buildStockWatchCandidates({ instruments: koreaInstruments, region: 'korea', newsResult, language, horizon: 'short', limit: 1 }), [koreaInstruments, language, newsResult])
  const usCandidates = useMemo(() => buildStockWatchCandidates({ instruments: usInstruments, region: 'us', newsResult, language, horizon: 'short', limit: 1 }), [language, newsResult, usInstruments])
  const instruments = useMemo(() => [...cryptoInstruments, ...koreaInstruments, ...usInstruments], [cryptoInstruments, koreaInstruments, usInstruments])
  const cryptoDataQuality: SimpleCandidateDataQuality = cryptoCatalog.catalog?.source === 'live' ? 'live' : cryptoCatalog.catalog?.source === 'mock' ? 'mock' : cryptoCatalog.error ? 'unavailable' : 'limited'
  const candidates = useMemo(() => buildSimpleCandidates({ cryptoCandidates, koreaStockCandidates: koreaCandidates, usStockCandidates: usCandidates, marketInstruments: instruments, language, maxCandidates: 5, cryptoDataQuality }), [cryptoCandidates, cryptoDataQuality, instruments, koreaCandidates, language, usCandidates])
  const simpleCrypto = candidates.filter((candidate) => candidate.assetType === 'crypto').slice(0, 3)
  const simpleStocks = candidates.filter((candidate) => candidate.assetType === 'stock').slice(0, 2)
  const stockLoading = [kospi, kosdaq, nasdaq, nyse].some((catalog) => catalog.loading)
  const handleOpenMarket = (instrumentId: string) => canOpenInstrument(instrumentId) ? openInstrument(instrumentId) : navigate('/market')

  return <div className={styles.page}>
    <div className={styles.pageHeader}>
      <header className={styles.hero}><span>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.subtitle}</p></header>
    </div>
    {displayMode === 'expert' && <aside className={styles.modeNote} role="note">{uiText[language].displayMode.simpleExpertNote}</aside>}
    <aside className={styles.safety} role="note">{t.safety}</aside>

    <section className={styles.candidates} aria-labelledby="simple-crypto-title"><header><div><span>01</span><h2 id="simple-crypto-title">{t.cryptoTitle}</h2><p>{t.cryptoOrder}</p></div><small>{t.cryptoStatus}</small></header>{cryptoCatalog.error && <div className={styles.error} role="alert"><strong>{t.cryptoError}</strong><small>{cryptoCatalog.error}</small><div><button type="button" onClick={() => setCryptoRetry((value) => value + 1)}>{t.retry}</button>{marketDataMode === 'live' && <button type="button" onClick={() => setMarketDataMode('mock')}>{t.useMock}</button>}</div></div>}{cryptoCatalog.loading && <div className={styles.state} role="status">{t.cryptoLoading}</div>}{!cryptoCatalog.loading && !cryptoCatalog.error && simpleCrypto.length === 0 && <div className={styles.state} role="status">{t.cryptoEmpty}</div>}{!cryptoCatalog.loading && !cryptoCatalog.error && simpleCrypto.length > 0 && <div className={styles.list}>{simpleCrypto.map((candidate) => <SimpleCandidateCard key={candidate.id} candidate={candidate} language={language} onOpenMarket={handleOpenMarket} />)}</div>}</section>

    <section className={`${styles.candidates} ${styles.stockSection}`} aria-labelledby="simple-stock-title"><header><div><span>02</span><h2 id="simple-stock-title">{t.stockTitle}</h2><p>{t.stockOrder}</p></div><small>{t.stockStatus}</small></header><p className={styles.stockNotice}>{t.stockNotice}</p>{stockLoading && <div className={styles.state} role="status">{t.stockLoading}</div>}{!stockLoading && simpleStocks.length === 0 && <div className={styles.state} role="status">{t.stockEmpty}</div>}{!stockLoading && simpleStocks.length > 0 && <div className={styles.list}>{simpleStocks.map((candidate) => <SimpleCandidateCard key={candidate.id} candidate={candidate} language={language} onOpenMarket={handleOpenMarket} />)}</div>}</section>

    <section className={styles.guide} aria-labelledby="simple-guide-title"><header><span>03</span><h2 id="simple-guide-title">{t.how}</h2></header><ol>{t.howItems.map((item) => <li key={item}>{item}</li>)}</ol></section>
    <nav className={styles.quick} aria-label={t.quick}><span>{t.quick}</span><Link to="/dashboard">{t.radar}</Link><Link to="/news">{t.news}</Link><Link to="/demo">{t.demo}</Link></nav>
    <footer className={styles.boundary}>{t.limitations}</footer>
  </div>
}
