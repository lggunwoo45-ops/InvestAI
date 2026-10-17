import { afterEach, expect, it, vi } from 'vitest'
import { upbitMarketDataProvider } from './UpbitMarketDataProvider'
import type { MarketInstrument } from '@/types/market'

// Pacing is tested separately using fake time; provider tests inspect mapping.
vi.mock('./upbitRequestGate', () => ({ upbitRequestGate: { run: (operation: () => unknown) => Promise.resolve(operation()), defer: vi.fn() } }))
const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, volume24h: 1000, change24hPercent: 1 }
afterEach(() => vi.unstubAllGlobals())
it('loads history with one REST call and candle start timestamps', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ timestamp: 1704070799999, candle_date_time_utc: '2024-01-01T00:00:00', opening_price: 90, high_price: 110, low_price: 80, trade_price: 100, candle_acc_trade_volume: 2 }] })
  vi.stubGlobal('fetch', fetcher)
  const snapshot = await upbitMarketDataProvider.loadSnapshot(instrument, '1H')
  expect(fetcher).toHaveBeenCalledOnce()
  expect(fetcher.mock.calls[0][0]).toContain('/candles/minutes/60?market=KRW-BTC')
  expect(snapshot.candles[0].timestamp).toBe(Date.parse('2024-01-01T00:00:00Z'))
  expect(snapshot.orderbook.asks).toEqual([]); expect(snapshot.recentTrades).toEqual([])
})
it('requests initial stream snapshots and avoids unsupported daily candle channel', async () => {
  const messages: unknown[] = []
  class FakeSocket {
    addEventListener(event: string, callback: (event: unknown) => void) { if (event === 'open') queueMicrotask(() => callback({})) }
    send(value: string) { messages.push(JSON.parse(value)) }
    close() {}
  }
  vi.stubGlobal('WebSocket', FakeSocket)
  const stop = upbitMarketDataProvider.subscribe(instrument, '1D', { instrument, timeframe: '1D', candles: [], recentTrades: [], orderbook: { symbolId: instrument.id, asks: [], bids: [], spread: 0 } }, vi.fn())
  await vi.waitFor(() => expect(messages).toHaveLength(1))
  expect(messages[0]).toEqual(expect.arrayContaining([{ type: 'ticker', codes: ['KRW-BTC'] }, { type: 'trade', codes: ['KRW-BTC'] }, { type: 'orderbook', codes: ['KRW-BTC'] }]))
  expect(JSON.stringify(messages)).not.toContain('candle.1d')
  stop()
})
