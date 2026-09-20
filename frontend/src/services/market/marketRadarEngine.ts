import type { Language } from '@/i18n/translations'
import type { NewsLoadResult } from '@/services/news/newsService'
import type { MarketDataMode, MarketInstrument } from '@/types/market'
import type { MarketRadarScope, MarketRadarSignal, MarketRadarSignalSource, MarketRadarSnapshot } from '@/types/marketRadar'
import type { WatchCandidate } from '@/types/watchCandidate'

export interface MarketRadarInput {
  instruments: readonly MarketInstrument[]
  watchCandidates: readonly WatchCandidate[]
  newsResult: NewsLoadResult | null
  language: Language
  mode: MarketDataMode
  generatedAt?: string
}

const scopeFromMarkets = (markets: readonly string[]): MarketRadarScope => {
  const known = markets.filter((value): value is MarketRadarScope => ['crypto', 'korea', 'us', 'macro'].includes(value))
  return new Set(known).size === 1 ? known[0] : known.length ? 'mixed' : 'macro'
}
const sourceFromNews = (result: NewsLoadResult | null): MarketRadarSignalSource => result?.source === 'local-proxy' ? 'local-proxy' : result?.source === 'mock' ? 'mock' : result?.source === 'rss' ? 'rule-based' : 'none'
const disclaimer = (language: Language) => language === 'ko' ? '규칙 기반 시장 검토용이며 투자 추천이나 인과관계 판단이 아닙니다.' : 'Rule-based market review only; not investment advice or a claim of causality.'

