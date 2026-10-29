import { describe, expect, it } from 'vitest'
import { opportunityDecision, opportunityNow, opportunityResult, opportunitySeries } from '@/test/opportunityFixtures'
import { buildCryptoDecision } from './cryptoDecisionEngine'
import { withMarketContext } from './marketContext'
import { opportunityCoin } from '@/test/opportunityFixtures'
import { bestOpportunity, buildOpportunityPlans, opportunityPayoff, opportunityPositionSize, opportunityShortlist, relativeToBitcoin } from './opportunityEngine'

describe('cost-aware long opportunity plans',()=>{
  it('finds a confirmed countertrend rebound without relabeling the broader downtrend',()=>{
    const decision = opportunityDecision(), plans = buildOpportunityPlans(decision)
    expect(decision.direction).toBe('sell')
    expect(bestOpportunity(plans)).toMatchObject({kind:'rebound',status:'ready',priceBasis:'current',referencePrice:101.4,targetBasis:'average'})
    expect(plans.find(p=>p.kind==='pullback')?.status).toBe('avoid')
    expect(decision.direction).toBe('sell')
  })
  it('finds a volume-confirmed breakout separately from the old pullback entry',()=>{
    const plans = buildOpportunityPlans(opportunityDecision(false))
    expect(plans.find(p=>p.kind==='breakout')).toMatchObject({status:'ready',target:108,targetBasis:'swing'})
  })
  it('supports a confirmed pullback but keeps actual resistance and adverse market context gates',()=>{
    const decision = {...opportunityDecision(false),direction:'buy' as const,plan:{frame:'4H' as const,entry:[100,101] as const,stop:99,target:106,resistance:[105,107] as const,sellInvalidation:108,targetBasis:'observed' as const,supportBasis:'pivot' as const,rewardRisk:4}}
    expect(buildOpportunityPlans(decision).find(p=>p.kind==='pullback')?.status).toBe('ready')
    expect(buildOpportunityPlans({...decision,plan:{...decision.plan,targetBasis:'atr'}}).find(p=>p.kind==='pullback')).toMatchObject({status:'avoid',target:null})
    const context = withMarketContext(opportunityDecision(),opportunitySeries(),opportunityCoin,{point:{at:opportunityNow,percent:60,marketChange:-2},previous:{at:opportunityNow-1_800_000,percent:59,marketChange:-2}},opportunityNow)
    expect(buildOpportunityPlans(context).find(p=>p.kind==='rebound')?.status).toBe('watch')
  })
  it('charges assumed costs on both outcomes and rejects misleading or invalid inputs',()=>{
    const payoff = opportunityPayoff(100,98,104,.2)!
    expect(payoff.netRewardRisk).toBeCloseTo(3.8/2.2)
    expect(payoff.plannedLossPercent).toBeCloseTo(2.2)
    expect(opportunityPayoff(100,98,104,1)!.netRewardRisk).toBe(1)
    for (const cost of [-1,NaN,Infinity,3.1]) expect(opportunityPayoff(100,98,104,cost)).toBeNull()
    expect(opportunityPayoff(100,100,104,.2)).toBeNull()
    expect(buildOpportunityPlans(opportunityDecision(),NaN).every(p=>p.status==='unavailable' && !p.entry)).toBe(true)
    expect(buildOpportunityPlans(opportunityDecision(false),3).find(p=>p.kind==='breakout')?.status).toBe('avoid')
  })
  it('requires price, closed-bar recovery, volume and context instead of recommending every falling coin',()=>{
    const d = opportunityDecision()
    const lowVolume = {...d,frames:d.frames.map(f=>f.frame==='1H'?{...f,volumeRatio:1}:f)}
    expect(bestOpportunity(buildOpportunityPlans(lowVolume))).toMatchObject({kind:'rebound',status:'watch'})
    const poorRecovery = {...d,frames:d.frames.map(f=>f.frame==='1H'?{...f,rsi:30}:f)}
    expect(buildOpportunityPlans(poorRecovery).find(p=>p.kind==='rebound')?.status).toBe('watch')
    const belowStop = {...d,price:90}
    expect(buildOpportunityPlans(belowStop).find(p=>p.kind==='rebound')?.status).toBe('avoid')
    const chasing = buildOpportunityPlans({...d,price:102}).find(p=>p.kind==='rebound')!
    expect(chasing.status).not.toBe('ready')
    expect(chasing.referencePrice).toBe(chasing.entry![1])
    expect(chasing.priceBasis).toBe('conditional')
  })
  it('does not invent an overhead target or let incomplete / stale bars trigger entry',()=>{
    const series = opportunitySeries(false)
    series['1H'] = {...series['1H'],candles:series['1H'].candles.map((c,i)=>i===25 ? {...c,high:c.close+.5}:c)}
    expect(buildOpportunityPlans(buildCryptoDecision(series,opportunityNow)).find(p=>p.kind==='breakout')).toMatchObject({status:'avoid',target:null})
    const valid = opportunitySeries()
    const unfinished = {...valid['1H'].candles.at(-1)!,timestamp:opportunityNow,open:101,close:300,high:301,low:100,volume:1e9}
    const current = {...valid,'1H':{...valid['1H'],candles:[...valid['1H'].candles,unfinished]}}
    expect(buildOpportunityPlans(buildCryptoDecision(current,opportunityNow))).toEqual(buildOpportunityPlans(buildCryptoDecision(valid,opportunityNow)))
    expect(buildOpportunityPlans(buildCryptoDecision(valid,opportunityNow+90_001)).every(p=>p.status==='unavailable')).toBe(true)
  })
  it('caps cash and planned losses without leverage and refuses adverse plans',()=>{
    const plan = bestOpportunity(buildOpportunityPlans(opportunityDecision()))
    const size = opportunityPositionSize(plan,10,1000)!
    expect(size.plannedLoss).toBeCloseTo(10)
    expect(size.notional).toBeLessThanOrEqual(1000)
    const limited = opportunityPositionSize(plan,1000,100)!
    expect(limited.notional).toBeCloseTo(100)
    expect(limited.plannedLoss).toBeLessThan(1000)
    expect(opportunityPositionSize({...plan,status:'avoid'},10,1000)).toBeNull()
    expect(opportunityPositionSize(plan,-1,1000)).toBeNull()
  })
})

