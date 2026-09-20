import type { Language } from '@/i18n/translations'
import { newsForInstrument } from '@/services/news/newsSelectors'
import type { NewsLoadResult } from '@/services/news/newsService'
import type { MarketInstrument } from '@/types/market'
import type { CandidatePlanningZones, StockCandidateDataQuality, StockMarketRegion, StockWatchCandidate, WatchCandidateBreakdown, WatchCandidateHorizon } from '@/types/watchCandidate'
import { getCandidateHorizonProfile } from './candidateHorizonProfiles'

export interface StockWatchCandidateInput {
  instruments: readonly MarketInstrument[]
  region: StockMarketRegion
  newsResult: NewsLoadResult | null
  language: Language
  horizon?: WatchCandidateHorizon
  limit?: number
}

const finite = (value: number) => Number.isFinite(value)
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))
const quality = (instrument: MarketInstrument): StockCandidateDataQuality => {
  if (!finite(instrument.lastPrice) || !finite(instrument.change24hPercent) || !finite(instrument.volume24h)) return 'unavailable'
  if (instrument.providerType === 'mock-krx' || instrument.providerType === 'mock-us') return 'mock'
  return 'limited'
}

function planningZones(horizon: WatchCandidateHorizon, language: Language, dataQuality: StockCandidateDataQuality): CandidatePlanningZones {
  const ko = language === 'ko'
  const prefix = dataQuality === 'mock' || dataQuality === 'unavailable' ? (ko ? '모의 데이터 기준: ' : 'Mock-data workflow: ') : ''
  const cadence = horizon === 'short' ? (ko ? '가격·거래량 반응 구간 확인' : 'Review the price and volume reaction area') : horizon === 'swing' ? (ko ? '조정·재확인 관찰 구간 검토' : 'Review the pullback and retest observation area') : (ko ? '장기 가설 재검토 구간 확인' : 'Review the long-term thesis review area')
  return {
    interestArea: `${prefix}${cadence}`,
    secondInterestArea: ko ? '추가 시장 근거가 확인될 때까지 관찰 유지' : 'Continue observing until additional market evidence is available',
    targetObservationArea: ko ? '가격 방향이 아닌 후속 근거 확인 구간' : 'Area for follow-up evidence review, not a directional price objective',
    invalidationRiskArea: ko ? '급격한 변동·유동성 약화·데이터 누락 시 재검토' : 'Reassess after extreme movement, weaker liquidity, or missing data',
    riskRewardNote: ko ? '계획 참고용 문구이며 진입가·손절가·목표가가 아닙니다.' : 'Planning reference only; no entry, stop, or target price is provided.',
    confidenceNote: ko ? '모의·제한 데이터 기반이며 실제 확률이 아닙니다.' : 'Based on mock or limited data; not a real probability.',
  }
}

const copy = {
  en: { momentum: 'Momentum', liquidity: 'Volume / liquidity', context: 'Market context', sector: 'Sector / theme', news: 'News evidence', complete: 'Data completeness', risk: 'Risk review', why: 'Ranked for evidence-based review from price movement, relative liquidity, market context, and explicit news links.', noSector: 'No verified sector classification is available.', noNews: 'No explicitly linked stock news is available.', explicitNews: 'Explicit related-symbol news is available for review.', marketKorea: 'KOSPI/KOSDAQ context from the available stock catalog.', marketUs: 'NASDAQ/NYSE context from the available stock catalog.', live: 'Live data label. Production coverage still requires provider review.', mock: 'Mock / preview data. Quotes are deterministic simulations.', limited: 'Limited data. Production stock coverage is not connected.', unavailable: 'Required stock data is unavailable.', riskNormal: 'No extreme-movement penalty applied.', riskExtreme: 'Extreme 24-hour movement reduces the Watch Score.', disclaimer: 'Rule-based stock review only. Not investment advice. The user makes the final decision.' },
  ko: { momentum: '모멘텀', liquidity: '거래량 / 유동성', context: '시장 맥락', sector: '섹터 / 테마', news: '뉴스 근거', complete: '데이터 완성도', risk: '위험 검토', why: '가격 움직임, 상대 유동성, 시장 맥락과 명시적 뉴스 연결을 바탕으로 검토 순서를 정했습니다.', noSector: '검증된 섹터 분류 정보가 없습니다.', noNews: '명시적으로 연결된 주식 뉴스가 없습니다.', explicitNews: '명시적으로 연결된 종목 뉴스를 검토할 수 있습니다.', marketKorea: '사용 가능한 주식 카탈로그의 KOSPI/KOSDAQ 맥락입니다.', marketUs: '사용 가능한 주식 카탈로그의 NASDAQ/NYSE 맥락입니다.', live: '실시간 데이터 표시입니다. 운영 범위는 제공자 검토가 더 필요합니다.', mock: '모의 / 미리보기 데이터입니다. 시세는 결정론적 시뮬레이션입니다.', limited: '제한된 데이터입니다. 운영용 주식 데이터는 연결되지 않았습니다.', unavailable: '필수 주식 데이터가 없습니다.', riskNormal: '급격한 변동에 따른 감점이 없습니다.', riskExtreme: '과도한 24시간 변동으로 관찰 점수를 감점했습니다.', disclaimer: '규칙 기반 주식 검토용이며 투자 조언이 아닙니다. 최종 판단은 사용자가 직접 내립니다.' },
} as const

