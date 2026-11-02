import { boundedJson } from '../monitor/quotes.mjs'
import { TRIAL_HOUR as H, validScenarioInstrument, validTrialCandle } from './opportunityModel.mjs'

// Fixed public hosts and exchange identities only; never follow a URL supplied by a member.
export function createOpportunityHistory({fetcher=fetch,clock=Date.now}={}) {
  const cooldown=new Map(),cache=new Map()
  return async (trial,now,signal)=>{
    const i=trial.instrument,end=Math.min(Math.floor(now/H)*H,trial.startAt+24*H)
    if (!validScenarioInstrument(i) || !Number.isSafeInteger(trial.startAt) || trial.startAt%H) throw new Error('Invalid spot identity/window')
    if (end<=trial.startAt) return []
    signal?.throwIfAborted()
    if ((cooldown.get(i.marketId)??0)>clock()) throw new Error('Exchange cooldown')
    const key=`${i.id}:${trial.startAt}:${end}`,prior=cache.get(key)
    if (prior && prior.until>clock()) return prior.rows
    const upbit=i.marketId==='upbit',symbol=upbit?`${i.quoteCurrency}-${i.symbol.split('/')[0]}`:i.symbol
    const url=new URL(upbit?'https://api.upbit.com/v1/candles/minutes/60':'https://data-api.binance.vision/api/v3/klines')
    url.search=new URLSearchParams(upbit?{market:symbol,count:'25',to:new Date(end).toISOString()}:{symbol,interval:'1h',startTime:String(trial.startAt),endTime:String(end-1),limit:'24'}).toString()
    const response=await fetcher(url.href,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000),redirect:'error',headers:{accept:'application/json'}})
    if (!response.ok) {
      if ([418,429].includes(response.status)) cooldown.set(i.marketId,clock()+Math.max(60,Math.min(3600,Number(response.headers.get('retry-after'))||60))*1000)
      await response.body?.cancel().catch(()=>{})
      throw new Error('Exchange history unavailable')
    }
    const data=await boundedJson(response)
    signal?.throwIfAborted()
    if (!Array.isArray(data) || data.length>(upbit?25:24)) throw new Error('Invalid history payload')
    const rows=data.map(r=>{
      if (upbit && (r?.market!==symbol || typeof r.candle_date_time_utc!=='string')) throw new Error('Mismatched spot market')
      if (!upbit && (!Array.isArray(r) || r.length<7 || Number(r[6])!==Number(r[0])+H-1)) throw new Error('Invalid hourly close')
      const c=upbit?{timestamp:Date.parse(r.candle_date_time_utc+'Z'),open:r.opening_price,high:r.high_price,low:r.low_price,close:r.trade_price,volume:r.candle_acc_trade_volume}:{timestamp:Number(r[0]),open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),volume:Number(r[5])}
      if (!validTrialCandle(c) || c.timestamp+H>end) throw new Error('Invalid or unfinished candle')
      return c
    }).filter(c=>c.timestamp>=trial.startAt)
    for (const [k,v] of cache) if (v.until<=clock()) cache.delete(k)
    if (cache.size>=500) cache.delete(cache.keys().next().value)
    cache.set(key,{rows,until:clock()+60_000})
    return rows
  }
}
