import { describe, expect, it } from 'vitest'
import { buildTechnicalLevelAnalysis } from '@/services/technicalLevels/technicalLevelEngine'
import type { MarketInstrument } from '@/types/market'
import { buildEvidenceCandidateRecommendation as build, selectEvidenceCandidates, type RecommendationInput } from './evidenceCandidateRecommendation'

const instrument: MarketInstrument = { id: 'test', marketId: 'upbit', symbol: 'TEST/KRW', name: 'Test', lastPrice: 100, change24hPercent: 2, volume24h: 10000, quoteCurrency: 'KRW' }
const candles = Array.from({ length: 60 }, (_, i) => ({ timestamp: 1700000000000 + i * 86400000, open: 98, close: 98, high: 110, low: 90, volume: 100 }))
const technical = buildTechnicalLevelAnalysis({ instrument, candles, language: 'ko', dataQuality: 'live' })
const reviewScore = { score: 75, level: 'strong' as const, label: 'Strong', summary: '', factors: [], cautions: [] }
const fixture: RecommendationInput = { instrument, candles, technicalAnalysis: { ...technical, movingAverageContext: { ...technical.movingAverageContext, pricePosition: 'above' } }, language: 'ko', dataQuality: 'live', reviewScore, btcAnchorContext: 'stable' }
const withChange = (change24hPercent: number): RecommendationInput => ({ ...fixture, instrument: { ...instrument, change24hPercent } })

describe('evidence candidate recommendation', () => {
  it('identifies constructive independent evidence', () => { expect(build(fixture).recommendationState).toBe('approachReviewPossible') })
  it('keeps mixed evidence under review without requiring Practical Decision', () => { expect(build({ ...withChange(0), reviewScore: { ...reviewScore, score: 60 } }).title).toBe('관심 유지') })
  it('identifies extended movement', () => { expect(build(withChange(10)).title).toBe('이미 움직임 큼') })
  it('explains weak momentum', () => { expect(build(withChange(-3))).toMatchObject({ title: '관망', why: expect.stringContaining('모멘텀 약함') }) })
  it('names missing price and series', () => {
    expect(build({ instrument: { ...instrument, lastPrice: NaN, change24hPercent: NaN, volume24h: NaN }, language: 'ko', dataQuality: 'limited' })).toMatchObject({ title: '데이터 부족', why: expect.stringContaining('현재 가격') })
  })
  it.each([0, -1])('excludes invalid price %s', (lastPrice) => { expect(build({ ...fixture, instrument: { ...instrument, lastPrice } }).title).toBe('추천 제외') })
  it('caps crypto with volatile BTC without blocking stocks', () => {
    expect(build({ ...fixture, btcAnchorContext: 'volatilityWatch' }).recommendationState).toBe('held')
    expect(build({ ...fixture, instrument: { ...instrument, marketId: 'us-stock' }, btcAnchorContext: 'volatilityWatch' }).recommendationState).toBe('approachReviewPossible')
  })
  it('keeps mock and limited data explicit and never promotes them to approach', () => {
    for (const dataQuality of ['mock', 'limited'] as const) expect(build({ ...fixture, dataQuality })).toMatchObject({ recommendationState: 'keepWatching', dataQuality })
    expect(build({ ...fixture, dataQuality: 'mock' }).summary).toContain('모의 데이터')
  })
  it('excludes unavailable quality and severe market pressure', () => {
    expect(build({ ...fixture, dataQuality: 'unavailable' }).recommendationState).toBe('excluded')
    expect(build({ ...fixture, marketBriefDirection: 'downsidePressure' }).exclusionReasons).toContain('시장 하방 주의')
  })
  it('preserves change and holding review', () => {
    expect(build({ ...fixture, freshness: 'expired' }).title).toBe('변화 확인 필요')
    expect(build({ ...fixture, positionReviewActive: true }).title).toBe('보유 기준 재확인')
  })
  it('does not fabricate technical structure, a score or timestamp from quote data', () => {
    const item = build({ instrument, language: 'ko', dataQuality: 'live' })
    expect(item.recommendationState).toBe('keepWatching')
    expect(item.reviewScore).toBeUndefined()
    expect(item.updatedAt).toBeNull()
    expect(item.evidenceFactors.some((factor) => factor.key === 'structure')).toBe(false)
  })
  it('does not promote price alone when movement, candles and volume are missing', () => {
    const item = build({ instrument: { ...instrument, change24hPercent: NaN, volume24h: NaN }, language: 'ko', dataQuality: 'live' })
    expect(item.recommendationState).toBe('notEnoughData')
    expect(item.why).toContain('거래량 확인 필요')
  })
  it('excludes genuinely low live review scores but preserves mock score limitations', () => {
    expect(build({ ...fixture, reviewScore: { ...reviewScore, score: 20 } }).recommendationState).toBe('excluded')
    expect(build({ ...fixture, dataQuality: 'mock', reviewScore: { ...reviewScore, score: 20 } }).recommendationState).toBe('keepWatching')
  })
  it('sorts by usable state then existing score and excludes secondary items from the main list', () => {
    const good = build(fixture), mixed = build({ ...withChange(0), reviewScore: { ...reviewScore, score: 60 } }), excluded = build({ ...fixture, instrument: { ...instrument, lastPrice: 0 } })
    expect(selectEvidenceCandidates([excluded, mixed, good]).recommended).toEqual([good, mixed])
    expect(selectEvidenceCandidates([excluded, mixed, good]).secondary).toEqual([excluded])
  })
  it('is deterministic and adds no forbidden wording in either language', () => {
    const forbidden = /매수|매도|진입가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i
    for (const language of ['ko', 'en'] as const) for (const change of [-10, -3, 0, 2, 10]) {
      const input = { ...withChange(change), language }
      expect(build(input)).toEqual(build(input))
      expect(JSON.stringify(build(input))).not.toMatch(forbidden)
    }
  })
})
