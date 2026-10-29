import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalysisFrame, AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { MarketInstrument } from '@/types/market'
import { CryptoDecisionPanel } from './CryptoDecisionPanel'

const state = vi.hoisted(() => ({ overrides: {} as Partial<Record<AnalysisFrame, AnalysisSeries>>, trend: 1, quality: 'live' as 'live' | 'mock', dominance: null as null | { point: { percent: number; at: number; marketChange: number }; previous: { percent: number; at: number; marketChange: number } | null } }))
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
vi.mock('@/hooks/useTechnicalLevelData', () => ({ useTechnicalLevelData: (_: unknown, frame: AnalysisFrame) => state.overrides[frame] ?? candles(frame) }))
vi.mock('@/hooks/useDominance', () => ({ useDominance: () => ({ data: state.dominance, loading: false, error: !state.dominance }) }))

describe('CryptoDecisionPanel', () => {
  it('shows the same conclusion and price plan when switching to the expert chart workspace', () => {
    const props = { instrument, daily: candles('1D'), language: 'en' as const }
    const { rerender } = render(<CryptoDecisionPanel {...props} />)
    const summary = screen.getByRole('tabpanel')
    expect(within(summary).getAllByText('274.5 – 277.5 KRW')[0]).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Expert analysis workspace' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Wait for a lower price before adding' })).toBeTruthy()
    rerender(<CryptoDecisionPanel {...props} expert />)
    expect(within(screen.getByRole('tabpanel')).getAllByText('274.5 – 277.5 KRW')[0]).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Wait for a lower price before adding' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Expert analysis workspace' })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Verified closes/ })).toBeTruthy()
    act(() => vi.advanceTimersByTime(100000))
    expect(screen.queryByRole('img', { name: /Verified closes/ })).toBeNull()
    expect(screen.getByText('The chart appears when valid price history is ready.')).toBeTruthy()
  })
  it('opens expert mode on request and calculates holding P/L only with a fresh quote and quantity', () => {
    const onExpert = vi.fn()
    const props = { instrument, daily: candles('1D'), language:'en' as const, holding:true, averagePrice:280, quantity:2, onExpert }
    const { rerender } = render(<CryptoDecisionPanel {...props} />)
    expect(within(screen.getByRole('tabpanel')).getByText('-2 KRW')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name:'View chart and calculations →' }))
    expect(onExpert).toHaveBeenCalledOnce()
    rerender(<CryptoDecisionPanel {...props} quantity={undefined} />)
    expect(within(screen.getByRole('tabpanel')).queryByText('-2 KRW')).toBeNull()
    rerender(<CryptoDecisionPanel {...props} />)
    act(() => vi.advanceTimersByTime(100000))
    expect(within(screen.getByRole('tabpanel')).queryByText('-2 KRW')).toBeNull()
  })
  it('keeps the excluded timeframe visible alongside a valid two-frame analysis', () => {
    const daily = candles('1D')
    render(<CryptoDecisionPanel instrument={instrument} daily={{ ...daily, candles: daily.candles.filter((_, i) => i !== 65) }} language="ko" />)
    expect(screen.getByText('상승 쪽이 강해요')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '자세히 보기' }))
    expect(screen.getByRole('list', { name: '시간대 확인' }).textContent).toContain('원본 봉 공백 · 분석 제외')
    expect(screen.getByText(/누락 구간은 임의로 채우지 않습니다/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '자세히 보기' }))
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
    fireEvent.keyDown(screen.getByRole('tab', { name: 'My price criteria' }), { key: 'Home' })
    expect(draft.closest('[hidden]')).not.toBeNull()
    fireEvent.keyDown(summary, { key: 'ArrowLeft' })
    expect((screen.getAllByRole('spinbutton')[0] as HTMLInputElement).value).toBe('272')
  })
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); state.trend = 1; state.quality = 'live'; state.dominance = null; state.overrides = {} })
  afterEach(() => vi.useRealTimers())
  it('gives a direction, price zones and holding impact even if dominance is unavailable', () => {
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="ko" averagePrice={280} quantity={2} />)
    expect(screen.getByText('상승 쪽이 강해요')).toBeTruthy()
    expect(screen.getByText('지금 따라 사기보다 가격이 내려오길 기다려보세요')).toBeTruthy()
    expect(within(screen.getByRole('tabpanel')).getAllByText('274.5 – 277.5 KRW')[0]).toBeTruthy()
    expect(within(screen.getByRole('tabpanel')).getByText('270 KRW')).toBeTruthy()
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    fireEvent.click(screen.getByRole('tab', { name: '내 평단가·가격 기준' }))
    expect(within(screen.getByRole('tabpanel')).getByText('주의 가격에서 예상 손익: -20 KRW')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '자세히 보기' }))
    expect(screen.getByText('시간대별 지표·계산 근거').closest('details')?.open).toBe(false)
    expect(screen.getByText('큰 체결·비트코인 도미넌스').closest('details')?.open).toBe(false)
    fireEvent.click(screen.getByRole('tab', { name: '자세히 보기' }))
    fireEvent.click(screen.getByText('큰 체결·비트코인 도미넌스'))
    expect(screen.getByText(/도미넌스 연결 불가/)).toBeTruthy()
    expect(screen.queryByText(/판단 부족/)).toBeNull()
  })
  it('gives a buyer conditional waiting guidance during a downtrend and retains the full evidence', () => {
    state.trend = -1
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="ko" />)
    expect(screen.getByText('하락 쪽이 강해요')).toBeTruthy()
    expect(screen.getByText('새로 사기보다 하락이 멈추는지 기다려보세요')).toBeTruthy()
    expect(within(screen.getByRole('tabpanel')).getByText(/지지 가격에 닿았다는 이유만으로 매수하지 않습니다/)).toBeTruthy()
    expect(screen.getByText(/저항 기준 가격:/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '자세히 보기' }))
    fireEvent.click(screen.getByText('시간대별 지표·계산 근거'))
    expect(within(screen.getByRole('tabpanel')).getByText('상승 돌파 확인선')).toBeTruthy()
  })
  it('separates bearish support, resistance and upside reassessment, preserving the holding downside threshold', () => {
    state.trend = -1
    const props = { instrument, daily: candles('1D'), language: 'ko' as const }
    const view = render(<CryptoDecisionPanel {...props} />)
    const summary = within(screen.getByRole('tabpanel'))
    const support = within(summary.getByRole('article', { name: '지지 구간' }))
    const resistance = within(summary.getByRole('article', { name: '저항 구간' }))
    const upside = within(summary.getByRole('article', { name: '상승 돌파 확인선' }))
    expect(support.getByText('118.5 – 121 KRW')).toBeTruthy()
    expect(resistance.getByText('122.5 – 125.5 KRW')).toBeTruthy()
    expect(resistance.getByText(/기준 가격: 124 KRW/)).toBeTruthy()
    expect(upside.getByText('127 KRW')).toBeTruthy()
    expect(upside.getByText(/4시간봉이 이 가격 위에서 마감/)).toBeTruthy()
    expect(summary.queryByText('반등 시 살펴볼 가격')).toBeNull()
    view.rerender(<CryptoDecisionPanel {...props} holding />)
    const downside = within(within(screen.getByRole('tabpanel')).getByRole('article', { name: '추가 하락 주의선' }))
    expect(downside.getByText('114 KRW')).toBeTruthy()
    expect(downside.getByText(/4시간봉이 이 가격 아래에서 마감/)).toBeTruthy()
  })
  it('withdraws prices and direction when the previously live quote becomes stale', () => {
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="en" />)
    expect(screen.getByText('Leaning upward')).toBeTruthy()
    act(() => vi.advanceTimersByTime(100000))
    expect(screen.queryByText('Leaning upward')).toBeNull()
    expect(screen.queryByText('Support zone')).toBeNull()
    expect(screen.getByText(/This is a data issue/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Evidence' }))
    const status = screen.getByRole('list', { name: 'Timeframes available' })
    expect(status.textContent?.match(/Stale quotes/g)).toHaveLength(3)
    expect(screen.getByText('Preparing analysis')).toBeTruthy()
    expect(screen.queryByText('Wait for direction before a new entry')).toBeNull()
  })

  it('shows actual readiness while holding, distinguishes history from quotes, and keeps partial results', () => {
    const waiting: AnalysisSeries = { candles: [], currentPrice: null, dataQuality: 'unavailable', connectionStatus: 'connecting', updatedAt: null }
    state.overrides = { '1H': waiting, '4H': waiting }
    const props = { instrument, language: 'ko' as const, holding: true, onHoldingChange: vi.fn(), averagePrice: 280 }
    const { rerender } = render(<CryptoDecisionPanel {...props} daily={waiting} />)
    expect(screen.getByRole('button', { name: '이미 갖고 있어요' }).getAttribute('aria-pressed')).toBe('true')
    const percent = () => screen.getByRole('progressbar', { name: '분석 자료 준비율' }).getAttribute('value')
    expect(percent()).toBe('0')
    expect(screen.getByText('분석 준비 중')).toBeTruthy()
    expect(screen.queryByText('분석 자료를 불러오고 있어요')).toBeNull()
    const withHistory = { ...candles('1H'), connectionStatus: 'connecting' }
    state.overrides['1H'] = withHistory
    rerender(<CryptoDecisionPanel {...props} daily={waiting} />)
    expect(screen.getByText('실시간 시세 연결 중')).toBeTruthy()
    expect(percent()).toBe('0')
    delete state.overrides['1H']
    rerender(<CryptoDecisionPanel {...props} daily={waiting} />)
    expect(percent()).toBe('33')
    expect(screen.queryByText('상승 쪽이 강해요')).toBeNull()
    delete state.overrides['4H']
    rerender(<CryptoDecisionPanel {...props} daily={waiting} />)
    expect(percent()).toBe('67')
    expect(screen.getByText('상승 쪽이 강해요')).toBeTruthy()
    expect(screen.getByText('분석 가능 · 나머지 자료 확인 중')).toBeTruthy()
    rerender(<CryptoDecisionPanel {...props} daily={candles('1D')} />)
    expect(percent()).toBe('100')
    expect(screen.getByText('분석 준비 완료')).toBeTruthy()
    expect(screen.queryByText(/초 경과/)).toBeNull()
  })

  it('does not invent progress with time and exposes slow and delayed states until recovery', () => {
    const waiting: AnalysisSeries = { candles: [], currentPrice: null, dataQuality: 'unavailable', connectionStatus: 'connecting', updatedAt: null }
    state.overrides = { '1H': waiting, '4H': waiting }
    const { rerender, unmount } = render(<CryptoDecisionPanel instrument={instrument} daily={waiting} language="ko" />)
    act(() => vi.advanceTimersByTime(15_000))
    expect(screen.getByText('분석 준비가 늦어지고 있어요')).toBeTruthy()
    expect(screen.getByText('15초 경과')).toBeTruthy()
    act(() => vi.advanceTimersByTime(30_000))
    expect(screen.getByText('시세 응답이 지연되고 있어요')).toBeTruthy()
    expect(screen.getByRole('button', { name: '페이지 새로고침' })).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('0')
    state.overrides = {}
    rerender(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="ko" />)
    expect(screen.getByText('분석 준비 완료')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '페이지 새로고침' })).toBeNull()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports insufficient history as a settled data problem, not ongoing analysis or 100%', () => {
    state.overrides = { '1H': { ...candles('1H'), candles: [] }, '4H': { ...candles('4H'), candles: [] } }
    render(<CryptoDecisionPanel instrument={instrument} daily={{ ...candles('1D'), candles: [] }} language="ko" />)
    expect(screen.getByText('지금은 분석할 자료가 부족해요')).toBeTruthy()
    expect(screen.getAllByText('가격 기록 부족')).toHaveLength(3)
    expect(screen.queryByText(/초 경과/)).toBeNull()
    act(() => vi.advanceTimersByTime(45_000))
    expect(screen.queryByText('시세 응답이 지연되고 있어요')).toBeNull()
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('0')
    fireEvent.click(screen.getByRole('button', { name: '연결·자료 상태 자세히 보기' }))
    expect(screen.getByRole('tab', { name: '자세히 보기' }).getAttribute('aria-selected')).toBe('true')
  })

  it('clears the previous instrument wait time and never claims mock readiness', () => {
    const waiting: AnalysisSeries = { candles: [], currentPrice: null, dataQuality: 'unavailable', connectionStatus: 'reconnecting', updatedAt: null }
    state.overrides = { '1H': waiting, '4H': waiting }
    const { rerender } = render(<CryptoDecisionPanel instrument={instrument} daily={waiting} language="en" />)
    act(() => vi.advanceTimersByTime(45_000))
    expect(screen.getByText('Market data is delayed')).toBeTruthy()
    rerender(<CryptoDecisionPanel instrument={{ ...instrument, id: 'upbit-eth', symbol: 'ETH/KRW' }} daily={waiting} language="en" />)
    expect(screen.getByText('0s elapsed')).toBeTruthy()
    expect(screen.queryByText('Market data is delayed')).toBeNull()
    state.quality = 'mock'; state.overrides = {}
    rerender(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="en" />)
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByText('You are viewing example data')).toBeTruthy()
  })
  it('never presents mock data as a live price plan', () => {
    state.quality = 'mock'
    render(<CryptoDecisionPanel instrument={instrument} daily={candles('1D')} language="ko" />)
    expect(screen.queryByText('상승 쪽이 강해요')).toBeNull()
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
    fireEvent.click(screen.getByRole('tab', { name: '자세히 보기' }))
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
      expect(copied).toContain('Leaning upward')
      expect(copied).toContain('Support zone: 274.5 – 277.5 KRW')
      expect(copied).toContain('Downside risk threshold: 270 KRW')
      expect(copied).not.toContain('987.65')
      expect(copied).not.toContain('Your holding basis')
      expect(copied).not.toContain('Approach review range')
      expect(screen.getByText('Copied')).toBeTruthy()
    } finally { vi.unstubAllGlobals() }
  })
})
