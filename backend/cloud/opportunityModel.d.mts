import type { Candle } from '../../frontend/src/types/marketDetail'
import type { MarketInstrument } from '../../frontend/src/types/market'
import type { OpportunityKind } from '../../frontend/src/services/cryptoAnalysis/opportunityEngine'
import type { OpportunityTrial, TrialOutcome, TrialState } from '../../frontend/src/services/cryptoAnalysis/opportunityTrials'
export const TRIAL_HOUR:3600000
export const TRIAL_VERSION:'opportunity-v1'
export const MAX_OPPORTUNITY_TRIALS:100
export function validScenarioInstrument(value:unknown):value is MarketInstrument
export function validTrialCandle(value:Candle):boolean
export function validOpportunityTrial(value:unknown):value is OpportunityTrial
export function evaluateOpportunityTrial(trial:OpportunityTrial,now:number):TrialOutcome
export function isTrialComplete(state:TrialState):boolean
export function mergeTrialEvidence(trial:OpportunityTrial,incoming:readonly Candle[],now:number):OpportunityTrial
export function summarizeOpportunityTrials(trials:readonly OpportunityTrial[],now:number,kind?:OpportunityKind):{total:number;completed:number;meanLow:number|null;meanHigh:number|null;winsLow:number|null;winsHigh:number|null;pending:number;unresolved:number;skipped:number;ambiguous:number}
