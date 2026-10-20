import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalysisFrame, AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { MarketInstrument } from '@/types/market'
import { CryptoDecisionPanel } from './CryptoDecisionPanel'

const state = vi.hoisted(() => ({ trend: 1, quality: 'live' as 'live' | 'mock', dominance: null as null | { point: { percent: number; at: number; marketChange: number }; previous: { percent: number; at: number; marketChange: number } | null } }))
const now = Date.parse('2026-10-20T12:00:00Z')
const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 279, change24hPercent: 1, volume24h: 1000 }
function candles(frame: AnalysisFrame): AnalysisSeries {
  const interval = { '1H': 3600000, '4H': 14400000, '1D': 86400000 }[frame]
  const end = Math.floor(now / interval) * interval
  return { dataQuality: state.quality, connectionStatus: 'live', updatedAt: now, currentPrice: 200 + state.trend * 79, candles: Array.from({ length: 80 }, (_, i) => {
    const close = 200 + state.trend * i
    return { timestamp: end - (80 - i) * interval, open: close, close, low: close - 3, high: close + 3, volume: 100 }
  }) }
}
vi.mock('@/hooks/useTechnicalLevelData', () => ({ useTechnicalLevelData: (_: unknown, frame: AnalysisFrame) => candles(frame) }))
vi.mock('@/hooks/useDominance', () => ({ useDominance: () => ({ data: state.dominance, loading: false, error: !state.dominance }) }))

describe('CryptoDecisionPanel', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); state.trend = 1; state.quality = 'live'; state.dominance = null })
  afterEach(() => vi.useRealTimers())
  it('gives a direction, price zones and holding impact even if dominance is unavailable', () => {
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="ko" averagePrice={280} quantity={2} />)
    expect(screen.getByText('매수 우세')).toBeTruthy()
    expect(screen.getByText('추격보다 눌림 구간 대기')).toBeTruthy()
    expect(screen.getByText('274.5 – 277.5 KRW')).toBeTruthy()
    expect(screen.getByText('270 KRW')).toBeTruthy()
    expect(screen.getByText('가정 해제 가격에서 평가손익: -20 KRW')).toBeTruthy()
    expect(screen.getByText(/도미넌스 연결 불가/)).toBeTruthy()
    expect(screen.queryByText(/판단 부족/)).toBeNull()
  })
  it('explains reducing into resistance during a downtrend instead of encouraging a support touch buy', () => {
    state.trend = -1
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="ko" />)
    expect(screen.getByText('매도 우세')).toBeTruthy()
    expect(screen.getByText('추가 매수보다 반등 시 축소 검토')).toBeTruthy()
    expect(screen.getByText(/지지 가격에 닿았다는 이유만으로 매수하지 않습니다/)).toBeTruthy()
    expect(screen.getByText('매도 우세 재검토 기준')).toBeTruthy()
  })
  it('withdraws prices and direction when the previously live quote becomes stale', () => {
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="en" />)
    expect(screen.getByText('Buy-side bias')).toBeTruthy()
    act(() => vi.advanceTimersByTime(100000))
    expect(screen.queryByText('Buy-side bias')).toBeNull()
    expect(screen.queryByText('Entry watch zone')).toBeNull()
    expect(screen.getAllByText('Stale quotes')).toHaveLength(3)
  })
  it('never presents mock data as a live price plan', () => {
    state.quality = 'mock'
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="ko" />)
    expect(screen.queryByText('매수 우세')).toBeNull()
    expect(screen.queryByText('매수 관심 구간')).toBeNull()
    expect(screen.getByText(/모의 시세에서는 실제 매수/)).toBeTruthy()
  })
  it('uses local receipt time for incoming trades between freshness timer ticks', () => {
    const { rerender } = render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="ko" />)
    act(() => vi.advanceTimersByTime(6000))
    const trades = Array.from({ length: 20 }, (_, i) => ({ id: String(i), timestamp: now + 6000, price: 100, amount: i < 5 ? 10 : 1, side: 'buy' as const }))
    rerender(<CryptoDecisionPanel instrument={instrument} daily={{ ...candles('1D'), updatedAt: now + 6000, recentTrades: trades }} language="ko" />)
    expect(screen.getByText('대형 체결 매수 우세')).toBeTruthy()
    expect(screen.getByText('관측 표본: 20 · 대형 체결: 5')).toBeTruthy()
  })
  it('labels actual local dominance observations without inventing a 24h change', () => {
    state.dominance = { point: { percent: 58, at: now, marketChange: -2 }, previous: { percent: 57.5, at: now - 3600000, marketChange: -1 } }
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="ko" />)
    const context = within(screen.getByRole('article', { name: '비트코인 도미넌스' }))
    expect(context.getByText('58.00%')).toBeTruthy()
    expect(context.getByText(/이 브라우저 관측 대비: \+0.50%p/)).toBeTruthy()
    expect(context.getByText(/BTC 비중 상승/)).toBeTruthy()
    expect(context.getByText('전체 시가총액 24시간 변화: -2.00%')).toBeTruthy()
    expect(context.queryByText(/도미넌스 24시간/)).toBeNull()
  })
  it('explains delayed trade feeds instead of endlessly claiming accumulation', () => {
    render(<CryptoDecisionPanel instrument={instrument} daily={{ ...candles('1D'), recentTrades: [{ id: 'old', price: 100, amount: 1, side: 'buy', timestamp: now - 360000 }] }} language="ko" />)
    expect(screen.getByText('체결 갱신 지연 · 우세 판단 보류')).toBeTruthy()
    expect(screen.getByText(/최근 수신 체결 시각:/)).toBeTruthy()
    expect(screen.queryByText('대형 체결 매수 우세')).toBeNull()
  })
})
