import { fireEvent, render, screen, within } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppRoutes } from '@/app/AppRoutes'
import { ModeSwitcher } from '@/components/mode/ModeSwitcher/ModeSwitcher'
import { AppProviders } from '@/app/providers/AppProviders'
import { saveCandidateSnapshotRecord } from '@/services/candidateSnapshot/candidateSnapshotStorage'
import { getDailyBasisTime, getLocalDateLabel } from '@/services/candidateSnapshot/dailyBasisTime'
import { saveDailyBucketSnapshot } from '@/services/candidateSnapshot/dailyBucketSnapshotStorage'
import type { CandidateSnapshot } from '@/types/candidateSnapshot'
import type { MarketInstrument, MarketVenue } from '@/types/market'
import { renderWithProviders } from '@/test/renderWithProviders'
import { MyAnalysisPage } from './MyAnalysisPage'
import { PORTFOLIO_KEY, readPortfolio, writePortfolio } from '@/services/portfolio/portfolioStorage'

const catalogMockState = vi.hoisted(() => ({ failedVenue: null as string | null }))
const technicalMockState = vi.hoisted(() => ({ isLoading: false }))

const instruments: MarketInstrument[] = [
  { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', koreanName: '비트코인', englishName: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 2, volume24h: 1000 },
  { id: 'krx-005930', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', symbol: '005930', name: 'Samsung Electronics', koreanName: '삼성전자', englishName: 'Samsung Electronics', quoteCurrency: 'KRW', lastPrice: 70000, change24hPercent: 1, volume24h: 5000 },
  { id: 'us-aapl', marketId: 'us-stock', marketType: 'nasdaq', providerType: 'mock-us', symbol: 'AAPL', name: 'Apple', englishName: 'Apple', quoteCurrency: 'USD', lastPrice: 230, change24hPercent: -1, volume24h: 6000 },
  { id: 'binance-spot-btcusdt', marketId: 'binance-spot', marketType: 'binance-spot', providerType: 'binance-spot', symbol: 'BTCUSDT', name: 'Bitcoin / Tether', englishName: 'Bitcoin / Tether', quoteCurrency: 'USDT', lastPrice: 95000, change24hPercent: -9, volume24h: 9000 },
]

const candidateSnapshot = (expiresAt = '2099-09-26T00:00:00Z'): CandidateSnapshot => ({ schemaVersion: 1, snapshotId: 'snapshot-1', generatedAt: '2026-09-25T00:00:00Z', expiresAt, engineVersion: 'v1', catalogSource: 'live', providerLabel: 'Upbit KRW · short', items: [{ instrumentId: 'upbit-btc', symbol: 'BTC/KRW', displayName: 'Bitcoin', assetType: 'crypto', marketId: 'upbit', quoteCurrency: 'KRW', order: 1, basisPrice: 90, basisChange24hPercent: 1, basisVolume24h: 1000, basisMovementBand: 'Limited', interestStage: 'first', actionStatus: 'watchZone', clarity: 'medium', reasonText: 'Recorded reason', ruleBasis: [{ key: 'dataQuality', label: 'Data quality', value: 'Live' }], dataQuality: 'live', newsState: 'Unavailable', disclosureCount: 0, latestDisclosureAt: null }] })

vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: (venue: MarketVenue) => ({ catalog: catalogMockState.failedVenue === venue ? null : { venue, source: venue === 'upbit-krw' ? 'live' : 'mock', fetchedAt: 0, instruments: instruments.filter((item) => item.marketType === venue) }, loading: false, error: catalogMockState.failedVenue === venue ? 'Catalog failed' : null, loadingMilliseconds: 0 }) }))
vi.mock('@/hooks/useDartDisclosures', () => ({ useDartDisclosures: (stockCode: string | null) => stockCode ? { status: 'mapping_unavailable', sourceMode: 'disabled', message: 'Mapping unavailable.', disclosures: [], fetchedAt: null } : { status: 'unavailable', sourceMode: 'disabled', message: 'Korean stocks only.', disclosures: [], fetchedAt: null } }))
vi.mock('@/hooks/useDominance', () => ({ useDominance: () => ({ data: null, loading: false, error: true }) }))
vi.mock('@/hooks/useTechnicalLevelData', () => ({
  useTechnicalLevelData: (instrument: MarketInstrument | null) => ({
    candles: instrument ? Array.from({ length: 60 }, (_, index) => {
      const close = instrument.lastPrice * (0.96 + Math.sin(index / 3) * 0.02)
      return { timestamp: 1_700_000_000_000 + index * 86_400_000, open: close * 0.998, high: close * 1.03, low: close * 0.97, close, volume: 100 + index }
    }) : [],
    currentPrice: instrument?.lastPrice ?? null,
    dataQuality: instrument ? instrument.providerType?.startsWith('mock') ? 'mock' : 'live' : 'unavailable',
    connectionStatus: instrument ? instrument.providerType?.startsWith('mock') ? 'mock' : 'live' : 'idle',
    isLoading: technicalMockState.isLoading,
  }),
}))

