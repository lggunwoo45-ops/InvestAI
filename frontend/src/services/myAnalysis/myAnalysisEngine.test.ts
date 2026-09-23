import { describe, expect, it } from 'vitest'

import type { NewsLoadResult } from '@/services/news/newsService'
import type { MarketInstrument } from '@/types/market'
import { buildMyInstrumentAnalysis } from './myAnalysisEngine'

const crypto: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', providerSymbol: 'KRW-BTC', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 2, volume24h: 10_000 }
const stock: MarketInstrument = { id: 'krx-005930', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', providerSymbol: '005930', symbol: '005930', name: 'Samsung Electronics', quoteCurrency: 'KRW', lastPrice: 70_000, change24hPercent: 1, volume24h: 1_000_000 }
const base = { userNote: '', averagePrice: null, newsResult: null, language: 'en' as const }

describe('buildMyInstrumentAnalysis', () => {
  it('is deterministic and keeps simple sections to three app-authored items', () => {
    const input = { ...base, instrument: crypto, intent: 'watching' as const, catalogSource: 'live' as const }
    const first = buildMyInstrumentAnalysis(input)
    expect(buildMyInstrumentAnalysis(input)).toEqual(first)
    expect(first.dataQuality).toBe('live')
    expect(first.simpleModeSections.every((section) => section.items.length <= 3)).toBe(true)
    expect(first.simpleModeSections.find((section) => section.id === 'simple-current')?.items).toContain('24H movement: +2%')
    expect(first.simpleModeSections.find((section) => section.id === 'simple-current')?.items).toContain('Data quality: Live public market data')
    expect(first.simpleModeSections.find((section) => section.id === 'simple-caution')?.items).not.toContain('Large recent move — review volatility before making any decision.')
    expect(first.simpleModeSections.flatMap((section) => section.items).join(' ')).not.toContain('No extreme-move penalty applied')
    expect(first.currentRead).toContain('moderate upward movement')
  })

  it('labels mock crypto values as demo and adds a large-move caution', () => {
    const result = buildMyInstrumentAnalysis({ ...base, instrument: { ...crypto, change24hPercent: -12.4 }, intent: 'shortTerm', catalogSource: 'mock' })
    expect(result.dataQuality).toBe('mock')
    expect(result.evidence.filter((entry) => ['price', 'change', 'volume'].includes(entry.type)).every((entry) => entry.level === 'demo')).toBe(true)
    expect(result.evidence.find((entry) => entry.type === 'price')?.detail).toContain('Simulated market value')
    const cautions = result.simpleModeSections.find((section) => section.id === 'simple-caution')?.items ?? []
    expect(result.simpleModeSections.find((section) => section.id === 'simple-current')?.items).toContain('24H movement: -12.4%')
    expect(cautions).toEqual(expect.arrayContaining(['This is demo data and should not be treated as live market evidence.', 'Large recent movement can reverse quickly. Review volatility before making any decision.', 'Check downside risk and your own decision criteria.']))
    expect(result.currentRead).toContain('large recent move')
  })

  it('keeps stock gaps explicit and separates user context from evidence', () => {
    const result = buildMyInstrumentAnalysis({ ...base, instrument: stock, intent: 'holding', userNote: 'Review after earnings', averagePrice: 68_000, catalogSource: 'mock' })
    expect(result.evidence.find((entry) => entry.type === 'price')?.level).toBe('demo')
    expect(result.missingEvidence.map((entry) => entry.type)).toEqual(expect.arrayContaining(['filing', 'earnings', 'fundamentals', 'ratings']))
    expect(result.userContext).toMatchObject({ intent: 'Holding', userNote: 'Review after earnings', averagePrice: '68,000 KRW' })
    expect(result.evidence.some((entry) => entry.detail.includes('Review after earnings') || entry.detail.includes('68,000'))).toBe(false)
    expect(result.currentRead).toContain('structure preview')
    expect(result.currentRead).toContain('disclosures, earnings, and fundamentals are not connected')
    expect(JSON.stringify(result)).not.toMatch(/gain|loss conclusion|target price|buy now|sell now/i)
  })

  it('produces distinct strong-up, strong-down, and flat current reads', () => {
    const build = (change24hPercent: number) => buildMyInstrumentAnalysis({ ...base, instrument: { ...crypto, change24hPercent }, intent: 'watching', catalogSource: 'live' })
    const strongUp = build(9)
    const strongDown = build(-9)
    const flat = build(0.4)
    expect(strongUp.currentRead).toContain('strong recent movement')
    expect(strongDown.currentRead).toContain('large recent move')
    expect(strongDown.simpleModeSections.find((section) => section.id === 'simple-caution')?.items.join(' ')).toContain('can reverse quickly')
    expect(flat.currentRead).toContain('Recent movement is limited')
    expect(new Set([strongUp.currentRead, strongDown.currentRead, flat.currentRead]).size).toBe(3)
  })

  it('adds review meaning to evidence and explicit gaps for missing core market data', () => {
    const result = buildMyInstrumentAnalysis({ ...base, instrument: { ...crypto, lastPrice: Number.NaN, change24hPercent: Number.NaN, volume24h: Number.NaN }, intent: 'watching', catalogSource: 'live' })
    expect(result.dataQuality).toBe('unavailable')
    expect(result.currentRead).toBe('Core market data is not available for this asset yet.')
    expect(result.evidence).toHaveLength(0)
    expect(result.missingEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'price-missing', level: 'missing', reviewMeaning: expect.stringContaining('should not be inferred') }),
      expect.objectContaining({ id: 'change-missing', level: 'missing' }),
      expect.objectContaining({ id: 'volume-missing', level: 'missing' }),
    ]))
    expect(result.simpleModeSections.flatMap((section) => section.items).join(' ')).not.toContain('Live public market data')
  })

  it('explains why each available evidence item matters for review', () => {
    const result = buildMyInstrumentAnalysis({ ...base, instrument: crypto, intent: 'watching', catalogSource: 'live' })
    expect(result.evidence).not.toHaveLength(0)
    expect(result.evidence.every((entry) => entry.reviewMeaning.length > 0)).toBe(true)
    expect(result.evidence.find((entry) => entry.type === 'price')?.reviewMeaning).toContain('not a valuation judgment')
    expect(result.evidence.find((entry) => entry.type === 'volume')?.reviewMeaning).toContain('reviewed together with price movement')
  })

  it('never mixes an unsafe third-party headline into Simple Mode guidance', () => {
    const newsResult: NewsLoadResult = { requestedMode: 'rss-ready', state: 'rss-ready', source: 'rss', providerLabel: 'Test RSS', lastUpdatedAt: null, error: null, fallback: false, articles: [{ id: 'n1', title: 'Analyst sets $200K target for Bitcoin', summary: 'Source report', source: 'Third Party', publishedAt: '2026-01-01T00:00:00Z', relatedSymbols: ['BTC'], relatedMarkets: ['crypto'], category: 'crypto', sentiment: 'unassessed', importance: 'unassessed', isMock: false }] }
    const result = buildMyInstrumentAnalysis({ ...base, instrument: crypto, intent: 'watching', catalogSource: 'live', newsResult })
    expect(result.simpleModeSections.flatMap((section) => section.items).join(' ')).not.toContain('Analyst sets $200K target for Bitcoin')
    expect(result.evidence.find((entry) => entry.type === 'news')).toMatchObject({ source: 'Test RSS', detail: 'Explicitly related news context is available from Test RSS.' })
  })

  it('changes only safe checklist wording for each review intent in English and Korean', () => {
    const intents = ['watching', 'holding', 'longTerm', 'swing', 'shortTerm'] as const
    const results = intents.map((intent) => buildMyInstrumentAnalysis({ ...base, instrument: crypto, intent, catalogSource: 'live' }))
    const holding = results[1]
    const korean = buildMyInstrumentAnalysis({ ...base, instrument: crypto, intent: 'longTerm', catalogSource: 'live', language: 'ko' })
    expect(new Set(results.map((result) => result.reviewChecklist[0])).size).toBe(5)
    expect(results.map((result) => result.reviewChecklist[0])).toEqual([
      'Check whether new data keeps this asset relevant.',
      'Compare your original reason with currently available evidence.',
      'Wait for connected filings, earnings, and fundamentals before deeper review.',
      'Recheck movement and volume after large changes.',
      'Recheck recent movement and related news context frequently.',
    ])
    expect(holding.reviewChecklist.join(' ')).not.toMatch(/buy|sell|hold advice/i)
    expect(korean.reviewChecklist[0]).toContain('공시·실적·재무')
    expect(korean.userContext.intentNotice).toBe('검토 목적은 체크리스트 문구만 바꾸며 개인 투자 조언을 생성하지 않습니다.')
    expect(korean.expertModeSections.find((section) => section.id === 'checklist')?.title).toBe('검토 체크리스트')
    expect(korean.expertModeSections.flatMap((section) => section.items).join(' ')).not.toMatch(/추천 매수|매수 신호|매도 신호|매수가|손절가|익절가|목표가|수익 보장/)
  })

  it.each([11.2, -11.2])('keeps volatility and general risk cautions for a large %s%% move', (change24hPercent) => {
    const result = buildMyInstrumentAnalysis({ ...base, instrument: { ...crypto, change24hPercent }, intent: 'watching', catalogSource: 'live' })
    const cautions = result.simpleModeSections.find((section) => section.id === 'simple-caution')?.items ?? []
    expect(cautions).toContain('Large recent movement can reverse quickly. Review volatility before making any decision.')
    expect(cautions).toContain('Check downside risk and your own decision criteria.')
  })

  it('does not render reassurance-like Korean risk wording', () => {
    const result = buildMyInstrumentAnalysis({ ...base, instrument: crypto, intent: 'watching', catalogSource: 'live', language: 'ko' })
    const risks = result.simpleModeSections.find((section) => section.id === 'simple-caution')?.items.join(' ') ?? ''
    expect(risks).not.toMatch(/감점 없음|위험 없음|안전|문제 없음/)
    expect(risks).toContain('하방 위험과 본인의 판단 기준을 확인하세요.')
    expect(result.currentRead).toContain('보통 수준의 상승 움직임')
    expect(result.evidence.find((entry) => entry.type === 'price')?.reviewMeaning).toContain('가치평가 판단은 아닙니다')
  })
})
