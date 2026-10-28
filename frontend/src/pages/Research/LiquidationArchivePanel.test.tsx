import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LiquidationArchivePanel } from './LiquidationArchivePanel'
import { fetchLiquidationArchive, type LiquidationArchive } from '@/services/research/marketEvents'
vi.mock('@/app/displayMode/useDisplayMode', () => ({ useDisplayMode: () => ({ displayMode: 'simple' }) }))
vi.mock('@/services/research/marketEvents', () => ({ fetchLiquidationArchive: vi.fn() }))
it('distinguishes absent hours from observed zero and switches period without retaining mismatched totals', async () => {
  const to = 1800000000000, from = to - 24 * 3600000
  const data: LiquidationArchive = { version: 1, source: 'Bybit USDT linear', asset: 'BTC', hours: 24, from, to, fetchedAt: to, persistent: true, retentionDays: 7, rows: Array.from({ length: 24 }, (_, i) => ({ at: from + i * 3600000, coveredMs: 0, count: null, long: null, short: null })) }
  vi.mocked(fetchLiquidationArchive).mockResolvedValueOnce(data).mockRejectedValueOnce(new Error('잠시 조회 실패'))
  render(<LiquidationArchivePanel asset="BTC" />)
  expect((await screen.findAllByText('관측 자료 없음')).length).toBe(2)
  expect(screen.queryByText('0 USDT')).toBeNull()
  expect(screen.getByText('시간별 관측과 누락 확인').closest('details')?.open).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '지난 7일 기록' }))
  expect((await screen.findByRole('alert')).textContent).toContain('잠시 조회 실패')
  expect(screen.queryByText('0.0 / 24시간')).toBeNull()
  expect(vi.mocked(fetchLiquidationArchive).mock.calls[1].slice(0, 2)).toEqual(['BTC', 168])
})
