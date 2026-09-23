import type { Language } from '@/i18n/translations'
import { newsForInstrument } from '@/services/news/newsSelectors'
import type { NewsLoadResult } from '@/services/news/newsService'
import type { ActionReadinessPlan, ActionReadinessStatus, ActionRuleBasisItem, MyAnalysisEvidence, MyAnalysisInput, MyAnalysisResult } from '@/types/myAnalysis'
import type { WatchCandidate } from '@/types/watchCandidate'

export interface MyAnalysisEngineInput extends MyAnalysisInput {
  catalogSource: 'live' | 'mock' | null
  candidate?: WatchCandidate
  newsResult: NewsLoadResult | null
  language: Language
}

type MovementBand = 'strongUp' | 'moderateUp' | 'flat' | 'moderateDown' | 'strongDown' | 'unknown'
type VolumeBand = 'high' | 'normal' | 'low' | 'unknown'
type NewsState = 'explicitlyRelated' | 'marketOnly' | 'missing'

interface MyAnalysisProfile {
  assetKind: 'crypto' | 'stock'
  movementBand: MovementBand
  volumeBand: VolumeBand
  dataTrust: MyAnalysisResult['dataQuality']
  newsState: NewsState
  candidateState: 'candidateAvailable' | 'noCandidate'
  riskState: 'highVolatility' | 'normalVolatility' | 'dataLimited'
}

const finite = (value: number) => Number.isFinite(value)
const firstThree = (items: readonly string[]) => items.slice(0, 3)

