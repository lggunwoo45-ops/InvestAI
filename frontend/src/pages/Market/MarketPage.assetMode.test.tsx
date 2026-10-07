import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '@/app/App'
import { LAST_MARKET_INSTRUMENT_STORAGE_KEY, MARKET_ASSET_MODE_STORAGE_KEY } from './marketAssetMode'

describe('Market asset separation', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.pushState({}, '', '/market')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network disabled in deterministic Market tests'))
  })

  afterEach(() => vi.restoreAllMocks())

  it('defaults to Crypto and selects BTC/KRW as soon as a catalog is available', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Crypto Market' })).toBeTruthy()
    expect(screen.getByText('Review crypto movement from Upbit and Binance markets.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'MOCK' }))

    expect(await screen.findByRole('img', { name: /BTC\/KRW 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Crypto' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByRole('button', { name: 'Open 005930' })).toBeNull()
    expect(window.localStorage.getItem(MARKET_ASSET_MODE_STORAGE_KEY)).toBe('crypto')
  })

  it('switches to the Korea stock boundary, selects Samsung, and preserves list collapse', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'MOCK' }))
    await screen.findByRole('img', { name: /BTC\/KRW 1H TradingView candlestick chart in mock mode/i })

    fireEvent.click(screen.getByRole('tab', { name: 'Korea Stocks' }))
    expect(await screen.findByRole('heading', { name: 'Korea Stocks Beta' })).toBeTruthy()
    expect(screen.getByText('KOSPI / KOSDAQ instruments are shown with beta data. A live stock provider is not connected yet.')).toBeTruthy()
    expect(await screen.findByRole('img', { name: /005930 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'KOSPI' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'KOSDAQ' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Open BTC/KRW' })).toBeNull()
    expect(window.localStorage.getItem(MARKET_ASSET_MODE_STORAGE_KEY)).toBe('korea')

    fireEvent.click(screen.getByRole('button', { name: 'Hide instruments' }))
    expect(screen.getByRole('button', { name: 'Show instruments' })).toBeTruthy()
    expect(screen.getByRole('img', { name: /005930 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
  })

  it('switches to the US stock boundary, selects Apple, and limits search to that mode', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('tab', { name: 'US Stocks' }))

    expect(await screen.findByRole('heading', { name: 'US Stocks Beta' })).toBeTruthy()
    expect(screen.getByText('US stock instruments are shown with beta data. A live stock provider is not connected yet.')).toBeTruthy()
    expect(await screen.findByRole('img', { name: /AAPL 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'NASDAQ' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'NYSE' })).toBeTruthy()

    const search = screen.getByRole('searchbox', { name: 'Search symbol, Korean or English name' })
    fireEvent.change(search, { target: { value: 'XRP/KRW' } })
    expect(await screen.findByText('No instruments match this market search.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Open BTC/KRW' })).toBeNull()
  })

  it('restores a valid previous selection and falls back when a stored id is unavailable', async () => {
    window.localStorage.setItem(MARKET_ASSET_MODE_STORAGE_KEY, 'korea')
    window.localStorage.setItem(LAST_MARKET_INSTRUMENT_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, instrumentIds: { korea: 'krx-000660' } }))
    const first = render(<App />)
    expect(await screen.findByRole('img', { name: /000660 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    first.unmount()

    window.localStorage.setItem(LAST_MARKET_INSTRUMENT_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, instrumentIds: { korea: 'krx-missing' } }))
    render(<App />)
    expect(await screen.findByRole('img', { name: /005930 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    await waitFor(() => expect(window.localStorage.getItem(LAST_MARKET_INSTRUMENT_STORAGE_KEY)).toContain('krx-005930'))
  })

  it('renders the separated asset modes and beta boundary copy in Korean', async () => {
    render(<App />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'ko' } })

    expect(await screen.findByRole('tab', { name: '코인' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '한국 주식' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '미국 주식' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '코인 마켓' })).toBeTruthy()
    expect(screen.getByText('업비트와 바이낸스 기준으로 코인 흐름을 확인합니다.')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: '한국 주식' }))
    expect(await screen.findByRole('heading', { name: '한국 주식 Beta' })).toBeTruthy()
    expect(screen.getByText('KOSPI / KOSDAQ 종목은 베타 데이터로 표시됩니다. 실시간 주식 공급자는 아직 연결되지 않았습니다.')).toBeTruthy()
  })
})
