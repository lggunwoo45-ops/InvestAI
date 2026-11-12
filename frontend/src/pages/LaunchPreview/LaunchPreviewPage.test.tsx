import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren } from 'react'
import type { AnalysisFrame } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { analysisIntervals } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { MarketInstrument } from '@/types/market'
import { App } from '@/app/App'
import { LaunchPreviewPage } from './LaunchPreviewPage'

const state = vi.hoisted(() => ({ stale: false, missing: false, language: 'ko', cloudMounted: vi.fn() }))
const instruments: MarketInstrument[] = [
  { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', koreanName: '비트코인', quoteCurrency: 'KRW', lastPrice: 279, volume24h: 1000, change24hPercent: 1 },
  { id: 'upbit-eth', marketId: 'upbit', symbol: 'ETH/KRW', name: 'Ethereum', koreanName: '이더리움', quoteCurrency: 'KRW', lastPrice: 279, volume24h: 500, change24hPercent: 1 },
]
vi.mock('@/i18n/useLanguage', () => ({ useLanguage: () => ({ language: state.language }) }))
vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: () => ({ catalog: state.missing ? null : { source: 'live', instruments }, loading: false, error: state.missing ? 'offline' : null }) }))
vi.mock('@/hooks/useTechnicalLevelData', () => ({ useTechnicalLevelData: (instrument: MarketInstrument | null, frame: AnalysisFrame) => {
  const now = Date.now(), interval = analysisIntervals[frame], end = Math.floor(now / interval) * interval
  return { dataQuality: instrument ? 'live' : 'unavailable', connectionStatus: instrument ? 'live' : 'idle', currentPrice: instrument ? 279 : null, updatedAt: state.stale ? now - 100_000 : now, isLoading: false, recentTrades: [], candles: instrument ? Array.from({ length: 80 }, (_, index) => ({ timestamp: end - (80 - index) * interval, open: 200 + index, close: 200 + index, high: 203 + index, low: 197 + index, volume: 100 })) : [] }
} }))
vi.mock('@/components/cloud/CloudBoundary', () => ({ CloudBoundary: ({ children }: PropsWithChildren) => { state.cloudMounted(); return children } }))

