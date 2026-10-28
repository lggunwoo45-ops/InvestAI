import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ForwardTrialPanel } from './ForwardTrialPanel'
import { defaultExplorerConfig } from '@/services/research/signalExplorer'
import { readMonitor, registerSignalWatch, type MonitorState, type SignalWatch } from '@/services/research/monitorClient'
import { summarizeTrial } from '@/services/research/forwardTrial'
vi.mock('@/services/research/monitorAvailability', () => ({ localMonitorAvailable: () => true }))
vi.mock('@/services/cloud/cloudClient', () => ({ cloudSignedIn: () => true }))
vi.mock('@/services/research/monitorClient', () => ({ readMonitor: vi.fn(), registerSignalWatch: vi.fn(), stopSignalWatch: vi.fn() }))
const state = { running: true, error: null, signals: [], now: 1800000000000 } as unknown as MonitorState
beforeEach(() => { vi.clearAllMocks(); vi.mocked(readMonitor).mockResolvedValue(state); vi.mocked(registerSignalWatch).mockResolvedValue(state) })
it('registers new immutable trials with explicit cost and duration, never historical outcomes', async () => {
  render(<MemoryRouter><ForwardTrialPanel asset="BTC" config={defaultExplorerConfig} /></MemoryRouter>)
  const button = screen.getByRole('button', { name: '조건 고정하고 미래 검증 시작' })
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false))
  fireEvent.change(screen.getByLabelText('앞으로 관측할 기간'), { target: { value: '7' } })
  fireEvent.change(screen.getByLabelText('미래 검증의 고정 왕복 비용 (%)'), { target: { value: '.4' } })
  fireEvent.click(button)
  await waitFor(() => expect(registerSignalWatch).toHaveBeenCalledOnce())
  expect(vi.mocked(registerSignalWatch).mock.calls[0][0]).toMatchObject({ asset: 'BTC', purpose: 'validation', notify: false, trialDays: 7, config: { cost: .4 } })
  expect(screen.getByText(/시작한 미래 검증이 없습니다/)).toBeTruthy()
  // Confirmed registration ends the retry identity; another explicit start is a new trial.
  fireEvent.click(button)
  await waitFor(() => expect(registerSignalWatch).toHaveBeenCalledTimes(2))
  expect(vi.mocked(registerSignalWatch).mock.calls[1][0].requestId).not.toBe(vi.mocked(registerSignalWatch).mock.calls[0][0].requestId)
})
it('blocks trials shorter than one full observation', async () => {
  render(<MemoryRouter><ForwardTrialPanel asset="BTC" config={{ ...defaultExplorerConfig, timeframe: '1d', horizon: 30 }} /></MemoryRouter>)
  await screen.findByRole('alert')
  expect((screen.getByRole('button', { name: '조건 고정하고 미래 검증 시작' }) as HTMLButtonElement).disabled).toBe(true)
})
it('summarizes ambiguous bounds, excludes missed and unfinished records and ignores pre-registration data', () => {
  const at = 1800000000000
  const event = (outcome: string, net: number | null, time = at + 1000) => ({ at: time, entry: 100, outcome, net })
  const rule = { createdAt: at, config: { trialDays: 7, config: { target: 2, cost: .2 } }, events: [event('up', 1.8), event('ambiguous', null), event('unresolved', null), event('pending', null), event('up', 100, at - 1)] } as unknown as SignalWatch
  const result = summarizeTrial(rule)
  expect(result.samples).toBe(2); expect(result.excluded).toBe(1); expect(result.pending).toBe(1)
  expect(result.meanLow).toBeCloseTo(-.2); expect(result.meanHigh).toBeCloseTo(1.8)
})
