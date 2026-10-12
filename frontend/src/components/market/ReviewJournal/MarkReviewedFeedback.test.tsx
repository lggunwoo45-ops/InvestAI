import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { MarkReviewedFeedback } from './MarkReviewedFeedback'

describe('Mark reviewed feedback', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers() })
  afterEach(() => vi.useRealTimers())
  it.each([
    { language: 'ko' as const, button: '확인 완료', status: '확인 완료됨', baseline: '현재 분석이 다음 비교 기준으로 저장되었습니다.' },
    { language: 'en' as const, button: 'Mark reviewed', status: 'Marked reviewed', baseline: 'Current analysis was saved as the next comparison baseline.' },
  ])('announces confirmation temporarily in $language', ({ language, button, status, baseline }) => {
    const onReview = vi.fn()
    renderWithProviders(<MarkReviewedFeedback language={language} onReview={onReview} />)
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: button }))
    expect(onReview).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status').textContent).toContain(status)
    expect(screen.getByRole('status').textContent).toContain(baseline)
    expect(screen.getByRole('status').textContent).not.toMatch(/매수|매도|매수가|진입가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i)
    act(() => vi.advanceTimersByTime(3000))
    fireEvent.click(screen.getByRole('button', { name: button }))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('status')).toBeTruthy()
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.queryByRole('status')).toBeNull()
    expect(onReview).toHaveBeenCalledTimes(2)
  })
})
