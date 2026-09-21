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
  displayMode: {
    label: string; simple: string; expert: string; simpleMode: string; expertMode: string
    simpleDescription: string; expertDescription: string; viewingSimple: string; viewingExpert: string
    simpleFirst: string; expertDetailed: string; openSimple: string; openExpert: string
    dashboardHint: string; marketHint: string; newsHint: string; aiSimpleHint: string; demoHint: string; simpleExpertNote: string
    todaySummary: string; marketMood: string; mainWatchArea: string; riskToCheck: string; newsTheme: string
    showDetailedRadar: string; hideDetailedRadar: string; calm: string; active: string; volatile: string; needsReview: string; earlyBeta: string; limitedData: string
    simpleDemoPath: string; simpleDemoSteps: readonly string[]
  }
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
    activeFilters: string; clearAll: string; removeFilter: string; filterLabels: { search: string; topic: string; symbol: string }
    sentiments: { positive: string; neutral: string; negative: string; unassessed: string }
    importanceLevels: { high: string; medium: string; low: string; unassessed: string }
    provider: {
      title: string; mock: string; rssReady: string; rssUnavailable: string; notConfigured: string
      realRss: string; lastUpdated: string; fallback: string; error: string; source: string
      publishedTime: string; relatedUnavailable: string; unassessed: string
      mode: string; status: string; ready: string; loading: string; fallbackStatus: string
      experimental: string; unableToLoad: string; networkError: string; timeoutError: string
      httpError: string; invalidFeedError: string; notConfiguredError: string
      localProxy: string; localProxyConnected: string; localProxyUnavailable: string; localProxyRequired: string
      localProxyStart: string; localProxyRealRss: string; localProxyFallback: string; sourceAllowlist: string
      serverSideRss: string; proxyStatus: string
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
    forecast: string; scenarioAnalysis: string; mockScenario: string; marketBias: string
    rationale: string; supportingConditions: string; riskNote: string; probabilityPending: string
    confidencePending: string; possiblePaths: string; planningReference: string; planningOnly: string
    analysisInactive: string; selectScenario: string; relatedDemoConsidered: string
    scenarioMap: string; evidenceCheck: string; priceAction: string; volumeEvidence: string
    newsContext: string; marketRegime: string; missingEvidence: string; mockPlaceholder: string
    demoOnly: string; missingConnections: string; incompleteEvidence: string; aiInactive: string
    scenarioStatus: string; lastGenerated: string; statusLabels: { watch: string; wait: string; risk: string; neutral: string }
    notInstruction: string; ownRiskControl: string; waitConfirmation: string; analysisUnavailable: string
    demoNewsBoundary: string
    analysisFoundation: {
      title: string; status: string; mockAnalysis: string; realAiInactive: string; inputPackage: string
      evidenceUsed: string; missingEvidence: string; watchReason: string; riskSummary: string; nextWatchPoints: string
      priceData: string; newsData: string; scenarioData: string; aiModel: string; newsBackend: string; portfolioContext: string
      notConnected: string; demoOnly: string; available: string; missing: string; inactiveMessage: string; futurePackage: string
      disclaimer: string; finalDecision: string
      newsEvidence: string; evidenceSource: string; evidenceScope: string; headlinesConsidered: string
      marketLevelNews: string; instrumentSpecificNews: string; localProxyRss: string; browserRss: string; noNewsEvidence: string
      realAiInterpretation: string; localProxyTransport: string; demoIllustrative: string; productionBackendMissing: string
      localProxyPrototype: string; newsScope: string; source: string; scope: string; consideredHeadlines: string; newsEvidenceOnly: string
      localProxyExperimental: string
    }
    bias: { bullish: string; neutral: string; bearish: string; mixed: string }
    analysisTimeframes: { short: string; medium: string; long: string }
  }
}

