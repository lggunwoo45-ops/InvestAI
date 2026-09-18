import type { MarketBriefing } from '@/types/briefing'

/** Editorial demo fixtures, not current market observations or recommendations. */
export const mockBriefings: readonly MarketBriefing[] = [
  {
    id: 'crypto', source: 'mock',
    mood: { en: 'Illustrative: selective risk appetite', ko: '예시: 선별적인 위험 선호' },
    whyMatters: { en: 'BTC direction, altcoin dispersion, exchange volume and volatility can frame the crypto session.', ko: 'BTC 방향, 알트코인 움직임, 거래소 거래량과 변동성을 함께 살펴봅니다.' },
    majorMovers: [{ label: 'BTC/KRW', instrumentId: 'upbit-btc' }, { label: 'ETH/KRW', instrumentId: 'upbit-eth' }],
    topGainers: [{ label: 'SOL/KRW', instrumentId: 'upbit-sol' }],
    topLosers: [{ label: 'XRP/KRW', instrumentId: 'upbit-xrp' }],
    highVolume: [{ label: 'BTC/KRW', instrumentId: 'upbit-btc' }, { label: 'ETH/KRW', instrumentId: 'upbit-eth' }],
    whatToWatch: [
      { en: 'Compare BTC direction with broad altcoin participation.', ko: 'BTC 방향과 알트코인 참여 폭을 비교하세요.' },
      { en: 'Watch exchange volume, volatility and abrupt liquidity changes.', ko: '거래소 거래량, 변동성, 유동성 급변을 관찰하세요.' },
    ],
    newsIds: ['news-btc-etf', 'news-sol-volume'],
  },
  {
    id: 'korea', source: 'mock',
    mood: { en: 'Illustrative: mixed large-cap breadth', ko: '예시: 대형주 흐름 혼조' },
    whyMatters: { en: 'KOSPI/KOSDAQ breadth and semiconductor leadership can reveal whether a move is broadly supported.', ko: 'KOSPI·KOSDAQ 시장 폭과 반도체 주도주 흐름을 함께 살펴봅니다.' },
    majorMovers: [{ label: 'Samsung Electronics', instrumentId: 'krx-005930' }, { label: 'SK hynix', instrumentId: 'krx-000660' }],
    topGainers: [{ label: 'SK hynix', instrumentId: 'krx-000660' }],
    topLosers: [{ label: 'NAVER', instrumentId: 'krx-035420' }],
    highVolume: [{ label: 'Samsung Electronics', instrumentId: 'krx-005930' }],
    whatToWatch: [
      { en: 'Compare KOSPI and KOSDAQ participation.', ko: 'KOSPI와 KOSDAQ의 참여 폭을 비교하세요.' },
      { en: 'Check whether semiconductor moves extend beyond a few large caps.', ko: '반도체 움직임이 일부 대형주를 넘어 확산되는지 확인하세요.' },
    ],
    newsIds: ['news-korea-semiconductors'],
  },
  {
    id: 'us', source: 'mock',
    mood: { en: 'Illustrative: technology-led divergence', ko: '예시: 기술주 중심 차별화' },
    whyMatters: { en: 'NASDAQ/NYSE participation, large-cap technology and earnings themes can shift wider risk appetite.', ko: 'NASDAQ·NYSE 참여 폭과 대형 기술주, 실적 테마가 위험 선호에 영향을 줄 수 있습니다.' },
    majorMovers: [{ label: 'NVIDIA', instrumentId: 'us-nvda' }, { label: 'Tesla', instrumentId: 'us-tsla' }],
    topGainers: [{ label: 'NVIDIA', instrumentId: 'us-nvda' }],
    topLosers: [{ label: 'Tesla', instrumentId: 'us-tsla' }],
    highVolume: [{ label: 'NVIDIA', instrumentId: 'us-nvda' }],
    whatToWatch: [
      { en: 'Compare NASDAQ leadership with NYSE market breadth.', ko: 'NASDAQ 주도주와 NYSE 시장 폭을 비교하세요.' },
      { en: 'Verify actual earnings dates and macro releases before acting.', ko: '행동 전 실제 실적 일정과 경제지표 발표를 확인하세요.' },
    ],
    newsIds: ['news-nvda-chips', 'news-us-session'],
  },
  {
    id: 'macro', source: 'mock',
    mood: { en: 'Illustrative: policy-sensitive risk appetite', ko: '예시: 정책 변화에 민감한 위험 선호' },
    whyMatters: { en: 'Rates, dollar strength and external events can affect equities and crypto together.', ko: '금리, 달러 강세와 대외 이벤트는 주식과 암호화폐에 함께 영향을 줄 수 있습니다.' },
    majorMovers: [{ label: 'Rates (illustrative)' }, { label: 'US dollar (illustrative)' }],
    topGainers: [{ label: 'Risk-on assets (illustrative)' }],
    topLosers: [{ label: 'Rate-sensitive assets (illustrative)' }],
    highVolume: [{ label: 'Cross-market volume (illustrative)' }],
    whatToWatch: [
      { en: 'Check verified rates and currency releases.', ko: '실제 금리·환율 발표를 확인하세요.' },
      { en: 'Observe whether external events alter broad risk appetite.', ko: '대외 이벤트가 전체 위험 선호를 바꾸는지 살펴보세요.' },
    ],
    newsIds: ['news-fed-outlook'],
  },
]
