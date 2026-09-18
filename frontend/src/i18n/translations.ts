import type { NavigationIcon } from '@/types/navigation'
import type { NewsCategory } from '@/types/dashboard'

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
  briefing: {
    title: string; subtitle: string; eyebrow: string; demo: string; trust: string; finalDecision: string
    crypto: string; korea: string; us: string; macro: string; mood: string; whyMatters: string
    movers: string; gainers: string; losers: string; highVolume: string; relatedNews: string
    watch: string; openSymbol: string; noSymbol: string; noNews: string; simulated: string; viewNews: string
  }
  news: {
    title: string; subtitle: string; all: string; search: string; relatedMarket: string
    noSymbol: string; on: string; off: string; articles: string; allCoverage: string
    filteredFor: string; noResults: string; demo: string; summary: string; importance: string
    categories: Record<NewsCategory, string>
    filters: string; marketFilter: string; sentiment: string; relatedSymbols: string; relatedMarkets: string; loading: string
    openInMarket: string; viewSymbol: string; details: string; hideDetails: string; externalSource: string
    noRelated: string; analysisInactive: string; allMarkets: string; allSentiments: string; allImportance: string
    sentiments: { positive: string; neutral: string; negative: string; unassessed: string }
    importanceLevels: { high: string; medium: string; low: string; unassessed: string }
    provider: {
      title: string; mock: string; rssReady: string; rssUnavailable: string; notConfigured: string
      realRss: string; lastUpdated: string; fallback: string; error: string; source: string
      publishedTime: string; relatedUnavailable: string; unassessed: string
      mode: string; status: string; ready: string; loading: string; fallbackStatus: string
      experimental: string; unableToLoad: string; networkError: string; timeoutError: string
      httpError: string; invalidFeedError: string; notConfiguredError: string
    }
  }
  copilot: {
    title: string; context: string; none: string; company: string; scenario: string
    ready: string; readyDescription: string; timeframe: string; price: string; change: string
    confidence: string; mockConfidence: string; why: string; placeholder: string
    trend: string; volume: string; momentum: string; boundary: string; noModels: string; judgment: string
    whyMatters: string; bullish: string; neutral: string; bearish: string; watchConditions: string
    riskFactors: string; entryPlanning: string; firstInterest: string; secondInterest: string
    invalidation: string; targetArea: string; pending: string; noAdvice: string
  }
}