/** English remains the safe default; this dictionary covers the primary workspace UI. */
export const uiText = {
  en: {
    navigation: { markets: 'Market', briefing: 'Market Briefing', dashboard: 'Dashboard', discover: 'Discover', portfolio: 'Portfolio', trading: 'Trading', ai: 'AI Analysis', strategies: 'Strategies', news: 'News', demo: 'Demo', settings: 'Settings' },
    workspace: 'Workspace', localEnvironment: 'Local environment', collapseSidebar: 'Collapse sidebar', expandSidebar: 'Expand sidebar',
    language: 'Language',
    displayMode: {
      label: 'Display mode', simple: 'Simple', expert: 'Expert', simpleMode: 'Simple Mode', expertMode: 'Expert Mode',
      simpleDescription: 'Easy view for beginners', expertDescription: 'Detailed evidence and controls', viewingSimple: 'You are viewing the app in Simple Mode', viewingExpert: 'You are viewing the app in Expert Mode',
      simpleFirst: 'Simple Mode shows key points first', expertDetailed: 'Expert Mode keeps detailed evidence visible', openSimple: 'Open Simple Candidate View', openExpert: 'Open Expert Workspace',
      dashboardHint: 'Simple Mode shows the key market points first.', marketHint: 'Search a coin or stock to review price, movement, and basic context.', newsHint: 'Start with the headline, source, and why it may matter.',
      aiSimpleHint: 'You are in Simple Mode. For the easiest candidate view, open Simple Candidate View.', demoHint: 'Simple Mode highlights the core demo flow while keeping trust boundaries visible.', simpleExpertNote: 'You are in Expert display mode. This page remains the beginner candidate view.',
      todaySummary: 'Today’s Market Summary', marketMood: 'Market mood', mainWatchArea: 'Main watch area', riskToCheck: 'Risk to check', newsTheme: 'News theme',
      showDetailedRadar: 'Show detailed radar', hideDetailedRadar: 'Hide detailed radar', calm: 'Calm', active: 'Active', volatile: 'Volatile', needsReview: 'Needs review', earlyBeta: 'Early beta', limitedData: 'Limited data',
      simpleDemoPath: 'Simple demo path', simpleDemoSteps: ['Start with Market Summary', 'Open Simple Candidate View', 'Review News Insight', 'Explain what is planned next'],
    },
    globalSearch: 'Search coins, stocks, or news', searchMarkets: 'MARKETS', searchNews: 'NEWS', searchEmpty: 'No results across markets or news.', marketSessions: 'Market sessions',
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
      activeFilters: 'Active filters', clearAll: 'Clear all', removeFilter: 'Remove filter', filterLabels: { search: 'Search', topic: 'Topic', symbol: 'Symbol' },
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
        localProxy: 'Local Proxy Experimental', localProxyConnected: 'Local proxy connected', localProxyUnavailable: 'Local proxy unavailable',
        localProxyRequired: 'Requires local news proxy server', localProxyStart: 'Start the local news proxy server to test server-side RSS loading.',
        localProxyRealRss: 'Real RSS loaded through local proxy', localProxyFallback: 'Local proxy unavailable. Showing demo news.',
        sourceAllowlist: 'Source allowlist', serverSideRss: 'Server-side RSS loading', proxyStatus: 'Proxy status',
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
      invalidation: 'Invalidation condition', targetArea: 'Target / observation area', pending: 'Placeholder — no AI analysis active',
      noAdvice: 'Demo only · Not investment advice · You make the final decision.',
      forecast: 'AI Forecast', scenarioAnalysis: 'Scenario Analysis', mockScenario: 'Mock scenario', marketBias: 'Market bias',
      rationale: 'Rationale', supportingConditions: 'Supporting conditions', riskNote: 'Risk note', probabilityPending: 'No probability · placeholder',
      confidencePending: 'Placeholder · no AI score', possiblePaths: 'Possible paths, not a prediction', planningReference: 'Planning Reference', planningOnly: 'Planning reference only',
      analysisInactive: 'AI analysis is not active yet.', selectScenario: 'Select an instrument from Market Explorer to view scenario analysis.', relatedDemoConsidered: 'Related demo news considered',
      scenarioMap: 'Scenario Map', evidenceCheck: 'Evidence Check', priceAction: 'Price action', volumeEvidence: 'Volume',
      newsContext: 'News context', marketRegime: 'Market regime', missingEvidence: 'Missing evidence', mockPlaceholder: 'Mock placeholder',
      demoOnly: 'Demo only', missingConnections: 'Real AI and real news backend are not connected yet.', incompleteEvidence: 'Incomplete evidence', aiInactive: 'AI inactive',
      scenarioStatus: 'Scenario status', lastGenerated: 'Last generated', statusLabels: { watch: 'Watch', wait: 'Wait', risk: 'Risk', neutral: 'Neutral' },
      notInstruction: 'Not a buy/sell instruction', ownRiskControl: 'Use with your own risk control', waitConfirmation: 'Consider waiting for confirmation.', analysisUnavailable: 'Mock scenario analysis is temporarily unavailable.',
      demoNewsBoundary: 'Demo news only — real news analysis is not active yet.',
      analysisFoundation: {
        title: 'AI Analysis Foundation', status: 'Analysis status', mockAnalysis: 'Mock analysis', realAiInactive: 'Real AI not active', inputPackage: 'Analysis Input Package',
        evidenceUsed: 'Evidence used', missingEvidence: 'Missing evidence', watchReason: 'Watch reason', riskSummary: 'Risk summary', nextWatchPoints: 'Next watch points',
        priceData: 'Price data', newsData: 'News data', scenarioData: 'Scenario data', aiModel: 'AI model', newsBackend: 'News backend', portfolioContext: 'Portfolio context',
        notConnected: 'Not connected', demoOnly: 'Demo only', available: 'Available', missing: 'Missing', inactiveMessage: 'Real AI analysis is not connected yet. This panel shows the structure and evidence package that a future AI model will use.',
        futurePackage: 'Future AI model will use this evidence package', disclaimer: 'Not investment advice', finalDecision: 'User makes final decision',
        newsEvidence: 'News Evidence', evidenceSource: 'Evidence source', evidenceScope: 'Evidence scope', headlinesConsidered: 'Headlines considered',
        marketLevelNews: 'Market-level news', instrumentSpecificNews: 'Instrument-specific news', localProxyRss: 'Local Proxy RSS', browserRss: 'Browser RSS', noNewsEvidence: 'No news evidence',
        realAiInterpretation: 'Real AI interpretation is not connected yet.', localProxyTransport: 'Local Proxy RSS is real news transport, not AI analysis.', demoIllustrative: 'Demo news is illustrative and not live market evidence.', productionBackendMissing: 'Production news backend is not connected.',
        localProxyPrototype: 'Local proxy prototype', newsScope: 'News scope', source: 'Source', scope: 'Scope', consideredHeadlines: 'Considered headlines', newsEvidenceOnly: 'News evidence only',
        localProxyExperimental: 'Local Proxy RSS is experimental.',
      },
      bias: { bullish: 'Bullish', neutral: 'Neutral', bearish: 'Bearish', mixed: 'Mixed' },
      analysisTimeframes: { short: 'Short', medium: 'Medium', long: 'Long' },
    },
  },
  ko: {
    navigation: { markets: '마켓', briefing: '시장 브리핑', dashboard: '대시보드', discover: '발견', portfolio: '포트폴리오', trading: '거래', ai: 'AI 분석', strategies: '전략', news: '뉴스', demo: '데모', settings: '설정' },
    workspace: '워크스페이스', localEnvironment: '로컬 환경', collapseSidebar: '사이드바 접기', expandSidebar: '사이드바 펼치기',
    language: '언어',
    displayMode: {
      label: '표시 모드', simple: '간편모드', expert: '전문가모드', simpleMode: '간편모드', expertMode: '전문가모드',
      simpleDescription: '초보자를 위한 쉬운 보기', expertDescription: '상세 근거와 설정 보기', viewingSimple: '현재 간편모드로 보고 있습니다', viewingExpert: '현재 전문가모드로 보고 있습니다',
      simpleFirst: '간편모드는 핵심 내용을 먼저 보여줍니다', expertDetailed: '전문가모드는 상세 근거를 유지합니다', openSimple: '간편 후보 보기 열기', openExpert: '전문가 작업공간 열기',
      dashboardHint: '간편모드는 핵심 시장 포인트를 먼저 보여줍니다.', marketHint: '코인이나 주식을 검색해 가격, 움직임, 기본 맥락을 확인하세요.', newsHint: '먼저 제목, 출처, 왜 중요한지부터 확인하세요.',
      aiSimpleHint: '현재 간편모드입니다. 가장 쉬운 후보 화면은 간편 후보 보기에서 확인할 수 있습니다.', demoHint: '간편모드는 신뢰 경계를 유지하면서 핵심 데모 흐름을 먼저 보여줍니다.', simpleExpertNote: '현재 전문가모드입니다. 이 화면은 초보자용 후보 보기입니다.',
      todaySummary: '오늘의 시장 요약', marketMood: '시장 분위기', mainWatchArea: '오늘 볼 영역', riskToCheck: '확인할 위험', newsTheme: '뉴스 흐름',
      showDetailedRadar: '상세 레이더 보기', hideDetailedRadar: '상세 레이더 숨기기', calm: '안정적', active: '활발함', volatile: '변동성 큼', needsReview: '확인 필요', earlyBeta: '초기 베타', limitedData: '제한 데이터',
      simpleDemoPath: '간편 데모 흐름', simpleDemoSteps: ['시장 요약 확인', '간편 후보 보기 열기', '뉴스 인사이트 확인', '다음 개발 방향 설명'],
    },
    globalSearch: '코인, 주식 또는 뉴스 검색', searchMarkets: '마켓', searchNews: '뉴스', searchEmpty: '마켓 또는 뉴스 검색 결과가 없습니다.', marketSessions: '시장 운영 상태',
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
      activeFilters: '적용된 필터', clearAll: '모두 초기화', removeFilter: '필터 해제', filterLabels: { search: '검색', topic: '주제', symbol: '종목' },
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
        localProxy: '로컬 프록시 실험', localProxyConnected: '로컬 프록시 연결됨', localProxyUnavailable: '로컬 프록시 이용 불가',
        localProxyRequired: '로컬 뉴스 프록시 서버가 필요합니다', localProxyStart: '서버 측 RSS 로딩을 테스트하려면 로컬 뉴스 프록시 서버를 시작하세요.',
        localProxyRealRss: '로컬 프록시를 통해 실제 RSS를 불러왔습니다', localProxyFallback: '로컬 프록시를 사용할 수 없어 데모 뉴스를 표시합니다.',
        sourceAllowlist: '출처 허용 목록', serverSideRss: '서버 측 RSS 로딩', proxyStatus: '프록시 상태',
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
      invalidation: '무효화 조건', targetArea: '목표 / 관찰 영역', pending: '준비 중 — AI 분석 비활성',
      noAdvice: '데모 전용 · 투자 조언 아님 · 최종 결정은 사용자가 합니다.',
      forecast: 'AI 전망', scenarioAnalysis: '시나리오 분석', mockScenario: '모의 시나리오', marketBias: '시장 성향',
      rationale: '근거', supportingConditions: '시나리오 지지 조건', riskNote: '위험 참고', probabilityPending: '확률 없음 · 자리표시자',
      confidencePending: '자리표시자 · AI 점수 없음', possiblePaths: '예측이 아닌 가능한 경로', planningReference: '계획 참고', planningOnly: '계획 참고용',
      analysisInactive: 'AI 분석은 아직 활성화되지 않았습니다.', selectScenario: '시나리오 분석을 보려면 마켓 익스플로러에서 종목을 선택하세요.', relatedDemoConsidered: '관련 데모 뉴스 참고',
      scenarioMap: '시나리오 맵', evidenceCheck: '근거 확인', priceAction: '가격 움직임', volumeEvidence: '거래량',
      newsContext: '뉴스 맥락', marketRegime: '시장 국면', missingEvidence: '부족한 근거', mockPlaceholder: '모의 자리표시자',
      demoOnly: '데모 전용', missingConnections: '실제 AI와 실제 뉴스 백엔드는 아직 연결되지 않았습니다.', incompleteEvidence: '불완전한 근거', aiInactive: 'AI 비활성',
      scenarioStatus: '시나리오 상태', lastGenerated: '마지막 생성', statusLabels: { watch: '관찰', wait: '대기', risk: '위험', neutral: '중립' },
      notInstruction: '매수·매도 지시가 아닙니다', ownRiskControl: '본인의 위험 관리 원칙과 함께 사용하세요', waitConfirmation: '확인 신호를 기다리는 것을 고려하세요.', analysisUnavailable: '모의 시나리오 분석을 일시적으로 표시할 수 없습니다.',
      demoNewsBoundary: '데모 뉴스 전용 — 실제 뉴스 분석은 아직 활성화되지 않았습니다.',
      analysisFoundation: {
        title: 'AI 분석 기반', status: '분석 상태', mockAnalysis: '모의 분석', realAiInactive: '실제 AI 비활성', inputPackage: '분석 입력 패키지',
        evidenceUsed: '사용된 근거', missingEvidence: '부족한 근거', watchReason: '관찰 이유', riskSummary: '위험 요약', nextWatchPoints: '다음 관찰 항목',
        priceData: '가격 데이터', newsData: '뉴스 데이터', scenarioData: '시나리오 데이터', aiModel: 'AI 모델', newsBackend: '뉴스 백엔드', portfolioContext: '포트폴리오 맥락',
        notConnected: '연결되지 않음', demoOnly: '데모 전용', available: '사용 가능', missing: '없음', inactiveMessage: '실제 AI 분석은 아직 연결되지 않았습니다. 현재 화면은 향후 AI 모델이 사용할 분석 구조와 근거 패키지를 보여줍니다.',
        futurePackage: '향후 AI 모델이 이 근거 패키지를 사용합니다', disclaimer: '투자 조언이 아닙니다', finalDecision: '최종 결정은 사용자가 합니다',
        newsEvidence: '뉴스 근거', evidenceSource: '근거 출처', evidenceScope: '근거 범위', headlinesConsidered: '검토한 헤드라인',
        marketLevelNews: '시장 수준 뉴스', instrumentSpecificNews: '종목별 뉴스', localProxyRss: '로컬 프록시 RSS', browserRss: '브라우저 RSS', noNewsEvidence: '뉴스 근거 없음',
        realAiInterpretation: '실제 AI 해석은 아직 연결되지 않았습니다.', localProxyTransport: '로컬 프록시 RSS는 실제 뉴스 전송 수단이며 AI 분석이 아닙니다.', demoIllustrative: '데모 뉴스는 설명용이며 실시간 시장 근거가 아닙니다.', productionBackendMissing: '프로덕션 뉴스 백엔드는 연결되지 않았습니다.',
        localProxyPrototype: '로컬 프록시 프로토타입', newsScope: '뉴스 범위', source: '출처', scope: '범위', consideredHeadlines: '검토한 헤드라인', newsEvidenceOnly: '뉴스 근거 전용',
        localProxyExperimental: '로컬 프록시 RSS는 실험 기능입니다.',
      },
      bias: { bullish: '상승', neutral: '중립', bearish: '하락', mixed: '혼재' },
      analysisTimeframes: { short: '단기', medium: '중기', long: '장기' },
    },
  },
} as const satisfies Record<Language, UiStrings>
