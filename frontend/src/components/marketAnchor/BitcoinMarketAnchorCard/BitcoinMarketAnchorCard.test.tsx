import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { buildBitcoinMarketAnchor } from '@/services/marketAnchor/bitcoinMarketAnchor'
import type { MarketInstrument } from '@/types/market'
import { BitcoinMarketAnchorCard } from './BitcoinMarketAnchorCard'

const btc: MarketInstrument = { id: 'btc', marketId: 'upbit', marketType: 'upbit-krw', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100_000, change24hPercent: -1.2, volume24h: 5_000 }

describe('BitcoinMarketAnchorCard', () => {
  it('renders compact English context without a transaction signal', () => {
    const anchor = buildBitcoinMarketAnchor({ marketBucket: 'upbit', instruments: [btc], catalogSource: 'live', newsResult: null, language: 'en' })
    render(<BitcoinMarketAnchorCard anchor={anchor} language="en" />)
    const card = screen.getByRole('region', { name: 'Bitcoin market anchor' })
    expect(card.textContent).toContain('BTC/KRW')
    expect(card.textContent).toContain('Current BTC flow')
    expect(card.textContent).toContain('Market context before reviewing crypto candidates. Not a trade instruction.')
  })

  it('renders the Korean unavailable state safely', () => {
    const anchor = buildBitcoinMarketAnchor({ marketBucket: 'upbit', instruments: [], catalogSource: null, newsResult: null, language: 'ko' })
    render(<BitcoinMarketAnchorCard anchor={anchor} language="ko" />)
    expect(screen.getByText('비트코인 기준 확인 불가')).toBeTruthy()
    expect(screen.getByText('BTC 기준 데이터를 찾을 수 없습니다. 코인 후보는 계속 확인할 수 있지만, 시장 기준 정보는 제한됩니다.')).toBeTruthy()
    expect(screen.getByText('코인 후보 확인 전 참고하는 시장 기준 정보입니다. 거래 지시가 아닙니다.')).toBeTruthy()
    expect(screen.getByText('점수 산정 불가')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/매수|매도|손절가|익절가|목표가/)
  })

  it('keeps the Binance anchor card visible when BTC data is unavailable', () => {
    const anchor = buildBitcoinMarketAnchor({ marketBucket: 'binance', instruments: [], catalogSource: null, newsResult: null, language: 'en' })
    render(<BitcoinMarketAnchorCard anchor={anchor} language="en" />)
    const card = screen.getByRole('region', { name: 'Bitcoin market anchor' })
    expect(card.getAttribute('data-market-bucket')).toBe('binance')
    expect(card.textContent).toContain('Bitcoin anchor unavailable')
    expect(card.textContent).toContain('BTC anchor data could not be found')
  })
})
