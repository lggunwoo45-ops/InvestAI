import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsPage } from './SettingsPage'
import { marketDataService } from '@/services/market/marketDataService'
import { notificationPreference } from '@/services/scenarios/browserNotifications'
const mock = vi.hoisted(() => ({ display: vi.fn(), language: vi.fn(), mode: vi.fn(), refresh: vi.fn() }))
vi.mock('@/i18n/useLanguage', () => ({ useLanguage: () => ({ language: 'ko', setLanguage: mock.language }) }))
vi.mock('@/app/displayMode/useDisplayMode', () => ({ useDisplayMode: () => ({ displayMode: 'simple', setDisplayMode: mock.display }) }))
vi.mock('@/hooks/useMarketWorkspace', () => ({ useMarketWorkspace: () => ({ marketDataMode: 'live', setMarketDataMode: mock.mode }) }))
vi.mock('@/hooks/useNewsProviderMode', () => ({ useNewsProviderMode: () => ({ result: null, refresh: mock.refresh }) }))
const permission = vi.fn()
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); vi.stubGlobal('Notification', { permission: 'default', requestPermission: permission }) })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
describe('working settings', () => {
  it('changes the actual providers and checks connections only on request', async () => {
    const catalog = vi.spyOn(marketDataService, 'getMarketCatalog').mockResolvedValue({ venue: 'upbit-krw', source: 'live', fetchedAt: Date.now(), instruments: [{ id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'BTC', quoteCurrency: 'KRW', lastPrice: 1, change24hPercent: 0, volume24h: 1 }] })
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    expect(catalog).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(permission).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('설명 수준'), { target: { value: 'expert' } })
    fireEvent.change(screen.getByLabelText('시세 모드'), { target: { value: 'mock' } })
    fireEvent.click(screen.getByRole('button', { name: '뉴스 다시 불러오기' }))
    expect(mock.display).toHaveBeenCalledWith('expert'); expect(mock.mode).toHaveBeenCalledWith('mock'); expect(mock.refresh).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '업비트 연결 확인' }))
    expect(await screen.findByText(/업비트 연결 확인 · 1개 종목/)).toBeTruthy()
    expect(catalog.mock.calls[0].slice(0, 3)).toEqual(['upbit-krw', 'live', true])
  })
  it('requires an explicit permission grant before storing notification opt-in', async () => {
    permission.mockResolvedValueOnce('denied').mockResolvedValueOnce('granted')
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: '브라우저 알림 허용' }))
    expect(await screen.findByText(/브라우저에서 알림을 허용해야/)).toBeTruthy()
    expect(notificationPreference().enabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '브라우저 알림 허용' }))
    await waitFor(() => expect(notificationPreference().enabled).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: '브라우저 알림 끄기' }))
    expect(notificationPreference().enabled).toBe(false)
  })
})
