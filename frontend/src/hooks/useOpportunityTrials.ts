import { useEffect, useState, useSyncExternalStore } from 'react'
import { cloudSnapshot, subscribeCloud } from '@/services/cloud/cloudClient'
import { readOpportunityTrials, TRIAL_CHANGED, trialStorageKey } from '@/services/cryptoAnalysis/opportunityTrialStorage'
import { readServerTrials, serverTrialKey } from '@/services/cryptoAnalysis/opportunityTrialCloud'

export function useOpportunityTrials(legacy=false) {
  const cloud=useSyncExternalStore(subscribeCloud,cloudSnapshot)
  const remote=!!cloud.user && !legacy,key=remote?serverTrialKey():trialStorageKey()
  const [store,setStore]=useState(()=>remote?readServerTrials():readOpportunityTrials(key))
  useEffect(()=>{
    const reload=()=>setStore(remote?readServerTrials():readOpportunityTrials(key))
    const sync=(e:StorageEvent)=>{if (e.key===key || e.key===null) reload()}
    reload();window.addEventListener(TRIAL_CHANGED,reload);window.addEventListener('storage',sync)
    return ()=>{window.removeEventListener(TRIAL_CHANGED,reload);window.removeEventListener('storage',sync)}
  },[key,remote])
  return store.key===key ? store : remote?readServerTrials():readOpportunityTrials(key)
}
