import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SignalValidation } from './SignalValidation'
import { defaultExplorerConfig } from '@/services/research/signalExplorer'
import type { ResearchHistory } from '@/services/research/researchClient'
const hour = 3_600_000, base = Date.UTC(2026, 0, 1)
const config = { ...defaultExplorerConfig, signals: ['three-long'], window: 1 as const, horizon: 4 }
const history: ResearchHistory = { version: 1, asset: 'BTC', timeframe: '1h', requested: 1000, source: 'Binance USDⓈ-M', asOf: base + 400 * hour, fetchedAt: base + 400 * hour,
  candles: Array.from({ length: 400 }, (_, i) => ({ timestamp: base + i * hour, open: 100 + i * .1, close: 100.05 + i * .1, high: 100.2 + i * .1, low: 99.9 + i * .1, volume: 100 })) }
beforeEach(() => vi.restoreAllMocks())
it('runs only on request and retains costs/results across simple and expert modes', () => {
  const view = render(<SignalValidation history={history} config={config} simple loading={false} />)
  expect(screen.queryByText('검증 기록 다운로드')).toBeNull()
  fireEvent.change(screen.getByLabelText('한 번 거래 수수료 (%)'), { target: { value: '.1' } })
  fireEvent.click(screen.getByRole('button', { name: '이 조건으로 구간 검증하기' }))
  expect(screen.getByRole('heading', { name: '앞 70% 비교 구간' })).toBeTruthy()
  expect(screen.getByText('구간별 결과와 계산 근거').closest('details')?.open).toBe(false)
  view.rerender(<SignalValidation history={history} config={config} simple={false} loading={false} />)
  expect(Number((screen.getByLabelText('한 번 거래 수수료 (%)') as HTMLInputElement).value)).toBe(.1)
  expect(screen.getByText('구간별 결과와 계산 근거').closest('details')?.open).toBe(true)
  expect(screen.getByRole('button', { name: '검증 기록 다운로드' })).toBeTruthy()
})
it('invalidates displayed results after cost, signal, history or source changes', () => {
  const view = render(<SignalValidation history={history} config={config} simple loading={false} />)
  const run = () => fireEvent.click(screen.getByRole('button', { name: '이 조건으로 구간 검증하기' }))
  run()
  fireEvent.change(screen.getByLabelText('불리한 체결 차이 (%)'), { target: { value: '.2' } })
  expect(screen.queryByRole('button', { name: '검증 기록 다운로드' })).toBeNull()
  expect(screen.getByRole('status').textContent).toContain('바뀌었어요')
  run()
  view.rerender(<SignalValidation history={history} config={{ ...config, target: 3 }} simple loading={false} />)
  expect(screen.queryByRole('button', { name: '검증 기록 다운로드' })).toBeNull()
  run()
  view.rerender(<SignalValidation history={{ ...history }} config={{ ...config, target: 3 }} simple loading={false} />)
  expect(screen.queryByRole('button', { name: '검증 기록 다운로드' })).toBeNull()
})
it('does not run with empty costs or unavailable derivative evidence', () => {
  const view = render(<SignalValidation history={history} config={config} simple loading={false} />)
  fireEvent.change(screen.getByLabelText('한 번 거래 수수료 (%)'), { target: { value: '' } })
  expect((screen.getByRole('button', { name: '이 조건으로 구간 검증하기' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByRole('alert').textContent).toContain('빈칸 없이')
  fireEvent.change(screen.getByLabelText('한 번 거래 수수료 (%)'), { target: { value: '.05' } })
  view.rerender(<SignalValidation history={history} config={{ ...config, funding: 'positive' }} simple loading={false} />)
  expect((screen.getByRole('button', { name: '이 조건으로 구간 검증하기' }) as HTMLButtonElement).disabled).toBe(true)
})
it('downloads a versioned record only after running and blocks old download after refresh starts', () => {
  const create = vi.fn().mockReturnValue('blob:test'), revoke = vi.fn()
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }))
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const view = render(<SignalValidation history={history} config={config} simple loading={false} />)
  fireEvent.click(screen.getByRole('button', { name: '이 조건으로 구간 검증하기' }))
  fireEvent.click(screen.getByRole('button', { name: '검증 기록 다운로드' }))
  expect(create).toHaveBeenCalledWith(expect.any(Blob)); expect(click).toHaveBeenCalledOnce()
  view.rerender(<SignalValidation history={history} config={config} simple loading />)
  expect(screen.queryByRole('button', { name: '검증 기록 다운로드' })).toBeNull()
  vi.unstubAllGlobals()
})
