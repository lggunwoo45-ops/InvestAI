import { afterEach, expect, it, vi } from 'vitest'
import { loadCryptoDailyHistory } from './dailyHistory'
import { fetchJson } from './providerUtils'
import { supportInstrument } from '@/test/majorSupportFixture'
vi.mock('./providerUtils', () => ({fetchJson:vi.fn()}))
afterEach(() => vi.resetAllMocks())
function rows(end: number, count=200, market='KRW-BTC') { return Array.from({length:count},(_,i)=>({market,candle_date_time_utc:new Date(end-i*86_400_000).toISOString().slice(0,19),opening_price:100,trade_price:101,high_price:102,low_price:99,candle_acc_trade_volume:50})) }
const end=Date.parse('2026-11-12T00:00:00Z')
it('loads at most four chronological pages with exclusive UTC cursors and keeps KRW identity', async () => {
  vi.mocked(fetchJson).mockImplementation(async (url) => { const before=new URL(url).searchParams.get('to'); return rows(before?Date.parse(before)-86_400_000:end) as never })
  const data=await loadCryptoDailyHistory(supportInstrument,new AbortController().signal)
  expect(data).toHaveLength(799); expect(fetchJson).toHaveBeenCalledTimes(4)
  expect(data.at(-1)?.timestamp).toBe(end-86_400_000)
  expect(data.every((c,i)=>!i||c.timestamp-data[i-1].timestamp===86_400_000)).toBe(true)
  expect(String(vi.mocked(fetchJson).mock.calls[1][0])).toContain('to=')
  expect(vi.mocked(fetchJson).mock.calls.every(([url])=>url.includes('market=KRW-BTC'))).toBe(true)
})
it('stops at a short page, rejects duplicate cursors and mismatched identities', async () => {
  vi.mocked(fetchJson).mockResolvedValueOnce(rows(end,80))
  expect(await loadCryptoDailyHistory(supportInstrument,new AbortController().signal)).toHaveLength(79)
  expect(fetchJson).toHaveBeenCalledTimes(1)
  vi.mocked(fetchJson).mockResolvedValue(rows(end))
  await expect(loadCryptoDailyHistory(supportInstrument,new AbortController().signal)).rejects.toThrow('history-cursor')
  vi.mocked(fetchJson).mockResolvedValue(rows(end,1,'USDT-BTC'))
  await expect(loadCryptoDailyHistory(supportInstrument,new AbortController().signal)).rejects.toThrow('history-identity')
})
it('never switches Binance spot to futures or fabricates data when a request fails', async () => {
  const instrument={...supportInstrument,id:'binance-spot-btc',marketId:'binance-spot' as const,symbol:'BTC/USDT',quoteCurrency:'USDT'}
  vi.mocked(fetchJson).mockResolvedValue([[end-86_400_000,'100','102','99','101','50'],[end,'100','10000','1','101','50']])
  const history=await loadCryptoDailyHistory(instrument,new AbortController().signal)
  expect(history).toHaveLength(1); expect(history[0].timestamp).toBe(end-86_400_000)
  expect(vi.mocked(fetchJson).mock.calls[0][0]).toBe('https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=800')
  vi.mocked(fetchJson).mockRejectedValue(new Error('offline'))
  await expect(loadCryptoDailyHistory(instrument,new AbortController().signal)).rejects.toThrow('offline')
  const controller=new AbortController(); controller.abort(); const calls=vi.mocked(fetchJson).mock.calls.length
  await expect(loadCryptoDailyHistory(instrument,controller.signal)).rejects.toMatchObject({name:'AbortError'})
  expect(fetchJson).toHaveBeenCalledTimes(calls)
})
