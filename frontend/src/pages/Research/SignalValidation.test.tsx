import { beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SignalValidation } from './SignalValidation'
import { defaultExplorerConfig } from '@/services/research/signalExplorer'
import type { ResearchHistory } from '@/services/research/researchClient'
import * as fundingClient from '@/services/research/fundingSettlements'
const hour = 3_600_000, base = Date.UTC(2026, 0, 1)
const config = { ...defaultExplorerConfig, signals: ['three-long'], window: 1 as const, horizon: 4 }
const history: ResearchHistory = { version: 1, asset: 'BTC', timeframe: '1h', requested: 1000, source: 'Binance USDⓈ-M', asOf: base + 400 * hour, fetchedAt: base + 400 * hour,
  candles: Array.from({ length: 400 }, (_, i) => ({ timestamp: base + i * hour, open: 100 + i * .1, close: 100.05 + i * .1, high: 100.2 + i * .1, low: 99.9 + i * .1, volume: 100 })) }
beforeEach(() => vi.restoreAllMocks())
it('runs only on request and retains costs/results across simple and expert modes', () => {
  const view = render(<SignalValidation history={history} config={config} simple loading={false} />)
  fireEvent.click(screen.getByRole('radio', { name: /직접 비용 가정/ }))
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
  fireEvent.click(screen.getByRole('radio', { name: /직접 비용 가정/ }))
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
  fireEvent.click(screen.getByRole('radio', { name: /직접 비용 가정/ }))
  fireEvent.click(screen.getByRole('button', { name: '이 조건으로 구간 검증하기' }))
  fireEvent.click(screen.getByRole('button', { name: '검증 기록 다운로드' }))
  expect(create).toHaveBeenCalledWith(expect.any(Blob)); expect(click).toHaveBeenCalledOnce()
  view.rerender(<SignalValidation history={history} config={config} simple loading />)
  expect(screen.queryByRole('button', { name: '검증 기록 다운로드' })).toBeNull()
  vi.unstubAllGlobals()
})
const funding: fundingClient.FundingHistory = { version: 1, asset: 'BTC', source: 'Binance USDⓈ-M', from: base, to: base + 400 * hour, fetchedAt: base + 400 * hour,
  records: Array.from({ length: 51 }, (_, i) => ({ at: base + i * 8 * hour, rate: .0001, markPrice: 110 })) }
it('defaults to settled funding, loads on request, and shows cost provenance and excluded cases', async () => {
  const fetcher = vi.spyOn(fundingClient, 'fetchFundingSettlements').mockResolvedValue(funding)
  render(<SignalValidation history={history} config={config} simple loading={false} />)
  expect(fetcher).not.toHaveBeenCalled()
  expect((screen.getByRole('radio', { name: /실제 정산 기록 반영/ }) as HTMLInputElement).checked).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '이 조건으로 구간 검증하기' }))
  expect(screen.getByRole('button', { name: '정산 기록을 불러와 계산 중…' }).hasAttribute('disabled')).toBe(true)
  await screen.findByRole('article', { name: '펀딩비 반영 결과' })
  expect(fetcher).toHaveBeenCalledOnce()
  expect(screen.getByText(/정산 기록 51건 조회/)).toBeTruthy()
  expect(screen.getByText(/양수는 지급한 비용/)).toBeTruthy()
})
it('does not silently fall back on failure and allows an explicit retry', async () => {
  const fetcher = vi.spyOn(fundingClient, 'fetchFundingSettlements').mockRejectedValueOnce(new Error('정산 기록 조회 실패')).mockResolvedValue(funding)
  render(<SignalValidation history={history} config={config} simple loading={false} />)
  fireEvent.click(screen.getByRole('button', { name: '이 조건으로 구간 검증하기' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', '정산 기록 조회 실패')
  expect(screen.queryByText('검증 기록 다운로드')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '이 조건으로 구간 검증하기' }))
  await screen.findByRole('article', { name: '펀딩비 반영 결과' }); expect(fetcher).toHaveBeenCalledTimes(2)
})
it('aborts stale requests when a new asset or cost is selected, even if the provider ignores abort', async () => {
  let finish!: (value: fundingClient.FundingHistory) => void
  const fetcher = vi.spyOn(fundingClient, 'fetchFundingSettlements').mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const view = render(<SignalValidation history={history} config={config} simple loading={false} />)
  fireEvent.click(screen.getByRole('button', { name: '이 조건으로 구간 검증하기' }))
  view.rerender(<SignalValidation history={{ ...history, asset: 'ETH' }} config={config} simple loading={false} />)
  expect(fetcher.mock.calls[0][1]?.aborted).toBe(true)
  await act(async () => finish(funding))
  await waitFor(() => expect(screen.queryByText('검증 기록 다운로드')).toBeNull())
  expect(screen.queryByRole('alert')).toBeNull()
})