describe('Customer plan launch preview', () => {
  beforeEach(() => { state.stale = false; state.missing = false; state.language = 'ko'; state.cloudMounted.mockClear(); localStorage.clear() })
  afterEach(() => { vi.restoreAllMocks(); window.history.replaceState({}, '', '/') })
  const mount = (entry = '/preview?plan=free') => render(<MemoryRouter initialEntries={[entry]}><LaunchPreviewPage /></MemoryRouter>)

  it('switches ad visibility and AI access while keeping the selected asset and real preferences unchanged', () => {
    localStorage.setItem('market-copilot.displayMode.v1', 'expert')
    localStorage.setItem('account-test-record', 'original')
    const network = vi.spyOn(globalThis, 'fetch')
    mount()
    expect(screen.getByRole('complementary', { name: '광고 위치 예시' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /AI 리포트 화면 예시 열기/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'ETH' }))
    fireEvent.click(screen.getByRole('button', { name: '프리미엄 화면' }))
    expect(screen.getByRole('heading', { name: '이더리움' })).toBeTruthy()
    expect(screen.queryByRole('complementary', { name: '광고 위치 예시' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /AI 리포트 화면 예시 열기/ }))
    expect(screen.getByText('AI 미연결 · 규칙 기반 예시')).toBeTruthy()
    expect(screen.getByText('예시 0 / 100회')).toBeTruthy()
    expect(network).not.toHaveBeenCalled()
    expect(localStorage.getItem('market-copilot.displayMode.v1')).toBe('expert')
    expect(localStorage.getItem('account-test-record')).toBe('original')
  })

  it('keeps report snapshots tied to their asset and hides them when switching back to free', () => {
    mount('/preview?plan=premium')
    fireEvent.click(screen.getByRole('button', { name: /AI 리포트 화면 예시 열기/ }))
    expect(screen.getByRole('heading', { name: /BTC\/KRW.*흐름과 가격 기준 리포트/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '무료 화면' }))
    expect(screen.queryByText('AI 미연결 · 규칙 기반 예시')).toBeNull()
    expect(screen.getByRole('heading', { name: 'AI 리포트는 프리미엄에서' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '프리미엄 화면' }))
    fireEvent.click(screen.getByRole('button', { name: 'ETH' }))
    fireEvent.click(within(screen.getByRole('navigation', { name: '미리보기 메뉴' })).getByRole('button', { name: /AI 리포트/ }))
    expect(screen.queryByRole('heading', { name: /BTC\/KRW.*흐름과 가격 기준 리포트/ })).toBeNull()
    expect(screen.getByRole('heading', { name: '내 종목의 설명을 한 편으로' })).toBeTruthy()
  })

  it('does not manufacture price levels or a report from stale or missing data', () => {
    state.stale = true
    const { unmount } = mount('/preview?plan=premium')
    expect(screen.getByRole('button', { name: /AI 리포트 화면 예시 열기/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/유효한 시간대 2개 이상과 최신 시세가 확보되면/)).toBeTruthy()
    expect(screen.queryByRole('img', { name: '실제 완료 봉 종가 차트' })).toBeNull()
    unmount(); state.missing = true; mount('/preview?plan=premium')
    expect(screen.getByText('종목 목록을 불러오지 못했어요')).toBeTruthy()
    expect(screen.getByRole('button', { name: /AI 리포트 화면 예시 열기/ }).hasAttribute('disabled')).toBe(true)
  })

  it('lets users try watchlisting without writing account or browser records', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    const { unmount } = mount()
    fireEvent.click(screen.getByRole('button', { name: '☆ 관심종목' }))
    fireEvent.click(within(screen.getByRole('navigation', { name: '미리보기 메뉴' })).getByRole('button', { name: '관심종목' }))
    expect(screen.getByRole('button', { name: /비트코인\s*BTC\/KRW\s*분석 보기/ })).toBeTruthy()
    expect(storage).not.toHaveBeenCalled()
    unmount(); mount('/preview?view=watchlist')
    expect(screen.getByRole('heading', { name: '관심 있는 코인부터 담아보세요' })).toBeTruthy()
  })

  it('supports direct links and the agreed three prices without a purchase action', () => {
    mount('/preview?plan=unknown&view=plans')
    expect(screen.getByRole('button', { name: '무료 화면' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('4,900')).toBeTruthy()
    expect(screen.getByText('14,900')).toBeTruthy()
    expect(screen.getByText(/현재는 판매 전이며, 체험 버튼은 화면만 바꿉니다/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /결제하기|구독하기/ })).toBeNull()
  })

  it('finds Korean coin names even when the live catalog only supplies symbols', () => {
    const original = instruments[0]
    instruments[0] = { ...original, name: 'BTC', koreanName: undefined, englishName: undefined }
    try {
      mount()
      fireEvent.change(screen.getByRole('searchbox', { name: '종목 검색' }), { target: { value: '비트코인' } })
      fireEvent.click(screen.getByRole('button', { name: /BTC\s*BTC\/KRW/ }))
      expect(screen.getByRole('heading', { name: 'BTC' })).toBeTruthy()
      expect(screen.getByRole('searchbox', { name: '종목 검색' }).getAttribute('value')).toBe('')
    } finally { instruments[0] = original }
  })

  it('direct public preview entry never mounts account initialization or synchronization', async () => {
    window.history.replaceState({}, '', '/preview?plan=premium')
    render(<App />)
    expect(await screen.findByRole('button', { name: '프리미엄 화면' })).toBeTruthy()
    expect(state.cloudMounted).not.toHaveBeenCalled()
  })
})
