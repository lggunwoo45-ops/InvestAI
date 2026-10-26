import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { DerivativeHeatPanel } from './DerivativeHeatPanel'
import type { DerivativesHistory } from '@/services/research/derivativesHistory'
afterEach(cleanup)
const HOUR = 3600000, at = 1800000000000, now = at + 10000
function data(days = 7): DerivativesHistory {
  return { version: 1, asset: 'BTC', days, from: at - days * 24 * HOUR, to: at, fetchedAt: now, source: 'Bybit USDT perpetual', retentionDays: 365, intervalMinutes: 15, backfillDays: 7, series: (['funding', 'openInterest'] as const).map(metric => { const count = metric === 'funding' ? 22 : 169, step = (metric === 'funding' ? 8 : 1) * HOUR; const points = Array.from({ length: count }, (_, i) => ({ at: at - (count - i - 1) * step, knownAt: at - (count - i - 1) * step + 1000, value: metric === 'funding' ? .0001 : 100 })); return { metric, unit: metric === 'funding' ? 'rate' : 'BTC', status: 'available', attemptedAt: now, succeededAt: now, firstAt: points[0]!.at, lastAt: at, gaps: metric === 'funding' ? null : [], points } }) }
}
it('shows separate readable comparisons in simple mode with no combined trading score', () => {
  render(<DerivativeHeatPanel data={data()} simple now={now} unavailable={false} />)
  expect(screen.getByRole('heading', { name: '평소보다 쏠림이 커졌을까요?' })).toBeTruthy()
  expect(screen.getAllByRole('meter')).toHaveLength(2)
  expect(screen.getAllByText('50 / 100')).toHaveLength(2)
})
it('removes score meters when the period or freshness is insufficient', () => {
  const view = render(<DerivativeHeatPanel data={data(30)} simple={false} now={now} unavailable={false} />)
  expect(screen.queryByRole('meter')).toBeNull(); expect(screen.getAllByText('비교 대기')).toHaveLength(2)
  view.rerender(<DerivativeHeatPanel data={data()} simple={false} now={now} unavailable />)
  expect(screen.queryByRole('meter')).toBeNull(); expect(screen.getAllByText(/최근 자료 갱신/)).toHaveLength(2)
})