const text = {
  en: {
    qualities: { live: 'Live public market data', mock: 'Mock / demo data', limited: 'Limited evidence', unavailable: 'Data unavailable' },
    summary: 'A structured review of available evidence and important gaps. It is not a prediction or recommendation.',
    current: 'What is visible now', standsOut: 'What stands out', caution: 'Risks and limits', evidence: 'Evidence board', missing: 'Missing evidence', checklist: 'Review checklist',
    price: 'Current market value', change: '24H movement', volume: 'Reported volume', dataQuality: 'Data quality',
    currentReads: {
      strongUp: 'This crypto asset shows strong recent movement. Review activity and related news before making any decision.',
      moderateUp: 'This crypto asset has usable market data and moderate upward movement. Review volume and related news before making any decision.',
      flat: 'Recent movement is limited. Review whether new volume or news changes the picture.',
      moderateDown: 'This crypto asset has usable market data and moderate downward movement. Review activity and downside context before making any decision.',
      strongDown: 'This crypto asset shows a large recent move. The next review should focus on volatility, activity, and whether the move continues.',
      unknown: 'Movement context is not available yet.',
      stockPreview: 'This stock analysis is a structure preview. Real disclosures, earnings, and fundamentals are not connected, so the result should be treated as workflow review only.',
      stockLive: 'Current stock market data can be reviewed, but disclosures, earnings, and fundamentals are not connected.',
      unavailable: 'Core market data is not available for this asset yet.',
    },
    unknownContext: 'Movement context is not available yet.',
    movementThreshold: '24H movement is outside the normal review threshold.',
    moderateMovement: '24H movement is measurable but below the large-movement review threshold.',
    limitedMovement: '24H movement is currently limited.',
    candidate: 'This asset also appears in the deterministic watch-candidate engine.',
    directNews: 'Explicitly related news context is available from', marketNews: 'Only market-level news context is available from', noNews: 'No explicitly related news is available.',
    stockBeta: 'Stock data is mock or limited in this beta.', stockWorkflow: 'This item can be reviewed for workflow structure, not as a live stock call.', stockMissing: 'Real disclosures and earnings are still missing.', stockPlanned: 'Sector and fundamental expansion is planned but not connected.',
    mockValue: 'Simulated market value is shown for workflow testing.', demoRisk: 'This is demo data and should not be treated as live market evidence.', stockDemoRisk: 'Current stock movement is demo context.', stockNotLive: 'Do not treat this as a live stock analysis.',
    filing: 'Regulatory filings are not connected.', earnings: 'Verified earnings data is not connected.', fundamentals: 'Verified financial fundamentals are not connected.', ratings: 'Analyst ratings and consensus are not connected.',
    missingPrice: 'Current market value is not available.', missingChange: 'Recent movement data is not available.', missingVolume: 'Volume data is not available.',
    verify: 'Verify primary-source market and company information before deciding.', revisit: 'Revisit this analysis when new evidence becomes available.', risk: 'Check downside risk and your own decision criteria.', largeMove: 'Large recent movement can reverse quickly. Review volatility before making any decision.', noNewsRisk: 'No explicitly related news is available, so the reason for movement may be unclear.', stockMissingRisk: 'Real filings and earnings are not connected.', limited: 'Data quality is limited.', unavailable: 'Core market data is unavailable.',
    meanings: {
      price: 'Shows the current observable market value, not a valuation judgment.',
      change: 'Shows recent movement context. Direction alone is not enough for a decision.',
      volume: 'Shows activity context. It should be reviewed together with price movement.',
      candidate: 'Shows that a rule-based candidate record exists. It is not a recommendation.',
      news: 'Shows source-linked context only when explicitly related.',
      market: 'Shows broad market context only; it is not instrument-specific evidence.',
      missing: 'This evidence is not connected yet and should not be inferred.',
    },
    userNotice: 'User-provided context only. Not market evidence.', intentNotice: 'Review intent changes checklist wording only. It does not create personal investment advice.', disclaimer: 'Decision-support structure only. No real AI model is connected. Not investment advice; the user makes the final decision.',
    intents: { watching: 'Watching', holding: 'Holding', longTerm: 'Long-term review', swing: 'Swing review', shortTerm: 'Short-term review' },
    intentChecks: { watching: 'Check whether new data keeps this asset relevant.', holding: 'Compare your original reason with currently available evidence.', longTerm: 'Wait for connected filings, earnings, and fundamentals before deeper review.', swing: 'Recheck movement and volume after large changes.', shortTerm: 'Recheck recent movement and related news context frequently.' },
  },
  ko: {
    qualities: { live: '실제 공개 시장 데이터', mock: '모의 / 데모 데이터', limited: '제한된 근거', unavailable: '데이터 이용 불가' },
    summary: '확보된 근거와 중요한 공백을 구조적으로 정리합니다. 예측이나 추천이 아닙니다.',
    current: '현재 확인되는 내용', standsOut: '눈에 띄는 점', caution: '위험과 한계', evidence: '근거 보드', missing: '부족한 근거', checklist: '검토 체크리스트',
    price: '현재 시장 값', change: '24시간 움직임', volume: '표시 거래량', dataQuality: '데이터 품질',
    currentReads: {
      strongUp: '이 가상자산은 최근 움직임이 강합니다. 판단 전 거래 활동과 관련 뉴스 맥락을 함께 확인하세요.',
      moderateUp: '이 가상자산은 시장 데이터와 보통 수준의 상승 움직임을 확인할 수 있습니다. 판단 전 거래량과 관련 뉴스 맥락을 함께 확인하세요.',
      flat: '최근 움직임은 제한적입니다. 거래량이나 뉴스가 새롭게 달라지는지 확인하세요.',
      moderateDown: '이 가상자산은 시장 데이터와 보통 수준의 하락 움직임을 확인할 수 있습니다. 판단 전 거래 활동과 하방 맥락을 확인하세요.',
      strongDown: '이 가상자산은 최근 움직임이 큽니다. 다음 검토는 변동성, 거래 활동, 움직임 지속 여부에 초점을 두는 것이 좋습니다.',
      unknown: '움직임 맥락을 아직 확인할 수 없습니다.',
      stockPreview: '이 주식 분석은 구조 미리보기입니다. 실제 공시·실적·재무 데이터가 연결되지 않았으므로 결과는 흐름 검토용으로만 봐야 합니다.',
      stockLive: '현재 주식 시장 데이터는 검토할 수 있지만 공시·실적·재무 데이터는 연결되지 않았습니다.',
      unavailable: '이 종목의 핵심 시장 데이터를 아직 확인할 수 없습니다.',
    },
    unknownContext: '움직임 맥락을 아직 확인할 수 없습니다.',
    movementThreshold: '24시간 움직임이 일반적인 검토 기준 범위를 벗어났습니다.',
    moderateMovement: '24시간 움직임이 확인되지만 큰 움직임 검토 기준보다는 작습니다.',
    limitedMovement: '현재 24시간 움직임은 제한적입니다.',
    candidate: '이 종목은 결정론적 관찰 후보 엔진에도 표시됩니다.',
    directNews: '명시적으로 연결된 관련 뉴스를 확인할 수 있는 출처', marketNews: '시장 수준 뉴스 맥락만 확인 가능한 출처', noNews: '명시적으로 연결된 관련 뉴스가 없습니다.',
    stockBeta: '이 베타에서는 주식 데이터가 모의 또는 제한 상태입니다.', stockWorkflow: '실시간 주식 판단이 아니라 화면 흐름 구조를 검토할 수 있습니다.', stockMissing: '실제 공시와 실적 데이터가 아직 부족합니다.', stockPlanned: '섹터와 펀더멘털 확장은 예정되어 있지만 연결되지 않았습니다.',
    mockValue: '화면 흐름 확인을 위한 모의 시장 값입니다.', demoRisk: '데모 데이터이므로 실제 시장 근거로 취급해서는 안 됩니다.', stockDemoRisk: '현재 주식 움직임은 데모용 맥락입니다.', stockNotLive: '실시간 주식 분석으로 취급하지 마세요.',
    filing: '공시 데이터가 연결되지 않았습니다.', earnings: '검증된 실적 데이터가 연결되지 않았습니다.', fundamentals: '검증된 재무·펀더멘털 데이터가 연결되지 않았습니다.', ratings: '애널리스트 평가와 컨센서스가 연결되지 않았습니다.',
    missingPrice: '현재 시장 값을 확인할 수 없습니다.', missingChange: '최근 움직임 데이터를 확인할 수 없습니다.', missingVolume: '거래량 데이터를 확인할 수 없습니다.',
    verify: '판단 전에 시장·기업의 1차 출처를 직접 확인하세요.', revisit: '새 근거가 생기면 이 분석을 다시 검토하세요.', risk: '하방 위험과 본인의 판단 기준을 확인하세요.', largeMove: '최근 큰 움직임은 빠르게 반전될 수 있습니다. 판단 전 변동성을 확인하세요.', noNewsRisk: '명시적으로 연결된 관련 뉴스가 없어 움직임의 이유가 불분명할 수 있습니다.', stockMissingRisk: '실제 공시와 실적 데이터가 연결되지 않았습니다.', limited: '데이터 품질이 제한적입니다.', unavailable: '핵심 시장 데이터를 이용할 수 없습니다.',
    meanings: {
      price: '현재 확인 가능한 시장 값을 보여주며, 가치평가 판단은 아닙니다.',
      change: '최근 움직임 맥락을 보여줍니다. 방향만으로 판단하기에는 부족합니다.',
      volume: '거래 활동 맥락을 보여줍니다. 가격 움직임과 함께 확인해야 합니다.',
      candidate: '규칙 기반 후보 기록이 있음을 보여줍니다. 추천이 아닙니다.',
      news: '명시적으로 연결된 경우에만 출처 기반 맥락을 보여줍니다.',
      market: '시장 전반의 맥락만 보여주며 종목별 근거는 아닙니다.',
      missing: '아직 연결되지 않은 근거이며 추정해서는 안 됩니다.',
    },
    userNotice: '사용자 입력 참고값입니다. 시장 근거가 아닙니다.', intentNotice: '검토 목적은 체크리스트 문구만 바꾸며 개인 투자 조언을 생성하지 않습니다.', disclaimer: '의사결정 보조 구조일 뿐입니다. 실제 AI 모델은 연결되지 않았으며 투자 조언이 아닙니다. 최종 판단은 사용자가 합니다.',
    intents: { watching: '관찰 중', holding: '보유 중', longTerm: '장기 검토', swing: '스윙 검토', shortTerm: '단기 검토' },
    intentChecks: { watching: '새 데이터에서도 이 종목을 계속 살펴볼 필요가 있는지 확인하세요.', holding: '처음 검토한 이유를 현재 확인 가능한 근거와 비교하세요.', longTerm: '공시·실적·재무 데이터가 연결된 뒤 심층 검토하세요.', swing: '큰 움직임 뒤 가격 변화와 거래량을 다시 확인하세요.', shortTerm: '최근 움직임과 관련 뉴스 맥락을 자주 다시 확인하세요.' },
  },
} as const

