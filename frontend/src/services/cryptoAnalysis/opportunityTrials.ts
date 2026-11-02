import type { Candle } from '@/types/marketDetail'
import type { MarketInstrument } from '@/types/market'
import type { ScanResult } from './liveCandidateScan'
import { bestOpportunity, buildOpportunityPlans, freshScanResult, type OpportunityKind } from './opportunityEngine'
import { validScenarioInstrument } from '@/services/scenarios/scenarioStorage'
import type { AnalysisFrame, Direction } from './cryptoDecisionEngine'

import { TRIAL_HOUR, TRIAL_VERSION, validOpportunityTrial } from '../../../../backend/cloud/opportunityModel.mjs'
export { TRIAL_HOUR, TRIAL_VERSION, MAX_OPPORTUNITY_TRIALS, validTrialCandle, validOpportunityTrial, evaluateOpportunityTrial, isTrialComplete, mergeTrialEvidence, summarizeOpportunityTrials } from '../../../../backend/cloud/opportunityModel.mjs'
export interface OpportunityTrial {
  id:string; batchId:string; version:typeof TRIAL_VERSION; recordedAt:number; signalAt:number; signalCandleAt:number
  instrument:MarketInstrument; kind:OpportunityKind; entry:[number,number]; stop:number; target:number; costPercent:number
  signalPrice:number; startAt:number; horizonHours:24; checkedAt:number|null; issue:'history'|'connection'|'revised'|null
  basis:{frame:AnalysisFrame;asOf:number;close:number;rsi:number;atr:number;volumeRatio:number|null;direction:Direction}[]
  evidence:Candle[]
}
export type TrialState = 'pending'|'open'|'target'|'stop'|'timeout'|'ambiguous'|'skipped'|'unresolved'
export interface TrialOutcome {
  state:TrialState; entry:number|null; exit:number|null; at:number|null; netLow:number|null; netHigh:number|null; bars:number
}
/** Save only currently qualified spot plans. Both signal and eventual simulation prices remain distinct. */
export function createOpportunityTrial(result:ScanResult,cost:number,recordedAt:number,batchId:string,id:string):OpportunityTrial|null {
  if (!freshScanResult(result,recordedAt) || !validScenarioInstrument(result.instrument)) return null
  const plan = bestOpportunity(buildOpportunityPlans(result.decision,cost))
  const hour = result.decision.frames.find(f=>f.frame==='1H' && !f.issue)
  if (plan.status!=='ready' || !plan.entry || !plan.stop || !plan.target || !hour?.asOf || !result.decision.price) return null
  const trial:OpportunityTrial = {id,batchId,version:TRIAL_VERSION,recordedAt,signalAt:result.analyzedAt,signalCandleAt:hour.asOf,
    instrument:{...result.instrument},kind:plan.kind,entry:[...plan.entry],stop:plan.stop,target:plan.target,costPercent:cost,signalPrice:result.decision.price,
    startAt:(Math.floor(recordedAt/TRIAL_HOUR)+1)*TRIAL_HOUR,horizonHours:24,checkedAt:null,issue:null,evidence:[],
    basis:result.decision.frames.filter(f=>!f.issue).map(f=>({frame:f.frame,asOf:f.asOf!,close:f.close!,rsi:f.rsi!,atr:f.atr!,volumeRatio:f.volumeRatio,direction:f.direction}))}
  return validOpportunityTrial(trial) ? trial : null
}
