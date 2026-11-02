import { cloudSnapshot } from '@/services/cloud/cloudClient'
import type { ScanResult } from './liveCandidateScan'
import { createOpportunityTrial, evaluateOpportunityTrial, isTrialComplete, MAX_OPPORTUNITY_TRIALS, validOpportunityTrial, type OpportunityTrial } from './opportunityTrials'

export const TRIAL_CHANGED = 'investai:opportunity-trials-changed'
export const trialStorageKey = () => `investai.opportunity.trials.v1.${encodeURIComponent(cloudSnapshot().user?.id ?? 'guest')}`
type Store = Pick<Storage,'getItem'|'setItem'>
export interface OpportunityTrialStore { trials:OpportunityTrial[]; raw:string|null; error:boolean; key:string; source?:'server'|'local'; asOf?:number; loading?:boolean; message?:string }
export function readOpportunityTrials(key=trialStorageKey(),storage:Store=localStorage):OpportunityTrialStore {
  let raw:string|null=null
  try {
    raw=storage.getItem(key)
    if (raw===null) return {key,raw,trials:[],error:false}
    if (raw.length>1_000_000) throw new Error('size')
    const data=JSON.parse(raw)
    if (data?.version!==1 || !Array.isArray(data.trials) || data.trials.length>MAX_OPPORTUNITY_TRIALS || !data.trials.every(validOpportunityTrial)
      || new Set(data.trials.map((r:OpportunityTrial)=>r.id)).size!==data.trials.length
      || new Set(data.trials.map(trialIdentity)).size!==data.trials.length) throw new Error('schema')
    return {key,raw,trials:data.trials,error:false}
  } catch { return {key,raw,trials:[],error:true} }
}
const trialIdentity=(r:OpportunityTrial)=>`${r.instrument.id}:${r.kind}:${r.signalCandleAt}`
function writeOpportunityTrials(trials:OpportunityTrial[],store:OpportunityTrialStore,storage:Store=localStorage) {
  if (store.error || trials.length>MAX_OPPORTUNITY_TRIALS || !trials.every(validOpportunityTrial)) throw new Error('invalid')
  if (trialStorageKey()!==store.key || storage.getItem(store.key)!==store.raw) throw new Error('changed')
  const raw=JSON.stringify({version:1,trials})
  if (raw.length>1_000_000) throw new Error('capacity')
  storage.setItem(store.key,raw)
  window.dispatchEvent(new Event(TRIAL_CHANGED))
}
/** One batch contains ALL eligible spot results, never only the three cards currently visible. */
export function recordOpportunityBatch(results:readonly ScanResult[],cost:number,now=Date.now(),storage:Store=localStorage) {
  const store=readOpportunityTrials(trialStorageKey(),storage)
  if (store.error) throw new Error('storage')
  const batchId=crypto.randomUUID(), trials=[...store.trials]
  let added=0,duplicates=0
  for (const result of results) {
    const trial=createOpportunityTrial(result,cost,now,batchId,crypto.randomUUID())
    if (!trial) continue
    const overlapping=trials.some(old=>old.instrument.id===trial.instrument.id && (!isTrialComplete(evaluateOpportunityTrial(old,now).state) && now<old.startAt+24*3_600_000))
    if (overlapping || trials.some(old=>trialIdentity(old)===trialIdentity(trial))) { duplicates++; continue }
    trials.push(trial); added++
  }
  if (trials.length>MAX_OPPORTUNITY_TRIALS) throw new Error('capacity')
  if (added) writeOpportunityTrials(trials,store,storage)
  return {added,duplicates}
}
export function saveOpportunityTrialUpdate(next:OpportunityTrial,key:string,storage:Store=localStorage) {
  const store=readOpportunityTrials(key,storage), old=store.trials.find(r=>r.id===next.id)
  if (!old || store.error || !validOpportunityTrial(next)) throw new Error('storage')
  const frozen=(r:OpportunityTrial)=>JSON.stringify({...r,checkedAt:null,issue:null,evidence:[]})
  if (frozen(old)!==frozen(next)) throw new Error('changed')
  // Another tab may have observed more evidence while this request was in flight.
  if (old.issue==='revised' || (old.checkedAt??0)>(next.checkedAt??0) || old.evidence.length>next.evidence.length || isTrialComplete(evaluateOpportunityTrial(old,next.checkedAt??Date.now()).state)) return
  if (old.evidence.some((c,i)=>(['timestamp','open','high','low','close','volume'] as const).some(field=>c[field]!==next.evidence[i]?.[field]))) throw new Error('changed')
  writeOpportunityTrials(store.trials.map(r=>r.id===next.id?next:r),store,storage)
}
