import { describe, expect, it } from 'vitest'
import { decisionGuide } from './decisionGuide'
import { buildCryptoDecision, type CryptoDecision, type SeriesIssue } from './cryptoDecisionEngine'

const base: CryptoDecision = { direction: 'buy', action: 'entry', price: 100, coverage: 3, frames: [], mixed: false, extended: false, plan: {
  frame: '4H', entry: [99, 101], resistance: [110, 112], target: 111, stop: 95, sellInvalidation: 115, rewardRisk: 2, targetBasis: 'observed', supportBasis: 'pivot',
} }

describe('plain language decision guide', () => {
  it('keeps entry conditional and changes holding guidance without changing the calculation', () => {
    expect(decisionGuide(base, 'ko').reason).toContain('닿았다는 이유만으로 사는 건 아니에요')
    const bearish = { ...base, direction: 'sell', action: 'reduce' } as const
    const before = JSON.stringify(bearish)
    expect(decisionGuide(bearish, 'ko', false).title).toContain('새로 사기보다')
    expect(decisionGuide(bearish, 'ko', true).title).toContain('보유 위험')
    expect(JSON.stringify(bearish)).toBe(before)
  })
  it.each(['mock', 'loading', 'stale', 'gaps'] as SeriesIssue[])('does not turn %s data into a market instruction or invented price', issue => {
    const empty = { candles: [], currentPrice: null, updatedAt: null, dataQuality: 'unavailable', connectionStatus: 'connecting' } as const
    const unavailable = buildCryptoDecision({ '1H': empty, '4H': empty, '1D': empty }, 1000)
    unavailable.frames = unavailable.frames.map(frame => ({ ...frame, issue }))
    const guide = decisionGuide(unavailable, 'ko')
    expect(guide.reason).toContain('기다리라는 뜻은 아니에요')
    expect(guide.next).toContain('연결 상태')
    expect(JSON.stringify(guide)).not.toMatch(/\d/)
    expect(guide.title).toContain(issue === 'mock' ? '예시' : issue === 'loading' ? '불러오고' : '자료가 부족')
  })
  it('explains waiting conditions and missing levels separately', () => {
    expect(decisionGuide({ ...base, action: 'pullback' }, 'ko').reason).toContain('가격 구간보다 높아요')
    expect(decisionGuide({ ...base, action: 'poorReward' }, 'ko').reason).toContain('손실 위험')
    expect(decisionGuide({ ...base, direction: 'neutral', action: 'wait', plan: null }, 'ko').next).toContain('기록이 부족')
  })
})
