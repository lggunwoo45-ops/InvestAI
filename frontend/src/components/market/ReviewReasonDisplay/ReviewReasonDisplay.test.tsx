import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { itemFromInstrument, type ReviewSnapshot } from '@/services/watchlist/watchlistStorage'
import { ReviewReasonDisplay } from './ReviewReasonDisplay'

const item = itemFromInstrument({ id: 'upbit-test', symbol: 'TEST/KRW', name: 'Test', marketId: 'upbit', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 0, volume24h: 1 })
const previous: ReviewSnapshot = { finalReadState: 'wait', finalReadTitle: 'Wait for now', finalReadSummary: 'Observe', capturedAt: '2026-10-10T00:00:00Z' }
describe('Review reason presentation', () => {
  beforeEach(() => localStorage.clear())
  it('shows the existing primary reason first and a changed state second', () => {
    const { container } = renderWithProviders(<ReviewReasonDisplay item={{ ...item, lastReviewedSnapshot: previous }} current={{ ...previous, finalReadState: 'keepWatching', finalReadTitle: 'Keep watching' }} reasons={['changed', 'stale']} language="en" />)
    expect(container.querySelector('strong')?.textContent).toBe('Final read changed')
    expect(container.querySelector('strong')?.nextElementSibling?.textContent).toBe('Wait for now → Keep watching')
    expect(screen.queryByText('Last review over 24 hours ago')).toBeNull()
  })
  it('uses a compact note indicator when there is no state change', () => {
    renderWithProviders(<ReviewReasonDisplay item={{ ...item, note: 'Check evidence' }} reasons={['first', 'limited']} language="ko" />)
    expect(screen.getByText('처음 확인 필요')).toBeTruthy()
    expect(screen.getByText('메모 있음')).toBeTruthy()
    expect(screen.queryByText('Check evidence')).toBeNull()
    expect(document.body.textContent).not.toMatch(/매수|매도|매수가|진입가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i)
  })
  it('does not add an empty secondary line for reviewed instruments', () => {
    const { container } = renderWithProviders(<ReviewReasonDisplay item={item} reasons={[]} language="ko" />)
    expect(screen.getByText('확인 완료')).toBeTruthy()
    expect(container.querySelector('small')).toBeNull()
  })
})
