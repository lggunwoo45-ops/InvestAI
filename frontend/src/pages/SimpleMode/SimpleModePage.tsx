import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { SimpleCandidateCard } from '@/components/simple/SimpleCandidateCard/SimpleCandidateCard'
import { useCandidateFeedback } from '@/hooks/useCandidateFeedback'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useOpenNewsInstrument } from '@/hooks/useOpenNewsInstrument'
import { useLanguage } from '@/i18n/useLanguage'
import { buildCryptoWatchCandidates } from '@/services/ai/cryptoWatchCandidateEngine'
import { buildStockWatchCandidates } from '@/services/ai/stockWatchCandidateEngine'
import { buildSimpleCandidates } from '@/services/simple/simpleCandidateEngine'
import styles from './SimpleModePage.module.css'

const copy = {
  en: {
    eyebrow: 'FOR BEGINNERS', title: 'Market Copilot Simple Mode', subtitle: 'A beginner-friendly view that shows what to watch, why it matters, and which price zones to observe.',
    safety: 'This screen is for planning and review only. It is not investment advice, a buy/sell signal, or a guarantee of profit. The final decision is yours.',
    explanation: ['This is not investment advice.', 'This is not a buy/sell signal.', 'This is a planning reference screen.', 'Crypto plans can show price zones when current price is available.', 'Stock plans remain limited until real stock data is connected.'],
    candidates: "Today’s Watch Candidates", generated: 'Rule-based shortlist · top 5', loading: 'Preparing current watch candidates…', empty: 'No candidates are available from the current catalog. No placeholder candidates were created.',
    how: 'How to read this screen', howItems: ['Watch Score is not a probability.', 'Observation prices are not buy instructions.', 'Risk Reference Price is not a stop-loss instruction.', 'Profit-Taking Reference Range is not a guaranteed target.', 'Open Expert Mode to review detailed evidence.'],
    stockTitle: 'Stock Beta Notice', stockBody: 'The stock candidate workflow is available in early beta. Price planning is disabled for mock or limited stock data. A real stock provider and reliable live price are required before numeric stock planning levels can appear.',
    quick: 'Continue exploring', expert: 'Open Expert Mode', radar: 'Open Market Radar', news: 'Open News Center', demo: 'Open Demo', limitations: 'No real AI, trading, account, payment, or production backend is connected.',
  },
  ko: {
    eyebrow: '초보자용', title: 'Market Copilot 간편모드', subtitle: '오늘 볼 후보, 보는 이유, 관찰할 가격 구간을 쉽게 정리한 초보자용 화면입니다.',
    safety: '이 화면은 계획과 검토를 위한 참고용입니다. 투자 조언, 매수·매도 신호, 수익 보장이 아닙니다. 최종 판단은 사용자가 직접 해야 합니다.',
    explanation: ['투자 조언 화면이 아닙니다.', '매수·매도 신호 화면이 아닙니다.', '계획 참고용 화면입니다.', '가상자산은 현재가가 있을 때 가격 구간을 표시할 수 있습니다.', '주식 계획은 실제 주식 데이터가 연결될 때까지 제한됩니다.'],
    candidates: '오늘의 관찰 후보', generated: '규칙 기반 목록 · 상위 5개', loading: '현재 관찰 후보를 준비하고 있습니다…', empty: '현재 카탈로그에서 표시할 후보가 없습니다. 임의 후보를 만들지 않았습니다.',
    how: '이 화면을 읽는 방법', howItems: ['관찰 점수는 확률이 아닙니다.', '관찰가는 매수 지시가 아닙니다.', '위험 기준가는 손절 지시가 아닙니다.', '수익 실현 참고 구간은 보장된 목표가가 아닙니다.', '상세 근거는 전문모드에서 확인하세요.'],
    stockTitle: '주식 베타 안내', stockBody: '주식 후보 흐름은 초기 베타로 제공됩니다. 모의·제한 주식 데이터에는 가격 계획이 비활성화됩니다. 숫자 주식 계획 구간을 표시하려면 실제 주식 공급자와 신뢰할 수 있는 실시간 가격이 필요합니다.',
    quick: '계속 살펴보기', expert: '전문모드 열기', radar: 'Market Radar 열기', news: '뉴스 센터 열기', demo: '데모 열기', limitations: '실제 AI, 거래, 계정, 결제 및 운영 백엔드는 연결되지 않았습니다.',
  },
} as const

