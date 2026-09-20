import type { Language } from '@/i18n/translations'
import type { DemoCapability, DemoFlowStep, DemoScopeSummary } from '@/types/demoScope'

const enCapabilities: readonly DemoCapability[] = [
  { area: 'marketRadar', title: 'Market Radar', status: 'available', summary: 'Rule-based market orientation from existing market and news evidence.', whatWorks: ['Hot sectors', 'Relative volume', 'Volatility and risk context'], limitations: ['No AI interpretation or causal claims'], nextMilestone: 'Expand reviewed market coverage.' },
  { area: 'cryptoCandidates', title: 'Crypto Watch Candidates', status: 'beta', summary: 'Usable evidence-review workflow with Short, Swing, and Long horizons.', whatWorks: ['Watch Score evidence', 'Planning references', 'Market navigation'], limitations: ['Research workflow only', 'No real AI'], nextMilestone: 'Broaden evidence quality and resilience.' },
  { area: 'stockCandidates', title: 'Stock Watch Candidates', status: 'limited', summary: 'Korea and US candidate workflow in early beta.', whatWorks: ['KOSPI/KOSDAQ and NASDAQ/NYSE tabs', 'Data-quality labels', 'Local review workflow'], limitations: ['Mock/limited quotes', 'No real stock provider or fundamentals'], nextMilestone: '1.6 Stock data expansion.' },
  { area: 'newsInsight', title: 'News Insight', status: 'beta', summary: 'Original-source news with deterministic market-level context.', whatWorks: ['News Center', 'Local Proxy RSS experiment', 'Rule-based insight'], limitations: ['No generated translation', 'No AI impact analysis'], nextMilestone: '1.7 AI summary pilot.' },
  { area: 'aiUsage', title: 'AI Usage & Plans', status: 'beta', summary: 'Transparent future usage and cost-control policy.', whatWorks: ['Free/Basic/Pro planning', 'Credit estimates', 'Locked action states'], limitations: ['No billing, entitlement, or model execution'], nextMilestone: 'Review server-side usage enforcement.' },
  { area: 'localFeedback', title: 'Local Notes / Review Status', status: 'available', summary: 'Device-only candidate review states and notes.', whatWorks: ['Watching, reviewed, and dismissed states', 'Local notes'], limitations: ['No account or cloud sync'], nextMilestone: 'Evaluate consented account sync.' },
  { area: 'paidPlans', title: 'Paid AI and Sector Picks', status: 'planned', summary: 'Cost-controlled AI features are product-planning placeholders.', whatWorks: ['Visible future tier model'], limitations: ['No payment or paid access'], nextMilestone: '1.8 Paid Sector Picks UI.' },
  { area: 'realAi', title: 'Real AI Analysis', status: 'planned', summary: 'The product is AI-ready, but no model is connected.', whatWorks: ['Structured evidence contracts and disabled actions'], limitations: ['No real AI output'], nextMilestone: 'Reviewed AI summary pilot.' },
  { area: 'trading', title: 'Trading / Order Execution', status: 'notAvailable', summary: 'Real-money execution is not available.', whatWorks: [], limitations: ['No orders', 'No auto trading', 'No brokerage connection'], nextMilestone: 'Deferred beyond the current beta scope.' },
]

