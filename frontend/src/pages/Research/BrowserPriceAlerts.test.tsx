import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { Link } from 'react-router-dom'
import { renderWithProviders } from '@/test/renderWithProviders'
import { readEvents, readRules, saveObservation, saveRule } from '@/services/research/researchJournal'
import type { ResearchSnapshot } from '@/services/research/researchModel'
import { BrowserPriceAlerts } from './BrowserPriceAlerts'

const now = Date.now()
const snapshot = (price: number, at = now): ResearchSnapshot => ({ version: 1, asset: 'BTC', symbol: 'BTCUSDT', fetchedAt: at, sources: { mark: { status: 'available', source: 'Binance', receivedAt: at, data: { markPrice: price, time: at } } } })
const review = { id: 'review-1', asset: 'BTC', at: now - 1000, price: 100, note: '거래량을 다시 살펴보기', funding: null, interest: null, volatility: null, signals: [] }
const props = { asset: 'BTC', snapshot: snapshot(100), now, auto: false, loading: false, onStart: vi.fn(), onPause: vi.fn() }
describe('browser price alert journey', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem('market-copilot.language', 'ko'); vi.clearAllMocks() })
  it('keeps the chosen review and starts checking only after a successful save', () => {
    saveObservation(review)
    const view = renderWithProviders(<><Link to="/research?asset=BTC&mode=alerts&review=review-1">연결</Link><BrowserPriceAlerts {...props} /></>)
    fireEvent.click(screen.getByRole('link', { name: '연결' }))
    expect(screen.getByText(review.note)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('이 가격까지 오르면 (USDT)'), { target: { value: '110' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하고 가격 확인 시작' }))
    expect(readRules()[0]).toMatchObject({ asset: 'BTC', above: 110, below: null, review: { id: review.id, price: 100, note: review.note } })
    expect(props.onStart).toHaveBeenCalledTimes(1)
    view.unmount()
    renderWithProviders(<BrowserPriceAlerts {...props} />)
    expect((screen.getByLabelText('이 가격까지 오르면 (USDT)') as HTMLInputElement).value).toBe('110')
    expect(screen.getByText(review.note)).toBeTruthy()
    expect(screen.getByRole('button', { name: '저장한 조건으로 다시 시작' })).toBeTruthy()
  })
  it('does not infer a review from another asset or silently replace existing rules', () => {
    saveObservation({ ...review, asset: 'ETH' }); saveRule({ asset: 'BTC', above: 120, below: 80 })
    renderWithProviders(<><Link to="/research?asset=BTC&mode=alerts&review=review-1">잘못된 연결</Link><BrowserPriceAlerts {...props} /></>)
    fireEvent.click(screen.getByRole('link', { name: '잘못된 연결' }))
    fireEvent.click(screen.getByRole('button', { name: '저장하고 가격 확인 시작' }))
    expect(props.onStart).not.toHaveBeenCalled()
    expect(readRules()[0]).toMatchObject({ above: 120, below: 80 })
    expect(screen.queryByText(review.note)).toBeNull()
  })
  it('preserves inputs and leaves checking off when storage fails', () => {
    renderWithProviders(<BrowserPriceAlerts {...props} />)
    fireEvent.change(screen.getByLabelText('이 가격까지 오르면 (USDT)'), { target: { value: '110' } })
    const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    fireEvent.click(screen.getByRole('button', { name: '저장하고 가격 확인 시작' }))
    expect(screen.getByRole('alert').textContent).toContain('저장하지 못했어요')
    expect(props.onStart).not.toHaveBeenCalled()
    expect((screen.getByLabelText('이 가격까지 오르면 (USDT)') as HTMLInputElement).value).toBe('110')
    failure.mockRestore()
  })
  it('observes a crossing across a refresh and preserves the original threshold and note', () => {
    saveRule({ asset: 'BTC', above: 110, below: 90, review })
    const view = renderWithProviders(<BrowserPriceAlerts {...props} />)
    view.rerender(<BrowserPriceAlerts {...props} snapshot={null} loading />)
    view.rerender(<BrowserPriceAlerts {...props} snapshot={snapshot(112, now + 1000)} now={now + 1000} />)
    expect(readEvents()).toHaveLength(1)
    expect(readEvents()[0]).toMatchObject({ threshold: 110, price: 112, review: { note: review.note } })
    view.rerender(<BrowserPriceAlerts {...props} snapshot={snapshot(113, now + 2000)} now={now + 2000} />)
    expect(readEvents()).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('이 가격까지 오르면 (USDT)'), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하고 가격 확인 시작' }))
    expect(readEvents()[0]?.threshold).toBe(110)
  })
  it('does not invent crossings on first load, failed data, or a changed rule', () => {
    saveRule({ asset: 'BTC', above: 110, below: null })
    const view = renderWithProviders(<BrowserPriceAlerts {...props} />)
    view.rerender(<BrowserPriceAlerts {...props} snapshot={null} />)
    view.rerender(<BrowserPriceAlerts {...props} snapshot={snapshot(115, now + 1000)} now={now + 1000} />)
    expect(readEvents()).toEqual([])
    fireEvent.change(screen.getByLabelText('이 가격까지 내려가면 (USDT)'), { target: { value: '90' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하고 가격 확인 시작' }))
    expect(readEvents()).toEqual([])
  })
})
