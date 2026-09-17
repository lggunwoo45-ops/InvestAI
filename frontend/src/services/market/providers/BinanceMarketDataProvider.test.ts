import { describe, expect, it } from 'vitest'

import { binanceStreamOrderbook, binanceStreamUrl } from './BinanceMarketDataProvider'

describe('Binance venue-specific partial book streams', () => {
  it('uses Spot 100ms depth and provider symbol', () => {
    expect(binanceStreamUrl('spot', 'ETHBTC', '1m')).toContain('ethbtc@depth10@100ms')
    expect(binanceStreamUrl('spot', 'ETHBTC', '1m')).toContain('ethbtc@kline_1m')
    expect(binanceStreamUrl('spot', 'ETHBTC', '1m')).toContain('stream.binance.com')
  })

  it('keeps the Futures 500ms stream separate', () => {
    expect(binanceStreamUrl('futures', 'BTCUSDT', '1H')).toContain('btcusdt@depth10@500ms')
    expect(binanceStreamUrl('futures', 'BTCUSDT', '1H')).toContain('fstream.binance.com')
  })

  it('parses Spot asks/bids and Futures a/b without mixing schemas', () => {
    expect(binanceStreamOrderbook({ asks: [['2', '3']], bids: [['1', '4']] }, 'spot')).toMatchObject({ asks: [{ price: 2 }], bids: [{ price: 1 }] })
    expect(binanceStreamOrderbook({ a: [['2', '3']], b: [['1', '4']] }, 'futures')).toMatchObject({ asks: [{ price: 2 }], bids: [{ price: 1 }] })
    expect(binanceStreamOrderbook({ a: [], b: [] }, 'spot')).toBeNull()
  })
})