const koCapabilities: readonly DemoCapability[] = [
  { area: 'marketRadar', title: 'Market Radar', status: 'available', summary: '기존 시장·뉴스 근거를 활용하는 규칙 기반 시장 탐색 화면입니다.', whatWorks: ['주목 섹터', '상대 거래량', '변동성과 위험 맥락'], limitations: ['AI 해석 및 인과관계 판단 없음'], nextMilestone: '검토된 시장 범위 확대' },
  { area: 'cryptoCandidates', title: '가상자산 관찰 후보', status: 'beta', summary: '단기·스윙·장기 기간을 지원하는 근거 검토 흐름입니다.', whatWorks: ['관찰 점수 근거', '계획 참고', '마켓 이동'], limitations: ['리서치 흐름 전용', '실제 AI 없음'], nextMilestone: '근거 품질과 안정성 확장' },
  { area: 'stockCandidates', title: '주식 관찰 후보', status: 'limited', summary: '한국·미국 주식 후보 흐름을 제공하는 초기 베타입니다.', whatWorks: ['KOSPI/KOSDAQ 및 NASDAQ/NYSE 탭', '데이터 품질 표시', '로컬 검토 흐름'], limitations: ['모의·제한 시세', '실제 주식 제공자와 펀더멘털 없음'], nextMilestone: '1.6 주식 데이터 확장' },
  { area: 'newsInsight', title: '뉴스 인사이트', status: 'beta', summary: '원문 출처와 결정론적 시장 수준 맥락을 제공합니다.', whatWorks: ['뉴스 센터', 'Local Proxy RSS 실험', '규칙 기반 인사이트'], limitations: ['생성형 번역 없음', 'AI 영향 분석 없음'], nextMilestone: '1.7 AI 요약 파일럿' },
  { area: 'aiUsage', title: 'AI 사용량 및 플랜', status: 'beta', summary: '향후 AI 사용량과 비용 통제 정책을 투명하게 보여줍니다.', whatWorks: ['Free/Basic/Pro 계획', '크레딧 예상', '잠긴 작업 상태'], limitations: ['결제·권한·모델 실행 없음'], nextMilestone: '서버 측 사용량 통제 검토' },
  { area: 'localFeedback', title: '로컬 메모 / 검토 상태', status: 'available', summary: '기기에만 저장되는 후보 검토 상태와 메모입니다.', whatWorks: ['관찰·검토 완료·제외 상태', '로컬 메모'], limitations: ['계정 및 클라우드 동기화 없음'], nextMilestone: '동의 기반 계정 동기화 검토' },
  { area: 'paidPlans', title: '유료 AI 및 섹터 후보', status: 'planned', summary: '비용이 통제된 AI 기능은 제품 계획용 자리표시자입니다.', whatWorks: ['향후 플랜 구조 표시'], limitations: ['결제 및 유료 접근 없음'], nextMilestone: '1.8 유료 섹터 후보 UI' },
  { area: 'realAi', title: '실제 AI 분석', status: 'planned', summary: 'AI 연결 준비 구조는 있지만 모델은 연결되지 않았습니다.', whatWorks: ['구조화된 근거 계약과 비활성 작업'], limitations: ['실제 AI 결과 없음'], nextMilestone: '검토된 AI 요약 파일럿' },
  { area: 'trading', title: '거래 / 주문 실행', status: 'notAvailable', summary: '실제 자금 주문 실행은 사용할 수 없습니다.', whatWorks: [], limitations: ['주문 없음', '자동 거래 없음', '증권사 연결 없음'], nextMilestone: '현재 베타 범위 이후로 연기' },
]

