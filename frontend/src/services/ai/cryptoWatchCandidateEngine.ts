import type { Language } from '@/i18n/translations'
import { newsForInstrument } from '@/services/news/newsSelectors'
import type { NewsLoadResult } from '@/services/news/newsService'
import type { MarketInstrument } from '@/types/market'
import type { WatchCandidate, WatchCandidateBreakdown, WatchCandidateNewsEvidence, WatchCandidateScoreLabel } from '@/types/watchCandidate'

export interface CryptoWatchCandidateInput {
  instruments: readonly MarketInstrument[]
  newsResult: NewsLoadResult | null
  language: Language
  limit?: number
}

const copy = {
  en: {
    momentum: 'Momentum', volume: 'Volume / liquidity', context: 'Market context', news: 'News evidence', scenario: 'Scenario readiness', risk: 'Risk penalty',
    positiveMomentum: 'Positive, non-extreme 24H movement.', neutralMomentum: 'Momentum is neutral or negative.', volumeRank: 'Relative activity rank within this catalog.', contextReady: 'Crypto market context is available.', newsInstrument: 'Verified headlines are linked to this instrument.', newsMarket: 'News is market-level context, not coin-specific evidence.', newsDemo: 'Demo headlines are illustrative and are not real evidence.', newsMissing: 'No news evidence is available.', scenarioReady: 'Price, change, and volume inputs are complete.', scenarioMissing: 'One or more market inputs are missing.', riskNormal: 'No extreme-move penalty applied.', riskExtreme: 'Extreme 24H movement reduces the watch score.', riskMissing: 'Missing market data reduces confidence in this screen.',
    summary: 'A transparent watch candidate based on current market evidence.', reason: 'Ranked for review from momentum, relative activity, context, and available evidence.', invalidation: 'Reassess if momentum reverses, liquidity weakens, or new risk evidence appears.', next: ['Confirm the move across multiple timeframes.', 'Review liquidity and market-wide context.', 'Verify source-specific news before making any decision.'],
    disclaimer: 'Watch score is a deterministic research aid, not a recommendation, prediction, or probability.', marketNews: 'Market-level RSS cannot be treated as coin-specific evidence.', demoNews: 'Demo news is illustrative only.', noneNews: 'No news source contributed to this score.', labels: { high: 'High evidence', medium: 'Medium evidence', low: 'Low evidence', incomplete: 'Incomplete evidence' },
  },
  ko: {
    momentum: '모멘텀', volume: '거래량 / 유동성', context: '시장 맥락', news: '뉴스 근거', scenario: '시나리오 준비도', risk: '위험 감점',
    positiveMomentum: '과도하지 않은 긍정적 24시간 움직임입니다.', neutralMomentum: '모멘텀이 중립 또는 하락 상태입니다.', volumeRank: '현재 카탈로그 내 상대적 활동 순위입니다.', contextReady: '가상자산 시장 맥락을 확인할 수 있습니다.', newsInstrument: '검증된 헤드라인이 이 종목에 직접 연결되어 있습니다.', newsMarket: '뉴스는 시장 수준 맥락이며 코인별 근거가 아닙니다.', newsDemo: '데모 헤드라인은 예시이며 실제 근거가 아닙니다.', newsMissing: '사용 가능한 뉴스 근거가 없습니다.', scenarioReady: '가격·등락률·거래량 입력이 갖춰졌습니다.', scenarioMissing: '하나 이상의 시장 입력이 누락되었습니다.', riskNormal: '급격한 변동에 따른 감점이 없습니다.', riskExtreme: '과도한 24시간 변동으로 관찰 점수를 감점했습니다.', riskMissing: '시장 데이터 누락으로 화면의 신뢰도가 낮아졌습니다.',
    summary: '현재 시장 근거를 투명하게 계산한 관찰 후보입니다.', reason: '모멘텀, 상대 활동성, 시장 맥락과 사용 가능한 근거를 기준으로 검토 순서를 정했습니다.', invalidation: '모멘텀 반전, 유동성 약화 또는 새로운 위험 근거가 나타나면 다시 평가해야 합니다.', next: ['여러 시간 프레임에서 움직임을 재확인하세요.', '유동성과 시장 전체 맥락을 확인하세요.', '판단 전 출처가 명확한 뉴스를 직접 검증하세요.'],
    disclaimer: 'Watch Score는 결정론적 리서치 보조 지표이며 추천·예측·확률이 아닙니다.', marketNews: '시장 수준 RSS는 코인별 근거로 해석할 수 없습니다.', demoNews: '데모 뉴스는 설명용 예시일 뿐입니다.', noneNews: '이 점수에는 뉴스 출처가 반영되지 않았습니다.', labels: { high: '근거 높음', medium: '근거 보통', low: '근거 낮음', incomplete: '근거 불완전' },
  },
} as const

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))
const finite = (value: number) => Number.isFinite(value)