/** English remains the safe default; this dictionary covers the primary workspace UI. */
export const uiText = {
  en: {
    navigation: { markets: 'Market', briefing: 'Market Briefing', dashboard: 'Dashboard', discover: 'Discover', portfolio: 'Portfolio', trading: 'Trading', ai: 'AI Analysis', strategies: 'Strategies', news: 'News', settings: 'Settings' },
    workspace: 'Workspace', localEnvironment: 'Local environment', collapseSidebar: 'Collapse sidebar', expandSidebar: 'Expand sidebar',
    language: 'Language', globalSearch: 'Search coins, stocks, or news', searchMarkets: 'MARKETS', searchNews: 'NEWS', searchEmpty: 'No results across markets or news.', marketSessions: 'Market sessions',
    sessions: { crypto: 'Crypto', korea: 'Korea', us: 'US', 'always-open': 'Always open', open: 'Open', closed: 'Closed' },
    market: 'Market', publicApi: 'Public API', health: { online: 'online', degraded: 'degraded', offline: 'offline', unconfigured: 'Not configured' }, operator: 'Operator', workspaceOwner: 'Workspace owner',
    dataMode: 'Market data mode', live: 'LIVE', mock: 'MOCK', active: 'Active',
    detail: { market: 'Market', high: 'High', low: 'Low', volume: 'Volume', change: '24H Change' },
    briefing: {
      title: 'Market Briefing', subtitle: 'A structured orientation to what could matter across markets.', eyebrow: 'MARKET INTELLIGENCE / DEMO',
      demo: 'Demo briefing / Mock data', trust: 'Information is for analysis support only. Not investment advice.', finalDecision: 'You make the final decision.',
      crypto: 'Crypto Briefing', korea: 'Korea Stock Briefing', us: 'US Stock Briefing', macro: 'Macro / Global Briefing',
      mood: 'Market mood', whyMatters: 'Why this market matters', movers: 'Major Movers', gainers: 'Top Gainers', losers: 'Top Losers', highVolume: 'High Volume',
      relatedNews: 'Related News', watch: 'What to Watch', openSymbol: 'Open in Market', noSymbol: 'Illustrative macro reference only', noNews: 'No related headlines', simulated: 'Simulated snapshot — not live market data', viewNews: 'View market news',
    },
    news: {
      title: 'News Center', subtitle: 'Structured illustrative headlines linked to your active market context.', all: 'All News', search: 'Search headlines, sources, or symbols',
      relatedMarket: 'RELATED MARKET', noSymbol: 'No symbol selected', on: 'ON', off: 'OFF', articles: 'ARTICLES', allCoverage: 'All market coverage',
      filteredFor: 'Filtered for', noResults: 'No articles match the active filters.', demo: 'Demo news / Mock data', summary: 'Summary', importance: 'Importance',
      categories: { crypto: 'Crypto', 'korea-stock': 'Korea Stock', 'us-stock': 'US Stock', macro: 'Macro', technology: 'Technology', ai: 'AI', earnings: 'Earnings', regulation: 'Regulation' },
      filters: 'News filters', marketFilter: 'Market', sentiment: 'Sentiment', relatedSymbols: 'Related Symbols', relatedMarkets: 'Related Markets', loading: 'Loading demo news…',
      openInMarket: 'Open in Market', viewSymbol: 'View symbol', details: 'Read details', hideDetails: 'Hide details', externalSource: 'Open source article',
      noRelated: 'No related demo news yet.', analysisInactive: 'AI analysis is not active yet.', allMarkets: 'All markets', allSentiments: 'All sentiments', allImportance: 'All importance levels',
      sentiments: { positive: 'Positive', neutral: 'Neutral', negative: 'Negative', unassessed: 'Not assessed' }, importanceLevels: { high: 'High', medium: 'Medium', low: 'Low', unassessed: 'Not assessed' },
      provider: {
        title: 'News provider', mock: 'Mock', rssReady: 'RSS Experimental', rssUnavailable: 'RSS unavailable', notConfigured: 'Provider not configured',
        realRss: 'Real RSS News', lastUpdated: 'Last updated', fallback: 'Real RSS unavailable. Showing demo news.',
        error: 'Approved RSS feed URLs and transport are not configured.', source: 'Source', publishedTime: 'Published time',
        relatedUnavailable: 'Related symbols unavailable', unassessed: 'Not assessed',
        mode: 'Provider mode', status: 'Status', ready: 'Ready', loading: 'Loading', fallbackStatus: 'Fallback',
        experimental: 'Experimental provider', unableToLoad: 'Unable to load RSS.',
        networkError: 'The browser could not reach the RSS feed. Network or CORS access may be blocked.',
        timeoutError: 'The RSS feed did not respond in time.', httpError: 'The RSS feed returned an error.',
        invalidFeedError: 'The RSS feed did not contain valid news items.', notConfiguredError: 'No approved RSS feed is configured.',
      },
    },
    copilot: {
      title: 'AI Copilot', context: 'Context', none: 'No market selected', company: 'Company research context', scenario: 'Market scenario context',
      ready: 'Your AI Copilot is ready', readyDescription: 'Select a market or asset to prepare an explainable investment context.',
      timeframe: 'Timeframe', price: 'Current Price', change: '24H Change', confidence: 'AI Confidence', mockConfidence: 'Mock confidence · no AI model',
      why: 'Why?', placeholder: 'Placeholder rationale', trend: 'Trend continuation', volume: 'Volume increasing', momentum: 'Momentum positive',
      boundary: 'Illustrative context only. Analysis remains disabled until an AI provider is configured.', noModels: 'AI models are not configured',
      judgment: 'AI confidence and explanations require human judgment.',
      whyMatters: 'Why this market matters', bullish: 'Bullish scenario', neutral: 'Neutral scenario', bearish: 'Bearish scenario', watchConditions: 'Watch conditions',
      riskFactors: 'Risk factors', entryPlanning: 'Possible entry planning reference', firstInterest: '1st interest area', secondInterest: '2nd interest area',
      invalidation: 'Invalidation / stop condition', targetArea: 'Target / take-profit area', pending: 'Placeholder — no AI analysis active',
      noAdvice: 'Demo only · Not investment advice · You make the final decision.',
    },
  },
  ko: {
    navigation: { markets: '마켓', briefing: '시장 브리핑', dashboard: '대시보드', discover: '발견', portfolio: '포트폴리오', trading: '거래', ai: 'AI 분석', strategies: '전략', news: '뉴스', settings: '설정' },
    workspace: '워크스페이스', localEnvironment: '로컬 환경', collapseSidebar: '사이드바 접기', expandSidebar: '사이드바 펼치기',
    language: '언어', globalSearch: '코인, 주식 또는 뉴스 검색', searchMarkets: '마켓', searchNews: '뉴스', searchEmpty: '마켓 또는 뉴스 검색 결과가 없습니다.', marketSessions: '시장 운영 상태',
    sessions: { crypto: '암호화폐', korea: '한국', us: '미국', 'always-open': '상시 개장', open: '개장', closed: '폐장' },
    market: '마켓', publicApi: '공개 API', health: { online: '연결됨', degraded: '연결 중', offline: '연결 끊김', unconfigured: '미설정' }, operator: '운영자', workspaceOwner: '워크스페이스 소유자',
    dataMode: '마켓 데이터 모드', live: '실시간', mock: '모의', active: '분석 중',
    detail: { market: '마켓', high: '고가', low: '저가', volume: '거래량', change: '24시간 변동' },
    briefing: {
      title: '시장 브리핑', subtitle: '시장별 주요 관찰 항목을 구조적으로 살펴봅니다.', eyebrow: '시장 인텔리전스 / 데모',
      demo: '데모 브리핑 / 모의 데이터', trust: '정보는 분석 보조용이며 투자 조언이 아닙니다.', finalDecision: '최종 결정은 사용자가 내립니다.',
      crypto: '암호화폐 브리핑', korea: '한국 주식 브리핑', us: '미국 주식 브리핑', macro: '거시경제 / 글로벌 브리핑',
      mood: '시장 분위기', whyMatters: '이 시장이 중요한 이유', movers: '주요 변동 종목', gainers: '상승 종목', losers: '하락 종목', highVolume: '거래량 상위',
      relatedNews: '관련 뉴스', watch: '관찰할 사항', openSymbol: '마켓에서 열기', noSymbol: '설명용 거시경제 항목', noNews: '관련 헤드라인 없음', simulated: '시뮬레이션 화면 — 실시간 시장 데이터 아님', viewNews: '해당 시장 뉴스 보기',
    },
    news: {
      title: '뉴스 센터', subtitle: '현재 선택된 시장과 연결된 예시 헤드라인을 살펴봅니다.', all: '전체 뉴스', search: '제목·출처·종목 검색',
      relatedMarket: '관련 시장', noSymbol: '선택된 종목 없음', on: '켬', off: '끔', articles: '건', allCoverage: '전체 시장 뉴스',
      filteredFor: '필터 적용', noResults: '현재 필터에 맞는 기사가 없습니다.', demo: '모의 뉴스 / 데모 데이터', summary: '요약', importance: '중요도',
      categories: { crypto: '암호화폐', 'korea-stock': '한국 주식', 'us-stock': '미국 주식', macro: '거시경제', technology: '기술', ai: 'AI', earnings: '실적', regulation: '규제' },
      filters: '뉴스 필터', marketFilter: '시장', sentiment: '감성', relatedSymbols: '관련 종목', relatedMarkets: '관련 시장', loading: '데모 뉴스를 불러오는 중…',
      openInMarket: '마켓에서 열기', viewSymbol: '종목 보기', details: '자세히 보기', hideDetails: '접기', externalSource: '원문 열기',
      noRelated: '관련 데모 뉴스가 아직 없습니다.', analysisInactive: 'AI 분석은 아직 활성화되지 않았습니다.', allMarkets: '전체 시장', allSentiments: '전체 감성', allImportance: '전체 중요도',
      sentiments: { positive: '긍정', neutral: '중립', negative: '부정', unassessed: '평가되지 않음' }, importanceLevels: { high: '높음', medium: '보통', low: '낮음', unassessed: '평가되지 않음' },
      provider: {
        title: '뉴스 제공자', mock: '모의', rssReady: 'RSS 실험', rssUnavailable: 'RSS 이용 불가', notConfigured: '제공자 미설정',
        realRss: '실제 RSS 뉴스', lastUpdated: '마지막 갱신', fallback: '실제 RSS를 사용할 수 없어 데모 뉴스를 표시합니다.',
        error: '승인된 RSS 피드 주소와 전송 방식이 설정되지 않았습니다.', source: '출처', publishedTime: '게시 시간',
        relatedUnavailable: '관련 종목 정보 없음', unassessed: '평가되지 않음',
        mode: '제공자 모드', status: '상태', ready: '준비됨', loading: '불러오는 중', fallbackStatus: '대체 표시',
        experimental: '실험적 제공자', unableToLoad: 'RSS를 불러올 수 없습니다.',
        networkError: '브라우저에서 RSS 피드에 연결할 수 없습니다. 네트워크 또는 CORS가 차단되었을 수 있습니다.',
        timeoutError: 'RSS 피드 응답 시간이 초과되었습니다.', httpError: 'RSS 피드가 오류를 반환했습니다.',
        invalidFeedError: 'RSS 피드에 유효한 뉴스 항목이 없습니다.', notConfiguredError: '승인된 RSS 피드가 설정되지 않았습니다.',
      },
    },
    copilot: {
      title: 'AI 코파일럿', context: '분석 대상', none: '선택된 종목 없음', company: '기업 리서치 맥락', scenario: '시장 시나리오 맥락',
      ready: 'AI 코파일럿 준비 완료', readyDescription: '종목을 선택하면 설명 가능한 투자 맥락을 준비합니다.',
      timeframe: '시간 간격', price: '현재가', change: '24시간 변동', confidence: 'AI 확신도', mockConfidence: '모의 확신도 · AI 모델 없음',
      why: '근거는?', placeholder: '예시 근거', trend: '추세 지속', volume: '거래량 증가', momentum: '모멘텀 긍정적',
      boundary: '설명용 맥락입니다. AI 제공자가 설정되기 전까지 분석은 비활성화됩니다.', noModels: 'AI 모델이 설정되지 않았습니다',
      judgment: 'AI 확신도와 설명에는 사람의 판단이 필요합니다.',
      whyMatters: '이 시장이 중요한 이유', bullish: '상승 시나리오', neutral: '중립 시나리오', bearish: '하락 시나리오', watchConditions: '관찰 조건',
      riskFactors: '위험 요인', entryPlanning: '가능한 진입 계획 참고', firstInterest: '1차 관심 구간', secondInterest: '2차 관심 구간',
      invalidation: '무효화 / 손절 조건', targetArea: '목표 / 이익실현 구간', pending: '준비 중 — AI 분석 비활성',
      noAdvice: '데모 전용 · 투자 조언 아님 · 최종 결정은 사용자가 합니다.',
    },
  },
} as const satisfies Record<Language, UiStrings>