const flow = (language: Language): readonly DemoFlowStep[] => language === 'ko' ? [
  { id: 'radar', title: 'Dashboard / Market Radar 열기', route: '/dashboard', summary: '첫 화면에서 시장 움직임과 위험 맥락을 확인합니다.', talkingPoints: ['규칙 기반 개요', '실제 AI 미연결'], status: 'available' },
  { id: 'crypto', title: '가상자산 후보 검토', route: '/ai-analysis', summary: '근거가 설명되는 관찰 후보를 확인합니다.', talkingPoints: ['관찰 점수', '최종 판단은 사용자'], status: 'beta' },
  { id: 'horizon', title: '단기 / 스윙 / 장기 전환', route: '/ai-analysis', summary: '분석 기간별 검토 기준을 비교합니다.', talkingPoints: ['기간별 주기', '확률 아님'], status: 'beta' },
  { id: 'zones', title: '계획 구간 확인', route: '/ai-analysis', summary: '안전한 관찰·무효화 참고 구조를 확인합니다.', talkingPoints: ['계획 참고용', '거래 지시 없음'], status: 'beta' },
  { id: 'stocks', title: '주식 후보 베타 탭 확인', route: '/ai-analysis', summary: '한국·미국 주식의 제한된 데모 흐름을 확인합니다.', talkingPoints: ['모의·제한 데이터', '실제 제공자 없음'], status: 'limited' },
  { id: 'news', title: '뉴스 센터 열기', route: '/news', summary: '출처가 보존된 뉴스와 필터를 확인합니다.', talkingPoints: ['원문 중심', 'Local Proxy 실험'], status: 'beta' },
  { id: 'insight', title: '뉴스 인사이트 확인', route: '/news', summary: '시장 수준과 종목 수준 경계를 확인합니다.', talkingPoints: ['규칙 기반', '실제 AI 해석 없음'], status: 'beta' },
  { id: 'plans', title: 'AI 사용량 및 플랜 확인', route: '/ai-analysis#ai-usage-plans-title', summary: '향후 비용 통제와 잠긴 AI 기능을 확인합니다.', talkingPoints: ['결제 없음', 'AI 실행 없음'], status: 'planned' },
] : [
  { id: 'radar', title: 'Open Dashboard / Market Radar', route: '/dashboard', summary: 'Orient to market movement and risk context.', talkingPoints: ['Rule-based overview', 'Real AI disconnected'], status: 'available' },
  { id: 'crypto', title: 'Review crypto candidates', route: '/ai-analysis', summary: 'Inspect explainable watch-candidate evidence.', talkingPoints: ['Watch Score', 'User makes final decision'], status: 'beta' },
  { id: 'horizon', title: 'Switch Short / Swing / Long', route: '/ai-analysis', summary: 'Compare review criteria across horizons.', talkingPoints: ['Horizon cadence', 'Not a probability'], status: 'beta' },
  { id: 'zones', title: 'Review planning zones', route: '/ai-analysis', summary: 'Inspect safe observation and invalidation references.', talkingPoints: ['Planning reference only', 'No trade instruction'], status: 'beta' },
  { id: 'stocks', title: 'Check stock candidate beta tabs', route: '/ai-analysis', summary: 'Inspect the limited Korea and US stock workflow.', talkingPoints: ['Mock/limited data', 'No real provider'], status: 'limited' },
  { id: 'news', title: 'Open News Center', route: '/news', summary: 'Review source-preserving news and filters.', talkingPoints: ['Original sources', 'Local Proxy experiment'], status: 'beta' },
  { id: 'insight', title: 'View News Insight', route: '/news', summary: 'Inspect market-level and instrument-level boundaries.', talkingPoints: ['Rule-based', 'No real AI interpretation'], status: 'beta' },
  { id: 'plans', title: 'Review AI Usage & Plans', route: '/ai-analysis#ai-usage-plans-title', summary: 'Review future cost controls and locked AI features.', talkingPoints: ['No payment', 'No AI execution'], status: 'planned' },
]

export function getDemoScopeSummary(language: Language): DemoScopeSummary {
  return {
    versionLabel: 'Market Copilot 1.5 Beta',
    positioning: language === 'ko' ? 'Market Radar, 뉴스 인사이트, 규칙 기반 관찰 후보, 기간별 계획 구간과 향후 비용 통제 AI 분석을 결합하는 AI-ready 투자 의사결정 지원 플랫폼입니다.' : 'An AI-ready investment decision-support platform combining Market Radar, News Insight, rule-based watch candidates, horizon-based planning zones, and future cost-controlled AI analysis.',
    capabilities: language === 'ko' ? koCapabilities : enCapabilities,
    demoFlow: flow(language),
    trustBoundaries: language === 'ko' ? ['투자 조언이 아닙니다.', '거래 기능이 없습니다.', '실제 AI가 아직 연결되지 않았습니다.', '결제 기능이 활성화되지 않았습니다.', '최종 판단은 사용자가 직접 내립니다.'] : ['Not investment advice.', 'Trading is not available.', 'Real AI is not connected yet.', 'Payment is not active.', 'The user makes the final decision.'],
  }
}

export const demoScopeConfig = getDemoScopeSummary('en')

