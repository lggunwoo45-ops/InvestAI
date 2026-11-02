import { TRIAL_HOUR as H } from './opportunityModel.mjs'
export const trialNow=Date.UTC(2026,10,2,12,0,15)
export function opportunityFixture(now=trialNow,asset='SOL') {
  const hour=Math.floor(now/H)*H
  return {id:'client-id',batchId:'client-batch',version:'opportunity-v1',recordedAt:now,signalAt:now,signalCandleAt:hour-H,
    instrument:{id:`upbit-${asset.toLowerCase()}`,symbol:`${asset}/KRW`,name:asset,marketId:'upbit',quoteCurrency:'KRW',lastPrice:100,change24hPercent:-2,volume24h:1000},
    kind:'rebound',entry:[99,101],stop:95,target:110,costPercent:.2,signalPrice:100,startAt:hour+H,horizonHours:24,checkedAt:null,issue:null,
    basis:[{frame:'1H',asOf:hour-H,close:100,rsi:45,atr:1,volumeRatio:1.2,direction:'buy'},{frame:'4H',asOf:hour-4*H,close:100,rsi:45,atr:1,volumeRatio:1.2,direction:'sell'}],evidence:[]}
}
export const opportunityBars=(t,count=24)=>Array.from({length:count},(_,n)=>({timestamp:t.startAt+n*H,open:100,high:101,low:99,close:100,volume:10}))