/** Pure stock ranking over supplied catalog data. No provider, model, fundamentals, or trading dependency exists here. */
export function buildStockWatchCandidates(input: StockWatchCandidateInput): readonly StockWatchCandidate[] {
  const t = copy[input.language]
  const horizon = input.horizon ?? 'short'
  const profile = getCandidateHorizonProfile(horizon, input.language)
  const wantedMarket = input.region === 'korea' ? 'korea-stock' : 'us-stock'
  const pool = input.instruments.filter((instrument) => instrument.marketId === wantedMarket)
  if (!pool.length) return []
  const orderedVolume = [...pool].filter((item) => finite(item.volume24h)).sort((a, b) => b.volume24h - a.volume24h)
  const volumeRanks = new Map(orderedVolume.map((instrument, index) => [instrument.id, index]))
  const limit = clamp(Math.trunc(input.limit ?? 5), 1, 10)

  return pool.map((instrument): StockWatchCandidate => {
    const dataQuality = quality(instrument)
    const missing = dataQuality === 'unavailable'
    const change = finite(instrument.change24hPercent) ? instrument.change24hPercent : 0
    const absoluteChange = Math.abs(change)
    const momentum = missing ? 0 : change > 0 && absoluteChange <= 8 ? Math.round(10 + Math.min(change, 8) * 1.25) : change > -2 ? 8 : 4
    const rank = volumeRanks.get(instrument.id)
    const liquidity = rank === undefined ? 0 : Math.round(8 + (1 - rank / Math.max(1, pool.length - 1)) * 12)
    const marketContext = 14
    const sectorScore = instrument.marketType ? 6 : 0
    const relatedNews = newsForInstrument(input.newsResult?.articles ?? [], instrument).filter((article) => !article.isMock)
    const newsScore = relatedNews.length ? 15 : 0
    const completeness = missing ? 0 : dataQuality === 'mock' ? 8 : 12
    const penalty = missing ? 20 : absoluteChange >= 12 ? 20 : absoluteChange >= 8 ? 10 : 0
    const watchScore = clamp(momentum + liquidity + marketContext + sectorScore + newsScore + completeness - penalty, 0, 100)
    const evidence: WatchCandidateBreakdown[] = [
      { type: 'momentum', label: t.momentum, score: momentum, maxScore: 20, summary: `${change >= 0 ? '+' : ''}${change.toFixed(2)}% / 24H`, status: momentum >= 12 ? 'positive' : 'neutral' },
      { type: 'liquidity', label: t.liquidity, score: liquidity, maxScore: 20, summary: rank === undefined ? t.unavailable : `${input.language === 'ko' ? '카탈로그 내 순위' : 'Catalog rank'} #${rank + 1}`, status: liquidity ? 'positive' : 'missing' },
      { type: 'marketContext', label: t.context, score: marketContext, maxScore: 20, summary: input.region === 'korea' ? t.marketKorea : t.marketUs, status: 'neutral' },
      { type: 'sector', label: t.sector, score: sectorScore, maxScore: 20, summary: instrument.marketType?.toUpperCase() ?? t.noSector, status: sectorScore ? 'neutral' : 'missing' },
      { type: 'news', label: t.news, score: newsScore, maxScore: 15, summary: relatedNews.length ? t.explicitNews : t.noNews, status: relatedNews.length ? 'positive' : 'missing' },
      { type: 'incomplete', label: t.complete, score: completeness, maxScore: 15, summary: t[dataQuality], status: missing ? 'missing' : dataQuality === 'mock' ? 'demo' : 'neutral' },
      { type: 'risk', label: t.risk, score: -penalty, maxScore: 0, summary: penalty ? t.riskExtreme : t.riskNormal, status: penalty ? 'risk' : 'neutral' },
    ]
    return {
      id: `stock-watch-${horizon}-${instrument.id}`, instrumentId: instrument.id, symbol: instrument.symbol, name: instrument.name, assetType: 'stock', region: input.region, sectorLabel: undefined, dataQuality, dataQualityNote: t[dataQuality], stockEvidenceTypes: ['momentum', 'liquidity', 'marketContext', 'sector', 'news', 'incomplete', 'risk'], horizon, lifecycleStatus: 'new', reviewCadence: profile.reviewCadence, planningZones: planningZones(horizon, input.language, dataQuality), rank: 0, watchScore, scoreLabel: missing ? 'incomplete' : watchScore >= 65 ? 'high' : watchScore >= 45 ? 'medium' : 'low', summary: input.language === 'ko' ? '현재 제한된 주식 데이터로 계산한 투명한 관찰 후보입니다.' : 'A transparent watch candidate calculated from currently limited stock data.', watchReason: t.why, evidence, riskSummary: penalty ? t.riskExtreme : t.riskNormal, invalidationSummary: planningZones(horizon, input.language, dataQuality).invalidationRiskArea, nextWatchPoints: [input.language === 'ko' ? '시장·거래량 데이터를 다시 확인하세요.' : 'Recheck market and volume evidence.', input.language === 'ko' ? '명시적으로 연결된 뉴스 원문을 확인하세요.' : 'Review explicitly linked original news.'], newsEvidence: { source: relatedNews.length ? (input.newsResult?.source === 'local-proxy' ? 'local-proxy' : 'browser-rss') : input.newsResult?.source === 'mock' ? 'demo' : 'none', scope: relatedNews.length ? 'instrument' : input.newsResult?.articles.length ? 'market' : 'none', count: relatedNews.length, headlines: relatedNews.slice(0, 3).map((article) => article.title), generated: false, disclaimer: relatedNews.length ? t.explicitNews : t.noNews }, disclaimer: t.disclaimer,
    }
  }).sort((left, right) => right.watchScore - left.watchScore || right.evidence[1].score - left.evidence[1].score || left.symbol.localeCompare(right.symbol)).slice(0, limit).map((candidate, index) => ({ ...candidate, rank: index + 1 }))
}