const actionText = {
  en: {
    statuses: {
      decisionPending: { title: 'Decision pending', summary: 'There is not enough reliable data to form a useful action state.' },
      waiting: { title: 'Waiting / checking conditions', summary: 'More confirmation is needed before treating this as an actionable setup.' },
      watchZone: { title: 'Watch zone', summary: 'This is worth watching, but the conditions are not complete.' },
      conditionalApproach: { title: 'Conditional approach possible', summary: 'Some review conditions are present, but confirmation is still required.' },
      chaseCaution: { title: 'Chase caution', summary: 'Recent movement is already large, so following the move requires caution.' },
      sharpDropReboundCaution: { title: 'Sharp-drop rebound caution', summary: 'A rebound after a sharp drop needs extra confirmation.' },
    },
    reasons: {
      decisionPending: 'Core data is missing, unreliable, or limited to a stock demo workflow.',
      waiting: 'Market data is available, but candidate or confirmation context is not sufficient yet.',
      watchZone: 'Movement is not extreme and a deterministic candidate record is available.',
      conditionalApproach: 'Moderate movement and candidate context are both present, but confirmation is still required.',
      chaseCaution: 'A large upward move can reverse quickly and should not be followed without confirmation.',
      sharpDropReboundCaution: 'A large downward move can stay volatile even if a rebound begins.',
    },
    conditions: {
      crypto: ['Core market data remains available.', 'Movement is checked together with activity and related news.'],
      stock: ['Reliable stock data and disclosures become available.', 'Earnings and fundamentals are verified from primary sources.'],
      unavailable: ['Core price, movement, and volume data become available.', 'The data source and freshness can be verified.'],
      mock: ['Connect live data before using action readiness.', 'Review whether price, movement, and volume are available.', 'Confirm whether related news is source-linked.'],
    },
    avoid: {
      crypto: ['Do not rely on movement direction alone.', 'Pause the review if core data becomes unavailable.'],
      stock: ['Do not treat demo movement as live stock evidence.', 'Do not infer missing disclosures, earnings, or fundamentals.'],
      volatility: ['Avoid following a large move without confirmation.', 'Do not treat a short rebound as proof that conditions improved.'],
      mock: ['Do not treat demo data as live market context.', 'Do not use mock stock movement as evidence.'],
    },
    recheckEvidence: 'Recheck data quality, movement, activity, and news context together.',
    waitForEvidence: 'Wait for new evidence or a meaningful change in conditions before reviewing the status.',
    mockLimit: 'This is a workflow preview using mock/demo data. Use it to understand the analysis structure, not to act on market conditions.',
    limitedReason: 'Action readiness remains conservative because the available data is limited.',
    disclaimer: 'Action status is generated from rule-based evidence conditions. This is not a trade instruction.',
    dataModes: { live: 'Live', mock: 'Workflow preview', limited: 'Limited', unavailable: 'Live data required' },
    ruleLabels: { dataQuality: 'Data quality', movementBand: 'Movement state', candidateState: 'Candidate evidence', newsState: 'News state', assetKind: 'Asset type' },
    ruleValues: {
      movementBand: { strongUp: 'Large upward movement', moderateUp: 'Moderate upward movement', flat: 'Limited movement', moderateDown: 'Moderate downward movement', strongDown: 'Large downward movement', unknown: 'Unavailable' },
      candidateState: { candidateAvailable: 'Available', noCandidate: 'Not available' },
      newsState: { explicitlyRelated: 'Source-linked', marketOnly: 'Market-level only', missing: 'Not available' },
      assetKind: { crypto: 'Crypto', stock: 'Stock' },
    },
  },
  ko: {
    statuses: {
      decisionPending: { title: '판단 보류', summary: '유의미한 액션 상태를 정하기에는 신뢰 가능한 데이터가 부족합니다.' },
      waiting: { title: '대기 / 조건 확인 중', summary: '행동 가능한 흐름으로 보기 전에 추가 확인이 필요합니다.' },
      watchZone: { title: '관심 구간', summary: '계속 볼 만하지만 조건이 완성된 상태는 아닙니다.' },
      conditionalApproach: { title: '조건부 접근 가능', summary: '일부 검토 조건은 확인되지만 추가 확인이 필요합니다.' },
      chaseCaution: { title: '추격 접근 주의', summary: '최근 움직임이 이미 커진 상태라 따라붙는 판단은 주의가 필요합니다.' },
      sharpDropReboundCaution: { title: '급락 반등 접근 주의', summary: '급락 이후 반등은 추가 확인이 필요합니다.' },
    },
    reasons: {
      decisionPending: '핵심 데이터가 없거나 신뢰하기 어렵고, 주식은 데모 흐름으로만 제공됩니다.',
      waiting: '시장 데이터는 있지만 후보 또는 확인 맥락이 아직 충분하지 않습니다.',
      watchZone: '움직임이 극단적이지 않고 결정론적 후보 기록이 있습니다.',
      conditionalApproach: '보통 수준의 움직임과 후보 맥락이 있지만 추가 확인이 필요합니다.',
      chaseCaution: '큰 상승 움직임은 빠르게 반전될 수 있어 확인 없이 따라가면 안 됩니다.',
      sharpDropReboundCaution: '큰 하락 뒤 반등이 시작돼도 변동성이 계속될 수 있습니다.',
    },
    conditions: {
      crypto: ['핵심 시장 데이터를 계속 확인할 수 있어야 합니다.', '움직임을 거래 활동과 관련 뉴스 맥락과 함께 확인해야 합니다.'],
      stock: ['신뢰할 수 있는 주식 데이터와 공시가 연결되어야 합니다.', '실적과 재무 정보를 1차 출처에서 확인해야 합니다.'],
      unavailable: ['핵심 가격·움직임·거래량 데이터를 확인할 수 있어야 합니다.', '데이터 출처와 최신성을 검증할 수 있어야 합니다.'],
      mock: ['실시간 데이터 연결 후 액션 상태를 확인하세요.', '가격, 움직임, 거래량이 확인되는지 보세요.', '관련 뉴스가 출처와 함께 연결되는지 확인하세요.'],
    },
    avoid: {
      crypto: ['움직임 방향만으로 판단하지 마세요.', '핵심 데이터를 확인할 수 없으면 검토를 보류하세요.'],
      stock: ['데모 움직임을 실제 주식 근거로 취급하지 마세요.', '누락된 공시·실적·재무 정보를 추정하지 마세요.'],
      volatility: ['큰 움직임을 추가 확인 없이 따라가지 마세요.', '짧은 반등을 조건 개선의 증거로 취급하지 마세요.'],
      mock: ['데모 데이터를 실시간 시장 맥락으로 보지 마세요.', '모의 주식 움직임을 실제 근거로 사용하지 마세요.'],
    },
    recheckEvidence: '데이터 품질, 움직임, 거래 활동, 뉴스 맥락을 함께 다시 확인하세요.',
    waitForEvidence: '새로운 근거나 의미 있는 조건 변화가 생긴 뒤 상태를 다시 검토하세요.',
    mockLimit: '모의/데모 데이터를 사용하는 흐름 미리보기입니다. 시장 상황 판단이 아니라 분석 구조를 확인하는 용도로 보세요.',
    limitedReason: '사용 가능한 데이터가 제한적이므로 액션 상태를 보수적으로 표시합니다.',
    disclaimer: '액션 상태는 규칙 기반 근거 조건으로 생성되며, 거래 지시가 아닙니다.',
    dataModes: { live: '실시간', mock: '흐름 미리보기', limited: '제한됨', unavailable: '실시간 데이터 필요' },
    ruleLabels: { dataQuality: '데이터 품질', movementBand: '움직임 상태', candidateState: '후보 근거', newsState: '뉴스 상태', assetKind: '자산 유형' },
    ruleValues: {
      movementBand: { strongUp: '큰 상승 움직임', moderateUp: '보통 상승 움직임', flat: '제한된 움직임', moderateDown: '보통 하락 움직임', strongDown: '큰 하락 움직임', unknown: '확인 불가' },
      candidateState: { candidateAvailable: '있음', noCandidate: '없음' },
      newsState: { explicitlyRelated: '출처 연결됨', marketOnly: '시장 수준만', missing: '없음' },
      assetKind: { crypto: '가상자산', stock: '주식' },
    },
  },
} as const

