import { useEffect, useState, useSyncExternalStore } from 'react'
import { cloudSnapshot, subscribeCloud } from '@/services/cloud/cloudClient'
import { readOpportunityTrials, TRIAL_CHANGED, trialStorageKey } from '@/services/cryptoAnalysis/opportunityTrialStorage'

export function useOpportunityTrials() {
  useSyncExternalStore(subscribeCloud,cloudSnapshot)
  const key=trialStorageKey()
  const [store,setStore]=useState(()=>readOpportunityTrials(key))
  useEffect(()=>{
    const reload=()=>setStore(readOpportunityTrials(key))
    const sync=(e:StorageEvent)=>{if (e.key===key || e.key===null) reload()}
    reload();window.addEventListener(TRIAL_CHANGED,reload);window.addEventListener('storage',sync)
    return ()=>{window.removeEventListener(TRIAL_CHANGED,reload);window.removeEventListener('storage',sync)}
  },[key])
  return store.key===key ? store : readOpportunityTrials(key)
}
