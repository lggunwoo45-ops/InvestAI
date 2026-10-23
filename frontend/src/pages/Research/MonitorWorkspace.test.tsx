import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { saveObservation } from '@/services/research/researchJournal'
import { cancelMonitor, readMonitor, registerMonitor, type MonitorState } from '@/services/research/monitorClient'
import { MonitorWorkspace } from './MonitorWorkspace'
import { ModeSwitcher } from '@/components/mode/ModeSwitcher/ModeSwitcher'
vi.mock('@/services/research/monitorClient', () => ({ readMonitor: vi.fn(), registerMonitor: vi.fn(), cancelMonitor: vi.fn() }))
const empty = (): MonitorState => ({ version: 1, running: true, error: null, now: Date.now(), lastCycleAt: Date.now(), intervalMs: 15000, channelConfigured: false, rules: [] })
describe('review to monitor workflow', () => {
  beforeEach(() => {
    localStorage.clear(); vi.resetAllMocks(); vi.mocked(readMonitor).mockResolvedValue(empty())
    saveObservation({ id: 'review-1', asset: 'BTC', at: Date.now(), price: 100, funding: null, interest: null, volatility: null, signals: ['aboveMean'], note: '원래 검토 근거' })
  })
  it('registers exact original source and keeps idempotency key for retry after uncertain response', async () => {
    vi.mocked(registerMonitor).mockRejectedValueOnce(new Error('응답을 받지 못했습니다.')).mockResolvedValue(empty())
    renderWithProviders(<MonitorWorkspace asset="BTC" />)
    await screen.findByText('감시 프로그램 연결됨')
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('목표 가격'), { target: { value: '110' } })
    fireEvent.change(screen.getByLabelText('손절 가격'), { target: { value: '90' } })
    fireEvent.click(screen.getByRole('button', { name: '이 조건으로 서버 감시 등록' }))
    await screen.findByText('응답을 받지 못했습니다.')
    fireEvent.click(screen.getByRole('button', { name: '이 조건으로 서버 감시 등록' }))
    await screen.findByText(/등록했습니다/)
    const calls = vi.mocked(registerMonitor).mock.calls
    expect(calls[0][0]).toEqual(calls[1][0])
    expect(calls[0][0].source.note).toBe('원래 검토 근거')
    expect(calls[0][0].instrument).toEqual({ venue: 'binance-futures', asset: 'BTC', quote: 'USDT' })
    expect(calls[0][0].notify).toBe(false)
  })
  it('shows unavailability and prevents a false successful registration', async () => {
    vi.mocked(readMonitor).mockRejectedValue(new Error('감시 서버 미연결'))
    renderWithProviders(<MonitorWorkspace asset="BTC" />)
    await screen.findByText('감시 서버 미연결')
    expect((screen.getByRole('button', { name: '이 조건으로 서버 감시 등록' }) as HTMLButtonElement).disabled).toBe(true)
    expect(registerMonitor).not.toHaveBeenCalled()
  })
  it('requires explicit termination and preserves record details', async () => {
    const state = empty()
    state.rules = [{ id: 'rule1', config: { requestId: 'a', instrument: { venue: 'upbit', asset: 'BTC', quote: 'KRW' }, source: { kind: 'scenario', id: 's1', revision: 'v1', at: Date.now(), price: 100, note: '근거 원본', signals: [] }, side: 'long', entry: [99, 101], target: 110, stop: 90, horizonHours: 24, costPercent: .1, notify: false }, hash: 'hash1', createdAt: Date.now(), phase: 'waiting', last: null, entered: null, result: null, events: [], issue: null, gaps: 0 }]
    vi.mocked(readMonitor).mockResolvedValue(state); vi.mocked(cancelMonitor).mockResolvedValue(empty())
    renderWithProviders(<MonitorWorkspace asset="BTC" />)
    fireEvent.click(await screen.findByRole('button', { name: '감시 종료' }))
    expect(cancelMonitor).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '종료 확인' }))
    await waitFor(() => expect(cancelMonitor).toHaveBeenCalledWith('rule1'))
  })
  it('preserves direction, period and prices when switching between simple and expert', async () => {
    localStorage.setItem('market-copilot.language', 'ko')
    vi.mocked(registerMonitor).mockResolvedValue(empty())
    renderWithProviders(<><ModeSwitcher /><MonitorWorkspace asset="BTC" /></>)
    await screen.findByText('감시 프로그램 연결됨')
    expect(screen.getByLabelText('감시 방향').closest('details')?.open).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /^전문가모드/ }))
    expect(screen.getByLabelText('감시 방향').closest('details')?.open).toBe(true)
    fireEvent.change(screen.getByLabelText('감시 방향'), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText('대기·진입 후 각각 최대 시간'), { target: { value: '48' } })
    fireEvent.change(screen.getByLabelText('목표 가격'), { target: { value: '90' } })
    fireEvent.change(screen.getByLabelText('손절 가격'), { target: { value: '110' } })
    fireEvent.click(screen.getByRole('button', { name: /^간편모드/ }))
    expect(screen.getByLabelText('감시 방향').closest('details')?.open).toBe(false)
    expect(screen.getByText('방향·기간·비용 설정 · 숏 · 48시간 · 비용 0.1%')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '이 조건으로 서버 감시 등록' }))
    await waitFor(() => expect(registerMonitor).toHaveBeenCalled())
    expect(vi.mocked(registerMonitor).mock.calls[0][0]).toMatchObject({ side: 'short', target: 90, stop: 110, horizonHours: 48 })
  })
})
