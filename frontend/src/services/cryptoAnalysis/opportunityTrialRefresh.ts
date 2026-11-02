import { marketDataService } from '@/services/market/marketDataService'
import { mergeTrialEvidence, evaluateOpportunityTrial, isTrialComplete, TRIAL_HOUR, type OpportunityTrial } from './opportunityTrials'
import { readOpportunityTrials, saveOpportunityTrialUpdate, trialStorageKey } from './opportunityTrialStorage'
import type { Candle } from '@/types/marketDetail'
import type { MarketInstrument } from '@/types/market'

type Load = (instrument:MarketInstrument,signal:AbortSignal)=>Promise<readonly Candle[]>
/** User-visible ledger refresh; bounded sequential public-history requests, no persistent streams. */
export async function refreshOpportunityTrials(signal:AbortSignal,{
  now=Date.now,load=(instrument,abort)=>marketDataService.getLiveCandles(instrument,'1H',abort),
}: {now?:()=>number;load?:Load}={}) {
  const key=trialStorageKey(), store=readOpportunityTrials(key)
  if (store.error) throw new Error('storage')
  const pending=store.trials.filter(r=>r.issue!=='revised' && !isTrialComplete(evaluateOpportunityTrial(r,now()).state) && now()>=r.startAt+TRIAL_HOUR)
  const groups=new Map<string,OpportunityTrial[]>()
  for (const row of pending) groups.set(row.instrument.id,[...(groups.get(row.instrument.id)??[]),row])
  for (const rows of groups.values()) {
    if (signal.aborted || trialStorageKey()!==key) return
    const controller=new AbortController(), abort=()=>controller.abort()
    signal.addEventListener('abort',abort,{once:true})
    const timeout=setTimeout(abort,18_000)
    let candles:readonly Candle[]|null=null
    let rejectAborted:()=>void=()=>{}
    const cancelled=new Promise<never>((_,reject)=>{rejectAborted=()=>reject(new DOMException('Aborted','AbortError'));controller.signal.addEventListener('abort',rejectAborted,{once:true})})
    try { candles=await Promise.race([load(rows[0].instrument,controller.signal),cancelled]) } catch { /* Preserve existing evidence when a provider is unavailable. */ }
    finally { clearTimeout(timeout);signal.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAborted) }
    if (signal.aborted || trialStorageKey()!==key) return
    for (const row of rows) {
      const at=now()
      if (at<(row.checkedAt??row.recordedAt)) continue
      const next=candles ? mergeTrialEvidence(row,candles,at) : {...row,checkedAt:at,issue:'connection' as const}
      saveOpportunityTrialUpdate(next,key)
    }
  }
}
