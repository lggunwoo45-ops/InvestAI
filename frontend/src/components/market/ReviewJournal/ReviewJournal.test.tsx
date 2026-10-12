import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { itemFromInstrument, reviewItem } from '@/services/watchlist/watchlistStorage'
import { ReviewJournal } from './ReviewJournal'

const item = itemFromInstrument({ id: 'upbit-test', symbol: 'TEST/KRW', name: 'Test', marketId: 'upbit', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 0, volume24h: 1 })
const forbidden = /매수|매도|매수가|진입가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i
function expandJournal() { fireEvent.click(screen.getByRole('button', { name: 'Recent review history', expanded: false })) }

describe('ReviewJournal', () => {
  beforeEach(() => localStorage.clear())
  it('shows only a compact locked message outside the watchlist', () => {
    renderWithProviders(<ReviewJournal item={undefined} language="ko" onSave={vi.fn()} />)
    expect(screen.getByText('관심종목에 등록하면 메모를 남길 수 있습니다.')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(document.body.textContent).not.toMatch(forbidden)
  })
  it('edits both fields, saves explicitly and retains the draft across rerenders', () => {
    const onSave = vi.fn()
    const view = renderWithProviders(<ReviewJournal item={item} language="en" onSave={onSave} />)
    expect(screen.getByRole('region', { name: 'Review record' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Review note' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Recent review history' })).toBeNull()
    expandJournal()
    fireEvent.change(screen.getByRole('textbox', { name: 'Review note' }), { target: { value: 'Check evidence quality' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Watch reason' }), { target: { value: 'Follow context' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith('Check evidence quality', 'Follow context')
    view.rerender(<ReviewJournal item={{ ...item, note: 'Check evidence quality', reviewReason: 'Follow context' }} language="en" onSave={onSave} />)
    expect((screen.getByRole('textbox', { name: 'Review note' }) as HTMLTextAreaElement).value).toBe('Check evidence quality')
    expect(screen.getByText('No review history yet.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(forbidden)
  })
  it('groups Korean notes and collapsed history without rendering a hidden history region', () => {
    renderWithProviders(<ReviewJournal item={item} language="ko" onSave={vi.fn()} />)
    expect(screen.getByRole('region', { name: '검토 기록' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: '검토 메모' })).toBeTruthy()
    const toggle = screen.getByRole('button', { name: '최근 검토 이력', expanded: false })
    expect(screen.queryByRole('region', { name: '최근 검토 이력' })).toBeNull()
    fireEvent.click(toggle)
    expect(screen.getByRole('region', { name: '최근 검토 이력' })).toBeTruthy()
    fireEvent.click(toggle)
    expect(screen.queryByRole('region', { name: '최근 검토 이력' })).toBeNull()
    expect(document.body.textContent).not.toMatch(forbidden)
  })
  it('shows the latest three entries with state, reason, time and note preview', () => {
    let items = [{ ...item, note: 'Evidence note' }]
    for (let index = 0; index < 4; index++) items = reviewItem(items, item.instrumentId, { finalReadState: 'keepWatching', finalReadTitle: 'Keep watching', finalReadSummary: `Observation ${index}`, capturedAt: new Date(Date.parse('2026-10-12T00:00:00Z') + index * 6000).toISOString() }).map(value => ({ ...value, note: value.note ?? '' }))
    renderWithProviders(<ReviewJournal item={items[0]} language="en" onSave={vi.fn()} />)
    expandJournal()
    const history = screen.getByRole('region', { name: 'Recent review history' })
    expect(within(history).getAllByRole('listitem')).toHaveLength(3)
    expect(within(history).getAllByText('Keep watching')).toHaveLength(3)
    expect(within(history).getAllByText('Evidence note')).toHaveLength(3)
    expect(history.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-12T00:00:18.000Z')
    expect(document.body.textContent).not.toMatch(forbidden)
  })
  it('resets the editor when a different instrument is selected', () => {
    const view = renderWithProviders(<ReviewJournal item={{ ...item, note: 'First instrument' }} language="en" onSave={vi.fn()} />)
    expandJournal()
    view.rerender(<ReviewJournal item={{ ...item, instrumentId: 'second', note: 'Second instrument' }} language="en" onSave={vi.fn()} />)
    expandJournal()
    expect((screen.getByRole('textbox', { name: 'Review note' }) as HTMLTextAreaElement).value).toBe('Second instrument')
  })
})
