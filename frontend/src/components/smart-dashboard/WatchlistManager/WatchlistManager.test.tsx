import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from '@/app/App'
import { rememberInstrument } from '@/services/market/instrumentRegistry'
import { WATCHLIST_SCHEMA_VERSION } from '@/utils/watchlists'

function createDataTransfer() {
  const values = new Map<string, string>()
  return {
    effectAllowed: 'none',
    types: [] as string[],
    setData(type: string, value: string) {
      values.set(type, value)
      if (!this.types.includes(type)) this.types.push(type)
    },
    getData(type: string) { return values.get(type) ?? '' },
  }
}

describe('WatchlistManager drag safety', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.pushState({}, '', '/dashboard')
  })

  it('does not reorder after a cancelled internal drag or an external drop', async () => {
    render(<App />)
    const watchlist = await screen.findByRole('region', { name: 'Watchlist 2.0' })
    const firstRow = within(watchlist).getByText('BTC/KRW').closest('[draggable="true"]')
    const secondRow = within(watchlist).getByText('ETH/KRW').closest('[draggable="true"]')
    expect(firstRow).toBeTruthy()
    expect(secondRow).toBeTruthy()

    const internalTransfer = createDataTransfer()
    fireEvent.dragStart(firstRow!, { dataTransfer: internalTransfer })
    fireEvent.dragEnd(firstRow!, { dataTransfer: internalTransfer })
    fireEvent.drop(secondRow!, { dataTransfer: internalTransfer })

    const externalTransfer = createDataTransfer()
    externalTransfer.setData('text/plain', 'external content')
    fireEvent.drop(secondRow!, { dataTransfer: externalTransfer })

    const rows = within(watchlist).getAllByText(/BTC\/KRW|ETH\/KRW/)
    expect(rows.map((row) => row.textContent)).toEqual(['BTC/KRW', 'ETH/KRW'])
  })

  it('keeps orphaned IDs visible and removable', async () => {
    window.localStorage.setItem('investai.watchlists.v2', JSON.stringify({
      schemaVersion: WATCHLIST_SCHEMA_VERSION,
      watchlists: [{ id: 'crypto', name: 'Crypto', instrumentIds: ['upbit-btc', 'removed-symbol'], isDefault: true }],
    }))
    render(<App />)

    const watchlist = await screen.findByRole('region', { name: 'Watchlist 2.0' })
    expect(within(watchlist).getByText('Unavailable')).toBeTruthy()
    fireEvent.click(within(watchlist).getByRole('button', { name: 'Remove removed-symbol' }))
    expect(within(watchlist).queryByText('Unavailable')).toBeNull()
  })

  it('shows expanded Explorer favorites in the Dashboard without an Unavailable row', async () => {
    rememberInstrument({ id: 'binance-spot-sprint72rowusdt', marketId: 'binance-spot', symbol: 'ROWUSDT', name: 'Row Coin', providerSymbol: 'ROWUSDT', marketType: 'binance-spot', quoteCurrency: 'USDT', lastPrice: .000001, change24hPercent: 1, volume24h: 10 })
    rememberInstrument({ id: 'upbit-sprint72row', marketId: 'upbit', symbol: 'ROW/KRW', name: 'Row Korea', providerSymbol: 'KRW-ROW', marketType: 'upbit-krw', quoteCurrency: 'KRW', lastPrice: .1, change24hPercent: 1, volume24h: 10 })
    window.localStorage.setItem('investai.watchlists.v2', JSON.stringify({
      schemaVersion: WATCHLIST_SCHEMA_VERSION,
      watchlists: [{ id: 'crypto', name: 'Crypto', instrumentIds: ['binance-spot-sprint72rowusdt', 'upbit-sprint72row'], isDefault: true }],
    }))
    render(<App />)
    const watchlist = await screen.findByRole('region', { name: 'Watchlist 2.0' })
    expect(await within(watchlist).findByText('ROWUSDT')).toBeTruthy()
    expect(within(watchlist).getByText('ROW/KRW')).toBeTruthy()
    expect(within(watchlist).getByText('0.000001 USDT')).toBeTruthy()
    expect(within(watchlist).queryByText('Unavailable')).toBeNull()
  })
})
