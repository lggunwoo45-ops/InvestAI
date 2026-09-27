import type { Language } from '@/i18n/translations'
import { buildCandidateReviewScore, type CandidateReviewScore } from '@/services/candidateScore/candidateReviewScore'
import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import type { NewsLoadResult } from '@/services/news/newsService'
import { buildPracticalDecision } from '@/services/practicalDecision/practicalDecisionModel'
import { buildReviewRanges } from '@/services/practicalDecision/reviewRangeModel'
import type { MarketInstrument } from '@/types/market'
import type { MarketBucketId } from '@/types/marketBucket'
import type { AnalysisDataQuality } from '@/types/myAnalysis'
import type { PracticalDecisionResult } from '@/types/practicalDecision'

export type BitcoinMarketAnchorStatus = 'ready' | 'unavailable' | 'limited'

export interface BitcoinMarketAnchor {
  status: BitcoinMarketAnchorStatus
  instrumentId: string | null
  symbol: string
  marketBucket: Extract<MarketBucketId, 'upbit' | 'binance'>
  currentPrice: number | null
  change24hPercent: number | null
  volume24h: number | null
  practicalDecision: PracticalDecisionResult
  reviewScore: CandidateReviewScore
  summary: string
  caution: string
  dataQuality: AnalysisDataQuality
}

export interface BitcoinMarketAnchorInput {
  marketBucket: Extract<MarketBucketId, 'upbit' | 'binance'>
  instruments: readonly MarketInstrument[]
  catalogSource: 'live' | 'mock' | null
  newsResult: NewsLoadResult | null
  language: Language
}

const copy = {
  en: {
    available: 'Bitcoin context is available for the current crypto market review.',
    limited: 'Bitcoin context is available with limited or demo data.',
    unavailable: 'BTC anchor data could not be found. Crypto candidates can still be reviewed, but market-anchor context is limited.',
    caution: 'If BTC is unstable, alt candidate review should be treated more conservatively.',
  },
  ko: {
    available: '현재 코인 시장 검토를 위한 비트코인 기준 흐름을 확인할 수 있습니다.',
    limited: '제한되거나 모의 데이터로 비트코인 기준 흐름을 표시합니다.',
    unavailable: 'BTC 기준 데이터를 찾을 수 없습니다. 코인 후보는 계속 확인할 수 있지만, 시장 기준 정보는 제한됩니다.',
    caution: 'BTC 흐름이 불안정하면 알트 후보 검토도 보수적으로 봐야 합니다.',
  },
} as const

