import { cloudRequest, cloudSnapshot, cloudSessionGeneration } from '@/services/cloud/cloudClient'
import { createOpportunityTrial, MAX_OPPORTUNITY_TRIALS, validOpportunityTrial, type OpportunityTrial } from './opportunityTrials'
import { recordOpportunityBatch, TRIAL_CHANGED, type OpportunityTrialStore } from './opportunityTrialStorage'
import type { ScanResult } from './liveCandidateScan'

interface Snapshot {version:1;asOf:number;trials:OpportunityTrial[]}
let cache:OpportunityTrialStore|null=null,session=-1
export const serverTrialKey=()=>`server:${cloudSnapshot().user?.id??'guest'}:${cloudSessionGeneration()}`
export function readServerTrials():OpportunityTrialStore {
  const key=serverTrialKey()
  if (cache?.key!==key || session!==cloudSessionGeneration()) {session=cloudSessionGeneration();cache={key,trials:[],raw:null,error:false,source:'server',loading:true}}
  return cache!
}
function publish(snapshot:Snapshot,key:string) {
  if (key!==serverTrialKey()) return
  if (snapshot?.version!==1 || !Number.isFinite(snapshot.asOf) || snapshot.asOf<=0 || !Array.isArray(snapshot.trials) || snapshot.trials.length>MAX_OPPORTUNITY_TRIALS || !snapshot.trials.every(validOpportunityTrial) || new Set(snapshot.trials.map(t=>t.id)).size!==snapshot.trials.length) throw new Error('서버 기록 형식을 확인하지 못했습니다.')
  const old=readServerTrials()
  if ((old.asOf??0)>snapshot.asOf || (old.asOf===snapshot.asOf && old.trials.length>snapshot.trials.length)) return
  cache={key,trials:snapshot.trials,raw:null,error:false,source:'server',asOf:snapshot.asOf,loading:false}
  window.dispatchEvent(new Event(TRIAL_CHANGED))
}
export async function refreshServerTrials(signal?:AbortSignal) {
  const key=serverTrialKey()
  try {
    if (!cloudSnapshot().user || !cloudSnapshot().opportunityTrialsAvailable) throw new Error('계정 기록 서버 연결을 확인해주세요. 기존 기기 기록은 아래에서 확인할 수 있습니다.')
    const result=await cloudRequest<Snapshot>('/opportunities')
    if (!signal?.aborted) publish(result,key)
  } catch(e) {
    if (!signal?.aborted && key===serverTrialKey()) {cache={...readServerTrials(),loading:false,error:true,message:e instanceof Error?e.message:'계정 기록을 불러오지 못했습니다.'};window.dispatchEvent(new Event(TRIAL_CHANGED))}
    throw e
  }
}
export async function submitOpportunityBatch(results:readonly ScanResult[],cost:number,now=Date.now()) {
  const member=cloudSnapshot().user
  if (!member) return {...recordOpportunityBatch(results,cost,now),source:'local' as const}
  if (!cloudSnapshot().opportunityTrialsAvailable) throw new Error('계정 기록 서버가 아직 준비되지 않았습니다. 새로고침 후 다시 확인해주세요.')
  const key=serverTrialKey(),batch=crypto.randomUUID()
  const trials=results.map(r=>createOpportunityTrial(r,cost,now,batch,crypto.randomUUID())).filter((t):t is OpportunityTrial=>!!t)
  if (!trials.length) throw new Error('유효한 후보가 없습니다. 최신 가격으로 다시 검색해주세요.')
  const result=await cloudRequest<Snapshot&{added:number;duplicates:number}>('/opportunities',{trials})
  if (key!==serverTrialKey()) throw new Error('계정이 변경되었습니다. 기록한 계정에서 결과를 확인해주세요.')
  publish(result,key)
  return {added:result.added,duplicates:result.duplicates,source:'server' as const}
}
