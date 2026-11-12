import { describe, expect, it } from 'vitest'
import { buildMajorSupport } from './majorSupport'
import { supportHistory, supportInstrument, supportNow as now } from '@/test/majorSupportFixture'
const quote = { dataQuality: 'live' as const, connectionStatus: 'live', updatedAt: now, currentPrice: 100, candles: [] }
describe('major support evidence ranking', () => {
  it('ranks repeated distant weekly support above a recent nearby low without hardcoded prices', () => {
    const history = supportHistory(), original = JSON.stringify(history)
    const model = buildMajorSupport(supportInstrument, history, quote, now)
    expect(model.status).toBe('ready')
    expect(model.candidates[0].center).toBe(82)
    expect(model.candidates[0].reactions).toBeGreaterThanOrEqual(5)
    expect(model.candidates[0].weeklyPivots).toBeGreaterThanOrEqual(4)
    expect(model.weeks).toBeGreaterThan(50)
    expect(JSON.stringify(history)).toBe(original)
    const scaled = { ...history, candles: history.candles.map(c => ({ ...c, open:c.open*1e6, high:c.high*1e6, low:c.low*1e6, close:c.close*1e6 })) }
    expect(buildMajorSupport(supportInstrument, scaled, { ...quote, currentPrice:1e8 }, now).candidates[0].center).toBe(82e6)
  })
  it('excludes incomplete daily bars and incomplete weeks', () => {
    const history = supportHistory(), model = buildMajorSupport(supportInstrument, history, quote, now)
    const timestamp = Math.floor(now/86_400_000)*86_400_000
    expect(buildMajorSupport(supportInstrument, { ...history, candles:[...history.candles, { timestamp,open:100,close:100,high:1e9,low:.001,volume:1e9 }] }, quote, now)).toEqual(model)
  })
  it('removes a support after two completed closes below its band even during an intraday reclaim', () => {
    const history = supportHistory()
    history.candles = history.candles.map((c, i) => i >= 398 ? { ...c,open:79,close:79,low:78,high:80 } : c)
    expect(buildMajorSupport(supportInstrument, history, quote, now).candidates.some(c => c.center === 82)).toBe(false)
  })
  it('does not invent a floor or call a single reaction a major support', () => {
    const history = supportHistory()
    expect(buildMajorSupport(supportInstrument, history, { ...quote,currentPrice:50 }, now).status).toBe('no-confluence')
    history.candles = history.candles.map((c,i) => i < 280 ? { ...c,open:110,close:110,high:112,low:108 } : c)
    expect(buildMajorSupport(supportInstrument, history, quote, now).status).toBe('no-confluence')
  })
  it('withholds stale, mock, mismatched, malformed and incomplete history', () => {
    const history = supportHistory()
    for (const data of [{...history,currency:'USDT'}, {...history,instrumentId:'other'}, {...history,fetchedAt:now-1_800_001}, {...history,fetchedAt:now+61_000}, {...history,candles:[...history.candles,history.candles[0]]}]) expect(buildMajorSupport(supportInstrument,data,quote,now).status).toBe('data')
    expect(buildMajorSupport(supportInstrument,history,{...quote,dataQuality:'mock'},now).candidates).toEqual([])
    expect(buildMajorSupport(supportInstrument,history,{...quote,updatedAt:now-91_000},now).status).toBe('data')
    expect(buildMajorSupport(supportInstrument,{...history,candles:history.candles.slice(-100)},quote,now).status).toBe('history')
    expect(buildMajorSupport(supportInstrument,{...history,candles:history.candles.slice(0,-4)},quote,now).status).toBe('history')
    expect(buildMajorSupport(supportInstrument,{...history,candles:history.candles.filter((_,i)=>i%5!==0)},quote,now).status).toBe('history')
  })
})