export function SimpleModePage() {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { marketDataMode } = useMarketWorkspace()
  const { result: newsResult } = useNewsProviderMode()
  const { openInstrument, canOpenInstrument } = useOpenNewsInstrument()
  const { feedback, setStatus } = useCandidateFeedback()
  const cryptoCatalog = useMarketCatalog('upbit-krw', marketDataMode, 0)
  const kospi = useMarketCatalog('kospi', marketDataMode, 0)
  const kosdaq = useMarketCatalog('kosdaq', marketDataMode, 0)
  const nasdaq = useMarketCatalog('nasdaq', marketDataMode, 0)
  const nyse = useMarketCatalog('nyse', marketDataMode, 0)
  const t = copy[language]
  useDocumentTitle(t.title)

  const cryptoInstruments = useMemo(() => cryptoCatalog.catalog?.instruments ?? [], [cryptoCatalog.catalog?.instruments])
  const koreaInstruments = useMemo(() => [...(kospi.catalog?.instruments ?? []), ...(kosdaq.catalog?.instruments ?? [])], [kosdaq.catalog?.instruments, kospi.catalog?.instruments])
  const usInstruments = useMemo(() => [...(nasdaq.catalog?.instruments ?? []), ...(nyse.catalog?.instruments ?? [])], [nasdaq.catalog?.instruments, nyse.catalog?.instruments])
  const cryptoCandidates = useMemo(() => buildCryptoWatchCandidates({ instruments: cryptoInstruments, newsResult, language, horizon: 'short', limit: 5 }), [cryptoInstruments, language, newsResult])
  const koreaCandidates = useMemo(() => buildStockWatchCandidates({ instruments: koreaInstruments, region: 'korea', newsResult, language, horizon: 'short', limit: 5 }), [koreaInstruments, language, newsResult])
  const usCandidates = useMemo(() => buildStockWatchCandidates({ instruments: usInstruments, region: 'us', newsResult, language, horizon: 'short', limit: 5 }), [language, newsResult, usInstruments])
  const instruments = useMemo(() => [...cryptoInstruments, ...koreaInstruments, ...usInstruments], [cryptoInstruments, koreaInstruments, usInstruments])
  const candidates = useMemo(() => buildSimpleCandidates({ cryptoCandidates, koreaStockCandidates: koreaCandidates, usStockCandidates: usCandidates, marketInstruments: instruments, language, maxCandidates: 5, cryptoDataQuality: marketDataMode === 'live' ? 'live' : 'mock' }), [cryptoCandidates, instruments, koreaCandidates, language, marketDataMode, usCandidates])
  const loading = [cryptoCatalog, kospi, kosdaq, nasdaq, nyse].some((catalog) => catalog.loading)
  const handleOpenMarket = (instrumentId: string) => canOpenInstrument(instrumentId) ? openInstrument(instrumentId) : navigate('/market')

  return <div className={styles.page}>
    <header className={styles.hero}><div><span>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><Link to="/ai-analysis">{t.expert} →</Link></header>
    <aside className={styles.safety} role="note"><strong>{language === 'ko' ? '계획 참고용' : 'Planning reference only'}</strong><p>{t.safety}</p></aside>
    <ul className={styles.explanation}>{t.explanation.map((item) => <li key={item}>{item}</li>)}</ul>

    <section className={styles.candidates} aria-labelledby="simple-candidates-title"><header><div><span>01</span><h2 id="simple-candidates-title">{t.candidates}</h2></div><small>{t.generated}</small></header>{loading && <div className={styles.state} role="status">{t.loading}</div>}{!loading && candidates.length === 0 && <div className={styles.state} role="status">{t.empty}</div>}{!loading && candidates.length > 0 && <div className={styles.list}>{candidates.map((candidate, index) => <SimpleCandidateCard key={candidate.id} candidate={candidate} rank={index + 1} language={language} reviewStatus={feedback[candidate.instrumentId]?.status ?? 'unreviewed'} onOpenMarket={handleOpenMarket} onSetStatus={setStatus} />)}</div>}</section>

    <section className={styles.guide} aria-labelledby="simple-guide-title"><header><span>02</span><h2 id="simple-guide-title">{t.how}</h2></header><ol>{t.howItems.map((item) => <li key={item}>{item}</li>)}</ol></section>
    <section className={styles.stockNotice} aria-labelledby="stock-beta-title"><span>EARLY BETA</span><h2 id="stock-beta-title">{t.stockTitle}</h2><p>{t.stockBody}</p></section>
    <nav className={styles.quick} aria-label={t.quick}><span>{t.quick}</span><Link to="/ai-analysis">{t.expert}</Link><Link to="/dashboard">{t.radar}</Link><Link to="/news">{t.news}</Link><Link to="/demo">{t.demo}</Link></nav>
    <footer className={styles.boundary}>{t.limitations}</footer>
  </div>
}