function movementBand(value: number): MovementBand {
  if (!finite(value)) return 'unknown'
  if (value >= 8) return 'strongUp'
  if (value >= 2) return 'moderateUp'
  if (value <= -8) return 'strongDown'
  if (value <= -2) return 'moderateDown'
  return 'flat'
}

function volumeBand(value: number): VolumeBand {
  if (!finite(value)) return 'unknown'
  if (value <= 0) return 'low'
  // Raw volume units differ by venue, so a positive value is not labelled "high" without a comparable baseline.
  return 'normal'
}

function buildProfile(input: MyAnalysisEngineInput, stock: boolean, dataTrust: MyAnalysisResult['dataQuality'], newsState: NewsState): MyAnalysisProfile {
  const movement = movementBand(input.instrument.change24hPercent)
  return {
    assetKind: stock ? 'stock' : 'crypto',
    movementBand: movement,
    volumeBand: volumeBand(input.instrument.volume24h),
    dataTrust,
    newsState,
    candidateState: input.candidate ? 'candidateAvailable' : 'noCandidate',
    riskState: movement === 'strongUp' || movement === 'strongDown' ? 'highVolatility' : dataTrust === 'live' ? 'normalVolatility' : 'dataLimited',
  }
}

function item(id: string, type: MyAnalysisEvidence['type'], label: string, detail: string, level: MyAnalysisEvidence['level'], source: string, reviewMeaning: string): MyAnalysisEvidence {
  return { id, type, label, detail, level, source, reviewMeaning }
}

