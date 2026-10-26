import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { readMonitor, registerSignalWatch, type MonitorState } from '@/services/research/monitorClient'
import { defaultExplorerConfig } from '@/services/research/signalExplorer'
import { SignalWatchPanel } from './SignalWatchPanel'
vi.mock('@/services/research/monitorClient', () => ({ readMonitor: vi.fn(), registerSignalWatch: vi.fn(), stopSignalWatch: vi.fn() }))
const config = { ...defaultExplorerConfig, funding: 'positive' as const, openInterest: 'rising' as const }
const state = (): MonitorState => ({ version: 1, running: true, error: null, now: 1800000000000, lastCycleAt: null, intervalMs: 15000, channelConfigured: false, derivativeSignalsAvailable: true, rules: [], signals: [] })
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); vi.mocked(readMonitor).mockResolvedValue(state()); vi.mocked(registerSignalWatch).mockResolvedValue(state()) })
it('gates derivative registration on server support while leaving price-only watches usable', async () => {
  vi.mocked(readMonitor).mockResolvedValue({ ...state(), derivativeSignalsAvailable: undefined })
  const view = renderWithProviders(<SignalWatchPanel asset="BTC" config={config} />)
  await screen.findByText(/이 감시 서버에는 파생 지표 저장소가/)
  expect((screen.getByRole('button', { name: '선택한 신호 감시 시작' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '선택한 신호 감시 시작' })); expect(registerSignalWatch).not.toHaveBeenCalled()
  view.rerender(<SignalWatchPanel asset="BTC" config={defaultExplorerConfig} />)
  expect((screen.getByRole('button', { name: '선택한 신호 감시 시작' }) as HTMLButtonElement).disabled).toBe(false)
})
it('preserves both selected conditions and keeps external delivery off unless explicitly selected', async () => {
  renderWithProviders(<SignalWatchPanel asset="BTC" config={config} />)
  await waitFor(() => expect((screen.getByRole('button', { name: '선택한 신호 감시 시작' }) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getByRole('button', { name: '선택한 신호 감시 시작' }))
  await waitFor(() => expect(registerSignalWatch).toHaveBeenCalledWith(expect.objectContaining({ config, notify: false })))
  expect(screen.getByText('가격 신호 + 펀딩 양수 + 미결제약정 증가')).toBeTruthy()
})
it('distinguishes unavailable observations from an observed nonmatch and shows stored evidence', async () => {
  const data = state(), at = data.now
  data.signals = [{ id: 'test', config: { requestId: 'signal-fixture', name: '파생 감시', asset: 'BTC', config, notify: false, purpose: 'opportunity', holdingSide: null, version: 'investai-signals-1' }, hash: 'fixture', createdAt: at, active: true, lastAt: at, checkedAt: at, matched: false, derivativeState: 'unknown', issue: '자료 부족으로 판정을 보류합니다.', events: [{ id: 'event', at, observedAt: at, price: 100, signals: [], outcome: 'pending', entry: null, entryAt: null, exit: null, exitAt: null, net: null, delivery: { status: 'off', attempts: 0 }, derivatives: { at: at + 3600000, method: 'investai-derivatives-asof-1', source: 'Bybit USDT perpetual', funding: { at, knownAt: at, value: .0001 }, openInterest: null } }] }]
  vi.mocked(readMonitor).mockResolvedValue(data)
  renderWithProviders(<SignalWatchPanel asset="BTC" ledger />)
  expect(await screen.findByText(/파생 자료 확인 대기/)).toBeTruthy()
  fireEvent.click(screen.getByText('발생 기록과 이후 결과 1건'))
  expect(screen.getByText(/확정 펀딩 0.0100%/)).toBeTruthy()
  expect(screen.getByText('외부 발송 안 함')).toBeTruthy()
})