function normalize(value: string | undefined) {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function normalizedSymbols(instrument: MarketInstrument) {
  return [instrument.symbol, instrument.displaySymbol, instrument.providerSymbol, instrument.id].filter(Boolean).map((value) => normalize(String(value)))
}

function anchorMatchScore(instrument: MarketInstrument, bucket: BitcoinMarketAnchorInput['marketBucket']) {
  const quote = bucket === 'upbit' ? 'KRW' : 'USDT'
  const symbols = normalizedSymbols(instrument)
  const venue = normalize([instrument.marketId, instrument.providerType, instrument.marketType, instrument.id].filter(Boolean).join(' '))
  const providerMatches = venue.includes(bucket === 'upbit' ? 'UPBIT' : 'BINANCE')
  const quoteMatches = normalize(instrument.quoteCurrency) === quote || symbols.some((symbol) => symbol.includes(quote))
  const exactPair = symbols.some((symbol) => symbol === `BTC${quote}` || symbol === `${quote}BTC`)
  const bitcoinMatches = exactPair || symbols.some((symbol) => symbol.includes('BTC'))

  if (!providerMatches || !quoteMatches || !bitcoinMatches) return null

  let score = exactPair ? 100 : 20
  if (normalize(instrument.quoteCurrency) === quote) score += 20
  if (bucket === 'upbit' && normalize(instrument.marketType) === 'UPBITKRW') score += 30
  if (bucket === 'binance' && normalize(instrument.marketType) === 'BINANCESPOT') score += 30
  if (bucket === 'binance' && normalize(instrument.marketType) === 'BINANCEFUTURES') score += 10
  if (Number.isFinite(instrument.lastPrice) && instrument.lastPrice > 0) score += 5
  return score
}

function findAnchorInstrument(bucket: BitcoinMarketAnchorInput['marketBucket'], instruments: readonly MarketInstrument[]) {
  return instruments
    .map((instrument) => ({ instrument, score: anchorMatchScore(instrument, bucket) }))
    .filter((entry): entry is { instrument: MarketInstrument; score: number } => entry.score !== null)
    .sort((left, right) => right.score - left.score)[0]?.instrument ?? null
}

function unavailableDecision(language: Language, bucket: BitcoinMarketAnchorInput['marketBucket']) {
  return buildPracticalDecision({ language, horizon: 'swing', dataQuality: 'unavailable', actionStatus: 'decisionPending', source: 'analysis', reason: bucket })
}

export function buildBitcoinMarketAnchor(input: BitcoinMarketAnchorInput): BitcoinMarketAnchor {
  const t = copy[input.language]
  const symbol = input.marketBucket === 'upbit' ? 'BTC/KRW' : 'BTC/USDT'
  const instrument = findAnchorInstrument(input.marketBucket, input.instruments)
  if (!instrument || !Number.isFinite(instrument.lastPrice) || instrument.lastPrice <= 0) {
    const practicalDecision = unavailableDecision(input.language, input.marketBucket)
    const reviewScore = buildCandidateReviewScore({ language: input.language, dataQuality: 'unavailable', practicalDecisionState: practicalDecision.state, clarity: 'low', hasReviewRanges: false, freshness: 'priceUnavailable', evidenceCount: 0, missingEvidenceCount: 1, hasNewsEvidence: false, hasDisclosureEvidence: false })
    return { status: 'unavailable', instrumentId: null, symbol, marketBucket: input.marketBucket, currentPrice: null, change24hPercent: null, volume24h: null, practicalDecision, reviewScore, summary: t.unavailable, caution: t.caution, dataQuality: 'unavailable' }
  }

  const analysis = buildMyInstrumentAnalysis({ instrument, intent: 'watching', userNote: '', averagePrice: null, catalogSource: input.catalogSource, newsResult: input.newsResult, language: input.language })
  const movementBand = analysis.actionReadiness.ruleBasis.find((item) => item.key === 'movementBand')?.value ?? null
  const practicalDecision = buildPracticalDecision({ language: input.language, horizon: 'swing', dataQuality: analysis.dataQuality, actionStatus: analysis.actionReadiness.status, movementBand, source: 'analysis', reason: analysis.actionReadiness.whyThisStatus, nextCheck: analysis.reviewChecklist[0] ?? analysis.actionReadiness.nextChecks[0] })
  const ranges = buildReviewRanges({ language: input.language, horizon: 'swing', dataQuality: analysis.dataQuality, anchorPrice: instrument.lastPrice, source: 'current' })
  const reviewScore = buildCandidateReviewScore({ language: input.language, dataQuality: analysis.dataQuality, practicalDecisionState: practicalDecision.state, clarity: analysis.actionReadiness.strength, hasReviewRanges: ranges.length > 0, freshness: 'basisHeld', evidenceCount: analysis.evidence.length, missingEvidenceCount: analysis.missingEvidence.length, hasNewsEvidence: analysis.evidence.some((entry) => entry.type === 'news' || entry.type === 'market'), hasDisclosureEvidence: false })
  const status: BitcoinMarketAnchorStatus = analysis.dataQuality === 'live' && practicalDecision.state !== 'unavailable' && reviewScore.score !== null ? 'ready' : 'limited'
  return { status, instrumentId: instrument.id, symbol: instrument.displaySymbol ?? instrument.symbol, marketBucket: input.marketBucket, currentPrice: instrument.lastPrice, change24hPercent: Number.isFinite(instrument.change24hPercent) ? instrument.change24hPercent : null, volume24h: Number.isFinite(instrument.volume24h) ? instrument.volume24h : null, practicalDecision, reviewScore, summary: status === 'ready' ? t.available : t.limited, caution: t.caution, dataQuality: analysis.dataQuality }
}