function number(value: number, language: Language, maximumFractionDigits = 2) {
  return new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits }).format(value)
}

function buildActionReadiness(profile: MyAnalysisProfile, input: MyAnalysisEngineInput): ActionReadinessPlan {
  const t = actionText[input.language]
  let status: ActionReadinessStatus

  if (profile.dataTrust === 'unavailable') status = 'decisionPending'
  else if (profile.dataTrust === 'mock') status = 'decisionPending'
  else if (profile.assetKind === 'stock') status = 'decisionPending'
  else if (profile.dataTrust === 'limited') status = 'waiting'
  else if (profile.movementBand === 'strongDown') status = 'sharpDropReboundCaution'
  else if (profile.movementBand === 'strongUp') status = 'chaseCaution'
  else if (profile.candidateState === 'candidateAvailable' && (profile.movementBand === 'moderateUp' || profile.movementBand === 'moderateDown')) status = 'conditionalApproach'
  else if (profile.candidateState === 'candidateAvailable' && profile.movementBand === 'flat') status = 'watchZone'
  else status = 'waiting'

  const highStrength: readonly ActionReadinessStatus[] = ['chaseCaution', 'sharpDropReboundCaution']
  const mediumStrength: readonly ActionReadinessStatus[] = ['watchZone', 'conditionalApproach']
  const strength = highStrength.includes(status) ? 'high' : mediumStrength.includes(status) ? 'medium' : 'low'
  const unavailable = profile.dataTrust === 'unavailable'
  const volatile = profile.riskState === 'highVolatility'
  const mock = profile.dataTrust === 'mock'
  const approachConditions = mock ? t.conditions.mock : unavailable ? t.conditions.unavailable : profile.assetKind === 'stock' ? t.conditions.stock : t.conditions.crypto
  const avoidConditions = mock ? t.avoid.mock : profile.assetKind === 'stock' ? t.avoid.stock : volatile ? t.avoid.volatility : t.avoid.crypto
  const ruleBasis: ActionRuleBasisItem[] = [
    { key: 'dataQuality', label: t.ruleLabels.dataQuality, value: t.dataModes[profile.dataTrust] },
    { key: 'movementBand', label: t.ruleLabels.movementBand, value: t.ruleValues.movementBand[profile.movementBand] },
    { key: 'candidateState', label: t.ruleLabels.candidateState, value: t.ruleValues.candidateState[profile.candidateState] },
    { key: 'newsState', label: t.ruleLabels.newsState, value: t.ruleValues.newsState[profile.newsState] },
    { key: 'assetKind', label: t.ruleLabels.assetKind, value: t.ruleValues.assetKind[profile.assetKind] },
  ]

  return {
    status,
    strength,
    dataQuality: profile.dataTrust,
    dataQualityLabel: t.dataModes[profile.dataTrust],
    title: t.statuses[status].title,
    summary: t.statuses[status].summary,
    whyThisStatus: profile.dataTrust === 'mock' ? t.mockLimit : profile.dataTrust === 'limited' ? t.limitedReason : t.reasons[status],
    approachConditions,
    avoidConditions,
    nextChecks: [t.recheckEvidence, t.waitForEvidence],
    ruleBasis,
    disclaimer: t.disclaimer,
  }
}

