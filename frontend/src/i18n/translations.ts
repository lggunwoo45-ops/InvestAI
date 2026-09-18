import type { NavigationIcon } from '@/types/navigation'

export type Language = 'en' | 'ko'

interface UiStrings {
  navigation: Record<NavigationIcon, string>
  workspace: string
  localEnvironment: string
  collapseSidebar: string
  expandSidebar: string
  language: string
  globalSearch: string
  searchMarkets: string
  searchNews: string
  searchEmpty: string
  marketSessions: string
  sessions: { crypto: string; korea: string; us: string; 'always-open': string; open: string; closed: string }
  market: string
  publicApi: string
  health: { online: string; degraded: string; offline: string; unconfigured: string }
  operator: string
  workspaceOwner: string
  dataMode: string
  live: string
  mock: string
  active: string
  detail: { market: string; high: string; low: string; volume: string; change: string }
  copilot: {
    title: string; context: string; none: string; company: string; scenario: string
    ready: string; readyDescription: string; timeframe: string; price: string; change: string
    confidence: string; mockConfidence: string; why: string; placeholder: string
    trend: string; volume: string; momentum: string; boundary: string; noModels: string; judgment: string
  }
}

/** English remains the safe default; this dictionary covers the primary workspace UI. */
export const uiText = {
  en: {
    navigation: { markets: 'Market', dashboard: 'Dashboard', discover: 'Discover', portfolio: 'Portfolio', trading: 'Trading', ai: 'AI Analysis', strategies: 'Strategies', news: 'News', settings: 'Settings' },
    workspace: 'Workspace', localEnvironment: 'Local environment', collapseSidebar: 'Collapse sidebar', expandSidebar: 'Expand sidebar',
    language: 'Language', globalSearch: 'Search coins, stocks, or news', searchMarkets: 'MARKETS', searchNews: 'NEWS', searchEmpty: 'No results across markets or news.', marketSessions: 'Market sessions',
    sessions: { crypto: 'Crypto', korea: 'Korea', us: 'US', 'always-open': 'Always open', open: 'Open', closed: 'Closed' },
    market: 'Market', publicApi: 'Public API', health: { online: 'online', degraded: 'degraded', offline: 'offline', unconfigured: 'Not configured' }, operator: 'Operator', workspaceOwner: 'Workspace owner',
    dataMode: 'Market data mode', live: 'LIVE', mock: 'MOCK', active: 'Active',
    detail: { market: 'Market', high: 'High', low: 'Low', volume: 'Volume', change: '24H Change' },
    copilot: {
      title: 'AI Copilot', context: 'Context', none: 'No market selected', company: 'Company research context', scenario: 'Market scenario context',
      ready: 'Your AI Copilot is ready', readyDescription: 'Select a market or asset to prepare an explainable investment context.',
      timeframe: 'Timeframe', price: 'Current Price', change: '24H Change', confidence: 'AI Confidence', mockConfidence: 'Mock confidence · no AI model',
      why: 'Why?', placeholder: 'Placeholder rationale', trend: 'Trend continuation', volume: 'Volume increasing', momentum: 'Momentum positive',
      boundary: 'Illustrative context only. Analysis remains disabled until an AI provider is configured.', noModels: 'AI models are not configured',
      judgment: 'AI confidence and explanations require human judgment.',
    },
  },
  ko: {
    navigation: { markets: '마켓', dashboard: '대시보드', discover: '발견', portfolio: '포트폴리오', trading: '거래', ai: 'AI 분석', strategies: '전략', news: '뉴스', settings: '설정' },
    workspace: '워크스페이스', localEnvironment: '로컬 환경', collapseSidebar: '사이드바 접기', expandSidebar: '사이드바 펼치기',
    language: '언어', globalSearch: '코인, 주식 또는 뉴스 검색', searchMarkets: '마켓', searchNews: '뉴스', searchEmpty: '마켓 또는 뉴스 검색 결과가 없습니다.', marketSessions: '시장 운영 상태',
    sessions: { crypto: '암호화폐', korea: '한국', us: '미국', 'always-open': '상시 개장', open: '개장', closed: '폐장' },
    market: '마켓', publicApi: '공개 API', health: { online: '연결됨', degraded: '연결 중', offline: '연결 끊김', unconfigured: '미설정' }, operator: '운영자', workspaceOwner: '워크스페이스 소유자',
    dataMode: '마켓 데이터 모드', live: '실시간', mock: '모의', active: '분석 중',
    detail: { market: '마켓', high: '고가', low: '저가', volume: '거래량', change: '24시간 변동' },
    copilot: {
      title: 'AI 코파일럿', context: '분석 대상', none: '선택된 종목 없음', company: '기업 리서치 맥락', scenario: '시장 시나리오 맥락',
      ready: 'AI 코파일럿 준비 완료', readyDescription: '종목을 선택하면 설명 가능한 투자 맥락을 준비합니다.',
      timeframe: '시간 간격', price: '현재가', change: '24시간 변동', confidence: 'AI 확신도', mockConfidence: '모의 확신도 · AI 모델 없음',
      why: '근거는?', placeholder: '예시 근거', trend: '추세 지속', volume: '거래량 증가', momentum: '모멘텀 긍정적',
      boundary: '설명용 맥락입니다. AI 제공자가 설정되기 전까지 분석은 비활성화됩니다.', noModels: 'AI 모델이 설정되지 않았습니다',
      judgment: 'AI 확신도와 설명에는 사람의 판단이 필요합니다.',
    },
  },
} as const satisfies Record<Language, UiStrings>
