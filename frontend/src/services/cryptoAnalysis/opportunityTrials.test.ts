import { describe,expect,it } from 'vitest'
import { opportunityNow,opportunityResult } from '@/test/opportunityFixtures'
import { createOpportunityTrial,evaluateOpportunityTrial,mergeTrialEvidence,summarizeOpportunityTrials,TRIAL_HOUR as H,validOpportunityTrial,type OpportunityTrial } from './opportunityTrials'
import type { Candle } from '@/types/marketDetail'
import {trialFixture,trialBars} from '@/test/opportunityTrialFixtures'
const finish=(trial:OpportunityTrial,bars:Candle[],at=trial.startAt+24*H)=>evaluateOpportunityTrial(mergeTrialEvidence(trial,bars,at),at)
describe('immutable forward opportunity outcomes',()=>{
  it('records current qualified spot cases, freezes their evidence and refuses stale or non-qualified plans',()=>{
    const result=opportunityResult(),trial=trialFixture()
    expect(validOpportunityTrial(trial)).toBe(true)
    expect(trial).toMatchObject({kind:'rebound',signalPrice:101.4,startAt:opportunityNow+H,costPercent:.2})
    expect(trial.basis).toHaveLength(3)
    expect(createOpportunityTrial(result,.2,opportunityNow+90_001,'b','id')).toBeNull()
    expect(createOpportunityTrial({...result,instrument:{...result.instrument,marketId:'binance-futures'}},.2,opportunityNow,'b','id')).toBeNull()
    expect(createOpportunityTrial({...result,decision:{...result.decision,price:90}},.2,opportunityNow,'b','id')).toBeNull()
    expect(validOpportunityTrial({...trial,entry:[trial.stop,trial.entry[1]]})).toBe(false)
    expect(validOpportunityTrial({...trial,startAt:opportunityNow})).toBe(false)
    expect(validOpportunityTrial({...trial,basis:[]})).toBe(false)
    expect(validOpportunityTrial({...trial,basis:[null,null]})).toBe(false)
  })
  it('uses only the next full hourly open and never treats later zone contact as an entry',()=>{
    const trial=trialFixture(),bars=trialBars(trial)
    bars[0]={...bars[0],open:trial.entry[1]+2,high:trial.target+1,low:trial.stop-1}
    const result=finish(trial,bars)
    expect(result).toMatchObject({state:'skipped',entry:null,netLow:null})
    const unfinished=mergeTrialEvidence(trial,trialBars(trial),trial.startAt+H-1)
    expect(unfinished.evidence).toHaveLength(0)
    expect(evaluateOpportunityTrial(unfinished,trial.startAt+H-1).state).toBe('pending')
  })
  it('deducts the fixed cost and handles target, stop, timeout and adverse opening gaps',()=>{
    const trial=trialFixture(),bars=trialBars(trial)
    const target=finish(trial,[{...bars[0],high:trial.target}])
    expect(target.state).toBe('target')
    expect(target.netLow).toBeCloseTo((trial.target/bars[0].open-1)*100-.2)
    expect(finish(trial,[{...bars[0],low:trial.stop}]).state).toBe('stop')
    const gap={...bars[1],open:trial.stop-2,high:trial.stop,low:trial.stop-3,close:trial.stop-1}
    expect(finish(trial,[bars[0],gap])).toMatchObject({state:'stop',exit:trial.stop-2})
    expect(finish(trial,bars)).toMatchObject({state:'timeout',netLow:-.2,netHigh:-.2})
    expect(finish(trial,bars.slice(0,2),trial.startAt+2*H).state).toBe('open')
  })
  it('includes same-bar ambiguity as a loss-to-gain range, not a winning guess',()=>{
    const trial=trialFixture(),bar=trialBars(trial)[0]
    const recorded=mergeTrialEvidence(trial,[{...bar,low:trial.stop,high:trial.target}],trial.startAt+H)
    const result=evaluateOpportunityTrial(recorded,trial.startAt+H)
    expect(result.state).toBe('ambiguous');expect(result.netLow!).toBeLessThan(0);expect(result.netHigh!).toBeGreaterThan(0)
    expect(summarizeOpportunityTrials([recorded],trial.startAt+H)).toMatchObject({completed:1,ambiguous:1,winsLow:0,winsHigh:100})
  })
  it('does not bridge gaps, recovers missing evidence later and freezes terminal results',()=>{
    const trial=trialFixture(),bars=trialBars(trial),at=trial.startAt+24*H
    bars[2].high=trial.target
    const gap=mergeTrialEvidence(trial,bars.filter((_,i)=>i!==1),at)
    expect(gap.evidence).toHaveLength(1)
    expect(evaluateOpportunityTrial(gap,at)).toMatchObject({state:'unresolved',netLow:null})
    const recovered=mergeTrialEvidence(gap,bars,at+1)
    expect(evaluateOpportunityTrial(recovered,at+1).state).toBe('target')
    expect(mergeTrialEvidence(recovered,[{...bars[0],close:100.9}],at+2)).toEqual(recovered)
  })
  it('keeps conflicting history out of performance and rejects clock rollback / invalid OHLC',()=>{
    const trial=trialFixture(),bars=trialBars(trial),at=trial.startAt+H
    const first=mergeTrialEvidence(trial,[bars[0]],at)
    const conflict=mergeTrialEvidence(first,[{...bars[0],volume:101}],at+1)
    expect(conflict.issue).toBe('revised')
    expect(evaluateOpportunityTrial(conflict,at+1).state).toBe('unresolved')
    expect(mergeTrialEvidence(conflict,bars,at+24*H).issue).toBe('revised')
    expect(()=>mergeTrialEvidence(first,bars,at-1)).toThrow()
    expect(mergeTrialEvidence(trial,[{...bars[0],high:0}],at).issue).toBe('revised')
    expect(mergeTrialEvidence(trial,[bars[0],{...bars[0],close:101}],at).issue).toBe('revised')
    expect(evaluateOpportunityTrial(trial,opportunityNow-1).state).toBe('unresolved')
  })
  it('separates pending, unresolved and skipped records from the completed denominator',()=>{
    const trial=trialFixture(),bars=trialBars(trial),now=trial.startAt+H
    const completed=mergeTrialEvidence(trial,[{...bars[0],high:trial.target}],now)
    const skipped=mergeTrialEvidence({...trial,id:'skip'},[{...bars[0],open:trial.entry[0]-.1,low:trial.entry[0]-.2}],now)
    const sum=summarizeOpportunityTrials([completed,skipped,{...trial,id:'missing'}],now)
    expect(sum).toMatchObject({total:3,completed:1,skipped:1,unresolved:1,winsLow:100,winsHigh:100})
    expect(summarizeOpportunityTrials([completed],now,'pullback').completed).toBe(0)
  })
})
