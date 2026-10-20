import { act, fireEvent, render, screen, within } from '@testing-library/react'
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
  it('keeps the excluded timeframe visible alongside a valid two-frame analysis', () => {
    const daily = candles('1D')
    render(<CryptoDecisionPanel instrument={instrument} daily={{ ...daily, candles: daily.candles.filter((_, i) => i !== 65) }} language="ko" />)
    expect(screen.getByText('매수 우세')).toBeTruthy()
    expect(screen.getByRole('list', { name: '시간대 확인' }).textContent).toContain('원본 봉 공백 · 분석 제외')
    expect(screen.getByText(/누락 구간은 임의로 채우지 않습니다/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '상세 근거' }))
    fireEvent.click(screen.getByText('시간대별 지표·계산 근거'))
    expect(screen.getByText(/원본 데이터가 없는 구간:/)).toBeTruthy()
  })
  it('explains initial rate-limit waiting separately from reconnecting', () => {
    const daily = { ...candles('1D'), dataQuality: 'unavailable' as const, connectionStatus: 'connecting', candles: [] }
    const { rerender } = render(<CryptoDecisionPanel instrument={instrument} daily={daily} language="ko" />)
    expect(screen.getByText(/업비트 요청 제한에 맞춰/)).toBeTruthy()
    rerender(<CryptoDecisionPanel instrument={instrument} daily={{ ...daily, connectionStatus: 'reconnecting' }} language="ko" />)
    expect(screen.queryByText(/업비트 요청 제한에 맞춰/)).toBeNull()
    expect(screen.getByText(/시세 연결을 복구하고 있습니다/)).toBeTruthy()
  })
  it('supports keyboard tabs and preserves a scenario draft while keeping inactive views out of navigation', () => {
    window.localStorage.clear()
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="en" />)
    const summary = screen.getByRole('tab', { name: 'Summary' })
    expect(summary.getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    expect(screen.queryByRole('region', { name: 'Key evidence' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save this analysis as a scenario' })).toBeNull()
    fireEvent.keyDown(summary, { key: 'ArrowRight' })
    const evidence = screen.getByRole('tab', { name: 'Evidence' })
    expect(document.activeElement).toBe(evidence)
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(evidence.id)
    expect(screen.getByRole('region', { name: 'Key evidence' })).toBeTruthy()
    fireEvent.keyDown(evidence, { key: 'End' })
    fireEvent.click(screen.getByRole('button', { name: 'Save this analysis as a scenario' }))
    const draft = screen.getAllByRole('spinbutton')[0] as HTMLInputElement
    fireEvent.change(draft, { target: { value: '272' } })
    fireEvent.keyDown(screen.getByRole('tab', { name: 'My investment' }), { key: 'Home' })
    expect(screen.queryByRole('spinbutton')).toBeNull()
    fireEvent.keyDown(summary, { key: 'ArrowLeft' })
    expect((screen.getAllByRole('spinbutton')[0] as HTMLInputElement).value).toBe('272')
  })
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); state.trend = 1; state.quality = 'live'; state.dominance = null })
  afterEach(() => vi.useRealTimers())
  it('gives a direction, price zones and holding impact even if dominance is unavailable', () => {
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="ko" averagePrice={280} quantity={2} />)
    expect(screen.getByText('매수 우세')).toBeTruthy()
    expect(screen.getByText('추격보다 눌림 구간 대기')).toBeTruthy()
    expect(screen.getByText('274.5 – 277.5 KRW')).toBeTruthy()
    expect(screen.getByText('270 KRW')).toBeTruthy()
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    fireEvent.click(screen.getByRole('tab', { name: '내 투자' }))
    expect(within(screen.getByRole('tabpanel')).getByText('가정 해제 가격에서 평가손익: -20 KRW')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '상세 근거' }))
    expect(screen.getByText('시간대별 지표·계산 근거').closest('details')?.open).toBe(false)
    expect(screen.getByText('큰 체결·비트코인 도미넌스').closest('details')?.open).toBe(false)
    fireEvent.click(screen.getByRole('tab', { name: '상세 근거' }))
    fireEvent.click(screen.getByText('큰 체결·비트코인 도미넌스'))
    expect(screen.getByText(/도미넌스 연결 불가/)).toBeTruthy()
    expect(screen.queryByText(/판단 부족/)).toBeNull()
  })
  it('explains reducing into resistance during a downtrend instead of encouraging a support touch buy', () => {
    state.trend = -1
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="ko" />)
    expect(screen.getByText('매도 우세')).toBeTruthy()
    expect(screen.getByText('추가 매수보다 반등 시 축소 검토')).toBeTruthy()
    expect(screen.getByText(/지지 가격에 닿았다는 이유만으로 매수하지 않습니다/)).toBeTruthy()
    expect(screen.getByText('반등 매도 검토 기준')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '상세 근거' }))
    fireEvent.click(screen.getByText('시간대별 지표·계산 근거'))
    expect(screen.getByText('매도 우세 재검토 기준')).toBeTruthy()
  })
  it('withdraws prices and direction when the previously live quote becomes stale', () => {
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="en" />)
    expect(screen.getByText('Buy-side bias')).toBeTruthy()
    act(() => vi.advanceTimersByTime(100000))
    expect(screen.queryByText('Buy-side bias')).toBeNull()
    expect(screen.queryByText('Entry watch zone')).toBeNull()
    const status = screen.getByRole('list', { name: 'Timeframes available' })
    expect(status.textContent?.match(/Stale quotes/g)).toHaveLength(3)
    expect(screen.getByText('Checking analysis data')).toBeTruthy()
    expect(screen.queryByText('Wait for direction before a new entry')).toBeNull()
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
    fireEvent.click(screen.getByRole('tab', { name: '상세 근거' }))
    fireEvent.click(screen.getByText('큰 체결·비트코인 도미넌스'))
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
  it('keeps expert evidence collapsed and copies the same price plan without personal inputs', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    try {
      render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="en" expert averagePrice={987.65} quantity={2} />)
      expect(screen.getByText('Timeframe indicators and calculations').closest('details')?.open).toBe(false)
      expect(screen.getByText('Large executions and Bitcoin dominance').closest('details')?.open).toBe(false)
      expect(screen.queryByRole('region', { name: 'Key evidence' })).toBeNull()
      fireEvent.click(screen.getByRole('tab', { name: 'Evidence' }))
      expect(within(screen.getByRole('region', { name: 'Key evidence' })).getAllByRole('definition')).toHaveLength(3)
      fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }))
      await act(async () => {})
      const copied = writeText.mock.calls[0][0]
      expect(copied).toContain('Buy-side bias')
      expect(copied).toContain('Entry watch zone: 274.5 – 277.5 KRW')
      expect(copied).toContain('Long thesis invalidation: 270 KRW')
      expect(copied).not.toContain('987.65')
      expect(copied).not.toContain('Your holding basis')
      expect(copied).not.toContain('Approach review range')
      expect(screen.getByText('Copied')).toBeTruthy()
    } finally { vi.unstubAllGlobals() }
  })
})