/** Pure radar aggregation. It never fetches, predicts, or calls a model. */
export function buildMarketRadar(input: MarketRadarInput): MarketRadarSnapshot {
  const { instruments, watchCandidates, newsResult, language, mode } = input
  const ko = language === 'ko'
  const commonDisclaimer = disclaimer(language)
  const valid = instruments.filter((item) => Number.isFinite(item.volume24h) && Number.isFinite(item.change24hPercent))
  const source = sourceFromNews(newsResult)

  const hotSectors: MarketRadarSignal[] = []
  if (valid.length) hotSectors.push({ id: 'sector-crypto', type: 'hotSector', scope: 'crypto', title: ko ? '가상자산 활동' : 'Crypto activity', summary: ko ? '현재 가상자산 카탈로그의 가격·거래량 데이터를 검토할 수 있습니다.' : 'Price and volume evidence is available in the current crypto catalog.', evidenceLabel: ko ? `${valid.length}개 활성 종목` : `${valid.length} active instruments`, relatedSymbols: valid.slice(0, 3).map((item) => item.symbol), relatedMarkets: ['crypto'], relatedInstrumentIds: valid.slice(0, 3).map((item) => item.id), score: Math.min(100, 40 + valid.length), status: 'active', source: mode === 'mock' ? 'mock' : 'rule-based', disclaimer: commonDisclaimer })
  const articles = newsResult?.articles ?? []
  const macroArticles = articles.filter((article) => article.category === 'macro')
  if (source === 'local-proxy' && macroArticles.length) hotSectors.push({ id: 'sector-macro', type: 'hotSector', scope: 'macro', title: ko ? '거시 환경' : 'Macro environment', summary: ko ? 'Local Proxy RSS 거시 뉴스가 있어 위험자산 전반의 맥락을 검토합니다.' : 'Local Proxy RSS macro news is available for broad risk-market review.', evidenceLabel: ko ? `${macroArticles.length}개 거시 기사` : `${macroArticles.length} macro article${macroArticles.length === 1 ? '' : 's'}`, relatedSymbols: [], relatedMarkets: ['macro'], relatedInstrumentIds: [], score: Math.min(100, 50 + macroArticles.length * 5), status: 'watch', source, disclaimer: commonDisclaimer })
  const technologyArticles = articles.filter((article) => article.category === 'ai' || article.category === 'technology')
  if (technologyArticles.length) hotSectors.push({ id: 'sector-technology', type: 'hotSector', scope: scopeFromMarkets(technologyArticles.flatMap((article) => [...article.relatedMarkets])), title: ko ? 'AI·기술 테마' : 'AI & technology theme', summary: ko ? '기사 분류가 뒷받침하는 섹터 맥락이며 종목을 임의로 추가하지 않습니다.' : 'Article categories support this sector context; no instruments are invented.', evidenceLabel: ko ? `${technologyArticles.length}개 관련 기사` : `${technologyArticles.length} related article${technologyArticles.length === 1 ? '' : 's'}`, relatedSymbols: [...new Set(technologyArticles.flatMap((article) => [...article.relatedSymbols]))].slice(0, 4), relatedMarkets: [...new Set(technologyArticles.flatMap((article) => [...article.relatedMarkets]))], relatedInstrumentIds: [...new Set(technologyArticles.flatMap((article) => Object.values(article.relatedInstrumentIds ?? {})))].filter((id) => instruments.some((item) => item.id === id)), score: Math.min(100, 45 + technologyArticles.length * 5), status: 'watch', source, disclaimer: commonDisclaimer })

  const byVolume = [...valid].filter((item) => item.volume24h > 0).sort((a, b) => b.volume24h - a.volume24h).slice(0, 3)
  const unusualVolume: MarketRadarSignal[] = byVolume.map((instrument, index) => ({ id: `volume-${instrument.id}`, type: 'unusualVolume', scope: 'crypto', title: instrument.symbol, summary: ko ? '현재 카탈로그 내 상대 거래량 순위입니다. 가격 방향을 의미하지 않습니다.' : 'Relative volume rank in the current catalog; it does not imply price direction.', evidenceLabel: ko ? `거래량 순위 #${index + 1}` : `Volume rank #${index + 1}`, relatedSymbols: [instrument.symbol], relatedMarkets: ['crypto'], relatedInstrumentIds: [instrument.id], score: Math.max(50, 90 - index * 15), status: index === 0 ? 'active' : 'watch', source: mode === 'mock' ? 'mock' : 'rule-based', disclaimer: commonDisclaimer }))

  const volatilityRadar: MarketRadarSignal[] = [...valid].filter((item) => Math.abs(item.change24hPercent) >= 5).sort((a, b) => Math.abs(b.change24hPercent) - Math.abs(a.change24hPercent)).slice(0, 4).map((instrument) => {
    const change = Math.abs(instrument.change24hPercent)
    const extreme = change >= 10
    return { id: `volatility-${instrument.id}`, type: 'volatility', scope: 'crypto', title: instrument.symbol, summary: ko ? `24시간 절대 변동률 ${change.toFixed(2)}%를 검토 대상으로 표시합니다.` : `Flagged for review at ${change.toFixed(2)}% absolute 24-hour movement.`, evidenceLabel: ko ? `절대 변동률 ${change.toFixed(2)}%` : `${change.toFixed(2)}% absolute change`, relatedSymbols: [instrument.symbol], relatedMarkets: ['crypto'], relatedInstrumentIds: [instrument.id], score: Math.min(100, Math.round(change * 6)), status: extreme ? 'caution' as const : 'watch' as const, source: mode === 'mock' ? 'mock' as const : 'rule-based' as const, disclaimer: commonDisclaimer }
  })

  const candidateSignals: MarketRadarSignal[] = watchCandidates.slice(0, 3).map((candidate) => ({ id: `candidate-${candidate.instrumentId}`, type: 'watchCandidate', scope: 'crypto', title: candidate.symbol, summary: ko ? '기존 관찰 후보 엔진이 만든 추가 검토 대상입니다.' : 'A research review item from the existing watch-candidate engine.', evidenceLabel: ko ? `관찰 점수 ${candidate.watchScore}` : `Watch Score ${candidate.watchScore}`, relatedSymbols: [candidate.symbol], relatedMarkets: ['crypto'], relatedInstrumentIds: [candidate.instrumentId], score: candidate.watchScore, status: candidate.scoreLabel === 'incomplete' ? 'incomplete' : 'watch', source: 'rule-based', disclaimer: commonDisclaimer }))

  const newsThemes: MarketRadarSignal[] = articles.slice(0, 3).map((article) => {
    const directIds = [...new Set(Object.values(article.relatedInstrumentIds ?? {}))].filter((id) => instruments.some((item) => item.id === id))
    const macro = article.category === 'macro'
    return { id: `news-${article.id}`, type: 'newsTheme', scope: macro ? 'macro' : scopeFromMarkets(article.relatedMarkets), title: article.title, summary: macro ? (ko ? '거시 뉴스는 시장 수준 맥락이며 특정 종목 신호가 아닙니다.' : 'Macro news is market-level context, not an instrument-specific signal.') : (ko ? '헤드라인 분류와 명시된 연결만 반영하며 인과관계를 추정하지 않습니다.' : 'Uses headline classification and explicit links only; no causality is inferred.'), evidenceLabel: `${article.source} · ${article.category}`, relatedSymbols: macro ? [] : article.relatedSymbols.slice(0, 4), relatedMarkets: [...article.relatedMarkets], relatedInstrumentIds: macro ? [] : directIds, score: article.importance === 'high' ? 75 : article.importance === 'medium' ? 60 : 45, status: macro ? 'watch' : article.isMock ? 'incomplete' : 'active', source: article.isMock ? 'mock' : source, disclaimer: commonDisclaimer }
  })

  const riskNotes = [
    ...(valid.length ? [] : [ko ? '시장 데이터가 없어 레이더가 불완전합니다.' : 'Market data is unavailable, so the radar is incomplete.']),
    ...(volatilityRadar.some((item) => item.status === 'caution') ? [ko ? '급격한 변동 종목은 추가 위험 검토가 필요합니다.' : 'Extreme movement requires additional risk review.'] : []),
    ...(macroArticles.length ? [ko ? '거시 뉴스는 특정 종목 근거가 아닙니다.' : 'Macro news is not instrument-specific evidence.'] : []),
    ko ? '실제 AI는 연결되지 않았습니다.' : 'Real AI is not connected.',
  ]
  if (!articles.length) riskNotes.push(ko ? '사용 가능한 뉴스 데이터가 없습니다.' : 'No news data is available.')

  const riskSignals: MarketRadarSignal[] = riskNotes.map((note, index) => ({ id: `risk-${index}`, type: 'risk', scope: 'mixed', title: ko ? '위험 검토' : 'Risk review', summary: note, evidenceLabel: ko ? '신뢰 경계' : 'Trust boundary', relatedSymbols: [], relatedMarkets: [], relatedInstrumentIds: [], score: 0, status: valid.length ? 'caution' : 'incomplete', source: 'rule-based', disclaimer: commonDisclaimer }))
  const signals = [...hotSectors, ...unusualVolume, ...volatilityRadar, ...candidateSignals, ...newsThemes, ...riskSignals]
  return { generatedAt: input.generatedAt ?? new Date(0).toISOString(), mode, newsSource: source, signals, hotSectors, unusualVolume, volatilityRadar, watchCandidates: candidateSignals, newsThemes, riskNotes }
}
