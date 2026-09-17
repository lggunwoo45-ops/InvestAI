import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from '@/app/App'
import { rememberInstrument } from '@/services/market/instrumentRegistry'
import { WATCHLIST_SCHEMA_VERSION } from '@/utils/watchlists'

describe('Discover recently viewed resolution', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.pushState({}, '', '/discover')
  })

  it('shows Explorer-selected instruments and keeps unknown IDs visible', async () => {
    rememberInstrument({ id: 'upbit-sprint72recent', marketId: 'upbit', symbol: 'RECENT/KRW', name: 'Recent Coin', providerSymbol: 'KRW-RECENT', marketType: 'upbit-krw', quoteCurrency: 'KRW', lastPrice: .1, change24hPercent: 2, volume24h: 20 })
    window.localStorage.setItem('investai.recently-viewed.v1', JSON.stringify({ schemaVersion: WATCHLIST_SCHEMA_VERSION, recentlyViewedIds: ['upbit-sprint72recent', 'deleted-recent'] }))
    render(<App />)
    expect(await screen.findByText('RECENT/KRW')).toBeTruthy()
    expect(screen.getByText('deleted-recent')).toBeTruthy()
    expect(screen.getByText('Unavailable')).toBeTruthy()
  })
})
