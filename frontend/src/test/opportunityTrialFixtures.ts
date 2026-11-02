import {opportunityNow,opportunityResult} from './opportunityFixtures'
import {createOpportunityTrial,TRIAL_HOUR as H,type OpportunityTrial} from '@/services/cryptoAnalysis/opportunityTrials'
import type {Candle} from '@/types/marketDetail'

export function trialFixture():OpportunityTrial {return createOpportunityTrial(opportunityResult(),.2,opportunityNow,'batch','trial')!}
export function trialBars(trial:OpportunityTrial,count=24):Candle[] {
  const open=(trial.entry[0]+trial.entry[1])/2
  return Array.from({length:count},(_,i)=>({timestamp:trial.startAt+i*H,open,high:open+.05,low:open-.05,close:open,volume:100}))
}