describe('comparable, fresh relative strength',()=>{
  const pair = ()=>{
    const alt = opportunityResult(), btc = opportunityResult()
    btc.instrument = {...btc.instrument,id:'upbit-btc',symbol:'BTC/KRW'}
    const frame = btc.decision.frames[0]
    btc.decision = {...btc.decision,frames:[{...frame,candles:frame.candles.map((c,i)=>({...c,close:200-i}))},...btc.decision.frames.slice(1)]}
    alt.decision = {...alt.decision,frames:alt.decision.frames.map(f=>({...f,candles:f.candles.map((c,i)=>({...c,close:200-i*.5}))}))}
    return {alt,btc}
  }
  it('shows both returns when a relative winner still loses money',()=>{
    const {alt,btc} = pair(), relative = relativeToBitcoin(alt,btc,opportunityNow)!
    expect(relative.assetReturn).toBeLessThan(0)
    expect(relative.bitcoinReturn).toBeLessThan(0)
    expect(relative.difference).toBeGreaterThan(0)
  })
  it('rejects mismatched venue/currency, shifted or gapped bars and expired results',()=>{
    const {alt,btc} = pair()
    expect(relativeToBitcoin(alt,{...btc,instrument:{...btc.instrument,quoteCurrency:'USDT'}},opportunityNow)).toBeNull()
    expect(relativeToBitcoin(alt,{...btc,instrument:{...btc.instrument,marketId:'binance-spot'}},opportunityNow)).toBeNull()
    expect(relativeToBitcoin(alt,btc,opportunityNow+90_001)).toBeNull()
    const hourly = btc.decision.frames[0]
    expect(relativeToBitcoin(alt,{...btc,decision:{...btc.decision,frames:[{...hourly,candles:hourly.candles.slice(0,-1)}]}},opportunityNow)).toBeNull()
    expect(relativeToBitcoin(alt,{...btc,decision:{...btc.decision,frames:[{...hourly,candles:hourly.candles.filter((_,i)=>i!==77)}]}},opportunityNow)).toBeNull()
    expect(opportunityShortlist([alt,btc],opportunityNow+90_001)).toHaveLength(0)
    expect(opportunityShortlist([alt],opportunityNow-1)).toHaveLength(0)
  })
})
