import { afterEach, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import * as availability from '@/services/research/monitorAvailability'
import * as monitor from '@/services/research/monitorClient'
import { PositionConnections } from './PositionConnections'
import { SignalWatchPanel } from './SignalWatchPanel'
import { MonitorWorkspace } from './MonitorWorkspace'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it.each(['lggunwoo45-ops.github.io', 'example.com', 'localhost.example.com', '192.168.0.1'])('keeps private monitoring unavailable on %s', hostname => {
  expect(availability.localMonitorAvailable(hostname)).toBe(false)
})

it.each(['localhost', '127.0.0.1', '[::1]'])('preserves local monitoring on %s', hostname => {
  expect(availability.localMonitorAvailable(hostname)).toBe(true)
})

it.each([
  ['positions', <PositionConnections key="positions" />],
  ['signals', <SignalWatchPanel key="signals" asset="BTC" ledger />],
  ['prices', <MonitorWorkspace key="prices" asset="BTC" />],
])('shows a usable public alternative without polling or credential inputs for %s', async (_, component) => {
  vi.spyOn(availability, 'localMonitorAvailable').mockReturnValue(false)
  const read = vi.spyOn(monitor, 'readMonitor')
  const { container } = renderWithProviders(component)
  expect(screen.getByRole('region', { name: '이 웹사이트에서 사용할 수 있는 기능' })).toBeTruthy()
  expect(screen.getByText('계좌 자동 연결·지속 감시는 PC 전용이에요')).toBeTruthy()
  expect(container.querySelector('input')).toBeNull()
  await Promise.resolve()
  expect(read).not.toHaveBeenCalled()
})

it('rejects direct monitor requests before sending any credentials on the public site', async () => {
  vi.spyOn(availability, 'localMonitorAvailable').mockReturnValue(false)
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
  await expect(monitor.setupCredentialVault('test-only-password')).rejects.toThrow('PC용 InvestAI')
  expect(fetchMock).not.toHaveBeenCalled()
})
