import {beforeEach,expect,it,vi} from 'vitest'
import {opportunityNow,opportunityResult} from '@/test/opportunityFixtures'
import {readOpportunityTrials,recordOpportunityBatch,saveOpportunityTrialUpdate,trialStorageKey} from './opportunityTrialStorage'
import {mergeTrialEvidence,TRIAL_HOUR} from './opportunityTrials'

beforeEach(()=>localStorage.clear())
it('records the whole eligible cohort, prevents duplicates/overlap and leaves original levels immutable',()=>{
  const result=opportunityResult()
  const rows=Array.from({length:5},(_,i)=>({...result,instrument:{...result.instrument,id:`upbit-c${i}`,symbol:`C${i}/KRW`}}))
  expect(recordOpportunityBatch(rows,.2,opportunityNow)).toEqual({added:5,duplicates:0})
  expect(recordOpportunityBatch(rows,.3,opportunityNow+1)).toEqual({added:0,duplicates:5})
  const store=readOpportunityTrials(),trial=store.trials[0]
  expect(trial.costPercent).toBe(.2)
  expect(()=>saveOpportunityTrialUpdate({...trial,target:trial.target+5},store.key)).toThrow('changed')
  const bar={timestamp:trial.startAt,open:trial.signalPrice,close:trial.signalPrice,high:trial.signalPrice+.1,low:trial.signalPrice-.1,volume:1}
  saveOpportunityTrialUpdate(mergeTrialEvidence(trial,[bar],trial.startAt+TRIAL_HOUR),store.key)
  expect(readOpportunityTrials().trials[0].evidence).toHaveLength(1)
  saveOpportunityTrialUpdate({...trial,checkedAt:trial.startAt},store.key)
  expect(readOpportunityTrials().trials[0].evidence).toHaveLength(1)
  const observed=readOpportunityTrials().trials[0]
  expect(()=>saveOpportunityTrialUpdate({...observed,evidence:[{...bar,volume:2}]},store.key)).toThrow('changed')
  saveOpportunityTrialUpdate({...observed,issue:'revised'},store.key)
  saveOpportunityTrialUpdate({...observed,checkedAt:observed.checkedAt!+1},store.key)
  expect(readOpportunityTrials().trials[0].issue).toBe('revised')
})
it('preserves corrupt storage and reports write failures without silently losing a record',()=>{
  const key=trialStorageKey();localStorage.setItem(key,'broken')
  expect(readOpportunityTrials().error).toBe(true)
  expect(()=>recordOpportunityBatch([opportunityResult()],.2,opportunityNow)).toThrow()
  expect(localStorage.getItem(key)).toBe('broken')
  localStorage.clear()
  const storage={getItem:()=>null,setItem:vi.fn(()=>{throw new Error('quota')})}
  expect(()=>recordOpportunityBatch([opportunityResult()],.2,opportunityNow,storage)).toThrow('quota')
})
it('rejects concurrent edits and capacity overflow without deleting prior cases',()=>{
  let reads=0
  const storage={getItem:()=>++reads===1?null:'changed',setItem:vi.fn()}
  expect(()=>recordOpportunityBatch([opportunityResult()],.2,opportunityNow,storage)).toThrow('changed')
  expect(storage.setItem).not.toHaveBeenCalled()
  const result=opportunityResult(),rows=Array.from({length:101},(_,i)=>({...result,instrument:{...result.instrument,id:`upbit-x${i}`,symbol:`X${i}/KRW`}}))
  expect(()=>recordOpportunityBatch(rows,.2,opportunityNow)).toThrow('capacity')
  expect(readOpportunityTrials().trials).toHaveLength(0)
})
