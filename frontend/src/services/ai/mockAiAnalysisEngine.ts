import type { Language } from '@/i18n/translations'
import type { AiAnalysisInput, AiAnalysisResult, AiEvidenceItem } from '@/types/aiAnalysis'

const copy = {
  en: {
    summary: (symbol: string) => `This is a mock analysis framework for ${symbol}. Real AI and a real news backend are not connected yet.`,
    cryptoWatch: 'This instrument is a watch candidate because quote and mock scenario context are available; crypto conditions can change quickly.',
    stockWatch: 'This instrument is a watch candidate for sector, index, company-context, and volume confirmation—not a recommendation.',
    cryptoRisk: 'Crypto volatility, BTC-led movement, exchange activity, and incomplete evidence can invalidate the observed scenario.',
    stockRisk: 'Sector rotation, index mood, company events, and incomplete evidence can invalidate the observed scenario.',
    invalidation: 'Reassess if the scenario conditions weaken or price and participation no longer confirm the observed context.',
    cryptoPoints: ['Volume confirmation', 'BTC direction', 'Exchange activity', 'Related news availability'],
    stockPoints: ['Volume confirmation', 'Sector or theme direction', 'Index mood', 'Company and news context'],
    labels: { price: 'Price data', volume: 'Volume data', news: 'News data', market: 'Market context', scenario: 'Scenario data' },
    values: { available: 'Available', missing: 'Missing', demoNews: 'Demo only', demoScenario: 'Mock available', market: 'Market and provider context available' },
    missing: { realAi: 'Real AI model', realNewsBackend: 'Real news backend', backtesting: 'Backtesting', portfolioContext: 'Portfolio context', realProbabilityModel: 'Real probability model' },
    disclaimer: 'Mock analysis only. Not investment advice. You make the final decision.',
  },
  ko: {
    summary: (symbol: string) => `${symbol}의 모의 분석 구조입니다. 실제 AI와 실제 뉴스 백엔드는 아직 연결되지 않았습니다.`,
    cryptoWatch: '시세와 모의 시나리오 맥락을 확인할 수 있어 관찰 후보로 구성했습니다. 암호화폐 조건은 빠르게 바뀔 수 있습니다.',
    stockWatch: '섹터·지수·기업 맥락과 거래량 확인을 위한 관찰 후보이며, 투자 추천이 아닙니다.',
    cryptoRisk: '암호화폐 변동성, BTC 주도 움직임, 거래소 활동과 불완전한 근거가 관찰 시나리오를 무효화할 수 있습니다.',
    stockRisk: '섹터 순환, 지수 분위기, 기업 이벤트와 불완전한 근거가 관찰 시나리오를 무효화할 수 있습니다.',
    invalidation: '시나리오 조건이 약해지거나 가격과 시장 참여가 관찰 맥락을 더 이상 확인하지 못하면 다시 평가합니다.',
    cryptoPoints: ['거래량 확인', 'BTC 방향', '거래소 활동', '관련 뉴스 가용성'],
    stockPoints: ['거래량 확인', '섹터 또는 테마 방향', '지수 분위기', '기업 및 뉴스 맥락'],
    labels: { price: '가격 데이터', volume: '거래량 데이터', news: '뉴스 데이터', market: '시장 맥락', scenario: '시나리오 데이터' },
    values: { available: '사용 가능', missing: '없음', demoNews: '데모 전용', demoScenario: '모의 데이터 사용 가능', market: '시장 및 제공자 맥락 사용 가능' },
    missing: { realAi: '실제 AI 모델', realNewsBackend: '실제 뉴스 백엔드', backtesting: '백테스팅', portfolioContext: '포트폴리오 맥락', realProbabilityModel: '실제 확률 모델' },
    disclaimer: '모의 분석 전용입니다. 투자 조언이 아니며 최종 결정은 사용자가 합니다.',
  },
} as const

/** Pure deterministic transformer. Identical input and language always produce identical output. */
export function createMockAiAnalysis(input: AiAnalysisInput, language: Language): AiAnalysisResult {
  const text = copy[language]
  const priceAvailable = input.quote.quoteStatus === 'available'
  const scenarioAvailable = input.scenarioContext.evidenceState === 'demo' && input.scenarioContext.scenarioMap !== null
  const evidenceUsed: AiEvidenceItem[] = [
    { type: 'price', label: text.labels.price, value: priceAvailable ? text.values.available : text.values.missing, status: priceAvailable ? 'available' : 'missing' },
    { type: 'volume', label: text.labels.volume, value: input.quote.volume24h === null ? text.values.missing : text.values.available, status: input.quote.volume24h === null ? 'missing' : 'available' },
    { type: 'news', label: text.labels.news, value: input.newsContext.isDemoOnly ? text.values.demoNews : text.values.available, status: input.newsContext.isDemoOnly ? 'demo' : 'available' },
    { type: 'market', label: text.labels.market, value: text.values.market, status: 'available' },
    { type: 'scenario', label: text.labels.scenario, value: scenarioAvailable ? text.values.demoScenario : text.values.missing, status: scenarioAvailable ? 'demo' : 'missing' },
  ]
  const missingEvidence = (Object.entries(input.missingInputs) as [keyof AiAnalysisInput['missingInputs'], boolean][])
    .filter(([, missing]) => missing)
    .map(([key]) => text.missing[key])
  const scenarioLinks = input.scenarioContext.scenarioMap
    ? (Object.entries(input.scenarioContext.scenarioMap) as ['bullish' | 'neutral' | 'bearish', string][]).map(([kind, summary]) => ({ kind, summary }))
    : []
  const crypto = input.instrument.assetType === 'crypto'

  return {
    instrumentId: input.instrument.id,
    generatedAt: input.generatedAt,
    providerMode: 'mock',
    status: missingEvidence.length || evidenceUsed.some((item) => item.status === 'missing') ? 'incomplete-evidence' : 'mock-analysis',
    summary: text.summary(input.instrument.symbol),
    watchReason: crypto ? text.cryptoWatch : text.stockWatch,
    evidenceUsed,
    missingEvidence,
    riskSummary: crypto ? text.cryptoRisk : text.stockRisk,
    invalidationSummary: text.invalidation,
    nextWatchPoints: crypto ? text.cryptoPoints : text.stockPoints,
    scenarioLinks,
    disclaimer: text.disclaimer,
  }
}
