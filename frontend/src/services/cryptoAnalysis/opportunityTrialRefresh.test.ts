import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {trialFixture,trialBars} from '@/test/opportunityTrialFixtures'
import {evaluateOpportunityTrial,TRIAL_HOUR as H} from './opportunityTrials'
import {readOpportunityTrials,trialStorageKey} from './opportunityTrialStorage'
import {refreshOpportunityTrials} from './opportunityTrialRefresh'
import type {Candle} from '@/types/marketDetail'

const account=vi.hoisted(()=>({id:'one'}))
vi.mock('@/services/cloud/cloudClient',()=>({cloudSnapshot:()=>({user:{id:account.id}})}))
beforeEach(()=>{localStorage.clear();account.id='one'})
afterEach(()=>vi.useRealTimers())
const seed=()=>{const trial=trialFixture();localStorage.setItem(trialStorageKey(),JSON.stringify({version:1,trials:[trial]}));return trial}
it('retrieves subsequent prices once, persists outcomes and never reloads a terminal result',async()=>{
  const trial=seed(),bar=trialBars(trial)[0],now=()=>trial.startAt+H
  const load=vi.fn().mockResolvedValue([{...bar,high:trial.target}])
  await refreshOpportunityTrials(new AbortController().signal,{now,load})
  expect(load).toHaveBeenCalledTimes(1)
  expect(evaluateOpportunityTrial(readOpportunityTrials().trials[0],now()).state).toBe('target')
  await refreshOpportunityTrials(new AbortController().signal,{now,load})
  expect(load).toHaveBeenCalledTimes(1)
})
it('preserves evidence after connection failure and recovers on a later request',async()=>{
  const trial=seed(),now=()=>trial.startAt+H,signal=new AbortController().signal
  await refreshOpportunityTrials(signal,{now,load:async()=>{throw new Error('offline')}})
  expect(readOpportunityTrials().trials[0]).toMatchObject({issue:'connection',evidence:[]})
  await refreshOpportunityTrials(signal,{now,load:async()=>trialBars(trial,1)})
  expect(readOpportunityTrials().trials[0]).toMatchObject({issue:null,evidence:trialBars(trial,1)})
})
it('settles a provider that ignores abort without persisting its late response',async()=>{
  const trial=seed(),raw=localStorage.getItem(trialStorageKey()),controller=new AbortController()
  let done!:(bars:Candle[])=>void
  const load=vi.fn(()=>new Promise<Candle[]>(resolve=>{done=resolve}))
  const request=refreshOpportunityTrials(controller.signal,{now:()=>trial.startAt+H,load})
  controller.abort();await request;done(trialBars(trial,1));await Promise.resolve()
  expect(localStorage.getItem(trialStorageKey())).toBe(raw)
})
it('bounds unresponsive providers and rejects results after an account switch',async()=>{
  vi.useFakeTimers()
  const trial=seed(),now=()=>trial.startAt+H
  const request=refreshOpportunityTrials(new AbortController().signal,{now,load:()=>new Promise(()=>{})})
  await vi.advanceTimersByTimeAsync(18_000);await request
  expect(readOpportunityTrials().trials[0].issue).toBe('connection')
  const key=trialStorageKey(),raw=localStorage.getItem(key)
  await refreshOpportunityTrials(new AbortController().signal,{now,load:async()=>{account.id='two';return trialBars(trial,1)}})
  expect(localStorage.getItem(key)).toBe(raw)
  expect(readOpportunityTrials().trials).toHaveLength(0)
})
