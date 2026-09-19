import type { Language } from '@/i18n/translations'
import type { AiScenarioAnalysis, AiScenarioKind, AiScenarioTimeframe } from '@/types/aiScenario'
import type { MarketInstrument } from '@/types/market'

const copy = {
  en: {
    labels: { bullish: 'Bullish scenario', neutral: 'Neutral scenario', bearish: 'Bearish scenario' },
    crypto: {
      rationale: ['Short-term momentum and volume are illustrative watch points.', 'BTC market influence and exchange activity can affect this asset.', 'Crypto volatility can change conditions quickly.'],
      watch: ['Watch whether volume confirms the current move.', 'Observe BTC direction and broader exchange activity.', 'Reassess after sharp volatility expansion.'],
      risks: ['Rapid liquidity changes', 'BTC-led market reversal', 'Exchange-specific volatility'],
    },
    stock: {
      rationale: ['Sector and company movement are illustrative context only.', 'Board and broader index mood may affect the scenario.', 'Earnings and company news remain unverified placeholders.'],
      watch: ['Watch sector and broader index direction.', 'Observe company movement around news or earnings placeholders.', 'Reassess if market-board participation weakens.'],
      risks: ['Company-specific event risk', 'Sector rotation', 'Broader index weakness'],
    },
    summaries: {
      bullish: 'Momentum may continue if participation and market context remain supportive.',
      neutral: 'Price may consolidate while the market waits for clearer confirmation.',
      bearish: 'The scenario may weaken if support and participation deteriorate.',
    },
    scenarioMap: {
      bullish: 'Needs momentum and participation confirmation.',
      neutral: 'May remain range-bound while evidence stays mixed.',
      bearish: 'Risk increases if observed support conditions weaken.',
    },
    conditions: {
      bullish: ['Participation remains constructive', 'Momentum holds above the observed support area'],
      neutral: ['Mixed momentum persists', 'No decisive break from the current range'],
      bearish: ['Support conditions weaken', 'Negative momentum expands with participation'],
    },
    invalidation: {
      bullish: 'Weakens if momentum loses support and participation fades.',
      neutral: 'Ends when price leaves the range with sustained confirmation.',
      bearish: 'Weakens if support is reclaimed with improving participation.',
    },
    scenarioRisk: { bullish: ['False breakout'], neutral: ['Range expansion without warning'], bearish: ['Fast reversal'] },
    plan: {
      firstInterestArea: 'Wait for a pullback near an observed support zone.',
      secondInterestArea: 'Look for confirmation after a deeper pullback.',
      invalidationCondition: 'Scenario weakens if price closes beyond the observed support condition.',
      targetArea: 'Watch the previous resistance zone as a planning reference.',
    },
    disclaimer: 'Mock scenario examples only. Not investment advice. You make the final decision.',
  },
  ko: {
    labels: { bullish: '상승 시나리오', neutral: '중립 시나리오', bearish: '하락 시나리오' },
    crypto: {
      rationale: ['단기 모멘텀과 거래량은 설명용 관찰 항목입니다.', 'BTC 시장 영향과 거래소 활동이 해당 자산에 영향을 줄 수 있습니다.', '암호화폐 변동성은 조건을 빠르게 바꿀 수 있습니다.'],
      watch: ['거래량이 현재 움직임을 확인하는지 관찰합니다.', 'BTC 방향과 전체 거래소 활동을 살펴봅니다.', '급격한 변동성 확대 후 조건을 다시 확인합니다.'],
      risks: ['급격한 유동성 변화', 'BTC 주도 시장 반전', '거래소별 변동성'],
    },
    stock: {
      rationale: ['섹터와 기업 움직임은 설명용 맥락입니다.', '시장 구분과 전체 지수 분위기가 시나리오에 영향을 줄 수 있습니다.', '실적과 기업 뉴스는 아직 검증되지 않은 자리표시자입니다.'],
      watch: ['섹터와 전체 지수 방향을 관찰합니다.', '뉴스 또는 실적 자리표시자 전후의 기업 움직임을 살펴봅니다.', '시장 참여가 약해지면 조건을 다시 확인합니다.'],
      risks: ['기업 고유 이벤트 위험', '섹터 순환', '전체 지수 약세'],
    },
    summaries: {
      bullish: '시장 참여와 주변 여건이 유지되면 모멘텀이 이어질 수 있습니다.',
      neutral: '더 명확한 확인 신호를 기다리며 가격이 횡보할 수 있습니다.',
      bearish: '지지 조건과 시장 참여가 약해지면 시나리오가 악화될 수 있습니다.',
    },
    scenarioMap: {
      bullish: '모멘텀과 시장 참여의 확인이 필요합니다.',
      neutral: '근거가 혼재된 동안 범위 안에 머물 수 있습니다.',
      bearish: '관찰된 지지 조건이 약해지면 위험이 커집니다.',
    },
    conditions: {
      bullish: ['시장 참여가 양호하게 유지됨', '관찰된 지지 영역 위에서 모멘텀이 유지됨'],
      neutral: ['혼재된 모멘텀이 지속됨', '현재 범위를 명확하게 벗어나지 않음'],
      bearish: ['지지 조건이 약해짐', '시장 참여와 함께 부정적 모멘텀이 확대됨'],
    },
    invalidation: {
      bullish: '모멘텀이 지지를 잃고 시장 참여가 줄면 약해집니다.',
      neutral: '지속적인 확인과 함께 가격이 범위를 벗어나면 종료됩니다.',
      bearish: '시장 참여가 개선되며 지지를 회복하면 약해집니다.',
    },
    scenarioRisk: { bullish: ['거짓 돌파'], neutral: ['예고 없는 범위 확대'], bearish: ['빠른 반전'] },
    plan: {
      firstInterestArea: '관찰된 지지 영역 부근의 되돌림을 기다립니다.',
      secondInterestArea: '더 깊은 되돌림 이후 확인 신호를 살펴봅니다.',
      invalidationCondition: '가격이 관찰된 지지 조건을 벗어나 마감하면 시나리오가 약해집니다.',
      targetArea: '이전 저항 영역을 계획 참고 구간으로 관찰합니다.',
    },
    disclaimer: '모의 시나리오 예시입니다. 투자 조언이 아니며 최종 결정은 사용자가 합니다.',
  },
} as const

