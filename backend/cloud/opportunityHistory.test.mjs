import test from 'node:test'
import assert from 'node:assert/strict'
import { createOpportunityHistory } from './opportunityHistory.mjs'
import { TRIAL_HOUR as H } from './opportunityModel.mjs'
import { opportunityFixture as fixture,opportunityBars as bars } from './opportunityFixtures.mjs'
const upbit=(t,rows)=>rows.map(c=>({market:`KRW-${t.instrument.symbol.split('/')[0]}`,candle_date_time_utc:new Date(c.timestamp).toISOString().slice(0,19),opening_price:c.open,high_price:c.high,low_price:c.low,trade_price:c.close,candle_acc_trade_volume:c.volume}))
test('reads the original Upbit window even months later, leaves absent trade hours absent and caches bounded requests',async()=>{
  const t=fixture(),rows=bars(t,3).filter((_,n)=>n!==1);let calls=0
  const read=createOpportunityHistory({fetcher:async(url,options)=>{calls++;const u=new URL(url);assert.equal(u.origin,'https://api.upbit.com');assert.equal(u.searchParams.get('market'),'KRW-SOL');assert.equal(u.searchParams.get('to'),new Date(t.startAt+24*H).toISOString());assert.equal(options.redirect,'error');return Response.json(upbit(t,rows))}})
  assert.deepEqual(await read(t,t.startAt+3000*H),rows)
  await read(t,t.startAt+3000*H);assert.equal(calls,1)
})
test('Binance spot uses exact start/end bounds and excludes an unfinished bar',async()=>{
  const t=fixture();t.instrument={...t.instrument,marketId:'binance-spot',id:'binance-spot-solusdt',symbol:'SOLUSDT',quoteCurrency:'USDT'}
  const rows=bars(t,2);let includeFuture=false
  const read=createOpportunityHistory({fetcher:async(url)=>{const u=new URL(url);assert.equal(u.origin,'https://data-api.binance.vision');assert.equal(u.searchParams.get('startTime'),String(t.startAt));assert.equal(u.searchParams.get('endTime'),String(t.startAt+H-1));return Response.json(rows.slice(0,includeFuture?2:1).map(c=>[c.timestamp,String(c.open),String(c.high),String(c.low),String(c.close),String(c.volume),c.timestamp+H-1]))}})
  assert.deepEqual(await read(t,t.startAt+H+1000),rows.slice(0,1))
  includeFuture=true
  const bad=createOpportunityHistory({fetcher:async()=>Response.json(rows.map(c=>[c.timestamp,'100','101','99','100','10',c.timestamp+H-1]))})
  await assert.rejects(bad(t,t.startAt+H+1000),/unfinished/)
})
test('rejects wrong markets, inconsistent OHLC, oversized payloads and untrusted instrument URLs',async()=>{
  const t=fixture(),r=upbit(t,bars(t,1)),at=t.startAt+H
  for(const payload of [[{...r[0],market:'KRW-BTC'}],[{...r[0],high_price:90}],{url:'https://example.com'},Array(26).fill(r[0])]) {
    const read=createOpportunityHistory({fetcher:async()=>Response.json(payload)})
    await assert.rejects(read(t,at))
  }
  const huge=createOpportunityHistory({fetcher:async()=>new Response('x'.repeat(65_000))})
  await assert.rejects(huge(t,at),/응답 크기/)
  const invalid=createOpportunityHistory({fetcher:async()=>{throw Error('must not fetch')}})
  await assert.rejects(invalid({...t,instrument:{...t.instrument,providerSymbol:'https://example.com'}},at),/identity/)
})
test('honors exchange cooldown and aborts before reading',async()=>{
  const t=fixture();let now=t.startAt+H,calls=0
  const read=createOpportunityHistory({clock:()=>now,fetcher:async()=>{calls++;return new Response('{}',{status:429,headers:{'retry-after':'120'}})}})
  await assert.rejects(read(t,now));await assert.rejects(read(t,now),/cooldown/);assert.equal(calls,1)
  now+=120_001;await assert.rejects(read(t,now));assert.equal(calls,2)
  const controller=new AbortController();controller.abort();await assert.rejects(read(t,now,controller.signal));assert.equal(calls,2)
})