describe('MyAnalysisPage', () => {
  it('preserves the asset, personal inputs and selected tab across global simple and expert mode changes', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc']}><AppRoutes /></MemoryRouter></AppProviders>)
    await screen.findByRole('heading', { name:'BTC/KRW' })
    fireEvent.click(screen.getByRole('tab', { name:'My price criteria' }))
    fireEvent.change(screen.getByRole('spinbutton', { name:'Average price (optional)' }), { target:{ value:'85' } })
    fireEvent.change(screen.getByRole('textbox', { name:'My note (optional)' }), { target:{ value:'Keep this context' } })
    fireEvent.click(screen.getByRole('button', { name:/Expert Mode/ }))
    expect(screen.getByRole('complementary', { name:'Application sidebar' })).toBeTruthy()
    expect(screen.getByRole('tab', { name:'My price criteria' }).getAttribute('aria-selected')).toBe('true')
    expect((screen.getByRole('spinbutton', { name:'Average price (optional)' }) as HTMLInputElement).value).toBe('85')
    fireEvent.click(screen.getByRole('button', { name:/Simple Mode/ }))
    expect(screen.queryByRole('complementary', { name:'Application sidebar' })).toBeNull()
    expect(screen.getByRole('heading', { name:'BTC/KRW' })).toBeTruthy()
    expect((screen.getByRole('textbox', { name:'My note (optional)' }) as HTMLTextAreaElement).value).toBe('Keep this context')
    expect(readPortfolio().positions).toHaveLength(0)
  })
  it('restores the selected asset, tab and draft after leaving through the menu, while explicit links take priority', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc']}>
      <nav><Link to="/away">Leave</Link><Link to="/my-analysis">Return to analysis</Link><Link to="/my-analysis?instrumentId=binance-spot-btcusdt">Another asset</Link></nav>
      <Routes><Route path="/my-analysis" element={<MyAnalysisPage />} /><Route path="/away" element={<p>Another page</p>} /></Routes>
    </MemoryRouter></AppProviders>)
    await screen.findByRole('heading', { name: 'BTC/KRW' })
    fireEvent.click(screen.getByRole('tab', { name: 'My price criteria' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Average price (optional)' }), { target: { value: '85' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'My note (optional)' }), { target: { value: 'My draft stays here' } })
    fireEvent.click(screen.getByRole('link', { name: 'Leave' }))
    expect(await screen.findByText('Another page')).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Return to analysis' }))
    expect(await screen.findByRole('heading', { name: 'BTC/KRW' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'My price criteria' }).getAttribute('aria-selected')).toBe('true')
    expect((screen.getByRole('spinbutton', { name: 'Average price (optional)' }) as HTMLInputElement).value).toBe('85')
    expect((screen.getByRole('textbox', { name: 'My note (optional)' }) as HTMLTextAreaElement).value).toBe('My draft stays here')
    expect(readPortfolio().positions).toHaveLength(0)
    fireEvent.click(screen.getByRole('link', { name: 'Another asset' }))
    expect(await screen.findByRole('heading', { name: 'BTCUSDT' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Summary' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('button', { name: 'Considering a buy' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('keeps personal inputs across tabs and resets the view when selecting a different coin', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc']}><AppRoutes /></MemoryRouter></AppProviders>)
    await screen.findByRole('heading', { name: 'BTC/KRW' })
    expect(screen.getByText('Change or search instrument').closest('details')?.open).toBe(false)
    expect(screen.queryByRole('textbox', { name: 'My note (optional)' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'My price criteria' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'My note (optional)' }), { target: { value: 'Keep my draft' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Average price (optional)' }), { target: { value: '90' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Summary' }))
    expect(screen.getByRole('button', { name: 'Already holding' }).getAttribute('aria-pressed')).toBe('true')
    expect(readPortfolio().positions).toHaveLength(0)
    expect(screen.queryByRole('spinbutton')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'My price criteria' }))
    expect((screen.getByRole('textbox', { name: 'My note (optional)' }) as HTMLTextAreaElement).value).toBe('Keep my draft')
    expect((screen.getByRole('spinbutton', { name: 'Average price (optional)' }) as HTMLInputElement).value).toBe('90')
    fireEvent.click(screen.getByText('Change or search instrument'))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search instrument' }), { target: { value: 'BTCUSDT' } })
    fireEvent.click(screen.getByRole('button', { name: /BTCUSDT/ }))
    expect(screen.getByRole('tab', { name: 'Summary' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('button', { name: 'Considering a buy' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Change or search instrument').closest('details')?.open).toBe(false)
    fireEvent.click(screen.getByRole('tab', { name: 'My price criteria' }))
    expect((screen.getByRole('spinbutton', { name: 'Average price (optional)' }) as HTMLInputElement).value).toBe('')
  })
  it('applies saved average price and clears it when selecting another asset', async () => {
    writePortfolio([{ id: 'p1', exchange: 'upbit', venue: 'upbit-krw', instrumentId: 'upbit-btc', symbol: 'BTC/KRW', quoteCurrency: 'KRW', averagePrice: 80, quantity: 2, targetPrice: 120, stopPrice: 70 }], null)
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc&positionId=p1']}><AppRoutes /></MemoryRouter></AppProviders>)
    await screen.findByRole('heading', { level: 1, name: 'BTC/KRW' })
    fireEvent.click(screen.getByRole('tab', { name: 'My price criteria' }))
    expect((screen.getByRole('spinbutton', { name: 'Average price (optional)' }) as HTMLInputElement).value).toBe('80')
    expect(screen.getByText(/Saved average price applied/)).toBeTruthy()
    const plan = screen.getByRole('region', { name: 'My investment criteria' })
    expect(within(plan).getByText('120 KRW')).toBeTruthy()
    expect(plan.textContent).toContain('Saved quantity 2')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Average price (optional)' }), { target: { value: '95' } })
    expect(readPortfolio().positions[0].averagePrice).toBe(80)
    fireEvent.click(screen.getByText('Change or search instrument'))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search instrument' }), { target: { value: 'Apple' } })
    fireEvent.click(screen.getByRole('button', { name: /AAPL/ }))
    fireEvent.click(screen.getByRole('button', { name: 'My holding' }))
    expect((screen.getByRole('spinbutton', { name: 'Average price (optional)' }) as HTMLInputElement).value).toBe('')
    expect(screen.queryByRole('region', { name: 'My investment criteria' })).toBeNull()
  })
  it('removes the saved plan when its position is deleted in another tab', async () => {
    const saved = writePortfolio([{ id: 'p1', exchange: 'upbit', venue: 'upbit-krw', instrumentId: 'upbit-btc', symbol: 'BTC/KRW', quoteCurrency: 'KRW', averagePrice: 80, quantity: 2, targetPrice: 120 }], null)
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc&positionId=p1']}><AppRoutes /></MemoryRouter></AppProviders>)
    await screen.findByRole('heading', { name: 'BTC/KRW' })
    fireEvent.click(screen.getByRole('tab', { name: 'My price criteria' }))
    expect(screen.getByRole('region', { name: 'My investment criteria' })).toBeTruthy()
    writePortfolio([], saved.raw)
    fireEvent(window, new StorageEvent('storage', { key: PORTFOLIO_KEY }))
    expect(screen.queryByRole('region', { name: 'My investment criteria' })).toBeNull()
    expect(screen.getByText(/Saved position not found/)).toBeTruthy()
  })
  it('uses one crypto conclusion and removes competing current-state cards in expert view', () => {
    window.localStorage.setItem('market-copilot.displayMode.v1', 'expert')
    renderWithProviders(<><ModeSwitcher /><MyAnalysisPage /></>)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search instrument' }), { target: { value: 'Bitcoin' } })
    fireEvent.click(screen.getByRole('button', { name: /BTC\/KRW/ }))
    expect(screen.getAllByRole('region', { name: 'Direction and price plan' })).toHaveLength(1)
    for (const name of ['Review summary', 'Decision-support information', 'Review ranges', 'Action readiness', 'Interest stage', 'Review mode']) expect(screen.queryByRole('region', { name })).toBeNull()
    expect(screen.queryByText('Approach review range')).toBeNull()
    expect(screen.getByText('Baseline records and further references').closest('details')?.open).toBe(false)
    fireEvent.click(screen.getByRole('tab', { name: 'Evidence' }))
    fireEvent.click(screen.getByText('Baseline records and further references'))
    expect(screen.getByRole('region', { name: 'Analysis baseline locked' })).toBeTruthy()
    fireEvent.click(screen.getByText('Daily chart structure (reference)'))
    expect(screen.getByRole('region', { name: 'Chart structure analysis' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Simple Mode/ }))
    expect(screen.getAllByRole('region', { name: 'Direction and price plan' })).toHaveLength(1)
    expect(screen.queryByRole('region', { name: 'Current action status' })).toBeNull()
  })
  afterEach(() => vi.useRealTimers())

  beforeEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); catalogMockState.failedVenue = null; technicalMockState.isLoading = false })

  it('offers a focused stock summary and preserves personal inputs in the full expert analysis', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'Instrument Analysis' })).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search instrument' }), { target: { value: 'Samsung' } })
    fireEvent.click(screen.getByRole('button', { name: /005930/ }))
    expect(screen.getByRole('heading', { name: '005930' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Rule basis' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Chart structure analysis' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'My holding' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'My note (optional)' }), { target: { value: 'Personal review note' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Average price (optional)' }), { target: { value: '68000' } })
    expect(screen.getByRole('region', { name: 'Position review' }).textContent).toContain('68,000 KRW')
    fireEvent.click(screen.getByRole('button', { name: /Expert Mode/ }))
    expect(screen.getByRole('region', { name: 'Review summary' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Rule basis' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Chart structure analysis' }).getAttribute('data-display-mode')).toBe('expert')
    expect(screen.getByRole('region', { name: 'Chart overlays' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Your inputs' }).textContent).toContain('Personal review note')
    fireEvent.click(screen.getByRole('button', { name: /Simple Mode/ }))
    fireEvent.click(screen.getByRole('button', { name: 'My holding' }))
    expect((screen.getByRole('spinbutton', { name: 'Average price (optional)' }) as HTMLInputElement).value).toBe('68000')
  })

  it('filters loaded search results by Crypto, Korea, and US without new provider calls', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis']}><AppRoutes /></MemoryRouter></AppProviders>)
    const search = await screen.findByRole('searchbox', { name: 'Search instrument' })
    fireEvent.change(search, { target: { value: 'Bitcoin' } })
    expect(screen.getByRole('button', { name: /BTC\/KRW/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Crypto' }))
    expect(screen.getByRole('button', { name: /BTC\/KRW/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Korea' }))
    fireEvent.change(search, { target: { value: 'Samsung' } })
    expect(screen.getByRole('button', { name: /005930/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'US' }))
    fireEvent.change(search, { target: { value: 'Apple' } })
    expect(screen.getByRole('button', { name: /AAPL/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /BTC\/KRW/ })).toBeNull()
  })

  it('supports direct crypto links, bilingual navigation and optional holding input without duplicate conclusions', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'BTC/KRW' })).toBeTruthy()
    expect(screen.getByText('Opened from Market workspace.')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Direction and price plan' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Review summary' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Disclosure review' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'My price criteria' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Average price (optional)' }), { target: { value: '90' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'ko' } })
    expect(screen.getByRole('link', { name: '궁금한 종목 분석' })).toBeTruthy()
    expect(screen.getByRole('region', { name: '지금의 방향과 가격 계획' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: '액션 준비도' })).toBeNull()
    expect(screen.queryByRole('region', { name: '분석 요약' })).toBeNull()
    expect((screen.getByRole('spinbutton', { name: '내 평단가 (선택)' }) as HTMLInputElement).value).toBe('90')
    expect(screen.getByRole('button', { name: '요약 복사' })).toBeTruthy()
  })

  it('labels unavailable analysis as a data issue and keeps optional chart references accessible', async () => {
    technicalMockState.isLoading = true
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'BTC/KRW' })).toBeTruthy()
    expect(screen.getByText('Preparing analysis')).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'Analysis data readiness' }).getAttribute('value')).toBe('0')
    expect(screen.getByText(/This is a data issue/)).toBeTruthy()
    expect(screen.queryByText('Wait for direction before a new entry')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Review summary' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Evidence' }))
    fireEvent.click(screen.getByText('Baseline records and further references'))
    fireEvent.click(screen.getByText('Daily chart structure (reference)'))
    const technical = screen.getByRole('region', { name: 'Chart structure analysis' })
    expect(within(technical).getByRole('status').textContent).toContain('Calculating chart structure')
  })

  it('resolves a Binance Market link through the existing catalog', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=binance-spot-btcusdt']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'BTCUSDT' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText(/Mock \/ demo data/)).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/strong buy|buy signal|sell signal|entry price|stop loss|target price|guaranteed profit|profit expected/i)
  })

  it('opens from a candidate snapshot and initializes the analysis baseline', async () => {
    saveCandidateSnapshotRecord(candidateSnapshot())
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc&snapshotId=snapshot-1&snapshotItemId=upbit-btc']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByText('Opened from a candidate snapshot record.')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Evidence' }))
    fireEvent.click(screen.getByText('Baseline records and further references'))
    const baseline = screen.getByRole('region', { name: 'Analysis baseline locked' })
    expect(baseline.textContent).toContain('90 KRW')
    expect(baseline.textContent).toContain('Observation start')
  })

  it('opens from today’s daily bucket record without mixing personal context', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-03T03:00:00Z'))
    const basis = getDailyBasisTime(new Date())
    const original = candidateSnapshot()
    saveDailyBucketSnapshot({ schemaVersion: 1, snapshotId: 'daily-upbit', tradingDate: basis.tradingDateLabel, bucketId: 'upbit', basisTimeLabel: '08:00', generatedAt: basis.currentDailyBasisAt, basisAt: basis.currentDailyBasisAt, expiresAt: basis.nextDailyBasisAt, itemLimit: 5, items: original.items })
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc&bucketId=upbit&snapshotId=daily-upbit']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByText('Opened from today’s interest candidate record.')).toBeTruthy()
    expect(screen.getByText('Bitcoin market flow is shown as context for crypto candidate review.')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Evidence' }))
    fireEvent.click(screen.getByText('Baseline records and further references'))
    expect(screen.getByRole('region', { name: 'Analysis baseline locked' }).textContent).toContain('90 KRW')
    fireEvent.click(screen.getByRole('tab', { name: 'My price criteria' }))
    expect((screen.getByRole('textbox', { name: 'My note (optional)' }) as HTMLTextAreaElement).value).toBe('')
    expect((screen.getByRole('spinbutton', { name: 'Average price (optional)' }) as HTMLInputElement).value).toBe('')
  })

  it('keeps a previous daily record available with an explicit handoff note', async () => {
    const basis = getDailyBasisTime(new Date())
    const previousBasis = new Date(Date.parse(basis.currentDailyBasisAt) - 24 * 60 * 60 * 1000)
    const original = candidateSnapshot()
    saveDailyBucketSnapshot({ schemaVersion: 1, snapshotId: 'daily-upbit-previous', tradingDate: getLocalDateLabel(previousBasis), bucketId: 'upbit', basisTimeLabel: '08:00', generatedAt: previousBasis.toISOString(), basisAt: previousBasis.toISOString(), expiresAt: basis.currentDailyBasisAt, itemLimit: 5, items: original.items })
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc&bucketId=upbit&snapshotId=daily-upbit-previous']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByText('Opened from a previous daily candidate record. Current data may differ.')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Evidence' }))
    fireEvent.click(screen.getByText('Baseline records and further references'))
    expect(screen.getByRole('region', { name: 'Analysis baseline locked' }).textContent).toContain('90 KRW')
  })

  it('keeps an expired snapshot as historical basis and shows a clear warning', async () => {
    saveCandidateSnapshotRecord(candidateSnapshot('2020-01-01T00:00:00Z'))
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc&snapshotId=snapshot-1&snapshotItemId=upbit-btc']}><AppRoutes /></MemoryRouter></AppProviders>)
    const notice = await screen.findByText('Opened from an expired snapshot record. Current data may differ.')
    expect(notice.getAttribute('data-snapshot-state')).toBe('expired')
    fireEvent.click(screen.getByRole('tab', { name: 'Evidence' }))
    fireEvent.click(screen.getByText('Baseline records and further references'))
    const baseline = screen.getByRole('region', { name: 'Analysis baseline locked' })
    expect(baseline.textContent).toContain('90 KRW')
    expect(baseline.textContent).toContain('Observation start')
  })

  it('falls back to current data when a snapshot record is missing', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc&snapshotId=missing']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByText('Snapshot record was not found, so current data is used.')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Evidence' }))
    fireEvent.click(screen.getByText('Baseline records and further references'))
    const baseline = screen.getByRole('region', { name: 'Analysis baseline locked' })
    expect(baseline.textContent).toContain('100 KRW')
  })

  it('does not show disclosure review for a US stock', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=us-aapl']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'AAPL' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Disclosure review' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Recent DART disclosures' })).toBeNull()
  })

  it('surfaces a venue failure while keeping loaded catalogs searchable', async () => {
    catalogMockState.failedVenue = 'binance-futures'
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=missing-instrument']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect((await screen.findByRole('status', { name: 'Catalog limitation' })).textContent).toContain('Some market catalogs could not be loaded. Search results may be incomplete.')
    expect(screen.getByRole('alert').textContent).toContain('The requested instrument is not available in the loaded catalogs.')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search instrument' }), { target: { value: 'Samsung' } })
    expect(screen.getByRole('button', { name: /005930/ })).toBeTruthy()
  })
})