/** Pure and deterministic: this function never fetches, calls an AI model, or issues a trading instruction. */
export function buildMyInstrumentAnalysis(input: MyAnalysisEngineInput): MyAnalysisResult {
  const t = text[input.language]
  const { instrument } = input
  const stock = instrument.marketId === 'korea-stock' || instrument.marketId === 'us-stock'
  const completeMarketData = finite(instrument.lastPrice) && finite(instrument.change24hPercent) && finite(instrument.volume24h)
  const dataQuality = !completeMarketData ? 'unavailable' : input.catalogSource === 'mock' ? 'mock' : input.catalogSource === 'live' ? 'live' : 'limited'
  const mock = dataQuality === 'mock'
  const relatedNews = newsForInstrument(input.newsResult?.articles ?? [], instrument).filter((article) => !article.isMock)
  const realMarketNews = (input.newsResult?.articles ?? []).filter((article) => !article.isMock)
  const newsState: NewsState = relatedNews.length ? 'explicitlyRelated' : realMarketNews.length ? 'marketOnly' : 'missing'
  const profile = buildProfile(input, stock, dataQuality, newsState)
  const sourceLabel = input.newsResult?.providerLabel ?? (input.language === 'ko' ? '뉴스 제공자' : 'news provider')
  const evidence: MyAnalysisEvidence[] = []
  const missing: MyAnalysisEvidence[] = []
  const marketSource = mock ? (input.language === 'ko' ? '모의 카탈로그' : 'mock catalog') : input.catalogSource ?? 'catalog'
  const caveat = mock ? ` ${t.mockValue}` : ''

  if (finite(instrument.lastPrice)) evidence.push(item('price', 'price', input.language === 'ko' ? '가격' : 'Price', `${t.price}: ${number(instrument.lastPrice, input.language)} ${instrument.quoteCurrency}.${caveat}`, mock ? 'demo' : 'available', marketSource, t.meanings.price))
  else missing.push(item('price-missing', 'price', input.language === 'ko' ? '가격' : 'Price', t.missingPrice, 'missing', marketSource, t.meanings.missing))
  if (finite(instrument.change24hPercent)) evidence.push(item('change', 'change', input.language === 'ko' ? '등락' : 'Movement', `${t.change}: ${instrument.change24hPercent >= 0 ? '+' : ''}${number(instrument.change24hPercent, input.language)}%.${caveat}`, mock ? 'demo' : 'context', marketSource, t.meanings.change))
  else missing.push(item('change-missing', 'change', input.language === 'ko' ? '등락' : 'Movement', t.missingChange, 'missing', marketSource, t.meanings.missing))
  if (finite(instrument.volume24h)) evidence.push(item('volume', 'volume', input.language === 'ko' ? '거래량' : 'Volume', `${t.volume}: ${number(instrument.volume24h, input.language, 0)} ${instrument.quoteCurrency}.${caveat}`, mock ? 'demo' : 'context', marketSource, t.meanings.volume))
  else missing.push(item('volume-missing', 'volume', input.language === 'ko' ? '거래량' : 'Volume', t.missingVolume, 'missing', marketSource, t.meanings.missing))
  if (input.candidate) evidence.push(item('candidate', 'candidate', input.language === 'ko' ? '관찰 후보' : 'Watch candidate', t.candidate, 'context', input.language === 'ko' ? '결정론적 후보 엔진' : 'deterministic candidate engine', t.meanings.candidate))
  if (profile.newsState === 'explicitlyRelated') evidence.push(item('news', 'news', input.language === 'ko' ? '관련 뉴스' : 'Related news', `${t.directNews} ${sourceLabel}.`, 'available', sourceLabel, t.meanings.news))
  else if (profile.newsState === 'marketOnly') evidence.push(item('market-news', 'market', input.language === 'ko' ? '시장 뉴스' : 'Market news', `${t.marketNews} ${sourceLabel}.`, 'context', sourceLabel, t.meanings.market))
  else missing.push(item('news-missing', 'news', input.language === 'ko' ? '관련 뉴스' : 'Related news', t.noNews, 'missing', input.language === 'ko' ? '연결 또는 일치 없음' : 'not connected or not matched', t.meanings.missing))

  if (stock) {
    missing.push(
      item('filing', 'filing', input.language === 'ko' ? '공시' : 'Filings', t.filing, 'missing', 'future stock provider', t.meanings.missing),
      item('earnings', 'earnings', input.language === 'ko' ? '실적' : 'Earnings', t.earnings, 'missing', 'future stock provider', t.meanings.missing),
      item('fundamentals', 'fundamentals', input.language === 'ko' ? '재무' : 'Fundamentals', t.fundamentals, 'missing', 'future stock provider', t.meanings.missing),
      item('ratings', 'ratings', input.language === 'ko' ? '평가' : 'Ratings', t.ratings, 'missing', 'future stock provider', t.meanings.missing),
    )
  }

  const currentRead = dataQuality === 'unavailable'
    ? t.currentReads.unavailable
    : stock
      ? dataQuality === 'live' ? t.currentReads.stockLive : t.currentReads.stockPreview
      : t.currentReads[profile.movementBand]
  const movement = finite(instrument.change24hPercent) ? `${t.change}: ${instrument.change24hPercent >= 0 ? '+' : ''}${number(instrument.change24hPercent, input.language)}%` : t.unknownContext
  const standout: string[] = []
  if (stock) standout.push(t.stockBeta, t.stockWorkflow, t.stockMissing, t.stockPlanned)
  else {
    if (profile.movementBand === 'strongUp' || profile.movementBand === 'strongDown') standout.push(t.movementThreshold)
    else if (profile.movementBand === 'moderateUp' || profile.movementBand === 'moderateDown') standout.push(t.moderateMovement)
    else if (profile.movementBand === 'flat') standout.push(t.limitedMovement)
    else standout.push(t.unknownContext)
    if (profile.candidateState === 'candidateAvailable') standout.push(t.candidate)
    if (profile.newsState === 'explicitlyRelated') standout.push(`${t.directNews} ${sourceLabel}.`)
    else if (profile.newsState === 'marketOnly') standout.push(`${t.marketNews} ${sourceLabel}.`)
    else standout.push(t.noNews)
  }

  const risks: string[] = []
  if (stock) {
    if (mock) risks.push(t.stockDemoRisk)
    else if (dataQuality === 'limited') risks.push(t.limited)
    else if (dataQuality === 'unavailable') risks.push(t.unavailable)
    risks.push(t.stockMissingRisk, t.stockNotLive)
  } else {
    if (mock) risks.push(t.demoRisk)
    else if (dataQuality === 'limited') risks.push(t.limited)
    else if (dataQuality === 'unavailable') risks.push(t.unavailable)
    if (profile.riskState === 'highVolatility') risks.push(t.largeMove)
    if (profile.newsState === 'missing' && risks.length < 2) risks.push(t.noNewsRisk)
    risks.push(t.risk)
  }

  const checklist = [t.intentChecks[input.intent], t.verify, t.revisit]
  const actionReadiness = buildActionReadiness(profile, input)
  return {
    instrumentId: instrument.id,
    assetType: profile.assetKind,
    dataQuality,
    dataQualityLabel: t.qualities[dataQuality],
    summary: t.summary,
    currentRead,
    evidence,
    missingEvidence: missing,
    userContext: {
      intent: t.intents[input.intent],
      userNote: input.userNote.trim() || null,
      averagePrice: input.averagePrice !== null && finite(input.averagePrice) ? `${number(input.averagePrice, input.language)} ${instrument.quoteCurrency}` : null,
      notice: t.userNotice,
      intentNotice: t.intentNotice,
    },
    simpleModeSections: [
      { id: 'simple-current', title: t.current, items: firstThree([movement, `${t.dataQuality}: ${t.qualities[dataQuality]}`, finite(instrument.lastPrice) ? `${t.price}: ${number(instrument.lastPrice, input.language)} ${instrument.quoteCurrency}` : t.missingPrice]) },
      { id: 'simple-check', title: t.standsOut, items: firstThree(standout) },
      { id: 'simple-caution', title: t.caution, items: firstThree(risks) },
    ],
    expertModeSections: [
      { id: 'evidence', title: t.evidence, items: [] },
      { id: 'missing', title: t.missing, items: [] },
      { id: 'checklist', title: t.checklist, items: checklist },
    ],
    reviewChecklist: checklist,
    actionReadiness,
    disclaimer: t.disclaimer,
  }
}