export function createMockScenarioAnalysis(instrument: MarketInstrument, language: Language, timeframe: AiScenarioTimeframe = 'short'): AiScenarioAnalysis {
  const text = copy[language]
  const context = instrument.marketId === 'upbit' || instrument.marketId.startsWith('binance') ? text.crypto : text.stock
  const scenario = (kind: AiScenarioKind) => ({
    kind,
    status: kind === 'bullish' ? 'watch' as const : kind === 'neutral' ? 'wait' as const : 'risk' as const,
    label: text.labels[kind],
    probability: null,
    summary: text.summaries[kind],
    conditions: text.conditions[kind],
    invalidation: text.invalidation[kind],
    risks: text.scenarioRisk[kind],
  })
  const scenarios: AiScenarioAnalysis['scenarios'] = {
    bullish: scenario('bullish'),
    neutral: scenario('neutral'),
    bearish: scenario('bearish'),
  }

  return {
    instrumentId: instrument.id,
    generatedAt: new Date().toISOString(),
    providerMode: 'mock',
    confidence: null,
    marketBias: 'mixed',
    timeframe,
    scenarios,
    scenarioMap: text.scenarioMap,
    rationale: context.rationale,
    watchConditions: context.watch,
    riskFactors: context.risks,
    tradePlan: text.plan,
    evidence: {
      priceAction: 'mock-placeholder',
      volume: 'mock-placeholder',
      newsContext: 'demo-only',
      marketRegime: 'mock-placeholder',
      missingEvidence: ['real-ai', 'real-news-backend'],
    },
    disclaimer: text.disclaimer,
  }
}

/** Invalid or incomplete catalog data must degrade to an unavailable state instead of crashing the panel. */
export function safelyCreateMockScenarioAnalysis(instrument: MarketInstrument, language: Language, timeframe: AiScenarioTimeframe): AiScenarioAnalysis | null {
  if (!instrument.id.trim() || !instrument.symbol.trim() || !instrument.name.trim()) return null
  try { return createMockScenarioAnalysis(instrument, language, timeframe) }
  catch { return null }
}
