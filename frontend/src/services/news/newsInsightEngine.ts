import type { Language } from '@/i18n/translations'
import type { NewsArticle } from '@/types/dashboard'
import type { NewsInsightAvailableInstrument, NewsInsightCandidate, NewsInsightImpactType, NewsInsightSummary } from '@/types/newsInsight'
import { safeNewsUrl } from '@/utils/safeNewsUrl'

interface BuildNewsInsightInput {
  article: NewsArticle
  availableInstruments?: readonly NewsInsightAvailableInstrument[]
  language: Language
}

const koPlaceholder = '실제 AI 한국어 요약은 아직 연결되지 않았습니다. 현재는 뉴스 제목과 분류를 바탕으로 핵심 이슈와 관련 시장을 규칙 기반으로 정리합니다.'
const enPlaceholder = 'AI Korean summary is not connected yet. This rule-based insight highlights the main issue and possible market areas.'
const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
const baseSymbol = (value: string) => normalize(value).replace(/(KRW|USDT|FDUSD|USD|BTC|ETH)$/, '')

function explicitCandidates(article: NewsArticle, available: readonly NewsInsightAvailableInstrument[]): NewsInsightCandidate[] {
  const explicitSymbols = new Set(article.relatedSymbols.map(normalize))
  const explicitIds = new Set(Object.values(article.relatedInstrumentIds ?? {}))
  return available.filter((instrument) => explicitIds.has(instrument.id) || explicitSymbols.has(normalize(instrument.symbol)) || explicitSymbols.has(baseSymbol(instrument.symbol)))
    .map(({ id, symbol, name }) => ({ instrumentId: id, symbol, name }))
    .filter((candidate, index, values) => values.findIndex((value) => value.instrumentId === candidate.instrumentId) === index)
}

function macroCandidates(available: readonly NewsInsightAvailableInstrument[]): NewsInsightCandidate[] {
  return available.filter((instrument) => ['BTC', 'ETH'].includes(baseSymbol(instrument.symbol))).slice(0, 2)
    .map(({ id, symbol, name }) => ({ instrumentId: id, symbol, name }))
}

function impactTypes(article: NewsArticle): NewsInsightImpactType[] {
  const result = new Set<NewsInsightImpactType>()
  if (article.category === 'macro') result.add('macro')
  if (article.category === 'crypto') result.add('crypto')
  if (article.category === 'korea-stock') result.add('koreaStock')
  if (article.category === 'us-stock') result.add('usStock')
  if (article.category === 'technology' || article.category === 'ai') result.add('sector')
  if (article.category === 'regulation') { result.add('regulation'); result.add('risk') }
  if (article.sentiment === 'negative' || article.importance === 'high') result.add('risk')
  return [...result]
}

function sectors(article: NewsArticle): string[] {
  if (article.category === 'ai' || article.category === 'technology') return ['AI', 'Semiconductors', 'Data Center']
  if (article.category === 'crypto') return ['Digital Assets']
  if (article.category === 'regulation') return ['Regulatory Policy']
  if (article.category === 'macro') return ['Rates', 'Liquidity', 'Risk Assets']
  return []
}

/** Deterministic interpretation boundary. It performs no network, translation, or model call. */
export function buildNewsInsight({ article, availableInstruments = [], language }: BuildNewsInsightInput): NewsInsightSummary {
  const isMacro = article.category === 'macro'
  const isSector = article.category === 'technology' || article.category === 'ai'
  const isRegulation = article.category === 'regulation'
  const direct = explicitCandidates(article, availableInstruments)
  const relatedCandidates = isMacro ? macroCandidates(availableInstruments) : direct
  const candidateScope = isMacro ? 'market-level' : direct.length > 0 ? 'instrument-specific' : isSector ? 'sector-level' : article.relatedMarkets.length > 0 ? 'market-level' : 'unavailable'
  const koreanSummaryPlaceholder = language === 'ko' ? koPlaceholder : enPlaceholder
  const keyIssue = language === 'ko'
    ? isMacro ? '금리·유동성 등 거시 환경의 위험자산 영향 점검' : isRegulation ? '규제 변화 가능성과 시장 위험 점검' : isSector ? 'AI·반도체·데이터센터 관련 섹터 영향 점검' : `${article.category} 뉴스의 시장 영향 점검`
    : isMacro ? 'Review macro conditions such as rates and liquidity across risk markets' : isRegulation ? 'Review regulatory uncertainty and market risk' : isSector ? 'Review possible AI, semiconductor, and data-center sector effects' : `Review the market context of this ${article.category} article`
  const marketImpact = language === 'ko'
    ? isMacro ? '특정 종목 신호가 아니라 가상자산과 주식 전반의 변동성·유동성 환경을 확인할 사안입니다.' : isSector ? '명시적으로 연결된 종목만 후보로 표시하며, 그 외에는 섹터 수준의 관찰 맥락만 제공합니다.' : '명시된 시장과 종목의 가격·거래량 변화 여부를 추가로 확인할 관찰 맥락입니다.'
    : isMacro ? 'This is broad volatility and liquidity context across crypto and equities, not an instrument-specific signal.' : isSector ? 'Only explicitly linked instruments appear as candidates; otherwise this remains sector-level context.' : 'This is context for reviewing price and volume changes in explicitly related markets and instruments.'
  const scopeCaveat = language === 'ko' ? '관련 후보는 투자 추천이 아니며 기사에 명시된 연결 또는 거시시장 참고 범위만 반영합니다.' : 'Related candidates are not recommendations and reflect only explicit article links or broad macro context.'
  return {
    originalTitle: article.title,
    source: article.source,
    publishedAt: article.publishedAt,
    providerMode: 'rule-based',
    language,
    koreanSummaryPlaceholder,
    keyIssue,
    marketImpact,
    relatedImpactTypes: impactTypes(article),
    relatedSectors: sectors(article),
    relatedMarkets: [...article.relatedMarkets],
    relatedCandidateSymbols: relatedCandidates.map((candidate) => candidate.symbol),
    relatedCandidates,
    candidateScope,
    shortTermView: language === 'ko' ? '헤드라인 이후 가격·거래량·변동성 반응을 확인합니다.' : 'Observe price, volume, and volatility after the headline.',
    swingView: language === 'ko' ? '후속 보도와 시장 흐름의 지속 여부를 함께 확인합니다.' : 'Review follow-up reporting and whether the market theme persists.',
    longTermView: language === 'ko' ? '구조적 영향은 추가 근거가 쌓이기 전까지 확정하지 않습니다.' : 'Do not infer structural impact until additional evidence accumulates.',
    risks: isRegulation ? [language === 'ko' ? '규제 해석과 시행 시점이 달라질 수 있습니다.' : 'Regulatory interpretation and timing may change.'] : [language === 'ko' ? '단일 뉴스만으로 방향을 판단할 수 없습니다.' : 'A single article cannot establish market direction.'],
    caveats: [scopeCaveat, article.isMock ? (language === 'ko' ? '모의 뉴스로 만든 데모 인사이트입니다.' : 'This is a demo insight generated from mock news.') : (language === 'ko' ? '원문을 직접 확인해야 하며 실제 AI 해석은 비활성입니다.' : 'Review the original source; real AI interpretation is inactive.')],
    sourceUrl: safeNewsUrl(article.url) ?? undefined,
    disclaimer: language === 'ko' ? '규칙 기반 리서치 참고용이며 투자 추천·예측·매매 지시가 아닙니다.' : 'Rule-based research context only; not investment advice, a forecast, or a trading instruction.',
    isDemo: article.isMock,
  }
}

