import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { MajorSupportPanel } from './MajorSupportPanel'
import { supportHistory, supportInstrument, supportNow as now } from '@/test/majorSupportFixture'
vi.mock('@/hooks/useMajorSupportHistory', () => ({ useMajorSupportHistory: () => ({data:supportHistory(),loading:false,failed:false,retry:vi.fn()}) }))
it('shows one primary support, explains its evidence and invalidation, and opens methodology only in expert mode', () => {
  const props = { instrument:supportInstrument,quote:{dataQuality:'live' as const,connectionStatus:'live',updatedAt:now,currentPrice:100,candles:[]},now,language:'en' as const,expert:false,onEvidence:vi.fn() }
  const { rerender } = render(<MajorSupportPanel {...props} />)
  expect(screen.getAllByText('Key support reference')).toHaveLength(1)
  expect(screen.getByText('82 KRW', {selector:'b'})).toBeTruthy()
  expect(screen.getByText(/not a bounce probability/)).toBeTruthy()
  expect(screen.getByText(/two consecutive daily closes/)).toBeTruthy()
  expect(screen.getByText('Other candidates and selection method').closest('details')?.open).toBe(false)
  rerender(<MajorSupportPanel {...props} expert />)
  expect(screen.getByText('Other candidates and selection method').closest('details')?.open).toBe(true)
  rerender(<MajorSupportPanel {...props} now={now+100_000} />)
  expect(screen.queryByText('82 KRW', {selector:'b'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Check current data'}))
  expect(props.onEvidence).toHaveBeenCalledOnce()
})
