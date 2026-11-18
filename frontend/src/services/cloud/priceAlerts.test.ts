import { expect, it, vi } from 'vitest'
import { readPriceAlerts, alertInstrumentId } from './priceAlerts'
const request = vi.hoisted(() => vi.fn())
vi.mock('./cloudClient', () => ({ cloudRequest: request }))
it('retains legacy futures alerts without replacing a new spot identity', async () => {
  const instrument = { venue: 'upbit', asset: 'SOL', quote: 'BTC', symbol: 'BTC-SOL' }
  request.mockResolvedValue({ rules: [{ asset: 'BTC' }, { asset: 'SOL', instrument }] })
  const result = await readPriceAlerts()
  expect(result.rules[0].instrument).toEqual({ venue: 'binance-futures', asset: 'BTC', quote: 'USDT', symbol: 'BTCUSDT' })
  expect(alertInstrumentId(result.rules[0].instrument)).toBe('binance-btc')
  expect(result.rules[1].instrument).toEqual(instrument)
  expect(alertInstrumentId(result.rules[1].instrument)).toBe('upbit-btc-sol')
})