function scoreLabel(score: number, incomplete: boolean): WatchCandidateScoreLabel {
  if (incomplete) return 'incomplete'
  if (score >= 70) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

function newsEvidence(instrument: MarketInstrument, result: NewsLoadResult | null, language: Language): { evidence: WatchCandidateNewsEvidence; points: number; item: WatchCandidateBreakdown } {
  const t = copy[language]
  const articles = result?.articles ?? []
  const related = newsForInstrument(articles, instrument).filter((article) => !article.isMock)
  const realArticles = articles.filter((article) => !article.isMock)
  const demo = result?.source === 'mock' && articles.length > 0
  const source = result?.source === 'local-proxy' && realArticles.length ? 'local-proxy'
    : result?.source === 'rss' && realArticles.length ? 'browser-rss'
      : demo ? 'demo' : 'none'
  const scope = related.length ? 'instrument' : realArticles.length ? 'market' : demo ? 'demo' : 'none'
  const selected = related.length ? related : realArticles.slice(0, 3)
  const points = scope === 'instrument' ? 15 : scope === 'market' ? 8 : scope === 'demo' ? 3 : 0
  const summary = scope === 'instrument' ? t.newsInstrument : scope === 'market' ? t.newsMarket : scope === 'demo' ? t.newsDemo : t.newsMissing
  const disclaimer = scope === 'market' ? t.marketNews : scope === 'demo' ? t.demoNews : scope === 'none' ? t.noneNews : t.disclaimer
  return {
    points,
    evidence: { source, scope, count: selected.length, headlines: selected.slice(0, 3).map((article) => article.title), generated: false, disclaimer },
    item: { type: 'news', label: t.news, score: points, maxScore: 15, summary, status: scope === 'instrument' ? 'positive' : scope === 'demo' ? 'demo' : scope === 'none' ? 'missing' : 'neutral' },
  }
}

/** Pure, deterministic ranking. It does not fetch, predict, or call an AI model. */
export function buildCryptoWatchCandidates(input: CryptoWatchCandidateInput): readonly WatchCandidate[] {
  const t = copy[input.language]
  const limit = clamp(Math.trunc(input.limit ?? 5), 1, 10)
  const crypto = input.instruments.filter((item) => item.marketId === 'upbit' || item.marketId.startsWith('binance'))
  const preferred = crypto.filter((item) => item.marketId === 'upbit' && item.quoteCurrency === 'KRW')
  const pool = preferred.length >= limit ? preferred : crypto
  const orderedVolume = [...pool].filter((item) => finite(item.volume24h)).sort((a, b) => b.volume24h - a.volume24h)
  const volumeRank = new Map(orderedVolume.map((item, index) => [item.id, index]))

  return pool.map((instrument) => {
    const missing = !finite(instrument.lastPrice) || !finite(instrument.change24hPercent) || !finite(instrument.volume24h)
    const change = finite(instrument.change24hPercent) ? instrument.change24hPercent : 0
    const absoluteChange = Math.abs(change)
    const momentum = change > 0 && absoluteChange <= 8 ? Math.round(15 + Math.min(change / 8, 1) * 10) : change > 0 ? 12 : change > -3 ? 8 : 4
    const rank = volumeRank.get(instrument.id)
    const volume = rank === undefined || pool.length === 0 ? 0 : Math.round(8 + (1 - rank / Math.max(1, pool.length - 1)) * 17)
    const context = instrument.symbol.startsWith('BTC/') ? 15 : 11
    const news = newsEvidence(instrument, input.newsResult, input.language)
    const scenario = missing ? 0 : 10
    const penalty = missing ? 20 : absoluteChange >= 15 ? 20 : absoluteChange >= 10 ? 12 : absoluteChange > 8 ? 6 : 0
    const score = clamp(momentum + volume + context + news.points + scenario - penalty, 0, 100)
    const evidence: WatchCandidateBreakdown[] = [
      { type: 'momentum', label: t.momentum, score: momentum, maxScore: 25, summary: change > 0 && absoluteChange <= 8 ? t.positiveMomentum : t.neutralMomentum, status: momentum >= 15 ? 'positive' : 'neutral' },
      { type: 'volume', label: t.volume, score: volume, maxScore: 25, summary: t.volumeRank, status: volume >= 17 ? 'positive' : volume ? 'neutral' : 'missing' },
      { type: 'marketContext', label: t.context, score: context, maxScore: 15, summary: t.contextReady, status: 'positive' },
      news.item,
      { type: 'scenario', label: t.scenario, score: scenario, maxScore: 10, summary: missing ? t.scenarioMissing : t.scenarioReady, status: missing ? 'missing' : 'positive' },
      { type: 'risk', label: t.risk, score: -penalty, maxScore: 0, summary: missing ? t.riskMissing : penalty ? t.riskExtreme : t.riskNormal, status: penalty ? 'risk' : 'neutral' },
    ]
    return {
      id: `crypto-watch-${instrument.id}`, instrumentId: instrument.id, symbol: instrument.displaySymbol ?? instrument.symbol, name: instrument.name,
      assetType: 'crypto' as const, rank: 0, watchScore: score, scoreLabel: scoreLabel(score, missing), summary: t.summary, watchReason: t.reason,
      evidence, riskSummary: evidence.at(-1)?.summary ?? t.riskNormal, invalidationSummary: t.invalidation, nextWatchPoints: t.next,
      newsEvidence: news.evidence, disclaimer: t.disclaimer,
    }
  }).sort((a, b) => b.watchScore - a.watchScore || b.evidence[1].score - a.evidence[1].score || a.symbol.localeCompare(b.symbol))
    .slice(0, limit).map((candidate, index) => ({ ...candidate, rank: index + 1 }))
}

export function getWatchScoreLabel(label: WatchCandidateScoreLabel, language: Language): string {
  return copy[language].labels[label]
}
