import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import * as monitor from '@/services/research/monitorClient'
import { PositionConnections } from './PositionConnections'
vi.mock('@/services/research/monitorClient', async original => ({ ...await original<typeof monitor>(), readMonitor: vi.fn(), connectPositions: vi.fn(), pausePositionConnection: vi.fn(), removePositionConnection: vi.fn(), registerSignalWatch: vi.fn() }))
const fixture = (connected = false): monitor.MonitorState => ({ version: 1, running: true, error: null, now: Date.now(), lastCycleAt: Date.now(), intervalMs: 15000, channelConfigured: false, rules: [], signals: [], connections: connected ? [{ id: 'connection-1', config: { requestId: 'connection-test', venue: 'hyperliquid', account: `0x${'a'.repeat(40)}`, label: '보유 계정', notify: false, thresholds: { distance: 5, loss: 10, leverage: null } }, active: true, createdAt: Date.now(), issue: null, sequence: 0, risk: {}, events: [], snapshot: { receivedAt: Date.now(), sourceAt: Date.now(), positions: [{ key: 'BTC:long', asset: 'BTC', side: 'long', size: 1, entryPrice: 100, currentPrice: 82, liquidationPrice: 80, unrealizedPnl: -18, leverage: 5, marginType: 'cross', quote: 'USDC' }] } }] : [] })
beforeEach(() => { localStorage.clear(); localStorage.setItem('market-copilot.language', 'ko'); vi.clearAllMocks(); vi.mocked(monitor.readMonitor).mockResolvedValue(fixture()) })
it('shows no invented positions and registers an explicit public connection with editable thresholds', async () => {
  vi.mocked(monitor.connectPositions).mockResolvedValue(fixture(true))
  renderWithProviders(<PositionConnections />)
  await waitFor(() => expect((screen.getByRole('button', { name: '연결하고 위험 확인하기' }) as HTMLButtonElement).disabled).toBe(false))
  expect(screen.getByText('연결한 포지션이 여기에 모입니다.')).toBeTruthy()
  expect(monitor.connectPositions).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('연결할 공개 지갑 주소'), { target: { value: `0x${'a'.repeat(40)}` } })
  fireEvent.change(screen.getByLabelText('청산 거리 기준'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: '연결하고 위험 확인하기' }))
  await screen.findByText('보유 계정')
  expect(vi.mocked(monitor.connectPositions).mock.calls[0][0]).toMatchObject({ venue: 'hyperliquid', thresholds: { distance: 3, loss: 10, leverage: null }, notify: false })
  expect(screen.getByText(/청산 거리 · 진입금액 대비 손실 기준에 도달/)).toBeTruthy()
})
it('uses different simple/expert layouts without losing connection form inputs', async () => {
  vi.mocked(monitor.readMonitor).mockResolvedValue(fixture(true))
  renderWithProviders(<PositionConnections />)
  await screen.findByText('보유 계정')
  expect(screen.queryByRole('table')).toBeNull()
  fireEvent.change(screen.getByLabelText('연결할 공개 지갑 주소'), { target: { value: `0x${'b'.repeat(40)}` } })
  fireEvent.click(screen.getByRole('button', { name: '전문가' }))
  expect(screen.getByRole('table')).toBeTruthy()
  expect((screen.getByLabelText('연결할 공개 지갑 주소') as HTMLInputElement).value).toBe(`0x${'b'.repeat(40)}`)
  expect(screen.getByRole('heading', { name: '연결한 포지션을 하나의 작업대로.' })).toBeTruthy()
})
it('binds opposite signals to the actual position and requires an explicit second action before deleting records', async () => {
  vi.mocked(monitor.readMonitor).mockResolvedValue(fixture(true)); vi.mocked(monitor.registerSignalWatch).mockResolvedValue(fixture(true)); vi.mocked(monitor.removePositionConnection).mockResolvedValue(fixture())
  renderWithProviders(<PositionConnections />)
  fireEvent.click(await screen.findByRole('button', { name: '반대 추세 감시 시작' }))
  await waitFor(() => expect(monitor.registerSignalWatch).toHaveBeenCalled())
  expect(vi.mocked(monitor.registerSignalWatch).mock.calls[0][0]).toMatchObject({ holdingSide: 'long', positionRef: { connectionId: 'connection-1', key: 'BTC:long' }, config: { signals: ['ema-short'], timeframe: '1h', side: 'short' } })
  await waitFor(() => expect((screen.getByRole('button', { name: '연결 삭제' }) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getByRole('button', { name: '연결 삭제' })); expect(monitor.removePositionConnection).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '연결과 기록 삭제' }))
  await waitFor(() => expect(monitor.removePositionConnection).toHaveBeenCalledWith('connection-1'))
  await screen.findByText('연결한 포지션이 여기에 모입니다.')
})
it('keeps last values visible but refuses risk counts and bound signal registration on stale connections', async () => {
  const data = fixture(true); data.connections![0].snapshot!.receivedAt -= 180000
  vi.mocked(monitor.readMonitor).mockResolvedValue(data)
  renderWithProviders(<PositionConnections />)
  await screen.findByText('보유 계정')
  expect(screen.getByText('현재 위험 판정 대기')).toBeTruthy()
  expect((screen.getByRole('button', { name: '반대 추세 감시 시작' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.queryByText(/기준에 도달했어요/)).toBeNull()
})
