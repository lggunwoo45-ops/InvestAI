import { fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DerivativeHistory } from './DerivativeHistory'
import { fetchDerivativesHistory, type DerivativesHistory } from '@/services/research/derivativesHistory'
let mode = 'simple'
vi.mock('@/app/displayMode/useDisplayMode', () => ({ useDisplayMode: () => ({ displayMode: mode }) }))
vi.mock('@/services/research/derivativesHistory', async original => ({ ...await original<typeof import('@/services/research/derivativesHistory')>(), fetchDerivativesHistory: vi.fn() }))
const at = Date.parse('2026-10-26T12:00:00Z'), hour = 3_600_000
function fixture(days = 7): DerivativesHistory {
  const points = [at - 25 * hour, at - hour].map((at, i) => ({ at, knownAt: at + hour, value: 100 + i * 2 }))
  return { version: 1, asset: 'BTC', days, from: at - days * 24 * hour, to: at, fetchedAt: at, source: 'Bybit USDT perpetual', retentionDays: 365, intervalMinutes: 15, backfillDays: 7, series: [
    { metric: 'funding', unit: 'rate', status: 'available', attemptedAt: at, succeededAt: at, firstAt: points[0]!.at, lastAt: points[1]!.at, gaps: null, points: points.map(p => ({ ...p, value: .0001 })) },
    { metric: 'openInterest', unit: 'BTC', status: 'available', attemptedAt: at, succeededAt: at, firstAt: points[0]!.at, lastAt: points[1]!.at, gaps: [{ from: at - days * 24 * hour, to: at - 26 * hour }], points },
  ] }
}
beforeEach(() => { mode = 'simple'; vi.spyOn(Date, 'now').mockReturnValue(at); vi.mocked(fetchDerivativesHistory).mockImplementation(async (_a, days) => fixture(days)) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks() })
it('simple mode explains actual history and missing coverage without a raw table', async () => {
  render(<DerivativeHistory asset="BTC" />)
  expect(await screen.findByText('102 BTC', { selector: 'strong' })).toBeTruthy()
  expect(screen.getByText(/24시간 전보다 2.00% 증가/)).toBeTruthy()
  expect(screen.getByText(/양수면 롱이 숏에게/)).toBeTruthy()
  expect(screen.getByText(/실제 확보한 기록/)).toBeTruthy()
  expect(screen.queryByRole('table')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '최근 30일' }))
  await waitFor(() => expect(fetchDerivativesHistory).toHaveBeenLastCalledWith('BTC', 30, expect.any(AbortSignal)))
})
it('expert mode exposes metric selection, observation times, gaps and export', async () => {
  mode = 'expert'; render(<DerivativeHistory asset="BTC" />)
  expect(await screen.findByRole('table')).toBeTruthy()
  expect(screen.getByRole('columnheader', { name: '이 값을 처음 저장한 시각' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '조회 기록 CSV 저장' })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('표시 지표'), { target: { value: 'funding' } })
  expect(screen.getByText('정산된 펀딩률 추이')).toBeTruthy()
})
it('empty collections never appear as zero and errors keep old data clearly labeled', async () => {
  const empty = fixture(); empty.series.forEach(s => { s.points = []; s.firstAt = null; s.lastAt = null; s.status = 'unavailable' })
  vi.mocked(fetchDerivativesHistory).mockResolvedValueOnce(empty)
  render(<DerivativeHistory asset="BTC" />)
  expect(await screen.findAllByText('자료 없음')).toHaveLength(2)
  expect(screen.queryByText('0 BTC')).toBeNull()
  vi.mocked(fetchDerivativesHistory).mockRejectedValueOnce(new Error('연결 실패'))
  fireEvent.click(screen.getByRole('button', { name: '저장 기록 새로고침' }))
  expect(await screen.findByText(/마지막으로 불러온 저장 기록/)).toBeTruthy()
})
